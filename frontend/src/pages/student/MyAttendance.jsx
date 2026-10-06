import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  CalendarCheck,
  TrendingUp,
  ShieldAlert,
  Sparkles,
  Users,
  Award,
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import attendanceApi from '../../api/attendanceApi';

export default function MyAttendance() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedSubId, setExpandedSubId] = useState(null);

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await attendanceApi.getStudentSummary();
        setSummary(res.data);
      } catch (err) {
        setError(err.message || 'Failed to load subject attendance');
      } finally {
        setLoading(false);
      }
    };
    fetchAttendance();
  }, []);

  const subjects = summary?.subjects || [];
  const overall = summary?.overall;

  const getTierBadge = (status) => {
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-400 text-sm">Calculating subject attendance...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-emerald-400" /> Subject-Wise Attendance Detail
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Detailed metrics including Present, Absent, On Duty, and Medical Leave sessions per curriculum subject.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
          {error}
        </div>
      )}

      {/* Subject Cards */}
      <div className="space-y-4">
        {subjects.map((sub) => {
          const isExpanded = expandedSubId === sub.subjectId;
          const tierBadge = getTierBadge(sub.status);

          return (
            <div
              key={sub.subjectId}
              className={`rounded-2xl border transition-all overflow-hidden ${
                sub.isShortage
                  ? 'border-rose-500/30 bg-slate-900 shadow-rose-950/20 shadow-lg'
                  : 'border-slate-800 bg-slate-900 hover:border-slate-700'
              }`}
            >
              {/* Card Main Bar */}
              <div
                onClick={() => setExpandedSubId(isExpanded ? null : sub.subjectId)}
                className="p-5 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 select-none"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-white text-base">{sub.subjectName}</h2>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${tierBadge}`}>
                      {sub.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 font-mono">
                    {sub.subjectCode} • {sub.credits} Credits • {sub.subjectType} • Instructor: {sub.facultyName}
                  </div>
                </div>

                <div className="flex items-center gap-6 self-end md:self-auto">
                  <div className="text-right">
                    <div
                      className={`text-2xl font-black ${
                        sub.isShortage ? 'text-rose-400' : 'text-white'
                      }`}
                    >
                      {sub.percentage}%
                    </div>
                    <div className="text-xs text-slate-400 font-mono">
                      {sub.attended} / {sub.conducted} classes
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-800 text-slate-400">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>
              </div>

              {/* Progress Line */}
              <div className="w-full h-1.5 bg-slate-800">
                <div
                  className={`h-full ${sub.isShortage ? 'bg-rose-500' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min(100, sub.percentage)}%` }}
                ></div>
              </div>

              {/* Expanded Breakdown */}
              {isExpanded && (
                <div className="p-5 bg-slate-950/40 border-t border-slate-800/80 space-y-4 animate-fade-in">
                  {/* Detailed Counters */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                    <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-800">
                      <span className="text-[11px] text-slate-400 block">Conducted</span>
                      <span className="text-base font-bold text-white font-mono">{sub.conducted}</span>
                    </div>
                    <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-800">
                      <span className="text-[11px] text-emerald-400 block">Attended (P)</span>
                      <span className="text-base font-bold text-emerald-400 font-mono">
                        {sub.attended - (sub.onDuty || 0)}
                      </span>
                    </div>
                    <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-800">
                      <span className="text-[11px] text-rose-400 block">Absent (A)</span>
                      <span className="text-base font-bold text-rose-400 font-mono">{sub.absent}</span>
                    </div>
                    <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-800">
                      <span className="text-[11px] text-sky-400 block">On Duty (OD)</span>
                      <span className="text-base font-bold text-sky-400 font-mono">{sub.onDuty}</span>
                    </div>
                    <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-800 col-span-2 sm:col-span-1">
                      <span className="text-[11px] text-amber-400 block">Medical Leave (ML)</span>
                      <span className="text-base font-bold text-amber-400 font-mono">{sub.medicalLeave}</span>
                    </div>
                  </div>

                  {/* Smart Prediction Box */}
                  <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 flex items-start gap-3">
                    {sub.isShortage ? (
                      <>
                        <ShieldAlert className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                        <div className="space-y-1 text-xs">
                          <strong className="text-rose-400 font-bold block">
                            Attendance Recovery Required:
                          </strong>
                          <p className="text-slate-300 leading-relaxed">
                            To reach the mandatory 75% threshold, you need to attend the next{' '}
                            <strong className="text-white font-bold">+{sub.classesToRecover} classes continuously</strong> without missing any.
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 text-teal-400 flex-shrink-0 mt-0.5" />
                        <div className="space-y-1 text-xs">
                          <strong className="text-teal-400 font-bold block">
                            Safe Bunk Buffer Available:
                          </strong>
                          <p className="text-slate-300 leading-relaxed">
                            Your attendance is well above 75%. You can safely miss up to{' '}
                            <strong className="text-white font-bold">{sub.bunkBuffer} upcoming class(es)</strong> and still remain at or above 75%.
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
