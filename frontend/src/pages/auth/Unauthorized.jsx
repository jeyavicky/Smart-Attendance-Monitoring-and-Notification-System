import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, ArrowLeft, LayoutDashboard, LogIn } from 'lucide-react';

export default function Unauthorized() {
  const { user, isAuthenticated, getDashboardPath } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const targetDashboard = isAuthenticated && user ? getDashboardPath(user.role) : '/login';

  return (
    <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200/90 shadow-xl p-6 sm:p-8 text-center">
        {/* Shield Icon */}
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mx-auto mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-rose-100 text-rose-700">
          HTTP 403 &bull; FORBIDDEN
        </span>

        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-3 mb-2">
          Access Denied
        </h1>

        <p className="text-sm text-slate-500 leading-relaxed mb-6">
          You do not have permission to access this page.
          {isAuthenticated && user && (
            <span className="block mt-2 font-medium text-slate-700">
              Current account role:{' '}
              <span className="uppercase text-teal-700 font-bold">{user.role}</span>
            </span>
          )}
        </p>

        <div className="space-y-3">
          {isAuthenticated ? (
            <Link
              to={targetDashboard}
              className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 transition-all shadow-md shadow-teal-600/20 flex items-center justify-center gap-2"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Return to My Authorized Dashboard</span>
            </Link>
          ) : (
            <Link
              to="/login"
              className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 transition-all shadow-md shadow-teal-600/20 flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In with Authorized Account</span>
            </Link>
          )}

          <button
            onClick={() => navigate(-1)}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Go Back</span>
          </button>
        </div>
      </div>
    </div>
  );
}
