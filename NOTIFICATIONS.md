# 🔔 Система уведомлений

## Обзор

Система уведомлений включает два типа:
1. **Push-уведомления** - уведомления на устройство через Service Worker и Push API
2. **Email-уведомления** - напоминания на почту через Supabase Edge Functions

## Возможности

### Push-уведомления
- ✅ Работают даже когда приложение закрыто
- ✅ Поддержка всех современных браузеров
- ✅ Кастомные иконки и действия
- ✅ Автоматическая очистка недействительных подписок

### Email-уведомления
- ✅ Напоминания о домашних заданиях
- ✅ Расписание на завтра
- ✅ Уведомления о просроченных заданиях
- ✅ Настраиваемое время напоминания

## Настройка

### 1. Выполните SQL миграцию

```bash
# Выполните файл supabase/migrations/005_add_notifications.sql
# в Supabase SQL Editor
```

### 2. Настройте VAPID ключи для Push

1. Сгенерируйте VAPID ключи:
```bash
npx web-push generate-vapid-keys
```

2. Добавьте ключи в Supabase:
   - Откройте таблицу `notification_settings`
   - Для вашего пользователя установите `vapid_public_key` и `vapid_private_key`

### 3. Настройте Resend для Email

1. Зарегистрируйтесь на [resend.com](https://resend.com)
2. Получите API ключ
3. Добавьте его в переменные окружения Supabase Edge Functions:
```bash
supabase secrets set RESEND_API_KEY=re_your_api_key_here
```

### 4. Деплой Edge Functions

```bash
# Деплой функции отправки email
supabase functions deploy send-notification

# Деплой функции отправки push
supabase functions deploy send-push-notification
```

## Использование

### В приложении

1. Перейдите в **Настройки** → **Уведомления**
2. Включите Push-уведомления (потребуется разрешение браузера)
3. Включите Email-уведомления
4. Настройте время напоминания

### Типы уведомлений

#### Напоминания о домашних заданиях
- Отправляются за N часов до срока
- Содержат список заданий на завтра
- Настраивается в настройках

#### Расписание на завтра
- Отправляются вечером накануне
- Содержат полное расписание
- Включает время, предмет, преподавателя, аудиторию

#### Просроченные задания
- Отправляются при наличии просроченных ДЗ
- Содержат список просроченных заданий
- Помогают не забыть о долгах

## Техническая реализация

### Service Worker (`public/sw.js`)
```javascript
// Обработка push-событий
self.addEventListener('push', (event) => {
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      data: { url: data.url }
    })
  );
});
```

### Хук `usePushNotifications`
```typescript
const { 
  isSupported,      // Поддерживается ли Push API
  isSubscribed,     // Подписан ли пользователь
  subscribe,        // Подписаться на уведомления
  unsubscribe,      // Отписаться от уведомлений
} = usePushNotifications();
```

### Edge Function для Email
```typescript
// Отправка email через Resend API
const res = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${RESEND_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    from: 'Трекер <onboarding@resend.dev>',
    to: [user.email],
    subject,
    html: body,
  }),
});
```

## Структура базы данных

### `notification_settings`
```sql
- user_id (UUID)
- push_enabled (BOOLEAN)
- email_enabled (BOOLEAN)
- vapid_public_key (TEXT)
- vapid_private_key (TEXT)
- email_reminder_hours_before (INTEGER)
```

### `push_subscriptions`
```sql
- user_id (UUID)
- endpoint (TEXT)
- keys (JSONB)
```

### `email_queue`
```sql
- user_id (UUID)
- to_email (TEXT)
- subject (TEXT)
- body (TEXT)
- status (TEXT: pending/sent/failed)
- scheduled_at (TIMESTAMPTZ)
- sent_at (TIMESTAMPTZ)
```

## Автоматизация

### Cron Jobs (планировщик)

Для автоматической отправки уведомлений настройте cron jobs в Supabase:

```sql
-- Напоминания о домашних заданиях (каждый день в 18:00)
SELECT cron.schedule(
  'homework-reminders',
  '0 18 * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/send-notification',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
    body := concat('{"type": "homework_reminder", "user_id": "', user_id, '"}')::jsonb
  )
  FROM notification_settings
  WHERE email_enabled = true
  $$
);

-- Расписание на завтра (каждый день в 20:00)
SELECT cron.schedule(
  'schedule-reminders',
  '0 20 * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/send-notification',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
    body := concat('{"type": "schedule_reminder", "user_id": "', user_id, '"}')::jsonb
  )
  FROM notification_settings
  WHERE email_enabled = true
  $$
);
```

## Тестирование

### Тест Push-уведомлений
1. Откройте **Настройки** → **Уведомления**
2. Включите Push-уведомления
3. Нажмите "Отправить тестовое уведомление"
4. Проверьте получение уведомления

### Тест Email-уведомлений
1. Откройте **Настройки** → **Уведомления**
2. Включите Email-уведомления
3. Нажмите "Отправить тестовое email"
4. Проверьте почту (включая спам)

## Решение проблем

### Push-уведомления не работают
- Проверьте разрешение браузера
- Убедитесь что Service Worker зарегистрирован
- Проверьте VAPID ключи в базе данных
- Проверьте логи Edge Function

### Email не приходят
- Проверьте API ключ Resend
- Убедитесь что email подтвержден в Resend
- Проверьте папку "Спам"
- Проверьте логи Edge Function

### Ошибки в консоли
- `Notification permission denied` - пользователь отклонил разрешение
- `ServiceWorker registration failed` - проблема с регистрацией SW
- `Push subscription failed` - проблема с подпиской на Push

## Безопасность

- ✅ VAPID ключи хранятся в базе данных
- ✅ Service Role Key используется только в Edge Functions
- ✅ RLS политики защищают данные пользователей
- ✅ Подписки удаляются при отписке

## Производительность

- ✅ Push-уведомления отправляются асинхронно
- ✅ Email ставятся в очередь
- ✅ Недействительные подписки автоматически удаляются
- ✅ TTL для Push установлен в 24 часа

## Будущие улучшения

- [ ] Rich notifications с изображениями
- [ ] Actions в уведомлениях (например, "Отметить выполненным")
- [ ] Группировка уведомлений
- [ ] Звуковые уведомления
- [ ] Уведомления о низком проценте посещаемости
- [ ] Интеграция с Telegram ботом
- [ ] SMS уведомления (через Twilio)

## Поддержка

- [Web Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Resend Docs](https://resend.com/docs)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
