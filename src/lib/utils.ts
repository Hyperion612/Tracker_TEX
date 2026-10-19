import { format, isToday, isSameMonth, isSameDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, addMonths, subMonths, addWeeks, subWeeks } from 'date-fns';
import { ru } from 'date-fns/locale';

export { format, isToday, isSameMonth, isSameDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, addMonths, subMonths, addWeeks, subWeeks };
export { ru };

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatDate(date: Date, fmt: string = 'dd.MM.yyyy'): string {
  return format(date, fmt, { locale: ru });
}

export function formatDateISO(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function getDaysInMonth(date: Date): Date[] {
  const start = startOfWeek(startOfMonth(date), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(date), { weekStartsOn: 1 });
  return eachDayOfInterval({ start, end });
}

export function getDaysInWeek(date: Date): Date[] {
  const start = startOfWeek(date, { weekStartsOn: 1 });
  const end = endOfWeek(date, { weekStartsOn: 1 });
  return eachDayOfInterval({ start, end });
}

export function getStatusColor(status: string | null): string {
  switch (status) {
    case 'present': return 'bg-blue-500';
    case 'late': return 'bg-yellow-400';
    case 'absent': return 'bg-red-500';
    default: return 'bg-gray-200 dark:bg-gray-700';
  }
}

export function getStatusBorderColor(status: string | null): string {
  switch (status) {
    case 'present': return 'border-blue-500';
    case 'late': return 'border-yellow-400';
    case 'absent': return 'border-red-500';
    default: return 'border-gray-200 dark:border-gray-700';
  }
}

export function getStatusLabel(status: string | null): string {
  switch (status) {
    case 'present': return 'Присутствовал';
    case 'late': return 'Опоздал';
    case 'absent': return 'Отсутствовал';
    default: return 'Не отмечено';
  }
}

export function getAbsenceReasonLabel(reason: string | null): string {
  const labels: Record<string, string> = {
    illness_certificate: 'Болезнь со справкой',
    personal: 'Личные',
    family: 'Семейные',
    valid_reason: 'Уважительная',
    skip: 'Прогул',
    academic_event: 'Учебное мероприятие',
    other: 'Другое',
  };
  return reason ? labels[reason] || 'Не указана' : 'Не указана';
}

export function generateId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
