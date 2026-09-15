import { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, CalendarDays, CalendarRange } from 'lucide-react';
import { format, addMonths, subMonths, addWeeks, subWeeks, isToday, isSameMonth } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn, getDaysInMonth, getDaysInWeek, getStatusColor } from '../../lib/utils';
import { useAttendanceStore } from '../../store/attendanceStore';
import type { CalendarView } from '../../types';
import { Button } from '../ui/Button';
import { CalendarSkeleton } from '../ui/Skeleton';

interface CalendarProps {
  onDayClick: (date: string) => void;
}

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export function Calendar({ onDayClick }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>('month');
  const [direction, setDirection] = useState<'left' | 'right'>('right');
  const touchStartX = useRef<number>(0);
  const { records, isLoading, selectedDates, toggleDateSelection, clearSelection } = useAttendanceStore();

  const getRecord = useCallback((dateStr: string) => {
    return records.find(r => r.date === dateStr);
  }, [records]);

  const navigate = (dir: 'prev' | 'next') => {
    setDirection(dir === 'prev' ? 'left' : 'right');
    if (view === 'month') {
      setCurrentDate(dir === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
    } else {
      setCurrentDate(dir === 'prev' ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      navigate(diff > 0 ? 'next' : 'prev');
    }
  };

  const handleDayClick = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    if (selectedDates.length > 0) {
      toggleDateSelection(dateStr);
    } else {
      onDayClick(dateStr);
    }
  };

  const handleDayLongPress = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    toggleDateSelection(dateStr);
  };

  const days = view === 'month' ? getDaysInMonth(currentDate) : getDaysInWeek(currentDate);

  if (isLoading && records.length === 0) {
    return <CalendarSkeleton />;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.h2
            key={format(currentDate, 'yyyy-MM')}
            initial={{ opacity: 0, x: direction === 'right' ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white"
          >
            {format(currentDate, 'LLLL yyyy', { locale: ru })}
          </motion.h2>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={goToToday}
            className="hidden sm:inline-flex"
          >
            Сегодня
          </Button>
          <button
            onClick={() => navigate('prev')}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="Предыдущий"
          >
            <ChevronLeft size={20} className="text-slate-600 dark:text-slate-400" />
          </button>
          <button
            onClick={() => navigate('next')}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="Следующий"
          >
            <ChevronRight size={20} className="text-slate-600 dark:text-slate-400" />
          </button>
          <div className="flex border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <button
              onClick={() => setView('month')}
              className={cn(
                'p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                view === 'month' ? 'bg-blue-500 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              )}
              aria-label="Месяц"
            >
              <CalendarDays size={18} />
            </button>
            <button
              onClick={() => setView('week')}
              className={cn(
                'p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                view === 'week' ? 'bg-blue-500 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              )}
              aria-label="Неделя"
            >
              <CalendarRange size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Selection bar */}
      {selectedDates.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/30 rounded-2xl border border-blue-200 dark:border-blue-800"
        >
          <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">
            Выбрано дней: {selectedDates.length}
          </span>
          <Button variant="ghost" size="sm" onClick={clearSelection}>
            Сбросить
          </Button>
        </motion.div>
      )}

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 md:gap-2">
        {WEEKDAYS.map((day) => (
          <div key={day} className="text-center text-xs font-medium text-slate-500 dark:text-slate-400 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <motion.div
        key={`${view}-${format(currentDate, 'yyyy-MM-dd')}`}
        initial={{ opacity: 0, x: direction === 'right' ? 30 : -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2 }}
        className={cn(
          'grid gap-1 md:gap-2',
          view === 'month' ? 'grid-cols-7' : 'grid-cols-7'
        )}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const record = getRecord(dateStr);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isTodayDate = isToday(day);
          const isSelected = selectedDates.includes(dateStr);

          return (
            <motion.button
              key={dateStr}
              onClick={() => handleDayClick(day)}
              onDoubleClick={() => handleDayLongPress(day)}
              className={cn(
                'relative aspect-square rounded-2xl flex flex-col items-center justify-center transition-all duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
                'hover:scale-105 active:scale-95',
                view === 'week' ? 'min-h-[100px]' : '',
                !isCurrentMonth && 'opacity-30',
                isSelected && 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/30',
                !isSelected && !record && 'hover:bg-slate-50 dark:hover:bg-slate-800/50',
                isTodayDate && !isSelected && !record && 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-700'
              )}
              whileTap={{ scale: 0.95 }}
            >
              <span className={cn(
                'text-sm font-medium',
                isTodayDate ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300',
                !isCurrentMonth && 'text-slate-400'
              )}>
                {format(day, 'd')}
              </span>

              {record && (
                <div className={cn(
                  'w-2 h-2 md:w-2.5 md:h-2.5 rounded-full mt-1',
                  getStatusColor(record.status)
                )} />
              )}

              {record?.status === 'late' && record.late_minutes && (
                <span className="text-[9px] text-yellow-600 dark:text-yellow-400 mt-0.5">
                  +{record.late_minutes}м
                </span>
              )}
            </motion.button>
          );
        })}
      </motion.div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 justify-center pt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-xs text-slate-600 dark:text-slate-400">Присутствовал</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <span className="text-xs text-slate-600 dark:text-slate-400">Опоздал</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-xs text-slate-600 dark:text-slate-400">Отсутствовал</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600" />
          <span className="text-xs text-slate-600 dark:text-slate-400">Не отмечено</span>
        </div>
      </div>
    </div>
  );
}
