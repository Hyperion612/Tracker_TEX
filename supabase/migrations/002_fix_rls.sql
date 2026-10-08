-- ============================================
-- МИНИМАЛЬНАЯ МИГРАЦИЯ: Исправление RLS для профиля
-- Выполните этот SQL в Supabase SQL Editor
-- ============================================

-- 1. Удаляем старую RPC функцию если есть
DROP FUNCTION IF EXISTS create_profile_rpc(UUID, TEXT, TEXT, TEXT);

-- 2. Создаём RPC функцию с SECURITY DEFINER
-- Эта функция выполняется от имени владельца БД и обходит RLS
CREATE OR REPLACE FUNCTION create_profile_rpc(
  p_id UUID,
  p_email TEXT,
  p_full_name TEXT DEFAULT 'Студент',
  p_group_name TEXT DEFAULT 'Не указана'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, group_name)
  VALUES (
    p_id,
    p_email,
    COALESCE(NULLIF(p_full_name, ''), 'Студент'),
    COALESCE(NULLIF(p_group_name, ''), 'Не указана')
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    full_name = COALESCE(NULLIF(p_full_name, ''), profiles.full_name),
    group_name = COALESCE(NULLIF(p_group_name, ''), profiles.group_name);
END;
$$;

-- 3. Даём право вызова всем (включая анонимных — для регистрации)
GRANT EXECUTE ON FUNCTION create_profile_rpc(UUID, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION create_profile_rpc(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

-- 4. Удаляем старый триггер если есть
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- 5. Создаём триггер для автоматического создания профиля
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, group_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Студент'),
    COALESCE(NEW.raw_user_meta_data->>'group_name', 'Не указана')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 6. Убеждаемся что RLS включен на profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 7. Удаляем старые политики
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_own" ON profiles;

-- 8. Создаём политики
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profiles_delete_own" ON profiles
  FOR DELETE USING (auth.uid() = id);

-- 9. Создаём функцию для получения профиля (с обходом RLS)
DROP FUNCTION IF EXISTS get_profile_rpc();

CREATE OR REPLACE FUNCTION get_profile_rpc()
RETURNS SETOF profiles
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.profiles 
  WHERE id = auth.uid()
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION get_profile_rpc() TO authenticated;

-- 10. Создаём функцию для обновления профиля (с обходом RLS)
DROP FUNCTION IF EXISTS update_profile_rpc(TEXT, TEXT, INTEGER);

CREATE OR REPLACE FUNCTION update_profile_rpc(
  p_full_name TEXT,
  p_group_name TEXT,
  p_threshold INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles
  SET 
    full_name = COALESCE(NULLIF(p_full_name, ''), full_name),
    group_name = COALESCE(NULLIF(p_group_name, ''), group_name),
    admission_threshold = COALESCE(p_threshold, admission_threshold)
  WHERE id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION update_profile_rpc(TEXT, TEXT, INTEGER) TO authenticated;
