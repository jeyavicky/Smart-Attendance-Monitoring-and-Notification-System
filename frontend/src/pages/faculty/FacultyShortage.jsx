import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Users,
  Search,
  BookOpen,
  ArrowRight,
  TrendingUp,
  ShieldAlert,
} from 'lucide-react';
import attendanceApi from '../../api/attendanceApi';

export default function FacultyShortage() {
  const [shortages, setShortages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchShortages = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await attendanceApi.getFacultyShortage();
        setShortages(res.data || []);
      } catch (err) {
        setError(err.message || 'Failed to fetch shortage students');
      } finally {
        setLoading(false);
      }
    };

    fetchShortages();
  }, []);

  const filteredShortages = shortages.filter((s) => {
    const term = searchTerm.toLowerCase();
    return (
      s.name?.toLowerCase().includes(term) ||
      s.registerNumber?.toLowerCase().includes(term) ||
      s.subjectCode?.toLowerCase().includes(term) ||
      s.subjectName?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-amber-400" /> Shortage Students Roster
          </h1>
          <p className="text-sm text-slate-400">
            Students currently falling below the 75% attendance threshold across your assigned classes.
          </p>
        </div>

        {/* Counter */}
        <div className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-xs font-semibold text-slate-300">
          Total Flagged:{' '}
          <span className="text-amber-400 font-bold text-sm ml-1">
            {shortages.length}
          </span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
          {error}
        </div>
      )}

      {/* Search / Filter */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search student or course..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="text-xs text-slate-400">
          Showing <span className="text-white font-bold">{filteredShortages.length}</span> students
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12">
            <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-slate-400 text-sm">Evaluating shortage rosters...</p>
          </div>
        ) : filteredShortages.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3">
              <Users className="w-6 h-6" />
            </div>
            <p className="text-white font-semibold">No attendance shortages</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              All students across your assigned courses currently maintain 75% or higher attendance.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Register No</th>
                  <th className="py-3.5 px-4">Student Name</th>
                  <th className="py-3.5 px-4">Cohort</th>
                  <th className="py-3.5 px-4">Subject</th>
                  <th className="py-3.5 px-4 text-center">Attended / Total</th>
                  <th className="py-3.5 px-4 text-center">Percentage</th>
                  <th className="py-3.5 px-4 text-center">Tier</th>
                  <th className="py-3.5 px-4 text-center">Classes to 75%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredShortages.map((s, idx) => (
                  <tr key={`${s.studentId}_${s.subjectCode}_${idx}`} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-200">
                      {s.registerNumber}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-white">{s.name}</td>
                    <td className="py-3.5 px-4 text-xs text-slate-400 whitespace-nowrap">
                      {s.className} ({s.sectionName})
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">{s.subjectCode}</div>
                      <div className="text-xs text-slate-400 truncate max-w-[180px]">{s.subjectName}</div>
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-medium text-slate-300">
                      {s.attended} / {s.conducted}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-rose-400">
                      {s.percentage}%
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          s.status === 'CRITICAL'
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : s.status === 'WARNING'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-800 text-xs font-bold text-emerald-400 border border-slate-700">
                        <TrendingUp className="w-3.5 h-3.5" /> +{s.classesToRecover} classes
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
