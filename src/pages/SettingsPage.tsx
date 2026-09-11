import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Moon, Sun, User, Save, AlertCircle, Database } from 'lucide-react';
import { useThemeStore } from '../store/themeStore';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/Button';
import { cn } from '../lib/utils';

export function SettingsPage() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useThemeStore();
  const { user, updateProfile } = useAuthStore();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [groupName, setGroupName] = useState(user?.group_name || '');
  const [threshold, setThreshold] = useState(user?.admission_threshold || 75);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!fullName.trim()) {
      setError('Введите имя');
      return;
    }
    if (threshold < 50 || threshold > 100) {
      setError('Порог допуска: от 50% до 100%');
      return;
    }
    setError('');
    setIsSaving(true);
    try {
      await updateProfile({
        full_name: fullName.trim(),
        group_name: groupName.trim(),
        admission_threshold: threshold,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError((err as Error).message);
    }
    setIsSaving(false);
  };

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Настройки</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Профиль и параметры приложения</p>
      </div>

      {/* Theme toggle */}
      <motion.div
        className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {theme === 'light' ? <Sun size={20} className="text-yellow-500" /> : <Moon size={20} className="text-blue-400" />}
            <div>
              <p className="font-medium text-slate-900 dark:text-white">Тема оформления</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {theme === 'light' ? 'Светлая' : 'Тёмная'}
              </p>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className={cn(
              'relative w-14 h-8 rounded-full transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
              theme === 'dark' ? 'bg-blue-600' : 'bg-slate-300'
            )}
            role="switch"
            aria-checked={theme === 'dark'}
            aria-label="Переключить тему"
          >
            <motion.div
              className="absolute top-1 w-6 h-6 rounded-full bg-white shadow-md"
              animate={{ x: theme === 'dark' ? 28 : 4 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </button>
        </div>
      </motion.div>

      {/* Profile */}
      <motion.div
        className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-2 mb-2">
          <User size={18} className="text-blue-500" />
          <h3 className="font-semibold text-slate-900 dark:text-white">Профиль</h3>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            ФИО
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            placeholder="Иванов Иван Иванович"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Email
          </label>
          <input
            type="email"
            value={user?.email || ''}
            disabled
            className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Группа
          </label>
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            placeholder="ИС-21"
          />
        </div>
      </motion.div>

      {/* Threshold */}
      <motion.div
        className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h3 className="font-semibold text-slate-900 dark:text-white">Порог допуска</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Минимальный процент посещаемости для допуска к занятиям
        </p>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={50}
            max={100}
            value={threshold}
            onChange={(e) => setThreshold(parseInt(e.target.value))}
            className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer accent-blue-500"
          />
          <span className="text-lg font-bold text-blue-600 dark:text-blue-400 w-12 text-right">
            {threshold}%
          </span>
        </div>
      </motion.div>

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 p-3 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
        >
          <AlertCircle size={16} className="text-red-500" />
          <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
        </motion.div>
      )}

      {/* Save button */}
      <Button
        variant="primary"
        size="lg"
        onClick={handleSave}
        isLoading={isSaving}
        className="w-full"
      >
        <Save size={16} className="mr-2" />
        {saved ? 'Сохранено ✓' : 'Сохранить изменения'}
      </Button>

      {/* Supabase Connection */}
      <motion.div
        className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Database size={20} className="text-green-500" />
            <div>
              <p className="font-medium text-slate-900 dark:text-white">Подключение к Supabase</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Изменить URL и ключ</p>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={() => navigate('/connect')}>
            Настроить
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
