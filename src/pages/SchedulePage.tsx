import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Clock, User, MapPin, Edit2, Trash2, X, BookOpen } from 'lucide-react';
import { useScheduleStore } from '../store/scheduleStore';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { cn } from '../lib/utils';
import type { ScheduleItem, DayOfWeek, WeekType } from '../types';

const DAYS_OF_WEEK = [
  { value: 1, label: 'Понедельник', short: 'Пн' },
  { value: 2, label: 'Вторник', short: 'Вт' },
  { value: 3, label: 'Среда', short: 'Ср' },
  { value: 4, label: 'Четверг', short: 'Чт' },
  { value: 5, label: 'Пятница', short: 'Пт' },
  { value: 6, label: 'Суббота', short: 'Сб' },
];

const WEEK_TYPES = [
  { value: 'every', label: 'Каждую неделю', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
  { value: 'odd', label: 'Только нечётную', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' },
  { value: 'even', label: 'Только чётную', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' },
];

export function SchedulePage() {
  const { user } = useAuthStore();
  const { schedule, isLoading, addScheduleItem, updateScheduleItem, deleteScheduleItem } = useScheduleStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);
  const [selectedDay, setSelectedDay] = useState<DayOfWeek | null>(null);

  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek>(1);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:30');
  const [subject, setSubject] = useState('');
  const [teacher, setTeacher] = useState('');
  const [room, setRoom] = useState('');
  const [notes, setNotes] = useState('');
  const [weekType, setWeekType] = useState<WeekType>('every');

  const openCreateModal = (day?: DayOfWeek) => {
    setEditingItem(null);
    setDayOfWeek(day || 1);
    setStartTime('09:00');
    setEndTime('10:30');
    setSubject('');
    setTeacher('');
    setRoom('');
    setNotes('');
    setWeekType('every');
    setIsModalOpen(true);
  };

  const openEditModal = (item: ScheduleItem) => {
    setEditingItem(item);
    setDayOfWeek(item.day_of_week);
    setStartTime(item.start_time);
    setEndTime(item.end_time);
    setSubject(item.subject);
    setTeacher(item.teacher || '');
    setRoom(item.room || '');
    setNotes(item.notes || '');
    setWeekType(item.week_type);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!user || !subject.trim() || !startTime || !endTime) return;

    if (editingItem) {
      await updateScheduleItem(editingItem.id, {
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
        subject: subject.trim(),
        teacher: teacher.trim() || null,
        room: room.trim() || null,
        notes: notes.trim() || null,
        week_type: weekType,
      });
    } else {
      await addScheduleItem({
        user_id: user.id,
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
        subject: subject.trim(),
        teacher: teacher.trim() || null,
        room: room.trim() || null,
        notes: notes.trim() || null,
        week_type: weekType,
      });
    }

    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Удалить эту пару?')) {
      await deleteScheduleItem(id);
    }
  };

  const getScheduleForDay = (day: DayOfWeek) => {
    return schedule
      .filter((s) => s.day_of_week === day)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Расписание</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Составьте своё недельное расписание пар
          </p>
        </div>
        <Button onClick={() => openCreateModal()}>
          <Plus size={18} className="mr-2" />
          Добавить пару
        </Button>
      </div>

      {/* Schedule Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {DAYS_OF_WEEK.map((day) => {
          const daySchedule = getScheduleForDay(day.value as DayOfWeek);
          
          return (
            <motion.div
              key={day.value}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden"
            >
              {/* Day Header */}
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-white">{day.label}</h3>
                  <button
                    onClick={() => openCreateModal(day.value as DayOfWeek)}
                    className="p-1 rounded-lg hover:bg-white/20 text-white transition-colors"
                    aria-label="Добавить пару"
                  >
                    <Plus size={18} />
                  </button>
                </div>
                <p className="text-xs text-blue-100 mt-0.5">
                  {daySchedule.length} {daySchedule.length === 1 ? 'пара' : 'пар'}
                </p>
              </div>

              {/* Schedule Items */}
              <div className="p-3 space-y-2 min-h-[200px]">
                {daySchedule.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 dark:text-slate-500">
                    <BookOpen size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Нет пар</p>
                  </div>
                ) : (
                  daySchedule.map((item) => (
                    <ScheduleCard
                      key={item.id}
                      item={item}
                      onEdit={openEditModal}
                      onDelete={handleDelete}
                    />
                  ))
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Редактировать пару' : 'Новая пара'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              День недели <span className="text-red-500">*</span>
            </label>
            <select
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(parseInt(e.target.value) as DayOfWeek)}
              className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {DAYS_OF_WEEK.map((day) => (
                <option key={day.value} value={day.value}>
                  {day.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Начало <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Конец <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Предмет <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Математика, Физика..."
              className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Преподаватель
            </label>
            <input
              type="text"
              value={teacher}
              onChange={(e) => setTeacher(e.target.value)}
              placeholder="Иванов И.И."
              className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Аудитория
            </label>
            <input
              type="text"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="301"
              className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Повторение
            </label>
            <div className="grid grid-cols-3 gap-2">
              {WEEK_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setWeekType(type.value as WeekType)}
                  className={cn(
                    'px-3 py-2 rounded-xl text-xs font-medium transition-all',
                    weekType === type.value
                      ? type.color + ' ring-2 ring-offset-2 ring-blue-500'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                  )}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Заметки
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Дополнительная информация..."
              rows={2}
              className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} className="flex-1">
              Отмена
            </Button>
            <Button
              onClick={handleSave}
              disabled={!subject.trim() || !startTime || !endTime}
              className="flex-1"
            >
              {editingItem ? 'Сохранить' : 'Создать'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

interface ScheduleCardProps {
  item: ScheduleItem;
  onEdit: (item: ScheduleItem) => void;
  onDelete: (id: string) => void;
}

function ScheduleCard({ item, onEdit, onDelete }: ScheduleCardProps) {
  const weekTypeConfig = WEEK_TYPES.find((t) => t.value === item.week_type);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={14} className="text-blue-500 flex-shrink-0" />
            <span className="text-sm font-medium text-slate-900 dark:text-white">
              {item.start_time} - {item.end_time}
            </span>
            {weekTypeConfig && item.week_type !== 'every' && (
              <span className={cn('px-2 py-0.5 rounded-full text-xs', weekTypeConfig.color)}>
                {weekTypeConfig.label}
              </span>
            )}
          </div>

          <h4 className="font-semibold text-slate-900 dark:text-white truncate">
            {item.subject}
          </h4>

          {item.teacher && (
            <div className="flex items-center gap-1 mt-1 text-xs text-slate-600 dark:text-slate-400">
              <User size={12} />
              <span className="truncate">{item.teacher}</span>
            </div>
          )}

          {item.room && (
            <div className="flex items-center gap-1 mt-0.5 text-xs text-slate-600 dark:text-slate-400">
              <MapPin size={12} />
              <span>Ауд. {item.room}</span>
            </div>
          )}

          {item.notes && (
            <p className="text-xs text-slate-500 dark:text-slate-500 mt-1 italic line-clamp-2">
              {item.notes}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <button
            onClick={() => onEdit(item)}
            className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 transition-colors"
            title="Редактировать"
          >
            <Edit2 size={14} />
          </button>
          <button
            onClick={() => onDelete(item.id)}
            className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors"
            title="Удалить"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
