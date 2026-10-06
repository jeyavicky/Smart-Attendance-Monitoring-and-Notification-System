import React from 'react';
import { ShieldCheck, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-medium">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-teal-600" />
          <span>Smart Attendance Monitoring and Notification System &copy; {new Date().getFullYear()}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1">
            MERN Architecture &bull; Production Foundation
          </span>
          <span className="text-slate-300">|</span>
          <span>Target Requirement: 75%</span>
        </div>
      </div>
    </footer>
  );
}
