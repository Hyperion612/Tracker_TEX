import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, Clock, X, Trash2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { cn, getAbsenceReasonLabel } from '../../lib/utils';
import { useAttendanceStore } from '../../store/attendanceStore';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import type { AttendanceStatus, AbsenceReason } from '../../types';

interface AttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string | null;
}

const STATUS_OPTIONS: { value: AttendanceStatus; label: string; icon: typeof Check; color: string }[] = [
  { value: 'present', label: 'Присутствовал', icon: Check, color: 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
  { value: 'late', label: 'Опоздал', icon: Clock, color: 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' },
  { value: 'absent', label: 'Отсутствовал', icon: X, color: 'border-red-500 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300' },
];

export function AttendanceModal({ isOpen, onClose, date }: AttendanceModalProps) {
  const [status, setStatus] = useState<AttendanceStatus>(null);
  const [absenceReason, setAbsenceReason] = useState<AbsenceReason | null>(null);
  const [lateMinutes, setLateMinutes] = useState<number>(0);
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { markAttendance, clearRecord, getRecordForDate, selectedDates, markRange, clearSelection } = useAttendanceStore();
  const { user } = useAuthStore();

  const isRangeMode = selectedDates.length > 1;
  const absenceReasons = supabase.getAbsenceReasons();

  // Load existing record
  useEffect(() => {
    if (date && !isRangeMode) {
      const record = getRecordForDate(date);
      if (record) {
        setStatus(record.status);
        setAbsenceReason(record.absence_reason || null);
        setLateMinutes(record.late_minutes || 0);
        setNote(record.note || '');
      } else {
        resetForm();
      }
    } else {
      resetForm();
    }
  }, [date, isRangeMode, getRecordForDate]);

  const resetForm = () => {
    setStatus(null);
    setAbsenceReason(null);
    setLateMinutes(0);
    setNote('');
    setErrors({});
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!status) {
      newErrors.status = 'Выберите статус';
    }
    if (status === 'absent' && !absenceReason) {
      newErrors.reason = 'Выберите причину отсутствия';
    }
    if (status === 'late' && (lateMinutes <= 0 || lateMinutes > 180)) {
      newErrors.minutes = 'Укажите минуты (1-180)';
    }
    if (note.length > 500) {
      newErrors.note = 'Заметка не более 500 символов';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate() || !user) return;

    if (isRangeMode) {
      await markRange(user.id, selectedDates, status, absenceReason, status === 'late' ? lateMinutes : null, note || null);
      clearSelection();
    } else if (date) {
      await markAttendance(user.id, date, status, absenceReason, status === 'late' ? lateMinutes : null, note || null);
    }
    onClose();
  };

  const handleClear = async () => {
    if (!user || !date) return;
    await clearRecord(user.id, date);
    onClose();
  };

  const formattedDate = date ? format(new Date(date + 'T00:00:00'), 'd MMMM yyyy, EEEE', { locale: ru }) : '';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isRangeMode ? `Отметка для ${selectedDates.length} дней` : formattedDate}>
      <div className="space-y-5">
        {/* Status selection */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Статус
          </label>
          <div className="grid grid-cols-3 gap-2">
            {STATUS_OPTIONS.map((option) => {
              const Icon = option.icon;
              return (
                <motion.button
                  key={option.value}
                  onClick={() => { setStatus(option.value || null); setAbsenceReason(null); }}
                  className={cn(
                    'flex flex-col items-center gap-1 p-3 rounded-2xl border-2 transition-all duration-200',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                    status === option.value
                      ? option.color
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  )}
                  whileTap={{ scale: 0.95 }}
                >
                  <Icon size={20} />
                  <span className="text-xs font-medium">{option.label}</span>
                </motion.button>
              );
            })}
          </div>
          {errors.status && (
            <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
              <AlertCircle size={12} /> {errors.status}
            </p>
          )}
        </div>

        {/* Absence reason */}
        {status === 'absent' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.2 }}
          >
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Причина отсутствия <span className="text-red-500">*</span>
            </label>
            <select
              value={absenceReason || ''}
              onChange={(e) => setAbsenceReason((e.target.value || null) as AbsenceReason | null)}
              className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            >
              <option value="">Выберите причину...</option>
              {absenceReasons.map((reason) => (
                <option key={reason.id} value={reason.id}>
                  {reason.label}
                </option>
              ))}
            </select>
            {errors.reason && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle size={12} /> {errors.reason}
              </p>
            )}
          </motion.div>
        )}

        {/* Late minutes */}
        {status === 'late' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.2 }}
          >
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Минут опоздания
            </label>
            <input
              type="number"
              min={1}
              max={180}
              value={lateMinutes || ''}
              onChange={(e) => setLateMinutes(parseInt(e.target.value) || 0)}
              placeholder="Введите минуты"
              className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
            {errors.minutes && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle size={12} /> {errors.minutes}
              </p>
            )}
          </motion.div>
        )}

        {/* Note */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Заметка
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Дополнительная информация..."
            rows={3}
            maxLength={500}
            className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
          />
          <div className="flex justify-between mt-1">
            {errors.note && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle size={12} /> {errors.note}
              </p>
            )}
            <span className="text-xs text-slate-400 ml-auto">{note.length}/500</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          {!isRangeMode && (
            <Button
              variant="ghost"
              size="md"
              onClick={handleClear}
              className="mr-auto"
            >
              <Trash2 size={16} className="mr-1" />
              Очистить
            </Button>
          )}
          <Button variant="secondary" size="md" onClick={onClose}>
            Отмена
          </Button>
          <Button variant="primary" size="md" onClick={handleSave}>
            <Check size={16} className="mr-1" />
            Сохранить
          </Button>
        </div>
      </div>
    </Modal>
  );
}
