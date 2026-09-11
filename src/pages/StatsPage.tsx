import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp, Calendar, Clock, XCircle, Target, Flame } from 'lucide-react';
import { useAttendanceStore } from '../store/attendanceStore';
import { useAuthStore } from '../store/authStore';
import { ABSENCE_REASONS } from '../lib/supabase';
import { getAbsenceReasonLabel, cn } from '../lib/utils';
import type { AttendanceStats, AttendanceRecord } from '../types';

function useStats(): AttendanceStats {
  const { records } = useAttendanceStore();
  const { user } = useAuthStore();

  return useMemo(() => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const today = new Date();

    // Count working days (Mon-Fri) from start of year to today
    let totalDays = 0;
    const current = new Date(startOfYear);
    while (current <= today) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) totalDays++;
      current.setDate(current.getDate() + 1);
    }

    const presentDays = records.filter(r => r.status === 'present').length;
    const lateDays = records.filter(r => r.status === 'late').length;
    const absentDays = records.filter(r => r.status === 'absent').length;
    const markedDays = presentDays + lateDays + absentDays;
    const unmarkedDays = Math.max(0, totalDays - markedDays);

    const attendanceRate = totalDays > 0 ? Math.round(((presentDays + lateDays) / totalDays) * 100) : 0;

    // Calculate streaks
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    const sortedRecords = [...records]
      .filter(r => r.status === 'present' || r.status === 'late')
      .sort((a, b) => a.date.localeCompare(b.date));

    for (let i = 0; i < sortedRecords.length; i++) {
      if (i === 0) {
        tempStreak = 1;
      } else {
        const prevDate = new Date(sortedRecords[i - 1].date);
        const currDate = new Date(sortedRecords[i].date);
        const diffDays = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays <= 2) {
          tempStreak++;
        } else {
          tempStreak = 1;
        }
      }
      longestStreak = Math.max(longestStreak, tempStreak);
    }

    // Current streak (from today backwards)
    const todayStr = today.toISOString().split('T')[0];
    let checkDate = new Date(today);
    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];
      const record = records.find(r => r.date === dateStr);
      if (record && (record.status === 'present' || record.status === 'late')) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    // Reasons breakdown
    const reasonsMap: Record<string, number> = {};
    records.filter((r: AttendanceRecord) => r.status === 'absent' && r.absence_reason).forEach((r: AttendanceRecord) => {
      const label = getAbsenceReasonLabel(r.absence_reason || null);
      reasonsMap[label] = (reasonsMap[label] || 0) + 1;
    });
    const reasonsBreakdown = Object.entries(reasonsMap).map(([reason, count]) => ({ reason, count }));

    // Days until expulsion
    const threshold = user?.admission_threshold || 75;
    let daysUntilExpulsion: number | null = null;
    if (attendanceRate < threshold) {
      const needed = Math.ceil((threshold * totalDays / 100) - (presentDays + lateDays));
      const remainingDays = totalDays - markedDays;
      if (needed > remainingDays) {
        daysUntilExpulsion = 0;
      } else {
        daysUntilExpulsion = remainingDays;
      }
    }

    return {
      totalDays,
      presentDays,
      lateDays,
      absentDays,
      unmarkedDays,
      attendanceRate,
      currentStreak,
      longestStreak,
      daysUntilExpulsion,
      reasonsBreakdown,
    };
  }, [records, user]);
}

const COLORS = ['#3B82F6', '#FBBF24', '#EF4444', '#9CA3AF'];

