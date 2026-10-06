import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Activity, Server, LogIn, LayoutDashboard, LogOut, ShieldCheck } from 'lucide-react';

export default function Header({ backendHealth, isChecking }) {
  const { user, isAuthenticated, logout, getDashboardPath } = useAuth();
  const navigate = useNavigate();
  const isHealthy = backendHealth && backendHealth.status === 'healthy';

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-teal-500/20 group-hover:scale-105 transition-transform">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base font-bold text-slate-900 tracking-tight block">
                Smart Attendance
              </span>
              <span className="text-xs text-slate-500 font-medium block">
                Monitoring & Notification System
              </span>
            </div>
          </Link>

          {/* Quick Nav & System Status */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Backend Health Status Badge */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
              <Server className="w-3.5 h-3.5 text-slate-400" />
              <span>API:</span>
              {isChecking ? (
                <span className="inline-flex items-center gap-1 text-slate-500">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                  Checking...
                </span>
              ) : isHealthy ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-600 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Online (v{backendHealth.version || '1.0.0'})
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-rose-600 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  Degraded / Offline
                </span>
              )}
            </div>

            {/* Phase Badge */}
            <div className="hidden sm:flex items-center">
              <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-teal-50 text-teal-700 border border-teal-200">
                Phase 2 Active
              </span>
            </div>

            {/* Auth Actions */}
            {isAuthenticated && user ? (
              <div className="flex items-center gap-2">
                <Link
                  to={getDashboardPath(user.role)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-sm transition-all"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>Dashboard</span>
                  <span className="uppercase text-[10px] bg-teal-700 px-1.5 py-0.2 rounded font-mono">
                    {user.role}
                  </span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-colors"
                  title="Sign out"
                  aria-label="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-sm shadow-teal-600/20 transition-all"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Portal Sign In</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
