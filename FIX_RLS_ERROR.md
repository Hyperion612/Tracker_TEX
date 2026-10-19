# 🔧 Исправление ошибки "Нет доступа. Проверьте настройки RLS в Supabase"

## Проблема

При регистрации появляется ошибка:
```
"Нет доступа. Проверьте настройки RLS в Supabase"
```

или

```
"new row violates row-level security policy for table profiles"
```

## Причина

RLS (Row Level Security) блокирует создание профиля, потому что:
1. RPC функции не созданы в базе данных
2. Или у функций нет нужных прав
3. Или триггер не работает

## Решение

### Шаг 1: Выполните исправляющую SQL миграцию

1. Откройте **Supabase Dashboard** → **SQL Editor**
2. Нажмите **"New query"**
3. Скопируйте **весь** код из файла `supabase/migrations/002_fix_rls.sql`
4. Вставьте в редактор
5. Нажмите **"Run"** (или Ctrl+Enter)

Этот SQL создаст:
- ✅ RPC функцию `create_profile_rpc` для создания профиля
- ✅ RPC функцию `get_profile_rpc` для получения профиля
- ✅ RPC функцию `update_profile_rpc` для обновления профиля
- ✅ Триггер для автоматического создания профиля
- ✅ Все необходимые права доступа

### Шаг 2: Проверьте что функции созданы

Выполните этот SQL чтобы убедиться что всё на месте:

```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('create_profile_rpc', 'get_profile_rpc', 'update_profile_rpc', 'handle_new_user');
```

Должны вернуться 4 строки:
- `create_profile_rpc`
- `get_profile_rpc`
- `update_profile_rpc`
- `handle_new_user`

### Шаг 3: Проверьте права доступа

```sql
SELECT routine_name, grantee 
FROM information_schema.routine_privileges 
WHERE routine_name IN ('create_profile_rpc', 'get_profile_rpc', 'update_profile_rpc')
AND privilege_type = 'EXECUTE';
```

Должны быть права для `anon` и `authenticated`.

### Шаг 4: Отключите подтверждение email

1. **Authentication** → **Providers** → **Email**
2. Отключите **"Confirm email"**
3. Нажмите **"Save"**

### Шаг 5: Попробуйте зарегистрироваться снова

Теперь регистрация должна работать без ошибок.

---

## Если ошибка осталась

### Проверка 1: Функция create_profile_rpc существует?

```sql
SELECT * FROM pg_proc WHERE proname = 'create_profile_rpc';
```

Если пусто — функция не создана, выполните миграцию заново.

### Проверка 2: Функция имеет SECURITY DEFINER?

```sql
SELECT proname, prosecdef 
FROM pg_proc 
WHERE proname = 'create_profile_rpc';
```

`prosecdef` должен быть `true`. Если `false` — выполните миграцию заново.

### Проверка 3: Права на выполнение?

```sql
SELECT grantee, privilege_type 
FROM information_schema.routine_privileges 
WHERE routine_name = 'create_profile_rpc';
```

Должны быть `anon` и `authenticated` с `EXECUTE`.

### Проверка 4: Триггер работает?

```sql
SELECT tgname, tgrelid::regclass 
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';
```

Должна вернуться одна строка с `auth.users`.

---

## Альтернативное решение: Временное отключение RLS

Если ничего не помогает, можно временно отключить RLS для таблицы profiles:

```sql
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
```

⚠️ **Внимание**: Это небезопасно! Используйте только для тестирования.

После тестирования включите RLS обратно:

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
```

---

## Проверка что всё работает

После выполнения миграции попробуйте:

1. Зарегистрироваться с новым email
2. Войти в систему
3. Открыть настройки и изменить профиль
4. Проверить что данные сохраняются

Если всё работает — проблема решена!

---

## Что делает миграция 002_fix_rls.sql

### 1. Создаёт RPC функции с SECURITY DEFINER

Эти функции выполняются от имени владельца базы данных и обходят RLS:

```sql
CREATE OR REPLACE FUNCTION create_profile_rpc(...)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER  -- ← Ключевое! Выполняется от имени владельца БД
AS $$ ... $$;
```

### 2. Даёт права всем пользователям

```sql
GRANT EXECUTE ON FUNCTION create_profile_rpc(...) TO anon;
GRANT EXECUTE ON FUNCTION create_profile_rpc(...) TO authenticated;
```

### 3. Создаёт триггер для автоматического создания профиля

```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### 4. Настраивает RLS политики

```sql
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);
```

---

## Почему это работает

### Обычный запрос (блокируется RLS)

```sql
-- От имени пользователя
INSERT INTO profiles (id, email, ...) VALUES (...);
-- ❌ Ошибка: violates row-level security policy
```

### RPC функция с SECURITY DEFINER

```sql
-- Вызывается от имени пользователя
SELECT create_profile_rpc(...);

-- Внутри функции выполняется от имени владельца БД
INSERT INTO profiles (id, email, ...) VALUES (...);
-- ✅ Успех: SECURITY DEFINER обходит RLS
```

---

## Структура файлов

```
supabase/migrations/
├── 001_initial_schema.sql  # Создание таблиц и базовых политик
└── 002_fix_rls.sql         # Исправление RLS (ЭТОТ ФАЙЛ)
```

---

## Быстрое решение (копипаст)

Если не хотите разбираться, просто выполните этот SQL:

```sql
-- Создать функцию создания профиля
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
  VALUES (p_id, p_email, COALESCE(NULLIF(p_full_name, ''), 'Студент'), COALESCE(NULLIF(p_group_name, ''), 'Не указана'))
  ON CONFLICT (id) DO UPDATE
  SET full_name = COALESCE(NULLIF(p_full_name, ''), profiles.full_name),
      group_name = COALESCE(NULLIF(p_group_name, ''), profiles.group_name);
END;
$$;

-- Дать права
GRANT EXECUTE ON FUNCTION create_profile_rpc(UUID, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION create_profile_rpc(UUID, TEXT, TEXT, TEXT) TO authenticated;
```

Это минимальный код для исправления ошибки.

---

## Поддержка

Если проблема не решена:
1. Скопируйте полный текст ошибки из консоли браузера (F12)
2. Проверьте логи в Supabase Dashboard → Logs
3. Убедитесь что все SQL из миграции выполнены без ошибок
