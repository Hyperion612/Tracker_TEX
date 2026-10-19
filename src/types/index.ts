export type AttendanceStatus = 'present' | 'late' | 'absent' | null;

export type AbsenceReason =
  | 'illness_certificate'
  | 'personal'
  | 'family'
  | 'valid_reason'
  | 'skip'
  | 'academic_event'
  | 'other';

export interface AttendanceRecord {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  absence_reason?: AbsenceReason | null;
  late_minutes?: number | null;
  note?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  group_name: string;
  admission_threshold: number; // percentage
  avatar_url?: string;
  created_at: string;
}

export interface AbsenceReasonItem {
  id: AbsenceReason;
  label: string;
  is_excused: boolean;
}

export interface AttendanceStats {
  totalDays: number;
  presentDays: number;
  lateDays: number;
  absentDays: number;
  unmarkedDays: number;
  attendanceRate: number;
  currentStreak: number;
  longestStreak: number;
  daysUntilExpulsion: number | null;
  reasonsBreakdown: { reason: string; count: number }[];
}

export type CalendarView = 'month' | 'week';

export interface UndoAction {
  id: string;
  previousRecord: AttendanceRecord | null;
  timeoutId: ReturnType<typeof setTimeout>;
}

export type HomeworkPriority = 'low' | 'normal' | 'high' | 'urgent';
export type HomeworkStatus = 'pending' | 'in_progress' | 'completed';

export interface Homework {
  id: string;
  user_id: string;
  subject: string;
  description: string;
  due_date: string; // YYYY-MM-DD
  priority: HomeworkPriority;
  status: HomeworkStatus;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export type DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7; // 1=Пн, 7=Вс
export type WeekType = 'every' | 'odd' | 'even';

export interface ScheduleItem {
  id: string;
  user_id: string;
  day_of_week: DayOfWeek;
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  subject: string;
  teacher?: string | null;
  room?: string | null;
  notes?: string | null;
  week_type: WeekType;
  created_at: string;
  updated_at: string;
}
