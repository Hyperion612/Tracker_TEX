-- Таблица настроек уведомлений
CREATE TABLE IF NOT EXISTS notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  push_enabled BOOLEAN DEFAULT false,
  email_enabled BOOLEAN DEFAULT false,
  vapid_public_key TEXT,
  vapid_private_key TEXT,
  email_reminder_hours_before INTEGER DEFAULT 24,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица push подписок
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  keys JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица очереди email уведомлений
CREATE TABLE IF NOT EXISTS email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  scheduled_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_notification_settings_user ON notification_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_scheduled ON email_queue(scheduled_at);

-- RLS
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

-- Политики для notification_settings
DROP POLICY IF EXISTS "notification_settings_select_own" ON notification_settings;
DROP POLICY IF EXISTS "notification_settings_insert_own" ON notification_settings;
DROP POLICY IF EXISTS "notification_settings_update_own" ON notification_settings;

CREATE POLICY "notification_settings_select_own" ON notification_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "notification_settings_insert_own" ON notification_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notification_settings_update_own" ON notification_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- Политики для push_subscriptions
DROP POLICY IF EXISTS "push_subscriptions_select_own" ON push_subscriptions;
DROP POLICY IF EXISTS "push_subscriptions_insert_own" ON push_subscriptions;
DROP POLICY IF EXISTS "push_subscriptions_delete_own" ON push_subscriptions;

CREATE POLICY "push_subscriptions_select_own" ON push_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "push_subscriptions_insert_own" ON push_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "push_subscriptions_delete_own" ON push_subscriptions
  FOR DELETE USING (auth.uid() = user_id);

-- Политики для email_queue (только для чтения пользователем)
DROP POLICY IF EXISTS "email_queue_select_own" ON email_queue;
DROP POLICY IF EXISTS "email_queue_insert_own" ON email_queue;

CREATE POLICY "email_queue_select_own" ON email_queue
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "email_queue_insert_own" ON email_queue
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Триггер для updated_at
CREATE TRIGGER update_notification_settings_updated_at
  BEFORE UPDATE ON notification_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Функция для отправки push уведомлений (вызывается из Edge Function)
CREATE OR REPLACE FUNCTION get_push_subscriptions_for_user(p_user_id UUID)
RETURNS TABLE(endpoint TEXT, keys JSONB)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT ps.endpoint, ps.keys
  FROM push_subscriptions ps
  WHERE ps.user_id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_push_subscriptions_for_user TO authenticated;

-- Функция для получения настроек уведомлений
CREATE OR REPLACE FUNCTION get_notification_settings_rpc()
RETURNS SETOF notification_settings
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM notification_settings
  WHERE user_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION get_notification_settings_rpc TO authenticated;

-- Функция для обновления настроек уведомлений
CREATE OR REPLACE FUNCTION update_notification_settings_rpc(
  p_push_enabled BOOLEAN DEFAULT NULL,
  p_email_enabled BOOLEAN DEFAULT NULL,
  p_email_reminder_hours_before INTEGER DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO notification_settings (user_id, push_enabled, email_enabled, email_reminder_hours_before)
  VALUES (auth.uid(), 
          COALESCE(p_push_enabled, false), 
          COALESCE(p_email_enabled, false), 
          COALESCE(p_email_reminder_hours_before, 24))
  ON CONFLICT (user_id) DO UPDATE
  SET 
    push_enabled = COALESCE(p_push_enabled, notification_settings.push_enabled),
    email_enabled = COALESCE(p_email_enabled, notification_settings.email_enabled),
    email_reminder_hours_before = COALESCE(p_email_reminder_hours_before, notification_settings.email_reminder_hours_before);
END;
$$;

GRANT EXECUTE ON FUNCTION update_notification_settings_rpc(BOOLEAN, BOOLEAN, INTEGER) TO authenticated;
