import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface UsePushNotificationsReturn {
  isSupported: boolean;
  permission: NotificationPermission | 'default';
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const [permission, setPermission] = useState<NotificationPermission | 'default'>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSupported = 'serviceWorker' in navigator && 'PushManager' in window;

  useEffect(() => {
    if (isSupported && 'Notification' in window) {
      setPermission(Notification.permission);
      checkSubscription();
    }
  }, [isSupported]);

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(subscription !== null);
    } catch (err) {
      console.error('Error checking subscription:', err);
    }
  };

  const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const subscribe = async (): Promise<boolean> => {
    if (!isSupported) {
      setError('Push-уведомления не поддерживаются в этом браузере');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Запрашиваем разрешение
      const permission = await Notification.requestPermission();
      setPermission(permission);

      if (permission !== 'granted') {
        setError('Разрешение на уведомления отклонено');
        setIsLoading(false);
        return false;
      }

      // Регистрируем service worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      // Получаем VAPID ключ из Supabase
      const { data: configData, error: configError } = await supabase
        .from('notification_settings')
        .select('vapid_public_key')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (configError || !configData?.vapid_public_key) {
        // Используем публичный ключ по умолчанию
        const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkPs-7y6gKjEj8y6gKjEj8y6gKjEj8y6gKjEj8y6';
        
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });

      // Сохраняем подписку в Supabase
      const p256dhKey = subscription.getKey('p256dh');
      const authKey = subscription.getKey('auth');
      
      const { error: saveError } = await supabase.from('push_subscriptions').insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        endpoint: subscription.endpoint,
        keys: {
          p256dh: p256dhKey ? btoa(String.fromCharCode(...new Uint8Array(p256dhKey))) : '',
          auth: authKey ? btoa(String.fromCharCode(...new Uint8Array(authKey))) : '',
        },
      });
        if (saveError) throw saveError;

        setIsSubscribed(true);
        setIsLoading(false);
        return true;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(configData.vapid_public_key) as BufferSource,
      });

      // Сохраняем подписку в Supabase
      const p256dhKey = subscription.getKey('p256dh');
      const authKey = subscription.getKey('auth');
      
      const { error: saveError } = await supabase.from('push_subscriptions').insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        endpoint: subscription.endpoint,
        keys: {
          p256dh: p256dhKey ? btoa(String.fromCharCode(...new Uint8Array(p256dhKey))) : '',
          auth: authKey ? btoa(String.fromCharCode(...new Uint8Array(authKey))) : '',
        },
      });

      if (saveError) throw saveError;

      setIsSubscribed(true);
      setIsLoading(false);
      return true;
    } catch (err) {
      console.error('Error subscribing to push:', err);
      setError(err instanceof Error ? err.message : 'Ошибка подписки на уведомления');
      setIsLoading(false);
      return false;
    }
  };

  const unsubscribe = async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Удаляем из Supabase
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', subscription.endpoint);

        // Отписываемся
        await subscription.unsubscribe();
      }

      setIsSubscribed(false);
      setIsLoading(false);
      return true;
    } catch (err) {
      console.error('Error unsubscribing:', err);
      setError(err instanceof Error ? err.message : 'Ошибка отписки от уведомлений');
      setIsLoading(false);
      return false;
    }
  };

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
  };
}
