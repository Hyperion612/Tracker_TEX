import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuthStore } from './store/authStore';
import { useAttendanceStore } from './store/attendanceStore';
import { useHomeworkStore } from './store/homeworkStore';
import { isSupabaseConfigured } from './lib/supabase';
import { Layout } from './components/layout/Layout';
import { LoginPage } from './pages/LoginPage';
import { CalendarPage } from './pages/CalendarPage';
import { StatsPage } from './pages/StatsPage';
import { SettingsPage } from './pages/SettingsPage';
import { ConnectPage } from './pages/ConnectPage';
import { HomeworkPage } from './pages/HomeworkPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 animate-pulse" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AttendanceLoader({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const { fetchRecords } = useAttendanceStore();
  const { fetchHomework } = useHomeworkStore();

  useEffect(() => {
    if (user) {
      fetchRecords(user.id);
      fetchHomework(user.id);
    }
  }, [user, fetchRecords, fetchHomework]);

  return <>{children}</>;
}

function App() {
  const { initialize, user } = useAuthStore();
  const [isConfigured] = useState(() => isSupabaseConfigured());

  useEffect(() => {
    if (isConfigured) {
      initialize();
    }
  }, [initialize, isConfigured]);

  return (
    <HashRouter>
      <Routes>
        {/* Страница подключения — всегда доступна */}
        <Route path="/connect" element={<ConnectPage />} />

        {/* Если Supabase не настроен — перенаправляем на подключение */}
        {!isConfigured && (
          <>
            <Route path="/login" element={<Navigate to="/connect" replace />} />
            <Route path="*" element={<Navigate to="/connect" replace />} />
          </>
        )}

        {/* Если Supabase настроен — обычный роутинг */}
        {isConfigured && (
          <>
            <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AttendanceLoader>
                    <Layout />
                  </AttendanceLoader>
                </ProtectedRoute>
              }
            >
              <Route index element={<CalendarPage />} />
              <Route path="homework" element={<HomeworkPage />} />
              <Route path="stats" element={<StatsPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
      </Routes>
    </HashRouter>
  );
}

export default App;
