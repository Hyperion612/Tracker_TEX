import { motion, AnimatePresence } from 'framer-motion';
import { X, Info, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { useNotificationStore } from '../../store/notificationStore';
import { cn } from '../../lib/utils';

const ICONS = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
};

const STYLES = {
  info: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100',
  success: 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-900 dark:text-green-100',
  warning: 'bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800 text-orange-900 dark:text-orange-100',
  error: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100',
};

const ICON_STYLES = {
  info: 'text-blue-500 dark:text-blue-400',
  success: 'text-green-500 dark:text-green-400',
  warning: 'text-orange-500 dark:text-orange-400',
  error: 'text-red-500 dark:text-red-400',
};

export function NotificationToast() {
  const { notifications, removeNotification } = useNotificationStore();

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      <AnimatePresence>
        {notifications.map((notification) => {
          const Icon = ICONS[notification.type];
          
          return (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, x: 100, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className={cn(
                'rounded-lg border p-4 shadow-lg backdrop-blur-sm',
                STYLES[notification.type]
              )}
            >
              <div className="flex items-start gap-3">
                <Icon className={cn('w-5 h-5 flex-shrink-0 mt-0.5', ICON_STYLES[notification.type])} />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm">{notification.title}</h3>
                  <p className="text-sm mt-1 opacity-90">{notification.message}</p>
                </div>
                <button
                  onClick={() => removeNotification(notification.id)}
                  className="flex-shrink-0 p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                  aria-label="Закрыть"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
