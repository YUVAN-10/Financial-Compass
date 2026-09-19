import React, { useState, useEffect } from 'react';
import { getNotifications, markAsRead } from '../services/notificationService';
import { toast } from 'react-hot-toast';
import { MonthlyReportIcon, WeeklyReportIcon, DailyReportIcon, TransactionIcon } from './icons';
import { BellIcon, CheckCircleIcon, CurrencyRupeeIcon } from '@heroicons/react/24/outline';

const getNotificationIcon = (type) => {
  switch (type) {
    case 'monthly_report':
      return <MonthlyReportIcon className="h-6 w-6 text-emerald-600" />;
    case 'weekly_report':
      return <WeeklyReportIcon className="h-6 w-6 text-teal-600" />;
    case 'daily_report':
      return <DailyReportIcon className="h-6 w-6 text-blue-600" />;
    case 'new_transaction':
      return <TransactionIcon className="h-6 w-6 text-yellow-600" />;
    default:
      return <BellIcon className="h-6 w-6 text-gray-500" />;
  }
};

const getNotificationStyles = (type) => {
  switch (type) {
    case 'monthly_report':
    case 'income':
      return 'border-emerald-100 bg-emerald-50/30 hover:bg-emerald-50';
    case 'expense':
      return 'border-red-100 bg-red-50/30 hover:bg-red-50';
    default:
      return 'border-gray-100 hover:bg-gray-50';
  }
};

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();

    const interval = setInterval(() => {
      fetchNotifications();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await getNotifications();
      // Ensure we handle the data structure correctly
      setNotifications(res.data || res);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await markAsRead(id);
      setNotifications(notifications.map(n => n._id === id ? { ...n, read: true } : n));
      toast.success('Marked as read', {
        style: {
          background: '#1E293B',
          color: '#fff',
        }
      });
    } catch (error) {
      toast.error('Failed to update notification');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      if (notifications.filter(n => !n.read).length === 0) return;

      await Promise.all(notifications.filter(n => !n.read).map(n => markAsRead(n._id)));
      setNotifications(notifications.map(n => ({ ...n, read: true })));
      toast.success('All marked as read', {
        style: {
          background: '#1E293B',
          color: '#fff',
        }
      });
    } catch (error) {
      toast.error('Failed to update notifications');
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="bg-cream min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-primary-900">
              Notifications
            </h1>
            <p className="mt-1 text-primary-600">
              Stay updated with your financial activity
            </p>
          </div>
          <button
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-300 font-medium ${unreadCount > 0
              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border border-emerald-200'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
              }`}
          >
            <CheckCircleIcon className="h-5 w-5" />
            <span>Mark all as read</span>
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col justify-center items-center h-64 bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-500"></div>
            <p className="mt-4 text-gray-500 font-medium animate-pulse">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
            <div className="mx-auto h-24 w-24 bg-primary-50 rounded-full flex items-center justify-center mb-6">
              <BellIcon className="h-10 w-10 text-primary-300" />
            </div>
            <h3 className="text-xl font-bold text-primary-900 mb-2">No notifications yet</h3>
            <p className="text-gray-500">
              We'll notify you when important financial events occur.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div
                key={notification._id}
                className={`relative group overflow-hidden rounded-2xl border p-5 transition-all duration-300 ${getNotificationStyles(notification.type)
                  } ${notification.read
                    ? 'bg-gray-50/50 border-gray-100 opacity-75'
                    : 'bg-white border-gray-200 shadow-sm'
                  }`}
              >
                {!notification.read && (
                  <div className="absolute top-4 right-4 h-3 w-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)] animate-pulse"></div>
                )}

                <div className="flex items-start gap-5">
                  <div className={`flex-shrink-0 p-3 rounded-xl bg-white border border-gray-100 shadow-sm ${!notification.read ? 'ring-1 ring-emerald-500/20' : ''}`}>
                    {getNotificationIcon(notification.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h4 className={`text-lg font-bold truncate pr-8 ${notification.read ? 'text-gray-500' : 'text-primary-900'}`}>
                        {notification.title}
                      </h4>
                      <span className="text-xs text-gray-500 font-medium whitespace-nowrap mt-1">
                        {new Date(notification.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>

                    <p className={`mt-1 text-sm leading-relaxed ${notification.read ? 'text-gray-400' : 'text-gray-600'}`}>
                      {/* Replace $ with ₹ just in case the backend didn't do it */}
                      {notification.message.replace(/\$/g, '₹')}
                    </p>

                    {!notification.read && (
                      <div className="mt-4 flex justify-end">
                        <button
                          onClick={() => handleMarkAsRead(notification._id)}
                          className="text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors flex items-center gap-1 uppercase tracking-wider"
                        >
                          Mark as Read
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;