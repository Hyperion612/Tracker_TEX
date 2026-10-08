# 📋 Инструкция по настройке Supabase

## Шаг 1: Создание проекта в Supabase

1. Перейдите на [supabase.com](https://supabase.com)
2. Войдите или зарегистрируйтесь
3. Нажмите **"New Project"**
4. Заполните данные:
   - **Name**: любое название (например, `attendance-tracker`)
   - **Database Password**: сохраните в надёжное место
   - **Region**: выберите ближайший к вам регион
   - **Pricing Plan**: Free (бесплатный)
5. Нажмите **"Create new project"** и подождите 1-2 минуты

## Шаг 2: Получение API ключей

1. В левом меню выберите **Settings** (шестерёнка) → **API**
2. Скопируйте два значения:
   - **Project URL** (например, `https://abcdefgh.supabase.co`)
   - **anon public key** (длинная строка, начинается с `eyJ...`)

## Шаг 3: Настройка .env файла

1. В корне проекта создайте файл `.env` (или отредактируйте существующий)
2. Добавьте следующие строки, заменив значения на свои:

```env
VITE_SUPABASE_URL=https://abcdefgh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

⚠️ **Важно**: 
- Не добавляйте кавычки вокруг значений
- Не коммитьте `.env` в Git (он уже в `.gitignore`)
- Для GitHub Actions добавьте эти значения в Secrets

## Шаг 4: Выполнение SQL миграции

1. В Supabase Dashboard перейдите в **SQL Editor** (иконка базы данных в левом меню)
2. Нажмите **"New query"**
3. Скопируйте содержимое файла `supabase/migrations/001_initial_schema.sql`
4. Вставьте в редактор и нажмите **"Run"** (или Ctrl+Enter)
5. Дождитесь сообщения "Success. No rows returned"

Это создаст:
- Таблицу `profiles` для профилей пользователей
- Таблицу `attendance` для записей посещаемости
- Таблицу `absence_reasons` со справочником причин
- RLS политики безопасности
- Триггеры для автоматического создания профилей
- Realtime подписки

## Шаг 5: Включение Email подтверждений (опционально)

По умолчанию Supabase требует подтверждения email. Для отключения:

1. Перейдите в **Authentication** → **Providers** → **Email**
2. Отключите **"Confirm email"**
3. Нажмите **"Save"**

## Шаг 6: Локальная разработка

```bash
# Установка зависимостей
npm install

# Запуск dev-сервера
npm run dev
```

Откройте http://localhost:3000

## Шаг 7: Деплой на GitHub Pages

### 7.1. Создание репозитория

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/USERNAME/REPO_NAME.git
git push -u origin main
```

### 7.2. Настройка GitHub Secrets

1. Перейдите в ваш репозиторий на GitHub
2. **Settings** → **Secrets and variables** → **Actions**
3. Нажмите **"New repository secret"** и добавьте два секрета:
   - **Name**: `VITE_SUPABASE_URL`  
     **Value**: ваш Project URL из Supabase
   - **Name**: `VITE_SUPABASE_ANON_KEY`  
     **Value**: ваш anon key из Supabase

### 7.3. Настройка GitHub Pages

1. **Settings** → **Pages**
2. **Source**: выберите **"GitHub Actions"**
3. Сохраните

### 7.4. Автоматический деплой

При каждом push в ветку `main` автоматически запустится:
1. Проверка типов (typecheck)
2. Сборка проекта (build)
3. Деплой на GitHub Pages

URL вашего сайта будет: `https://USERNAME.github.io/REPO_NAME/`

## Шаг 8: Проверка работы

1. Откройте сайт
2. Зарегистрируйтесь с любым email и паролем (минимум 6 символов)
3. Войдите в систему
4. Попробуйте отметить день в календаре
5. Проверьте статистику

## 🔧 Решение проблем

### Белый экран после деплоя

**Причина**: Используется `BrowserRouter`, который не работает на GitHub Pages.

**Решение**: В коде уже используется `HashRouter`. Если проблема осталась:
1. Проверьте консоль браузера (F12) на наличие ошибок
2. Убедитесь, что секреты в GitHub Actions настроены правильно
3. Проверьте вкладку **Actions** в репозитории — нет ли ошибок сборки

### Ошибка "Supabase не настроен"

**Причина**: Переменные окружения не переданы в build.

**Решение**:
- Для локальной разработки: проверьте файл `.env`
- Для GitHub Actions: проверьте Secrets в настройках репозитория

### Ошибка "relation does not exist"

**Причина**: SQL миграция не выполнена.

**Решение**: Выполните SQL из `supabase/migrations/001_initial_schema.sql` в SQL Editor.

### Ошибка RLS "new row violates row-level security policy"

**Причина**: Пользователь не аутентифицирован или пытается получить доступ к чужим данным.

**Решение**: Убедитесь, что:
1. Пользователь вошёл в систему
2. RLS политики созданы правильно (выполните миграцию заново)

## 📊 Мониторинг

### Просмотр данных в Supabase

1. **Table Editor** — просмотр таблиц `profiles`, `attendance`, `absence_reasons`
2. **Logs** — логи API запросов и ошибок
3. **Realtime** — мониторинг realtime подписок

### Очистка данных

```sql
-- Удалить все записи посещаемости
DELETE FROM attendance;

-- Удалить всех пользователей (осторожно!)
DELETE FROM profiles;
DELETE FROM auth.users;
```

## 🔐 Безопасность

- ✅ RLS включён на всех таблицах
- ✅ Пользователи видят только свои данные
- ✅ CHECK-констрейнты валидируют данные в БД
- ✅ Секреты хранятся только в GitHub Secrets
- ✅ Анонимный ключ Supabase безопасен для клиента

## 📞 Поддержка

- [Supabase Docs](https://supabase.com/docs)
- [Supabase Discord](https://discord.supabase.com)
- [GitHub Issues](https://github.com/your-repo/issues)
