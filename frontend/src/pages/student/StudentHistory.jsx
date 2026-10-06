import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  BookOpen,
  Filter,
  CheckCircle2,
  XCircle,
  Award,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import attendanceApi from '../../api/attendanceApi';

export default function StudentHistory() {
  const [history, setHistory] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, totalItems: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchHistory = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const params = { page, limit: 25 };
      if (statusFilter) params.status = statusFilter;

      const res = await attendanceApi.getStudentHistory(params);
      setHistory(res.data?.items || []);
      setPagination(res.data?.pagination || { page: 1, totalPages: 1, totalItems: 0 });
    } catch (err) {
      setError(err.message || 'Failed to load attendance log');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory(1);
  }, [statusFilter]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'P':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Present
          </span>
        );
      case 'A':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            Absent
          </span>
        );
      case 'OD':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
            On Duty
          </span>
        );
      case 'ML':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Medical Leave
          </span>
        );
      default:
        return <span className="text-slate-400 font-mono">—</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Calendar className="w-6 h-6 text-emerald-400" /> Attendance Audit Log
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Chronological lecture-by-lecture record of your attendance entries.
          </p>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="">All Statuses</option>
            <option value="P">Present Only</option>
            <option value="A">Absent Only</option>
            <option value="OD">On Duty Only</option>
            <option value="ML">Medical Leave Only</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            <p className="text-xs text-slate-400 mt-3">Loading history entries...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-2" />
            <p className="text-white font-semibold text-sm">No attendance records found</p>
            <p className="text-xs text-slate-400 mt-1">
              No sessions match the selected filter criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4 text-center">Period</th>
                  <th className="py-3.5 px-4">Subject</th>
                  <th className="py-3.5 px-4">Instructor</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {history.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-white whitespace-nowrap">
                      {new Date(h.date).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono text-xs font-bold">
                        P{h.period}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">{h.subjectName}</div>
                      <div className="text-xs font-mono text-emerald-400">{h.subjectCode}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 text-xs">
                      {h.facultyName || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {getStatusBadge(h.status)}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-400">
                      {h.remarks || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div>
              Page {pagination.page} of {pagination.totalPages} ({pagination.totalItems} records)
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchHistory(pagination.page - 1)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white"
              >
                Previous
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchHistory(pagination.page + 1)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
