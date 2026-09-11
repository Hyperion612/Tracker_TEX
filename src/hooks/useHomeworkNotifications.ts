import { useEffect } from 'react';
import { useHomeworkStore } from '../store/homeworkStore';

export function useHomeworkNotifications() {
  const { homework } = useHomeworkStore();

  useEffect(() => {
    // Проверяем поддержку уведомлений
    if (!('Notification' in window)) {
      console.log('Браузер не поддерживает уведомления');
      return;
    }

    // Запрашиваем разрешение на уведомления
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Проверяем домашние задания каждые 5 минут
    const checkHomework = () => {
      if (Notification.permission !== 'granted') return;

      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

      // Уведомления о заданиях на сегодня
      const todayHomework = homework.filter(
        (h) => h.due_date === today && h.status !== 'completed'
      );

      if (todayHomework.length > 0) {
        const subjects = todayHomework.map((h) => h.subject).join(', ');
        new Notification('📚 Домашнее задание на сегодня', {
          body: `Не забудьте выполнить: ${subjects}`,
          icon: '/favicon.ico',
          tag: 'homework-today',
        });
      }

      // Уведомления о заданиях на завтра
      const tomorrowHomework = homework.filter(
        (h) => h.due_date === tomorrow && h.status !== 'completed'
      );

      if (tomorrowHomework.length > 0) {
        const subjects = tomorrowHomework.map((h) => h.subject).join(', ');
        new Notification('📅 Домашнее задание на завтра', {
          body: `Завтра нужно сдать: ${subjects}`,
          icon: '/favicon.ico',
          tag: 'homework-tomorrow',
        });
      }

      // Уведомления о просроченных заданиях
      const overdueHomework = homework.filter(
        (h) => h.due_date < today && h.status !== 'completed'
      );

      if (overdueHomework.length > 0) {
        new Notification('⚠️ Просроченные домашние задания', {
          body: `У вас ${overdueHomework.length} просроченных заданий`,
          icon: '/favicon.ico',
          tag: 'homework-overdue',
        });
      }
    };

    // Проверяем сразу при загрузке
    checkHomework();

    // И затем каждые 5 минут
    const interval = setInterval(checkHomework, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [homework]);
}
