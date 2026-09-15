import { motion } from 'framer-motion';
import { BookOpen, Calendar, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useHomeworkStore } from '../../store/homeworkStore';
import { cn } from '../../lib/utils';
import type { Homework } from '../../types';

const PRIORITY_CONFIG = {
  low: { icon: '📗', color: 'text-slate-500' },
  normal: { icon: '📘', color: 'text-blue-500' },
  high: { icon: '📙', color: 'text-orange-500' },
  urgent: { icon: '📕', color: 'text-red-500' },
};

export function HomeworkSidebar() {
  const { homework, isLoading } = useHomeworkStore();

  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const overdueHomework = homework
    .filter((h) => h.due_date < today && h.status !== 'completed')
    .sort((a, b) => a.due_date.localeCompare(b.due_date));

  const todayHomework = homework.filter((h) => h.due_date === today && h.status !== 'completed');

  const tomorrowHomework = homework.filter((h) => h.due_date === tomorrow && h.status !== 'completed');

  const upcomingHomework = homework
    .filter((h) => h.due_date > tomorrow && h.status !== 'completed')
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
    .slice(0, 3);

  if (isLoading) {
    return (
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="animate-pulse space-y-3">
          <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
          <div className="h-20 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-20 bg-slate-200 dark:bg-slate-700 rounded" />
        </div>
      </div>
    );
  }

  if (homework.length === 0) {
    return (
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="text-center py-6">
          <BookOpen size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Нет домашних заданий
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
      <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
        <BookOpen size={18} className="text-blue-500" />
        Домашние задания
      </h3>

      <div className="space-y-4">
        {/* Overdue */}
        {overdueHomework.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-red-600 dark:text-red-400 mb-2 flex items-center gap-1">
              <AlertCircle size={14} />
              Просрочено ({overdueHomework.length})
            </h4>
            <div className="space-y-2">
              {overdueHomework.slice(0, 2).map((hw) => (
                <HomeworkItem key={hw.id} homework={hw} isOverdue />
              ))}
              {overdueHomework.length > 2 && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  И ещё {overdueHomework.length - 2}...
                </p>
              )}
            </div>
          </div>
        )}

        {/* Today */}
        {todayHomework.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-orange-600 dark:text-orange-400 mb-2 flex items-center gap-1">
              <Clock size={14} />
              Сегодня ({todayHomework.length})
            </h4>
            <div className="space-y-2">
              {todayHomework.map((hw) => (
                <HomeworkItem key={hw.id} homework={hw} isToday />
              ))}
            </div>
          </div>
        )}

        {/* Tomorrow */}
        {tomorrowHomework.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-2 flex items-center gap-1">
              <Calendar size={14} />
              Завтра ({tomorrowHomework.length})
            </h4>
            <div className="space-y-2">
              {tomorrowHomework.map((hw) => (
                <HomeworkItem key={hw.id} homework={hw} />
              ))}
            </div>
          </div>
        )}

        {/* Upcoming */}
        {upcomingHomework.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
              Ближайшие
            </h4>
            <div className="space-y-2">
              {upcomingHomework.map((hw) => (
                <HomeworkItem key={hw.id} homework={hw} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface HomeworkItemProps {
  homework: Homework;
  isOverdue?: boolean;
  isToday?: boolean;
}

function HomeworkItem({ homework: hw, isOverdue, isToday }: HomeworkItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        'p-3 rounded-xl border transition-all',
        isOverdue
          ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
          : isToday
          ? 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800'
          : 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600'
      )}
    >
      <div className="flex items-start gap-2">
        <span className="text-sm">{PRIORITY_CONFIG[hw.priority].icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
            {hw.subject}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mt-0.5">
            {hw.description}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
            {format(new Date(hw.due_date + 'T00:00:00'), 'd MMM', { locale: ru })}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
