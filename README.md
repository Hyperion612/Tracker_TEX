# 📚 Трекер посещаемости техникума

Современное SPA-приложение для отслеживания посещаемости студентов техникума.

## 🚀 Технологии

- **Frontend:** React 18 + TypeScript + Vite
- **Стили:** Tailwind CSS + Framer Motion
- **Графики:** Recharts
- **Иконки:** Lucide React
- **State:** Zustand
- **Роутинг:** React Router v6
- **Backend/БД:** Supabase (Postgres + Auth + RLS + Realtime)
- **PWA:** vite-plugin-pwa
- **CI/CD:** GitHub Actions → GitHub Pages

## 🎨 Дизайн

- Палитра: синий (#1E3A8A, #3B82F6, #60A5FA), белый, чёрный
- Стиль: минимализм + неоморфизм + glassmorphism
- Скругления 16–24px, мягкие тени
- Светлая и тёмная тема
- Адаптивный дизайн (320px — 1440px)

## 📦 Установка

```bash
npm install
```

## 🔧 Разработка

```bash
npm run dev
```

## 🏗️ Сборка

```bash
npm run build
```

## ✅ Проверка типов

```bash
npm run typecheck
```

## 🗄️ Настройка Supabase

**Подробная инструкция**: см. [SETUP.md](./SETUP.md)

### Краткая инструкция:

1. Создайте проект на [supabase.com](https://supabase.com)
2. Скопируйте **Project URL** и **anon key** из Settings → API
3. Создайте файл `.env` в корне проекта:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

4. Выполните SQL-миграцию из `supabase/migrations/001_initial_schema.sql` в SQL Editor
5. Запустите `npm run dev`

## 🚀 Деплой

### GitHub Pages

1. Добавьте секреты в GitHub Repository Settings → Secrets:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
2. Push в `main` автоматически запустит деплой

### Переменные окружения

| Переменная | Описание |
|---|---|
| `VITE_SUPABASE_URL` | URL Supabase проекта |
| `VITE_SUPABASE_ANON_KEY` | Публичный ключ Supabase |

## 📱 Функциональность

### Календарь
- Месячный и недельный вид
- Навигация стрелками, свайпами, кнопкой «Сегодня»
- Цветовая индикация статусов
- Клик по дню → модальное окно отметки
- Двойной клик → выбор диапазона дней
- Realtime-синхронизация

### Отметки
- «Присутствовал» — без доп. полей
- «Опоздал» — поле минут опоздания
- «Отсутствовал» — обязательный выбор причины + заметка
- Undo-отмена в течение 5 секунд

### Статистика
- Круговой прогресс посещаемости
- Счётчики по статусам
- Диаграмма причин пропусков
- Серии посещений (streak)
- Прогноз допуска
- Помесячная динамика

### Настройки
- Переключатель темы
- Редактирование профиля
- Порог допуска (50-100%)

## 🔒 Безопасность

- RLS-политики на всех таблицах
- Пользователь видит только свои данные
- CHECK-констрейнты в БД
- Валидация на клиенте и сервере
- Секреты только в GitHub Secrets

## 📂 Структура проекта

```
src/
├── App.tsx              # Главный компонент с роутингом
├── main.tsx             # Точка входа
├── index.css            # Глобальные стили
├── types/               # TypeScript типы
├── lib/                 # Утилиты и Supabase клиент
├── store/               # Zustand stores
├── components/
│   ├── ui/              # Переиспользуемые UI компоненты
│   ├── calendar/        # Кастомный календарь
│   ├── modals/          # Модальные окна
│   └── layout/          # Layout компоненты
└── pages/               # Страницы приложения
```

## 📄 Лицензия

MIT
