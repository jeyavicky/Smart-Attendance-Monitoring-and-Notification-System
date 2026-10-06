import React from 'react';
import { Layers, Clock, ShieldCheck } from 'lucide-react';

export default function PlaceholderPage({ title, targetPhase, description }) {
  return (
    <div className="p-6 sm:p-8 max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm text-center">
        <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-100 text-teal-600 flex items-center justify-center mx-auto mb-4">
          <Layers className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">
          {title}
        </h2>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold mb-4">
          <Clock className="w-3.5 h-3.5 text-amber-600" />
          <span>Scheduled for {targetPhase || 'Upcoming Phase'}</span>
        </div>
        <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
          {description ||
            'This module is scoped for a subsequent phase in accordance with the project roadmap. Phase 2 (Authentication & Role Authorization) is actively gating this section.'}
        </p>
        <div className="pt-6 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Role-Based Access Verified & Active</span>
        </div>
      </div>
    </div>
  );
}
