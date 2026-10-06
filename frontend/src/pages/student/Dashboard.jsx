import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import attendanceApi from '../../api/attendanceApi';
import notificationApi from '../../api/notificationApi';
import {
  GraduationCap,
  ShieldCheck,
  CheckCircle2,
  CalendarCheck,
  Layers,
  Clock,
  Loader2,
  TrendingUp,
  AlertTriangle,
  Bell,
  BookOpen,
  ArrowRight,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [sumRes, notifRes] = await Promise.all([
          attendanceApi.getStudentSummary(),
          notificationApi.getMyNotifications({ limit: 1 }),
        ]);

        if (sumRes.success) setSummary(sumRes.data);
        if (notifRes.success) setUnreadNotifsCount(notifRes.data?.unreadCount || 0);
      } catch (err) {
        console.error('Failed to load student attendance summary:', err);
        setError(err.message || 'Failed to load attendance metrics');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const overall = summary?.overall;
  const student = summary?.student;
  const subjects = summary?.subjects || [];

  const getTierColor = (status) => {
    switch (status) {
      case 'EXCELLENT':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'SAFE':
        return 'text-teal-400 bg-teal-500/10 border-teal-500/20';
      case 'CAUTION':
        return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      case 'WARNING':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'CRITICAL':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      default:
        return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-slate-800">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold mb-3 border border-emerald-500/30">
              <GraduationCap className="w-4 h-4 text-emerald-400" />
              <span>Student Attendance Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-1">
              Welcome, {student?.name || user?.name || 'Student'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              {student?.registerNumber} • {student?.department} ({student?.class} - {student?.section})
            </p>
          </div>

          {/* Quick Notification Pill */}
          <Link
            to="/student/notifications"
            className="inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-xs font-semibold text-slate-200 border border-slate-700 transition-all self-start sm:self-auto"
          >
            <Bell className="w-4 h-4 text-amber-400" />
            <span>Alerts</span>
            {unreadNotifsCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px]">
                {unreadNotifsCount} new
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Overall Attendance */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Overall Attendance</span>
            <CalendarCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-3xl font-extrabold text-white">
              {isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
              ) : (
                `${overall?.overallPercentage ?? 100}%`
              )}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${getTierColor(
                  overall?.status
                )}`}
              >
                {overall?.status || 'SAFE'}
              </span>
              <span className="text-xs text-slate-500">
                ({overall?.totalAttended || 0}/{overall?.totalConducted || 0} classes)
              </span>
            </div>
          </div>
        </div>

        {/* Total Subjects */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Total Courses</span>
            <BookOpen className="w-4 h-4 text-sky-400" />
          </div>
          <div>
            <div className="text-3xl font-extrabold text-white">
              {isLoading ? <Loader2 className="w-6 h-6 animate-spin text-slate-500" /> : overall?.totalSubjects ?? 0}
            </div>
            <p className="text-xs text-slate-500 mt-2">Active Semester Curriculum</p>
          </div>
        </div>

        {/* Safe Subjects */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Safe Subjects</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-3xl font-extrabold text-emerald-400">
              {isLoading ? <Loader2 className="w-6 h-6 animate-spin text-slate-500" /> : overall?.safeSubjectsCount ?? 0}
            </div>
            <p className="text-xs text-slate-500 mt-2">&ge; 75% Attendance</p>
          </div>
        </div>

        {/* Shortage Subjects */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Shortage Subjects</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div>
            <div className="text-3xl font-extrabold text-rose-400">
              {isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
              ) : (
                overall?.shortageSubjectsCount ?? 0
              )}
            </div>
            <p className="text-xs text-slate-500 mt-2">&lt; 75% Attendance Required</p>
          </div>
        </div>
      </div>

      {/* Recovery Prediction Callout (If any shortage) */}
      {overall?.isShortage && (
        <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-start gap-4 shadow-lg">
          <ShieldAlert className="w-6 h-6 flex-shrink-0 mt-0.5 text-amber-400" />
          <div className="space-y-1">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              Overall Attendance Recovery Required
            </h3>
            <p className="text-xs leading-relaxed text-slate-300">
              Your overall attendance is currently at <strong className="text-amber-400">{overall.overallPercentage}%</strong>.
              You must attend the next <strong className="text-emerald-400">+{overall.classesToRecover} classes continuously</strong> to bring your overall attendance to the mandatory 75% threshold.
            </p>
          </div>
        </div>
      )}

      {/* Subject-Wise Attendance Cards */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-400" /> Subject Attendance Summary
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Live status, conducted counts, and consecutive classes required for shortage recovery.
            </p>
          </div>
          <Link
            to="/student/attendance"
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 underline"
          >
            Detailed Breakdown
          </Link>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-slate-400 mt-3">Loading subject calculations...</p>
          </div>
        ) : subjects.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-xl">
            <p className="text-white font-semibold text-sm">No course mappings found</p>
            <p className="text-xs text-slate-400 mt-1">
              Your class cohort has not been assigned subjects for this academic term yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subjects.map((sub) => {
              const tierClass = getTierColor(sub.status);

              return (
                <div
                  key={sub.subjectId}
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
                    sub.isShortage
                      ? 'bg-rose-500/5 border-rose-500/20'
                      : 'bg-slate-850/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold text-white text-base leading-snug">
                        {sub.subjectName}
                      </div>
                      <div className="text-xs font-mono text-emerald-400 font-semibold mt-0.5">
                        {sub.subjectCode} • {sub.credits} Credits
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        Instructor: {sub.facultyName}
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div
                        className={`text-2xl font-black ${
                          sub.isShortage ? 'text-rose-400' : 'text-white'
                        }`}
                      >
                        {sub.percentage}%
                      </div>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold border ${tierClass}`}>
                        {sub.status}
                      </span>
                    </div>
                  </div>

                  {/* Attendance breakdown bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Attended: <strong className="text-white">{sub.attended}</strong></span>
                      <span>Conducted: <strong className="text-white">{sub.conducted}</strong></span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          sub.isShortage ? 'bg-rose-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, sub.percentage)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Recovery or Safe prediction */}
                  <div className="pt-3 border-t border-slate-800/80 text-xs">
                    {sub.isShortage ? (
                      <div className="flex items-center gap-2 text-rose-300 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
                        <TrendingUp className="w-4 h-4 text-rose-400 flex-shrink-0" />
                        <span>
                          Attend next <strong className="text-white">+{sub.classesToRecover} classes continuously</strong> to reach 75%.
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-teal-300 bg-teal-500/10 p-2.5 rounded-xl border border-teal-500/20">
                        <Sparkles className="w-4 h-4 text-teal-400 flex-shrink-0" />
                        <span>
                          You can safely miss <strong className="text-white">{sub.bunkBuffer} upcoming class(es)</strong> and stay &ge; 75%.
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
