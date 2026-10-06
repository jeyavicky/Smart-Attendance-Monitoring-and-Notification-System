import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  BookOpen,
  Users,
  Search,
  Filter,
  Eye,
  Edit3,
  CheckCircle2,
  AlertCircle,
  X,
  Save,
  RotateCcw,
  CheckCheck,
} from 'lucide-react';
import attendanceApi from '../../api/attendanceApi';
import { facultyMappingApi } from '../../api/academicApi';

export default function AttendanceHistory() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Filters
  const [filterSubject, setFilterSubject] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [myMappings, setMyMappings] = useState([]);

  // Modal State (View / Edit)
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [modalMode, setModalMode] = useState(null); // 'view' | 'edit' | null
  const [sessionDetail, setSessionDetail] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editedRecords, setEditedRecords] = useState({});
  const [editRemarks, setEditRemarks] = useState('');

  // 1. Fetch sessions & faculty mappings
  const fetchSessions = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {};
      if (filterDate) params.date = filterDate;
      if (filterSubject) params.subjectId = filterSubject;

      const [sessRes, mapRes] = await Promise.all([
        attendanceApi.getSessions(params),
        facultyMappingApi.getMyMappings(),
      ]);

      setSessions(sessRes.data?.items || []);
      setMyMappings(mapRes.data || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch attendance history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [filterDate, filterSubject]);

  // Open Details Modal
  const openModal = async (sessionId, mode) => {
    try {
      setActiveSessionId(sessionId);
      setModalMode(mode);
      setModalLoading(true);
      setError(null);
      setSuccess(null);

      const res = await attendanceApi.getSessionById(sessionId);
      const detail = res.data;
      setSessionDetail(detail);
      setEditRemarks(detail.session?.remarks || '');

      // Initialize edit state
      const initial = {};
      (detail.records || []).forEach((r) => {
        initial[r.studentId] = {
          status: r.status,
          remarks: r.remarks || '',
        };
      });
      setEditedRecords(initial);
    } catch (err) {
      setError(err.message || 'Failed to load session details');
      setModalMode(null);
    } finally {
      setModalLoading(false);
    }
  };

  const closeModal = () => {
    setModalMode(null);
    setSessionDetail(null);
    setActiveSessionId(null);
  };

  // Edit status change
  const handleEditStatus = (studentId, status) => {
    setEditedRecords((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
      },
    }));
  };

  const handleEditRemark = (studentId, remarks) => {
    setEditedRecords((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        remarks,
      },
    }));
  };

  // Save edits
  const handleSaveEdit = async () => {
    try {
      setSavingEdit(true);
      setError(null);

      const recordsArray = Object.keys(editedRecords).map((stId) => ({
        studentId: stId,
        status: editedRecords[stId].status,
        remarks: editedRecords[stId].remarks || '',
      }));

      await attendanceApi.updateSession(activeSessionId, {
        records: recordsArray,
        remarks: editRemarks,
      });

      setSuccess('Attendance session updated successfully!');
      closeModal();
      fetchSessions();
    } catch (err) {
      setError(err.message || 'Failed to update attendance session');
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Attendance History</h1>
          <p className="text-sm text-slate-400">
            Audit, inspect, and modify previously recorded attendance sessions.
          </p>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="text-sm font-medium">{error}</div>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="text-sm font-medium">{success}</div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Subject Filter */}
          <div className="relative min-w-[200px]">
            <select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="">All Assigned Subjects</option>
              {myMappings.map((m) => (
                <option key={m._id} value={m.subjectId?._id}>
                  {m.subjectId?.subjectCode} — {m.subjectId?.subjectName}
                </option>
              ))}
            </select>
          </div>

          {/* Date Filter */}
          <div className="relative">
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {(filterSubject || filterDate) && (
            <button
              onClick={() => {
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
          Showing <span className="text-white font-bold">{sessions.length}</span> recorded session(s)
        </div>
      </div>

      {/* Sessions Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-slate-400 text-sm">Loading attendance history...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <Calendar className="w-12 h-12 text-slate-600 mb-3" />
            <p className="text-white font-semibold">No attendance sessions found</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              You haven't recorded any attendance sessions matching the current filter criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Course</th>
                  <th className="py-3.5 px-4">Cohort</th>
                  <th className="py-3.5 px-4 text-center">Period</th>
                  <th className="py-3.5 px-4 text-center text-emerald-400">P</th>
                  <th className="py-3.5 px-4 text-center text-rose-400">A</th>
                  <th className="py-3.5 px-4 text-center text-sky-400">OD</th>
                  <th className="py-3.5 px-4 text-center text-amber-400">ML</th>
                  <th className="py-3.5 px-4 text-center">Total</th>
                  <th className="py-3.5 px-4 text-center">%</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {sessions.map((s) => {
                  const dateStr = s.attendanceDate ? new Date(s.attendanceDate).toLocaleDateString() : '—';
                  const percent = s.totalStudents > 0 ? Math.round(((s.presentCount + s.onDutyCount) / s.totalStudents) * 100) : 0;

                  return (
                    <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-medium text-white whitespace-nowrap">
                        {dateStr}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">{s.subjectCode}</div>
                        <div className="text-xs text-slate-400 truncate max-w-[200px]">{s.subjectName}</div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="text-slate-300 font-medium">{s.className}</span>{' '}
                        <span className="text-xs text-slate-500">({s.sectionName})</span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-slate-800 text-xs font-mono font-bold text-slate-300">
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
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
                            percent >= 75
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-rose-500/10 text-rose-400'
                          }`}
                        >
                          {percent}%
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openModal(s.id, 'view')}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                            title="View Student Roster"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openModal(s.id, 'edit')}
                            className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 transition-colors"
                            title="Edit Attendance"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: View / Edit Roster */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  {modalMode === 'edit' ? (
                    <>
                      <Edit3 className="w-5 h-5 text-emerald-400" /> Edit Attendance Session
                    </>
                  ) : (
                    <>
                      <Eye className="w-5 h-5 text-sky-400" /> Attendance Session Details
                    </>
                  )}
                </h3>
                {sessionDetail?.session && (
                  <p className="text-xs text-slate-400 mt-1">
                    {sessionDetail.session.subjectId?.subjectName} ({sessionDetail.session.subjectId?.subjectCode}) —{' '}
                    {new Date(sessionDetail.session.attendanceDate).toLocaleDateString()} — Period {sessionDetail.session.period}
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

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {modalLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-slate-400 text-xs mt-3">Loading session roster...</p>
                </div>
              ) : sessionDetail ? (
                <>
                  {/* Summary bar */}
                  <div className="grid grid-cols-4 gap-3 bg-slate-800/60 p-3 rounded-xl text-center text-xs">
                    <div>
                      <span className="text-slate-400 block">Present</span>
                      <span className="font-bold text-emerald-400 text-sm">
                        {modalMode === 'edit'
                          ? Object.values(editedRecords).filter((r) => r.status === 'P').length
                          : sessionDetail.counts?.present}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Absent</span>
                      <span className="font-bold text-rose-400 text-sm">
                        {modalMode === 'edit'
                          ? Object.values(editedRecords).filter((r) => r.status === 'A').length
                          : sessionDetail.counts?.absent}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">On Duty</span>
                      <span className="font-bold text-sky-400 text-sm">
                        {modalMode === 'edit'
                          ? Object.values(editedRecords).filter((r) => r.status === 'OD').length
                          : sessionDetail.counts?.onDuty}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Medical Leave</span>
                      <span className="font-bold text-amber-400 text-sm">
                        {modalMode === 'edit'
                          ? Object.values(editedRecords).filter((r) => r.status === 'ML').length
                          : sessionDetail.counts?.medicalLeave}
                      </span>
                    </div>
                  </div>

                  {/* Student list */}
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
                        {sessionDetail.records.map((r) => {
                          const status = modalMode === 'edit' ? editedRecords[r.studentId]?.status : r.status;
                          const remarks = modalMode === 'edit' ? editedRecords[r.studentId]?.remarks : r.remarks;

                          return (
                            <tr key={r.id} className="hover:bg-slate-800/30">
                              <td className="py-2 px-3 font-mono font-semibold text-slate-300">
                                {r.registerNumber}
                              </td>
                              <td className="py-2 px-3 font-medium text-white">{r.name}</td>
                              <td className="py-2 px-3 text-center">
                                {modalMode === 'edit' ? (
                                  <div className="flex items-center justify-center gap-1">
                                    {['P', 'A', 'OD', 'ML'].map((st) => (
                                      <button
                                        key={st}
                                        type="button"
                                        onClick={() => handleEditStatus(r.studentId, st)}
                                        className={`px-2 py-1 rounded text-[11px] font-bold transition-all ${
                                          status === st
                                            ? st === 'P'
                                              ? 'bg-emerald-500 text-white'
                                              : st === 'A'
                                              ? 'bg-rose-500 text-white'
                                              : st === 'OD'
                                              ? 'bg-sky-500 text-white'
                                              : 'bg-amber-500 text-white'
                                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                        }`}
                                      >
                                        {st}
                                      </button>
                                    ))}
                                  </div>
                                ) : (
                                  <span
                                    className={`inline-block px-2 py-0.5 rounded font-bold text-xs ${
                                      status === 'P'
                                        ? 'bg-emerald-500/10 text-emerald-400'
                                        : status === 'A'
                                        ? 'bg-rose-500/10 text-rose-400'
                                        : status === 'OD'
                                        ? 'bg-sky-500/10 text-sky-400'
                                        : 'bg-amber-500/10 text-amber-400'
                                    }`}
                                  >
                                    {status === 'P'
                                      ? 'Present'
                                      : status === 'A'
                                      ? 'Absent'
                                      : status === 'OD'
                                      ? 'On Duty'
                                      : 'Medical Leave'}
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3">
                                {modalMode === 'edit' ? (
                                  <input
                                    type="text"
                                    value={remarks || ''}
                                    onChange={(e) => handleEditRemark(r.studentId, e.target.value)}
                                    placeholder="Optional note"
                                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-xs text-white"
                                  />
                                ) : (
                                  <span className="text-slate-400">{remarks || '—'}</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {modalMode === 'edit' && (
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-300">Session Remarks</label>
                      <input
                        type="text"
                        value={editRemarks}
                        onChange={(e) => setEditRemarks(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>
                  )}

                  {sessionDetail.session?.lastUpdatedBy && (
                    <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800">
                      Last edited by {sessionDetail.session.lastUpdatedBy.name} on{' '}
                      {new Date(sessionDetail.session.lastUpdatedAt).toLocaleString()}
                    </div>
                  )}
                </>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-850 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
              >
                {modalMode === 'edit' ? 'Cancel' : 'Close'}
              </button>
              {modalMode === 'edit' && (
                <button
                  type="button"
                  disabled={savingEdit}
                  onClick={handleSaveEdit}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-bold transition-all"
                >
                  <Save className="w-3.5 h-3.5" />
                  {savingEdit ? 'Saving Edits...' : 'Save Changes'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