export function StatsPage() {
  const stats = useStats();
  const { records } = useAttendanceStore();
  const { user } = useAuthStore();

  const pieData = [
    { name: 'Присутствовал', value: stats.presentDays },
    { name: 'Опоздал', value: stats.lateDays },
    { name: 'Отсутствовал', value: stats.absentDays },
    { name: 'Не отмечено', value: stats.unmarkedDays },
  ].filter(d => d.value > 0);

  const barData = stats.reasonsBreakdown;

  const threshold = user?.admission_threshold || 75;

  // Monthly data for bar chart
  const monthlyData = useMemo(() => {
    const months: Record<string, { month: string; present: number; absent: number; late: number }> = {};
    records.forEach(r => {
      const month = r.date.substring(0, 7);
      if (!months[month]) months[month] = { month, present: 0, absent: 0, late: 0 };
      if (r.status === 'present') months[month].present++;
      else if (r.status === 'absent') months[month].absent++;
      else if (r.status === 'late') months[month].late++;
    });
    return Object.values(months).sort((a, b) => a.month.localeCompare(b.month)).slice(-6);
  }, [records]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Статистика</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Ваша посещаемость за учебный год</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <StatCard
          icon={<Target size={20} />}
          label="Посещаемость"
          value={`${stats.attendanceRate}%`}
          color="blue"
          threshold={threshold}
        />
        <StatCard
          icon={<Calendar size={20} />}
          label="Присутствий"
          value={String(stats.presentDays)}
          color="green"
        />
        <StatCard
          icon={<Clock size={20} />}
          label="Опозданий"
          value={String(stats.lateDays)}
          color="yellow"
        />
        <StatCard
          icon={<XCircle size={20} />}
          label="Пропусков"
          value={String(stats.absentDays)}
          color="red"
        />
      </div>

      {/* Streak cards */}
      <div className="grid grid-cols-2 gap-3 md:gap-4">
        <motion.div
          className="p-4 rounded-3xl bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border border-orange-200 dark:border-orange-800"
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Flame size={18} className="text-orange-500" />
            <span className="text-xs font-medium text-orange-600 dark:text-orange-400">Текущая серия</span>
          </div>
          <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">{stats.currentStreak} дн.</p>
        </motion.div>
        <motion.div
          className="p-4 rounded-3xl bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border border-purple-200 dark:border-purple-800"
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={18} className="text-purple-500" />
            <span className="text-xs font-medium text-purple-600 dark:text-purple-400">Лучшая серия</span>
          </div>
          <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{stats.longestStreak} дн.</p>
        </motion.div>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Pie chart */}
        <motion.div
          className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Распределение</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-slate-400 text-sm">
              Нет данных для отображения
            </div>
          )}
          <div className="flex flex-wrap gap-3 mt-3 justify-center">
            {pieData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                <span className="text-xs text-slate-600 dark:text-slate-400">{entry.name}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Reasons bar chart */}
        <motion.div
          className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Причины пропусков</h3>
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="reason" tick={{ fontSize: 11 }} width={120} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  }}
                />
                <Bar dataKey="count" fill="#EF4444" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-slate-400 text-sm">
              Нет пропусков — отлично! 🎉
            </div>
          )}
        </motion.div>
      </div>

      {/* Monthly trend */}
      {monthlyData.length > 0 && (
        <motion.div
          className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Помесячная динамика</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} tickFormatter={(v) => v.substring(5)} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  borderRadius: '12px',
                  border: 'none',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                }}
              />
              <Bar dataKey="present" fill="#3B82F6" name="Присутствовал" radius={[4, 4, 0, 0]} />
              <Bar dataKey="late" fill="#FBBF24" name="Опоздал" radius={[4, 4, 0, 0]} />
              <Bar dataKey="absent" fill="#EF4444" name="Отсутствовал" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* Admission forecast */}
      <motion.div
        className={cn(
          'p-5 rounded-3xl border',
          stats.attendanceRate >= threshold
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        )}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-12 h-12 rounded-2xl flex items-center justify-center',
            stats.attendanceRate >= threshold ? 'bg-green-100 dark:bg-green-800' : 'bg-red-100 dark:bg-red-800'
          )}>
            {stats.attendanceRate >= threshold ? (
              <Target size={24} className="text-green-600 dark:text-green-400" />
            ) : (
              <XCircle size={24} className="text-red-600 dark:text-red-400" />
            )}
          </div>
          <div>
            <p className={cn(
              'font-semibold',
              stats.attendanceRate >= threshold ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
            )}>
              {stats.attendanceRate >= threshold
                ? 'Вы в пределах нормы!'
                : 'Внимание! Посещаемость ниже порога'}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Порог допуска: {threshold}% • Текущая посещаемость: {stats.attendanceRate}%
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: 'blue' | 'green' | 'yellow' | 'red';
  threshold?: number;
}

function StatCard({ icon, label, value, color, threshold }: StatCardProps) {
  const colorMap = {
    blue: 'from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400',
    green: 'from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800 text-green-600 dark:text-green-400',
    yellow: 'from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-yellow-200 dark:border-yellow-800 text-yellow-600 dark:text-yellow-400',
    red: 'from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400',
  };

  return (
    <motion.div
      className={cn('p-4 rounded-3xl bg-gradient-to-br border', colorMap[color])}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.15 }}
    >
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs font-medium opacity-80">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {threshold !== undefined && (
        <div className="mt-2 w-full bg-white/50 dark:bg-black/20 rounded-full h-1.5">
          <div
            className={cn('h-1.5 rounded-full transition-all', color === 'blue' ? 'bg-blue-500' : 'bg-green-500')}
            style={{ width: `${Math.min(100, Number(value))}%` }}
          />
        </div>
      )}
    </motion.div>
  );
}
