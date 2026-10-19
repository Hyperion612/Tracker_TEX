# 🔔 Быстрая настройка уведомлений

## Что добавлено

✅ **Push-уведомления** - работают даже когда приложение закрыто  
✅ **Email-уведомления** - напоминания на почту через Resend  
✅ **Страница настроек** - управление уведомлениями  
✅ **Service Worker** - для обработки push-событий  
✅ **Edge Functions** - для отправки email и push

## Типы уведомлений

1. **Напоминания о домашних заданиях** - за день до срока
2. **Расписание на завтра** - вечером накануне
3. **Просроченные задания** - если есть невыполненные ДЗ

## Настройка за 5 шагов

### 1. Выполните SQL миграцию

Откройте **Supabase Dashboard** → **SQL Editor** и выполните:

```bash
# Скопируйте содержимое файла:
# supabase/migrations/005_add_notifications.sql
```

### 2. Сгенерируйте VAPID ключи

```bash
npx web-push generate-vapid-keys
```

Скопируйте `publicKey` и `privateKey`.

### 3. Добавьте VAPID ключи в базу данных

В **Supabase Dashboard** → **Table Editor** → `notification_settings`:

- Создайте запись для вашего пользователя
- Установите `vapid_public_key` и `vapid_private_key`

### 4. Настройте Resend для Email

1. Зарегистрируйтесь на [resend.com](https://resend.com)
2. Получите API ключ
3. Добавьте в Supabase Secrets:

```bash
supabase secrets set RESEND_API_KEY=re_your_api_key_here
```

### 5. Задеплойте Edge Functions

```bash
# Email уведомления
supabase functions deploy send-notification

# Push уведомления
supabase functions deploy send-push-notification
```

## Использование в приложении

1. Откройте приложение
2. Перейдите в **Настройки** → **Уведомления**
3. Включите **Push-уведомления** (разрешите в браузере)
4. Включите **Email-уведомления**
5. Настройте время напоминания (по умолчанию 24 часа)
6. Нажмите **Сохранить настройки**

## Тестирование

### Тест Push
- Включите Push в настройках
- Нажмите "Отправить тестовое уведомление"
- Проверьте получение уведомления

### Тест Email
- Включите Email в настройках
- Нажмите "Отправить тестовое email"
- Проверьте почту (включая спам)

## Автоматическая отправка

Для автоматической отправки уведомлений настройте cron jobs:

```sql
-- Напоминания о ДЗ каждый день в 18:00
SELECT cron.schedule(
  'homework-reminders',
  '0 18 * * *',
  $$SELECT net.http_post(...)$$
);

-- Расписание на завтра каждый день в 20:00
SELECT cron.schedule(
  'schedule-reminders',
  '0 20 * * *',
  $$SELECT net.http_post(...)$$
);
```

## Файлы

- `src/pages/NotificationSettingsPage.tsx` - страница настроек
- `src/hooks/usePushNotifications.ts` - хук для push
- `public/sw.js` - service worker
- `supabase/functions/send-notification/` - email edge function
- `supabase/functions/send-push-notification/` - push edge function
- `supabase/migrations/005_add_notifications.sql` - миграция БД
- `NOTIFICATIONS.md` - полная документация

## Решение проблем

### Push не работают
- Проверьте разрешение браузера
- Убедитесь что VAPID ключи установлены
- Проверьте логи Edge Function

### Email не приходят
- Проверьте API ключ Resend
- Убедитесь что email подтвержден
- Проверьте папку "Спам"

### Ошибки
- `Notification permission denied` - отклонено разрешение
- `ServiceWorker registration failed` - проблема с SW
- `Push subscription failed` - проблема с подпиской

## Готово!

Теперь вы будете получать уведомления о:
- 📚 Домашних заданиях
- 📅 Расписании на завтра
- ⚠️ Просроченных заданиях

Подробная документация: [NOTIFICATIONS.md](./NOTIFICATIONS.md)
