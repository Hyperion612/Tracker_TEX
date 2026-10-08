# 🔧 Исправление ошибки "Database error saving new user"

## Проблема

При регистрации появляется ошибка: **"Database error saving new user"**

Это означает, что триггер Supabase не может создать профиль пользователя в таблице `profiles`.

## Причины

1. **RLS политики блокируют вставку** — триггер работает, но RLS не позволяет создать запись
2. **Триггер не создан или сломан** — SQL миграция не выполнена полностью
3. **Email не подтверждён** — Supabase по умолчанию требует подтверждения email
4. **Пустые значения** — `full_name` или `group_name` пустые и нарушают CHECK-констрейнты

## Решение

### Шаг 1: Выполните SQL миграцию заново

1. Откройте **Supabase Dashboard** → **SQL Editor**
2. Нажмите **"New query"**
3. Скопируйте **всё содержимое** файла `supabase/migrations/001_initial_schema.sql`
4. Вставьте в редактор
5. Нажмите **"Run"** (или Ctrl+Enter)

Этот SQL:
- ✅ Удаляет старые таблицы и триггеры
- ✅ Создаёт таблицы с правильными значениями по умолчанию
- ✅ Настраивает RLS политики
- ✅ Создаёт триггер с `SECURITY DEFINER` (обходит RLS)
- ✅ Добавляет справочник причин отсутствия

### Шаг 2: Отключите подтверждение email

По умолчанию Supabase требует подтверждения email. Для тестирования отключите:

1. **Authentication** → **Providers** → **Email**
2. Найдите **"Confirm email"**
3. **Отключите** переключатель
4. Нажмите **"Save"**

Теперь пользователи смогут регистрироваться без подтверждения.

### Шаг 3: Проверьте триггер

Выполните этот SQL чтобы убедиться что триггер создан:

```sql
SELECT tgname, tgrelid::regclass, tgfoid::regproc 
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';
```

Должна вернуться одна строка:
- `tgname`: `on_auth_user_created`
- `tgrelid`: `auth.users`
- `tgfoid`: `handle_new_user`

Если строк нет — триггер не создан, выполните миграцию заново.

### Шаг 4: Проверьте RLS политики

Выполните этот SQL чтобы увидеть все политики:

```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('profiles', 'attendance', 'absence_reasons');
```

Должны быть политики:
- `profiles_select_own`
- `profiles_insert_own`
- `profiles_update_own`
- `attendance_select_own`
- `attendance_insert_own`
- и т.д.

### Шаг 5: Протестируйте регистрацию

1. Откройте приложение
2. Нажмите **"Зарегистрироваться"**
3. Введите:
   - Email: любой (например, `test@example.com`)
   - Пароль: минимум 6 символов
   - ФИО: любое (например, `Иванов Иван`)
   - Группа: любая (например, `ИС-21`)
4. Нажмите **"Зарегистрироваться"**

Если всё работает — вы войдёте в систему и увидите календарь.

## Если ошибка осталась

### Проверьте логи Supabase

1. **Logs** → **API** или **Postgres**
2. Найдите последнюю ошибку
3. Скопируйте текст ошибки

### Типичные ошибки и решения

#### "new row violates row-level security policy"

**Причина**: RLS блокирует вставку.

**Решение**: Убедитесь что триггер использует `SECURITY DEFINER`:

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER  -- ← Это важно!
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
```

#### "duplicate key value violates unique constraint"

**Причина**: Профиль уже существует.

**Решение**: Используйте `ON CONFLICT DO NOTHING` в триггере (уже добавлено в миграции).

#### "column full_name is required"

**Причина**: Пустое значение `full_name`.

**Решение**: Добавлены значения по умолчанию в триггер:
```sql
COALESCE(NEW.raw_user_meta_data->>'full_name', 'Студент')
```

#### "relation profiles does not exist"

**Причина**: Таблица не создана.

**Решение**: Выполните SQL миграцию полностью.

## Альтернативное решение: Ручное создание профиля

Если триггер всё ещё не работает, можно создать профиль вручную после регистрации:

1. Зарегистрируйтесь (получите ошибку)
2. Откройте **Supabase Dashboard** → **Authentication** → **Users**
3. Найдите своего пользователя, скопируйте **UID**
4. Откройте **SQL Editor** и выполните:

```sql
INSERT INTO profiles (id, email, full_name, group_name)
VALUES (
  'ВАШ_UID_ЗДЕСЬ',
  'ваш@email.com',
  'Ваше ФИО',
  'Ваша группа'
);
```

5. Теперь войдите в систему

## Проверка что всё работает

После регистрации выполните:

```sql
-- Проверить что профиль создан
SELECT * FROM profiles WHERE email = 'ваш@email.com';

-- Должна вернуться одна строка с вашим профилем
```

## Обновлённый код

Код приложения обновлён и включает:
- ✅ Fallback-создание профиля если триггер не сработал
- ✅ Улучшенную обработку ошибок с читаемыми сообщениями
- ✅ Логирование для отладки

После выполнения этих шагов регистрация должна работать корректно.
