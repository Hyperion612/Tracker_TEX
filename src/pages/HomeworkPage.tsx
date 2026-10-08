import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, BookOpen, Calendar, AlertCircle, CheckCircle2, Clock, Trash2, Edit2, X } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useHomeworkStore } from '../store/homeworkStore';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { cn } from '../lib/utils';
import type { Homework, HomeworkPriority, HomeworkStatus } from '../types';

const PRIORITY_CONFIG = {
  low: { label: 'Низкий', color: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400', icon: '📗' },
  normal: { label: 'Обычный', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300', icon: '📘' },
  high: { label: 'Высокий', color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300', icon: '📙' },
  urgent: { label: 'Срочный', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300', icon: '📕' },
};

const STATUS_CONFIG = {
  pending: { label: 'Не начато', color: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400' },
  in_progress: { label: 'В процессе', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
  completed: { label: 'Выполнено', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' },
};

export function HomeworkPage() {
  const { user } = useAuthStore();
  const { homework, isLoading, addHomework, updateHomework, deleteHomework } = useHomeworkStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHomework, setEditingHomework] = useState<Homework | null>(null);

  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<HomeworkPriority>('normal');
  const [status, setStatus] = useState<HomeworkStatus>('pending');
  const [notes, setNotes] = useState('');

  const openCreateModal = () => {
    setEditingHomework(null);
    setSubject('');
    setDescription('');
    setDueDate('');
    setPriority('normal');
    setStatus('pending');
    setNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (hw: Homework) => {
    setEditingHomework(hw);
    setSubject(hw.subject);
    setDescription(hw.description);
    setDueDate(hw.due_date);
    setPriority(hw.priority);
    setStatus(hw.status);
    setNotes(hw.notes || '');
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!user || !subject.trim() || !description.trim() || !dueDate) return;

    if (editingHomework) {
      await updateHomework(editingHomework.id, {
        subject: subject.trim(),
        description: description.trim(),
        due_date: dueDate,
        priority,
        status,
        notes: notes.trim() || null,
      });
    } else {
      await addHomework({
        user_id: user.id,
        subject: subject.trim(),
        description: description.trim(),
        due_date: dueDate,
        priority,
        status,
        notes: notes.trim() || null,
      });
    }

    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Удалить это домашнее задание?')) {
      await deleteHomework(id);
    }
  };

  const handleStatusChange = async (id: string, newStatus: HomeworkStatus) => {
    await updateHomework(id, { status: newStatus });
  };

  const today = new Date().toISOString().split('T')[0];
  const upcomingHomework = homework
    .filter((h) => h.due_date >= today && h.status !== 'completed')
    .sort((a, b) => a.due_date.localeCompare(b.due_date));

  const overdueHomework = homework
    .filter((h) => h.due_date < today && h.status !== 'completed')
    .sort((a, b) => a.due_date.localeCompare(b.due_date));

  const completedHomework = homework
    .filter((h) => h.status === 'completed')
    .sort((a, b) => b.due_date.localeCompare(a.due_date));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Домашняя работа</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Управляйте домашними заданиями и отслеживайте дедлайны
          </p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus size={18} className="mr-2" />
          Добавить ДЗ
        </Button>
      </div>

      {/* Overdue */}
      {overdueHomework.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-3 flex items-center gap-2">
            <AlertCircle size={20} />
            Просрочено ({overdueHomework.length})
          </h2>
          <div className="space-y-3">
            {overdueHomework.map((hw) => (
              <HomeworkCard
                key={hw.id}
                homework={hw}
                onEdit={openEditModal}
                onDelete={handleDelete}
                onStatusChange={handleStatusChange}
                isOverdue
              />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming */}
      {upcomingHomework.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
            <Clock size={20} className="text-blue-500" />
            Предстоящие ({upcomingHomework.length})
          </h2>
          <div className="space-y-3">
            {upcomingHomework.map((hw) => (
              <HomeworkCard
                key={hw.id}
                homework={hw}
                onEdit={openEditModal}
                onDelete={handleDelete}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        </div>
      )}

      {/* Completed */}
      {completedHomework.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-green-600 dark:text-green-400 mb-3 flex items-center gap-2">
            <CheckCircle2 size={20} />
            Выполнено ({completedHomework.length})
          </h2>
          <div className="space-y-3">
            {completedHomework.map((hw) => (
              <HomeworkCard
                key={hw.id}
                homework={hw}
                onEdit={openEditModal}
                onDelete={handleDelete}
                onStatusChange={handleStatusChange}
                isCompleted
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {homework.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <BookOpen size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            Нет домашних заданий
          </h3>
          <p className="text-slate-500 dark:text-slate-400 mb-4">
            Добавьте первое домашнее задание, чтобы начать отслеживание
          </p>
          <Button onClick={openCreateModal}>
            <Plus size={18} className="mr-2" />
            Добавить ДЗ
          </Button>
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingHomework ? 'Редактировать ДЗ' : 'Новое домашнее задание'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Предмет <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Математика, Физика, Русский язык..."
              className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Что задано <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Описание задания..."
              rows={3}
              className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Срок выполнения <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Приоритет
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(Object.keys(PRIORITY_CONFIG) as HomeworkPriority[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={cn(
                    'px-3 py-2 rounded-xl text-sm font-medium transition-all',
                    priority === p
                      ? PRIORITY_CONFIG[p].color + ' ring-2 ring-offset-2 ring-blue-500'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                  )}
                >
                  {PRIORITY_CONFIG[p].icon} {PRIORITY_CONFIG[p].label}
                </button>
              ))}
            </div>
          </div>

          {editingHomework && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Статус
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(STATUS_CONFIG) as HomeworkStatus[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    className={cn(
                      'px-3 py-2 rounded-xl text-sm font-medium transition-all',
                      status === s
                        ? STATUS_CONFIG[s].color + ' ring-2 ring-offset-2 ring-blue-500'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                    )}
                  >
                    {STATUS_CONFIG[s].label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Заметки
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Дополнительная информация, ссылки, подсказки..."
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
              disabled={!subject.trim() || !description.trim() || !dueDate}
              className="flex-1"
            >
              {editingHomework ? 'Сохранить' : 'Создать'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

interface HomeworkCardProps {
  homework: Homework;
  onEdit: (hw: Homework) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: HomeworkStatus) => void;
  isOverdue?: boolean;
  isCompleted?: boolean;
}

function HomeworkCard({ homework: hw, onEdit, onDelete, onStatusChange, isOverdue, isCompleted }: HomeworkCardProps) {
  const daysLeft = Math.ceil((new Date(hw.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        'p-4 rounded-2xl border transition-all hover:shadow-md',
        isOverdue
          ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
          : isCompleted
          ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800 opacity-75'
          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{PRIORITY_CONFIG[hw.priority].icon}</span>
            <h3 className="font-semibold text-slate-900 dark:text-white truncate">{hw.subject}</h3>
            <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', PRIORITY_CONFIG[hw.priority].color)}>
              {PRIORITY_CONFIG[hw.priority].label}
            </span>
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2 line-clamp-2">
            {hw.description}
          </p>

          {hw.notes && (
            <p className="text-xs text-slate-500 dark:text-slate-500 mb-2 italic">
              💡 {hw.notes}
            </p>
          )}

          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <Calendar size={14} />
              {format(new Date(hw.due_date + 'T00:00:00'), 'd MMMM', { locale: ru })}
            </span>
            {!isCompleted && (
              <span className={cn('font-medium', isOverdue ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400')}>
                {isOverdue ? `Просрочено на ${Math.abs(daysLeft)} дн.` : daysLeft === 0 ? 'Сегодня!' : daysLeft === 1 ? 'Завтра' : `Осталось ${daysLeft} дн.`}
              </span>
            )}
            <span className={cn('px-2 py-0.5 rounded-full', STATUS_CONFIG[hw.status].color)}>
              {STATUS_CONFIG[hw.status].label}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          {!isCompleted && (
            <button
              onClick={() => onStatusChange(hw.id, 'completed')}
              className="p-2 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400 transition-colors"
              title="Отметить как выполненное"
            >
              <CheckCircle2 size={18} />
            </button>
          )}
          <button
            onClick={() => onEdit(hw)}
            className="p-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 transition-colors"
            title="Редактировать"
          >
            <Edit2 size={18} />
          </button>
          <button
            onClick={() => onDelete(hw.id)}
            className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors"
            title="Удалить"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
