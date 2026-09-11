-- ============================================
-- Трекер посещаемости техникума
-- SQL миграции для Supabase (PostgreSQL)
-- ============================================

-- Удаляем старые объекты если есть (для повторного запуска)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS update_attendance_updated_at ON attendance;
DROP FUNCTION IF EXISTS update_updated_at();
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS absence_reasons CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- ============================================
-- Таблица профилей пользователей
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT 'Студент' CHECK (char_length(full_name) >= 1 AND char_length(full_name) <= 200),
  group_name TEXT NOT NULL DEFAULT 'Не указана' CHECK (char_length(group_name) >= 1 AND char_length(group_name) <= 50),
  admission_threshold INTEGER NOT NULL DEFAULT 75 CHECK (admission_threshold >= 50 AND admission_threshold <= 100),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- Таблица причин отсутствия
-- ============================================
CREATE TABLE absence_reasons (
  id TEXT PRIMARY KEY,
  label TEXT UNIQUE NOT NULL CHECK (char_length(label) >= 2 AND char_length(label) <= 100),
  is_excused BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- Сид для причин отсутствия
INSERT INTO absence_reasons (id, label, is_excused, sort_order) VALUES
  ('illness_certificate', 'Болезнь со справкой', TRUE, 1),
  ('personal', 'Личные', FALSE, 2),
  ('family', 'Семейные', TRUE, 3),
  ('valid_reason', 'Уважительная', TRUE, 4),
  ('skip', 'Прогул', FALSE, 5),
  ('academic_event', 'Учебное мероприятие', TRUE, 6),
  ('other', 'Другое', FALSE, 7);

-- ============================================
-- Таблица посещаемости
-- ============================================
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'late', 'absent')),
  absence_reason TEXT REFERENCES absence_reasons(id),
  late_minutes INTEGER CHECK (late_minutes >= 0 AND late_minutes <= 180),
  note TEXT CHECK (char_length(COALESCE(note, '')) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- ============================================
-- Индексы для производительности
-- ============================================
CREATE INDEX idx_attendance_user_date ON attendance(user_id, date);
CREATE INDEX idx_attendance_status ON attendance(status);
CREATE INDEX idx_attendance_date ON attendance(date);

-- ============================================
-- RLS (Row Level Security)
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE absence_reasons ENABLE ROW LEVEL SECURITY;

-- Удаляем старые политики если есть
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_own" ON profiles;
DROP POLICY IF EXISTS "attendance_select_own" ON attendance;
DROP POLICY IF EXISTS "attendance_insert_own" ON attendance;
DROP POLICY IF EXISTS "attendance_update_own" ON attendance;
DROP POLICY IF EXISTS "attendance_delete_own" ON attendance;
DROP POLICY IF EXISTS "absence_reasons_select_all" ON absence_reasons;

-- Profiles: пользователь работает только со своим профилем
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profiles_delete_own" ON profiles
  FOR DELETE USING (auth.uid() = id);

-- Attendance: пользователь работает только со своими записями
CREATE POLICY "attendance_select_own" ON attendance
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "attendance_insert_own" ON attendance
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "attendance_update_own" ON attendance
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "attendance_delete_own" ON attendance
  FOR DELETE USING (auth.uid() = user_id);

-- Absence reasons: все аутентифицированные могут читать
CREATE POLICY "absence_reasons_select_all" ON absence_reasons
  FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================
-- Функция и триггер для автосоздания профиля
-- ============================================

-- Функция создания профиля при регистрации
-- SECURITY DEFINER позволяет обойти RLS
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Триггер срабатывает после создания пользователя в auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- Триггеры для updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_attendance_updated_at
  BEFORE UPDATE ON attendance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Realtime подписки
-- ============================================

-- Удаляем старую публикацию если есть
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS attendance;
ALTER PUBLICATION supabase_realtime ADD TABLE attendance;
