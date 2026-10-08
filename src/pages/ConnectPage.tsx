import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Database, CheckCircle2, XCircle, Loader2, ArrowLeft, Trash2, ExternalLink } from 'lucide-react';
import {
  saveConnectionSettings,
  clearConnectionSettings,
  getConnectionSettings,
  testConnection,
  isSupabaseConfigured,
} from '../lib/supabase';
import { Button } from '../components/ui/Button';

export function ConnectPage() {
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const settings = getConnectionSettings();
    if (settings.url && settings.url !== 'https://placeholder.supabase.co') {
      setUrl(settings.url);
    }
    if (settings.anonKey && settings.anonKey !== 'placeholder-key') {
      setAnonKey(settings.anonKey);
    }
    setIsConnected(isSupabaseConfigured());
  }, []);

  const handleTest = async () => {
    if (!url || !anonKey) {
      setTestResult({ success: false, message: 'Заполните оба поля' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    const result = await testConnection(url, anonKey);

    if (result.success) {
      setTestResult({
        success: true,
        message: result.error || 'Подключение успешно!',
      });
    } else {
      setTestResult({
        success: false,
        message: result.error || 'Ошибка подключения',
      });
    }

    setIsTesting(false);
  };

  const handleSave = () => {
    if (!url || !anonKey) return;
    saveConnectionSettings(url, anonKey);
    setIsConnected(true);
    setTestResult({ success: true, message: 'Настройки сохранены! Перенаправление...' });
    setTimeout(() => navigate('/'), 1500);
  };

  const handleClear = () => {
    if (confirm('Вы уверены? Все данные будут удалены из браузера.')) {
      clearConnectionSettings();
      setUrl('');
      setAnonKey('');
      setIsConnected(false);
      setTestResult(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors"
          >
            <ArrowLeft size={24} className="text-slate-600 dark:text-slate-400" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              Подключение к Supabase
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Настройте подключение к вашей базе данных
            </p>
          </div>
        </div>

        {/* Status Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`p-6 rounded-2xl mb-6 ${
            isConnected
              ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800'
              : 'bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-200 dark:border-orange-800'
          }`}
        >
          <div className="flex items-center gap-3">
            {isConnected ? (
              <CheckCircle2 size={32} className="text-green-600 dark:text-green-400" />
            ) : (
              <XCircle size={32} className="text-orange-600 dark:text-orange-400" />
            )}
            <div>
              <h3 className={`font-semibold ${isConnected ? 'text-green-900 dark:text-green-100' : 'text-orange-900 dark:text-orange-100'}`}>
                {isConnected ? 'Подключено' : 'Не подключено'}
              </h3>
              <p className={`text-sm ${isConnected ? 'text-green-700 dark:text-green-300' : 'text-orange-700 dark:text-orange-300'}`}>
                {isConnected ? 'Все данные синхронизируются с Supabase' : 'Введите URL и ключ для подключения'}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Form */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 space-y-6">
          {/* URL Field */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Project URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://your-project.supabase.co"
              className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Найдите в Supabase Dashboard → Settings → API → Project URL
            </p>
          </div>

          {/* Anon Key Field */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Anon Key
            </label>
            <textarea
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono text-sm"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Найдите в Supabase Dashboard → Settings → API → anon public key
            </p>
          </div>

          {/* Test Result */}
          {testResult && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-xl ${
                testResult.success
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
              }`}
            >
              <div className="flex items-start gap-3">
                {testResult.success ? (
                  <CheckCircle2 size={20} className="text-green-600 dark:text-green-400 mt-0.5" />
                ) : (
                  <XCircle size={20} className="text-red-600 dark:text-red-400 mt-0.5" />
                )}
                <p className={`text-sm ${testResult.success ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
                  {testResult.message}
                </p>
              </div>
            </motion.div>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleTest}
              disabled={isTesting || !url || !anonKey}
              className="flex-1"
              variant="secondary"
            >
              {isTesting ? (
                <>
                  <Loader2 size={18} className="animate-spin mr-2" />
                  Проверка...
                </>
              ) : (
                'Тест подключения'
              )}
            </Button>
            <Button
              onClick={handleSave}
              disabled={!url || !anonKey}
              className="flex-1"
            >
              Сохранить и подключиться
            </Button>
          </div>

          {/* Clear Button */}
          {isConnected && (
            <Button
              onClick={handleClear}
              variant="ghost"
              className="w-full text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <Trash2 size={16} className="mr-2" />
              Очистить настройки подключения
            </Button>
          )}
        </div>

        {/* Instructions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-6 bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-800"
        >
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
            <Database size={20} />
            Как получить URL и Key
          </h3>
          <ol className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
            <li className="flex gap-2">
              <span className="font-bold">1.</span>
              <span>Откройте <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">Supabase Dashboard <ExternalLink size={12} className="inline" /></a></span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold">2.</span>
              <span>Выберите ваш проект</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold">3.</span>
              <span>Перейдите в <strong>Settings</strong> → <strong>API</strong></span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold">4.</span>
              <span>Скопируйте <strong>Project URL</strong> и <strong>anon public key</strong></span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold">5.</span>
              <span>Вставьте в поля выше и нажмите "Тест подключения"</span>
            </li>
          </ol>
        </motion.div>
      </motion.div>
    </div>
  );
}
