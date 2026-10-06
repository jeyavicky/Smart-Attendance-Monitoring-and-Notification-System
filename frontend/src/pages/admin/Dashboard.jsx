import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { adminApi } from '../../api/academicApi';
import attendanceApi from '../../api/attendanceApi';
import ChangePasswordModal from '../../components/common/ChangePasswordModal';
import {
  ShieldCheck,
  UserCheck,
  KeyRound,
  CheckCircle2,
  Clock,
  GraduationCap,
  Users,
  Building2,
  BookOpen,
  Calendar,
  Layers,
  Sparkles,
  Loader2,
  ShieldAlert,
  AlertTriangle,
  FileText,
  ArrowRight,
  TrendingDown,
} from 'lucide-react';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [summary, setSummary] = useState(null);
  const [attendanceOverview, setAttendanceOverview] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const [sumRes, attRes] = await Promise.all([
          adminApi.getDashboardSummary(),
          attendanceApi.getAdminOverview(),
        ]);

        if (sumRes.success) setSummary(sumRes.data);
        if (attRes.success) setAttendanceOverview(attRes.data);
      } catch (err) {
        console.error('Failed to load dashboard summary:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSummary();
  }, []);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-slate-800">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold mb-3 border border-emerald-500/30">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Role-Based Access: Administrator</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
            Welcome, {user?.name || 'Administrator'}
          </h1>
          <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
            Institutional Master Data Hub &amp; Attendance Audit. Live statistics verified from MongoDB.
            Current Academic Session:{' '}
            <span className="text-emerald-400 font-semibold">
              {isLoading ? 'Loading...' : summary?.currentAcademicYear || '2026-27'}
            </span>
          </p>
        </div>
      </div>

      {/* Attendance Pulse Cards (Phase 5 Requirement: Section 27) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Attendance Sessions Today */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400">Attendance Sessions Today</span>
            <div className="text-2xl font-bold text-white mt-1">
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-slate-500" /> : attendanceOverview?.todaySessionsCount ?? 0}
            </div>
            <Link to="/admin/attendance" className="text-xs text-emerald-400 hover:underline mt-1 inline-flex items-center gap-1 font-medium">
              View Register <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        {/* Students Below 75% */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400">Students Below 75%</span>
            <div className="text-2xl font-bold text-amber-400 mt-1">
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-slate-500" /> : attendanceOverview?.below75Count ?? 0}
            </div>
            <Link to="/admin/shortage" className="text-xs text-amber-400 hover:underline mt-1 inline-flex items-center gap-1 font-medium">
              View Shortage List <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* Critical Attendance Students */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400">Critical Attendance Students</span>
            <div className="text-2xl font-bold text-rose-400 mt-1">
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-slate-500" /> : attendanceOverview?.criticalCount ?? 0}
            </div>
            <span className="text-xs text-slate-500 mt-1 block">Below 65% Threshold</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Master Data Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Students</span>
            <GraduationCap className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-slate-500" /> : summary?.students ?? 0}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Enrolled records</p>
        </div>

        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Faculty</span>
            <Users className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-slate-500" /> : summary?.faculty ?? 0}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Teaching staff</p>
        </div>

        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Departments</span>
            <Building2 className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-slate-500" /> : summary?.departments ?? 0}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Academic units</p>
        </div>

        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Subjects</span>
            <BookOpen className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-slate-500" /> : summary?.subjects ?? 0}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Curriculum courses</p>
        </div>

        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Classes</span>
            <Layers className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-slate-500" /> : summary?.classes ?? 0}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Student cohorts</p>
        </div>

        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Academic Year</span>
            <Calendar className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-base font-bold text-white truncate">
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-slate-500" /> : summary?.currentAcademicYear || '2026-27'}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Active calendar</p>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to="/admin/attendance"
          className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Attendance Register</h3>
              <p className="text-xs text-slate-400">Audit session logs across faculty</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
        </Link>

        <Link
          to="/admin/shortage"
          className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Shortage Roster</h3>
              <p className="text-xs text-slate-400">Detect students requiring recovery</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
        </Link>

        <Link
          to="/admin/reports"
          className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Audit Reports</h3>
              <p className="text-xs text-slate-400">Print class & student reports</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
        </Link>
      </div>
    </div>
  );
}
