import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Sidebar from './Sidebar';
import FinancialAssistant from '../FinancialAssistant';
import { getNotifications } from '../../services/notificationService';
import {
  Bars3Icon,
  CurrencyRupeeIcon,
  BellIcon,
} from '@heroicons/react/24/outline';

const MainLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        console.log('Fetching notifications for indicator...');
        const res = await getNotifications();
        console.log('Notifications response:', res);
        const unread = res.data.filter(n => !n.read).length;
        console.log('Unread count:', unread);
        setUnreadCount(unread);
      } catch (error) {
        console.error('Failed to fetch notifications for indicator:', error);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);

    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-cream"> {/* Silver/Tech Gray background */}

      {/* Top Header (Aramco Style) */}
      <header className="sticky top-0 z-40 bg-gradient-to-r from-primary-900 to-primary-800 shadow-xl border-b border-primary-800">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Left: Logo Area */}
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm border border-white/20">
                <CurrencyRupeeIcon className="h-5 w-5 text-accent-400" />
              </div>
              <span className="text-xl font-display font-bold text-white tracking-tight">
                Aramco <span className="text-accent-400">Finance</span>
              </span>
            </div>

            {/* Right: Notifications & Menu Trigger */}
            <div className="flex items-center gap-3">
              {/* Notification Bell Button */}
              <Link
                to="/notifications"
                className="group relative p-2 text-primary-100 hover:bg-white/10 hover:text-white rounded-xl transition-all duration-300 flex items-center justify-center"
                title="Notifications"
              >
                <span className="sr-only">View notifications</span>
                <BellIcon className="h-6 w-6 transition-transform duration-300 group-hover:rotate-12" />
                
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] px-1.5 items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-[10px] font-black text-white ring-2 ring-[#00301e] shadow-lg animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </Link>

              {/* Menu Trigger */}
              <button
                type="button"
                className="group relative inline-flex items-center justify-center rounded-xl p-2 text-primary-100 hover:bg-white/10 hover:text-white focus:outline-none transition-all duration-300"
                onClick={() => setMobileMenuOpen(true)}
              >
                <span className="sr-only">Open menu</span>
                <div className="flex flex-col gap-1.5 items-end">
                  <span className="block h-0.5 w-6 bg-current transition-all duration-300 group-hover:w-7"></span>
                  <span className="block h-0.5 w-4 bg-accent-400 transition-all duration-300 group-hover:w-7"></span>
                  <span className="block h-0.5 w-6 bg-current transition-all duration-300 group-hover:w-7"></span>
                </div>
                <span className="ml-3 text-sm font-extrabold tracking-widest uppercase hidden sm:block">Menu</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar Component (Drawer) */}
      <Sidebar
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        user={user}
        handleLogout={handleLogout}
        unreadCount={unreadCount}
      />

      {/* Main content - Full width now */}
      <div className="flex flex-col flex-1 min-h-screen transition-all duration-300">
        {/* Removed sticky mobile header as we have the global header now */}

        <main className="flex-1 py-8">
          <div className="px-4 sm:px-8 lg:px-12 max-w-[1920px] mx-auto">
            {/* Content Container */}
            <div className="w-full">
              {children}
            </div>
          </div>
        </main>
      </div>

      <FinancialAssistant />
    </div>
  );
};

export default MainLayout;