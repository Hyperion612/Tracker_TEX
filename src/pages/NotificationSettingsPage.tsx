import { useState, useEffect } from 'react';
import { Bell, Mail, Smartphone, Save, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { supabase } from '../lib/supabase';
import { useNotificationStore } from '../store/notificationStore';

interface NotificationSettings {
  push_enabled: boolean;
  email_enabled: boolean;
  email_reminder_hours_before: number;
}

export function NotificationSettingsPage() {
  const { isSupported, isSubscribed, isLoading: isPushLoading, subscribe, unsubscribe } = usePushNotifications();
  const { addNotification } = useNotificationStore();
  
  const [settings, setSettings] = useState<NotificationSettings>({
    push_enabled: false,
    email_enabled: false,
    email_reminder_hours_before: 24,
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setSettings({
          push_enabled: data.push_enabled || false,
          email_enabled: data.email_enabled || false,
          email_reminder_hours_before: data.email_reminder_hours_before || 24,
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      addNotification({
        type: 'error',
        title: 'Ошибка',
        message: 'Не удалось загрузить настройки уведомлений',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.rpc('update_notification_settings_rpc', {
        p_push_enabled: settings.push_enabled,
        p_email_enabled: settings.email_enabled,
        p_email_reminder_hours_before: settings.email_reminder_hours_before,
      });

      if (error) throw error;

      addNotification({
        type: 'success',
        title: 'Успешно',
        message: 'Настройки уведомлений сохранены',
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      addNotification({
        type: 'error',
        title: 'Ошибка',
        message: 'Не удалось сохранить настройки',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePushToggle = async () => {
    if (!settings.push_enabled) {
      const success = await subscribe();
      if (success) {
        setSettings({ ...settings, push_enabled: true });
      }
    } else {
      const success = await unsubscribe();
      if (success) {
        setSettings({ ...settings, push_enabled: false });
      }
    }
  };

  const handleTestPush = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.functions.invoke('send-push-notification', {
        body: { user_id: user.id, title: 'Тестовое уведомление', body: 'Это тестовое push-уведомление' },
      });

      if (error) throw error;

      addNotification({
        type: 'success',
        title: 'Успешно',
        message: 'Тестовое уведомление отправлено',
      });
    } catch (error) {
      console.error('Error sending test push:', error);
      addNotification({
        type: 'error',
        title: 'Ошибка',
        message: 'Не удалось отправить тестовое уведомление',
      });
    }
  };

  const handleTestEmail = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.functions.invoke('send-notification', {
        body: { type: 'homework_reminder', user_id: user.id },
      });

      if (error) throw error;

      addNotification({
        type: 'success',
        title: 'Успешно',
        message: 'Тестовое email отправлено',
      });
    } catch (error) {
      console.error('Error sending test email:', error);
      addNotification({
        type: 'error',
        title: 'Ошибка',
        message: 'Не удалось отправить тестовое email',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Настройки уведомлений</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Управляйте push-уведомлениями и email-рассылкой
        </p>
      </div>

      {/* Push уведомления */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Smartphone className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Push-уведомления
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Получайте уведомления прямо на устройство даже когда приложение закрыто
            </p>
            
            {!isSupported ? (
              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Push-уведомления не поддерживаются в вашем браузере
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isSubscribed ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-slate-400" />
                    )}
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      {isSubscribed ? 'Подписаны' : 'Не подписаны'}
                    </span>
                  </div>
                  <button
                    onClick={handlePushToggle}
                    disabled={isPushLoading}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.push_enabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.push_enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                
                {settings.push_enabled && (
                  <button
                    onClick={handleTestPush}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Отправить тестовое уведомление
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Email уведомления */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <Mail className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Email-уведомления
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Получайте напоминания о домашних заданиях и расписании на почту
            </p>
            
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  Включить email-уведомления
                </span>
                <button
                  onClick={() => setSettings({ ...settings, email_enabled: !settings.email_enabled })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.email_enabled ? 'bg-green-600' : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.email_enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {settings.email_enabled && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Напоминать за (часов)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="168"
                      value={settings.email_reminder_hours_before}
                      onChange={(e) => setSettings({ ...settings, email_reminder_hours_before: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      За сколько часов до срока отправлять напоминание
                    </p>
                  </div>

                  <button
                    onClick={handleTestEmail}
                    className="text-sm text-green-600 dark:text-green-400 hover:underline"
                  >
                    Отправить тестовое email
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Типы уведомлений */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Какие уведомления вы будете получать
        </h2>
        <ul className="space-y-3">
          <li className="flex items-start gap-3">
            <Bell className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                Напоминания о домашних заданиях
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                За день до срока выполнения
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <Bell className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                Расписание на завтра
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Вечером накануне учебного дня
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <Bell className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                Просроченные задания
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Если есть невыполненные домашние задания
              </p>
            </div>
          </li>
        </ul>
      </div>

      {/* Кнопка сохранения */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Сохранение...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Сохранить настройки
            </>
          )}
        </button>
      </div>
    </div>
  );
}
