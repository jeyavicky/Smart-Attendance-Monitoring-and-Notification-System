import React, { useState, useEffect } from 'react';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Sparkles,
  CheckCheck,
  Clock,
  TrendingUp,
  Inbox,
  Loader2,
} from 'lucide-react';
import notificationApi from '../../api/notificationApi';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await notificationApi.getMyNotifications({ limit: 50 });
      setNotifications(res.data?.items || []);
      setUnreadCount(res.data?.unreadCount || 0);
    } catch (err) {
      setError(err.message || 'Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await notificationApi.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id || n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'CRITICAL':
        return <ShieldAlert className="w-5 h-5 text-rose-400" />;
      case 'WARNING':
        return <AlertTriangle className="w-5 h-5 text-amber-400" />;
      case 'CAUTION':
        return <Clock className="w-5 h-5 text-yellow-400" />;
      case 'RECOVERY':
        return <Sparkles className="w-5 h-5 text-emerald-400" />;
      default:
        return <Bell className="w-5 h-5 text-sky-400" />;
    }
  };

  const getTypeStyle = (type, isRead) => {
    const baseBorder = isRead ? 'border-slate-800' : 'border-slate-700 bg-slate-850/80';
    switch (type) {
      case 'CRITICAL':
        return `border-l-4 border-l-rose-500 ${baseBorder}`;
      case 'WARNING':
        return `border-l-4 border-l-amber-500 ${baseBorder}`;
      case 'CAUTION':
        return `border-l-4 border-l-yellow-500 ${baseBorder}`;
      case 'RECOVERY':
        return `border-l-4 border-l-emerald-500 ${baseBorder}`;
      default:
        return `border-l-4 border-l-sky-500 ${baseBorder}`;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Bell className="w-6 h-6 text-amber-400" /> Notifications & Smart Alerts
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time threshold status warnings and attendance recovery recommendations.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors self-start sm:self-auto"
          >
            <CheckCheck className="w-4 h-4 text-emerald-400" /> Mark All as Read
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
          {error}
        </div>
      )}

      {/* Notifications List */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 bg-slate-900 border border-slate-800 rounded-2xl">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            <p className="text-xs text-slate-400 mt-3">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <Inbox className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white">No notifications</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              You are all caught up! When attendance warnings or status updates occur, they will appear here.
            </p>
          </div>
        ) : (
          notifications.map((n) => {
            const notifId = n._id || n.id;

            return (
              <div
                key={notifId}
                className={`p-5 rounded-2xl border transition-all ${
                  n.isRead ? 'bg-slate-900' : 'bg-slate-850 shadow-lg'
                } ${getTypeStyle(n.type, n.isRead)}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="mt-0.5 p-2 rounded-xl bg-slate-800/80 border border-slate-700/60">
                      {getTypeIcon(n.type)}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white">{n.title}</h4>
                        {!n.isRead && (
                          <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                        )}
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold">
                          {n.type}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                        {n.message}
                      </p>

                      {/* Percentage pill if applicable */}
                      {n.attendancePercentage !== null && n.attendancePercentage !== undefined && (
                        <div className="pt-2 flex items-center gap-3 text-xs">
                          <span className="text-slate-400">
                            Recorded Attendance:{' '}
                            <strong className="text-white font-mono">{n.attendancePercentage}%</strong>
                          </span>
                          {n.classesToRecover > 0 && (
                            <span className="inline-flex items-center gap-1 text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20 font-medium">
                              <TrendingUp className="w-3.5 h-3.5" /> +{n.classesToRecover} classes to recover
                            </span>
                          )}
                        </div>
                      )}

                      <div className="text-[11px] text-slate-500 pt-1">
                        {new Date(n.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {!n.isRead && (
                    <button
                      onClick={() => handleMarkAsRead(notifId)}
                      className="text-xs text-slate-400 hover:text-white transition-colors underline whitespace-nowrap"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
