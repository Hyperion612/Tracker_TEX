import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Undo2 } from 'lucide-react';
import { useAttendanceStore } from '../store/attendanceStore';
import { Calendar } from '../components/calendar/Calendar';
import { AttendanceModal } from '../components/modals/AttendanceModal';

export function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { undoAction, performUndo } = useAttendanceStore();

  const handleDayClick = (date: string) => {
    setSelectedDate(date);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedDate(null);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Календарь</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Нажмите на день для отметки • Двойной клик для выбора диапазона
        </p>
      </div>

      <Calendar onDayClick={handleDayClick} />

      <AttendanceModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        date={selectedDate}
      />

      {/* Undo notification */}
      <AnimatePresence>
        {undoAction && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xl">
              <span className="text-sm font-medium">Действие выполнено</span>
              <button
                onClick={performUndo}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/20 dark:bg-slate-900/20 hover:bg-white/30 dark:hover:bg-slate-900/30 transition-colors text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <Undo2 size={14} />
                Отменить
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
