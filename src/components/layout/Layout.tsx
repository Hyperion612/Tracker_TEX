import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CalendarDays, BarChart3, Settings, LogOut, GraduationCap, BookOpen } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { cn } from '../../lib/utils';

const NAV_ITEMS = [
  { to: '/', icon: CalendarDays, label: 'Календарь' },
  { to: '/homework', icon: BookOpen, label: 'Домашняя работа' },
  { to: '/stats', icon: BarChart3, label: 'Статистика' },
  { to: '/settings', icon: Settings, label: 'Настройки' },
];

function MobileNavItem({ to, icon: Icon, label }: { to: string; icon: typeof CalendarDays; label: string }) {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <NavLink
      to={to}
      className={cn(
        'relative flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 min-w-[64px]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
        isActive
          ? 'text-blue-600 dark:text-blue-400'
          : 'text-slate-400 dark:text-slate-500'
      )}
    >
      <Icon size={20} />
      <span className="text-[10px] font-medium">{label}</span>
      {isActive && (
        <motion.div
          className="absolute -bottom-0.5 w-6 h-0.5 bg-blue-500 rounded-full"
          layoutId="nav-indicator"
        />
      )}
    </NavLink>
  );
}

export function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-md shadow-blue-500/20">
              <GraduationCap size={18} className="text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">Трекер</h1>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">посещаемости</p>
            </div>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                )}
              >
                <item.icon size={18} />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <span className="hidden sm:block text-sm text-slate-600 dark:text-slate-400">
              {user?.full_name?.split(' ')[0] || 'Студент'}
            </span>
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              aria-label="Выйти"
            >
              <LogOut size={18} className="text-slate-500 dark:text-slate-400" />
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-4 py-6 pb-24 md:pb-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Outlet />
        </motion.div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border-t border-slate-200 dark:border-slate-700">
        <div className="flex justify-around items-center h-16 px-2">
          {NAV_ITEMS.map((item) => (
            <MobileNavItem key={item.to} to={item.to} icon={item.icon} label={item.label} />
          ))}
        </div>
      </nav>
    </div>
  );
}
