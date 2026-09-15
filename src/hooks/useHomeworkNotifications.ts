import { useEffect, useRef } from 'react';
import { useHomeworkStore } from '../store/homeworkStore';
import { useNotificationStore } from '../store/notificationStore';

export function useHomeworkNotifications() {
  const { homework } = useHomeworkStore();
  const { addNotification } = useNotificationStore();
  const notifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const checkHomework = () => {
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

      // Уведомления о просроченных заданиях
      const overdueHomework = homework.filter(
        (h) => h.due_date < today && h.status !== 'completed'
      );

      if (overdueHomework.length > 0) {
        const key = `overdue-${overdueHomework.length}`;
        if (!notifiedRef.current.has(key)) {
          notifiedRef.current.add(key);
          addNotification({
            type: 'error',
            title: '⚠️ Просроченные задания',
            message: `У вас ${overdueHomework.length} просроченных домашних заданий`,
            duration: 7000,
          });
        }
      }

      // Уведомления о заданиях на сегодня
      const todayHomework = homework.filter(
        (h) => h.due_date === today && h.status !== 'completed'
      );

      if (todayHomework.length > 0) {
        const key = `today-${todayHomework.map(h => h.id).join(',')}`;
        if (!notifiedRef.current.has(key)) {
          notifiedRef.current.add(key);
          const subjects = todayHomework.map((h) => h.subject).join(', ');
          addNotification({
            type: 'warning',
            title: '📚 Домашнее задание на сегодня',
            message: `Не забудьте выполнить: ${subjects}`,
            duration: 7000,
          });
        }
      }

      // Уведомления о заданиях на завтра
      const tomorrowHomework = homework.filter(
        (h) => h.due_date === tomorrow && h.status !== 'completed'
      );

      if (tomorrowHomework.length > 0) {
        const key = `tomorrow-${tomorrowHomework.map(h => h.id).join(',')}`;
        if (!notifiedRef.current.has(key)) {
          notifiedRef.current.add(key);
          const subjects = tomorrowHomework.map((h) => h.subject).join(', ');
          addNotification({
            type: 'info',
            title: '📅 Домашнее задание на завтра',
            message: `Завтра нужно сдать: ${subjects}`,
            duration: 7000,
          });
        }
      }
    };

    // Проверяем сразу при загрузке
    checkHomework();

    // И затем каждые 5 минут
    const interval = setInterval(checkHomework, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [homework, addNotification]);
}
