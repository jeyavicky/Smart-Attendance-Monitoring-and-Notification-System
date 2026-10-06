import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  BookOpen,
  Users,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  AlertCircle,
  X,
  Building2,
  GraduationCap,
} from 'lucide-react';
import attendanceApi from '../../api/attendanceApi';
import { classApi, subjectApi } from '../../api/academicApi';

export default function AdminAttendance() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter options
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);

  // Selected filters
  const [filterClass, setFilterClass] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterDate, setFilterDate] = useState('');

  // Modal State
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [sessionDetail, setSessionDetail] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  // 1. Initial Load: Filter Options
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [clsRes, subRes] = await Promise.all([
          classApi.getAll({ limit: 100 }),
          subjectApi.getAll({ limit: 100 }),
        ]);
        setClasses(clsRes.data || []);
        setSubjects(subRes.data || []);
      } catch (err) {
        console.error('Failed to load filter options:', err);
      }
    };
    fetchOptions();
  }, []);

  // 2. Fetch Sessions
  const fetchSessions = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (filterClass) params.classId = filterClass;
      if (filterSubject) params.subjectId = filterSubject;
      if (filterDate) params.date = filterDate;

      const res = await attendanceApi.getSessions(params);
      setSessions(res.data?.items || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch attendance sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [filterClass, filterSubject, filterDate]);

  // Open Details Modal
  const openDetailsModal = async (sessionId) => {
    try {
      setSelectedSessionId(sessionId);
      setModalLoading(true);
      const res = await attendanceApi.getSessionById(sessionId);
      setSessionDetail(res.data);
    } catch (err) {
      setError(err.message || 'Failed to fetch session detail');
      setSelectedSessionId(null);
    } finally {
      setModalLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedSessionId(null);
    setSessionDetail(null);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Calendar className="w-6 h-6 text-emerald-400" /> Institutional Attendance Register
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Audit system-wide classroom attendance sessions across departments and faculty members.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
          {error}
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Class Filter */}
          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="">All Class Cohorts</option>
            {classes.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Subject Filter */}
          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="">All Subjects</option>
            {subjects.map((s) => (
              <option key={s._id} value={s._id}>
                {s.subjectCode} — {s.subjectName}
              </option>
            ))}
          </select>

          {/* Date Filter */}
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
          />

          {(filterClass || filterSubject || filterDate) && (
            <button
              onClick={() => {
                setFilterClass('');
                setFilterSubject('');
                setFilterDate('');
              }}
              className="text-xs text-slate-400 hover:text-white transition-colors underline"
            >
              Reset Filters
            </button>
          )}
        </div>

        <div className="text-xs text-slate-400 font-medium">
          Total Sessions: <span className="text-white font-bold">{sessions.length}</span>
        </div>
      </div>

      {/* Sessions Register Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-slate-400 text-sm">Loading attendance sessions...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <Calendar className="w-12 h-12 text-slate-600 mb-3" />
            <p className="text-white font-semibold">No attendance sessions recorded</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              No sessions match the current query criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Faculty Member</th>
                  <th className="py-3.5 px-4">Subject</th>
                  <th className="py-3.5 px-4">Cohort</th>
                  <th className="py-3.5 px-4 text-center">Period</th>
                  <th className="py-3.5 px-4 text-center text-emerald-400">P</th>
                  <th className="py-3.5 px-4 text-center text-rose-400">A</th>
                  <th className="py-3.5 px-4 text-center text-sky-400">OD</th>
                  <th className="py-3.5 px-4 text-center text-amber-400">ML</th>
                  <th className="py-3.5 px-4 text-center">Total</th>
                  <th className="py-3.5 px-4 text-center">%</th>
                  <th className="py-3.5 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {sessions.map((s) => {
                  const percent =
                    s.totalStudents > 0
                      ? Math.round(((s.presentCount + s.onDutyCount) / s.totalStudents) * 100)
                      : 0;

                  return (
                    <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-medium text-white whitespace-nowrap">
                        {new Date(s.attendanceDate).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-white">{s.facultyName || 'Instructor'}</div>
                        <div className="text-xs text-slate-500 font-mono">{s.facultyEmployeeId || '—'}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">{s.subjectCode}</div>
                        <div className="text-xs text-slate-400 truncate max-w-[180px]">
                          {s.subjectName}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-300">
                        {s.className} ({s.sectionName})
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 text-xs font-mono font-bold text-slate-300">
                          P{s.period}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-emerald-400">
                        {s.presentCount}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-rose-400">
                        {s.absentCount}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-sky-400">
                        {s.onDutyCount}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-amber-400">
                        {s.medicalLeaveCount}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-slate-400">
                        {s.totalStudents}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            percent >= 75
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-rose-500/10 text-rose-400'
                          }`}
                        >
                          {percent}%
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => openDetailsModal(s.id)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                          title="View Attendance Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: View Full Student Roster */}
      {selectedSessionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Eye className="w-5 h-5 text-emerald-400" /> Session Attendance Audit Details
                </h3>
                {sessionDetail?.session && (
                  <p className="text-xs text-slate-400 mt-1">
                    {sessionDetail.session.subjectId?.subjectName} ({sessionDetail.session.subjectId?.subjectCode}) —{' '}
                    {new Date(sessionDetail.session.attendanceDate).toLocaleDateString()} — Period {sessionDetail.session.period} — Faculty: {sessionDetail.session.facultyId?.name}
                  </p>
                )}
              </div>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {modalLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-slate-400 text-xs mt-3">Loading roster details...</p>
                </div>
              ) : sessionDetail ? (
                <>
                  <div className="grid grid-cols-4 gap-3 bg-slate-800/60 p-3 rounded-xl text-center text-xs">
                    <div>
                      <span className="text-slate-400 block">Present</span>
                      <span className="font-bold text-emerald-400 text-sm">
                        {sessionDetail.counts?.present}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Absent</span>
                      <span className="font-bold text-rose-400 text-sm">
                        {sessionDetail.counts?.absent}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">On Duty</span>
                      <span className="font-bold text-sky-400 text-sm">
                        {sessionDetail.counts?.onDuty}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Medical Leave</span>
                      <span className="font-bold text-amber-400 text-sm">
                        {sessionDetail.counts?.medicalLeave}
                      </span>
                    </div>
                  </div>

                  <div className="border border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-800/80 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                        <tr>
                          <th className="py-2.5 px-3">Register No</th>
                          <th className="py-2.5 px-3">Name</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                          <th className="py-2.5 px-3">Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {sessionDetail.records?.map((r) => (
                          <tr key={r.id} className="hover:bg-slate-800/30">
                            <td className="py-2 px-3 font-mono font-semibold text-slate-300">
                              {r.registerNumber}
                            </td>
                            <td className="py-2 px-3 font-medium text-white">{r.name}</td>
                            <td className="py-2 px-3 text-center">
                              <span
                                className={`inline-block px-2 py-0.5 rounded font-bold text-xs ${
                                  r.status === 'P'
                                    ? 'bg-emerald-500/10 text-emerald-400'
                                    : r.status === 'A'
                                    ? 'bg-rose-500/10 text-rose-400'
                                    : r.status === 'OD'
                                    ? 'bg-sky-500/10 text-sky-400'
                                    : 'bg-amber-500/10 text-amber-400'
                                }`}
                              >
                                {r.status === 'P'
                                  ? 'Present'
                                  : r.status === 'A'
                                  ? 'Absent'
                                  : r.status === 'OD'
                                  ? 'On Duty'
                                  : 'Medical Leave'}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-400">{r.remarks || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {sessionDetail.session?.remarks && (
                    <div className="text-xs text-slate-300 bg-slate-800/40 p-3 rounded-xl border border-slate-800">
                      <strong>Topic / Notes:</strong> {sessionDetail.session.remarks}
                    </div>
                  )}

                  <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800 flex justify-between">
                    <span>
                      Recorded by: {sessionDetail.session?.markedBy?.name} (
                      {new Date(sessionDetail.session?.markedAt).toLocaleString()})
                    </span>
                    {sessionDetail.session?.lastUpdatedBy && (
                      <span>
                        Last updated by: {sessionDetail.session?.lastUpdatedBy?.name} (
                        {new Date(sessionDetail.session?.lastUpdatedAt).toLocaleString()})
                      </span>
                    )}
                  </div>
                </>
              ) : null}
            </div>

            <div className="p-4 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
