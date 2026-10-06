import React from 'react';

const STATUS_CONFIGS = {
  // Attendance Tiers
  EXCELLENT: { label: 'Excellent (90%+)', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  SAFE: { label: 'Safe (80%-89%)', bg: 'bg-teal-50 text-teal-700 border-teal-200' },
  CAUTION: { label: 'Caution (75%-79%)', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
  WARNING: { label: 'Warning (65%-74%)', bg: 'bg-orange-50 text-orange-700 border-orange-200' },
  CRITICAL: { label: 'Critical (<65%)', bg: 'bg-rose-50 text-rose-700 border-rose-200' },

  // Attendance Marking Statuses
  P: { label: 'Present', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  A: { label: 'Absent', bg: 'bg-rose-100 text-rose-800 border-rose-300' },
  OD: { label: 'On Duty', bg: 'bg-blue-100 text-blue-800 border-blue-300' },
  ML: { label: 'Medical Leave', bg: 'bg-purple-100 text-purple-800 border-purple-300' },

  // Notification Levels
  INFO: { label: 'Info', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
  RECOVERY: { label: 'Recovered', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

export default function Badge({ status, customLabel, size = 'md' }) {
  const config = STATUS_CONFIGS[status] || {
    label: status || 'Unknown',
    bg: 'bg-slate-100 text-slate-700 border-slate-300',
  };

  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-semibold';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${config.bg} ${sizeClass} tracking-wide transition-all`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70"></span>
      {customLabel || config.label}
    </span>
  );
}
