import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Calendar,
  Clock,
  BookOpen,
  Users,
  CheckCircle2,
  XCircle,
  Award,
  AlertTriangle,
  ArrowLeft,
  Save,
  CheckCheck,
  RotateCcw,
  AlertCircle,
  FileText,
} from 'lucide-react';
import attendanceApi from '../../api/attendanceApi';
import { facultyMappingApi } from '../../api/academicApi';
import { useAuth } from '../../context/AuthContext';

export default function MarkAttendance() {
  const { timetableId } = useParams();
  const [searchParams] = useSearchParams();
  const mappingIdParam = searchParams.get('mappingId');
  const navigate = useNavigate();
  const { user } = useAuth();

  // State
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Available mappings if accessed without timetableId
  const [mappings, setMappings] = useState([]);
  const [selectedMappingId, setSelectedMappingId] = useState(mappingIdParam || '');

  // Session metadata
  const [sessionMeta, setSessionMeta] = useState(null);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [period, setPeriod] = useState(1);
  const [generalRemarks, setGeneralRemarks] = useState('');

  // Student roster & statuses: { studentId: { status: 'P', remarks: '' } }
  const [students, setStudents] = useState([]);
  const [attendanceState, setAttendanceState] = useState({});

  // 1. Initial Load: Fetch mappings if no timetableId, or fetch roster directly
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        setError(null);

        if (timetableId) {
          const res = await attendanceApi.getStudentsForMarking({ timetableId });
          const payload = res.data;
          setSessionMeta(payload);
          setSelectedMappingId(payload.mappingId);
          setStudents(payload.students || []);

          // Initialize attendance state with 'P' (Present) by default
          const initial = {};
          (payload.students || []).forEach((st) => {
            initial[st.id] = { status: 'P', remarks: '' };
          });
          setAttendanceState(initial);
        } else {
          // Load faculty's assigned mappings
          const res = await facultyMappingApi.getMyMappings();
          const list = res.data || [];
          setMappings(list);

          const defaultMapping = mappingIdParam || (list.length > 0 ? list[0]._id : '');
          if (defaultMapping) {
            setSelectedMappingId(defaultMapping);
            loadRosterForMapping(defaultMapping);
          }
        }
      } catch (err) {
        setError(err.message || 'Failed to initialize attendance marking session');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [timetableId, mappingIdParam]);

  const loadRosterForMapping = async (mId) => {
    try {
      setLoading(true);
      setError(null);
      const res = await attendanceApi.getStudentsForMarking({ mappingId: mId });
      const payload = res.data;
      setSessionMeta(payload);
      setStudents(payload.students || []);

      const initial = {};
      (payload.students || []).forEach((st) => {
        initial[st.id] = { status: 'P', remarks: '' };
      });
      setAttendanceState(initial);
    } catch (err) {
      setError(err.message || 'Failed to load students for selected mapping');
    } finally {
      setLoading(false);
    }
  };

  const handleMappingChange = (e) => {
    const newId = e.target.value;
    setSelectedMappingId(newId);
    if (newId) {
      loadRosterForMapping(newId);
    }
  };

  // Status handlers
  const handleStatusChange = (studentId, status) => {
    setAttendanceState((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
      },
    }));
  };

  const handleStudentRemarkChange = (studentId, remarks) => {
    setAttendanceState((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        remarks,
      },
    }));
  };

  const handleMarkAllPresent = () => {
    const updated = {};
    students.forEach((st) => {
      updated[st.id] = {
        ...attendanceState[st.id],
        status: 'P',
      };
    });
    setAttendanceState(updated);
  };

  const handleClearAll = () => {
    const updated = {};
    students.forEach((st) => {
      updated[st.id] = {
        ...attendanceState[st.id],
        status: '',
      };
    });
    setAttendanceState(updated);
  };

  // Live Counts
  const counts = {
    total: students.length,
    present: Object.values(attendanceState).filter((s) => s.status === 'P').length,
    absent: Object.values(attendanceState).filter((s) => s.status === 'A').length,
    onDuty: Object.values(attendanceState).filter((s) => s.status === 'OD').length,
    medicalLeave: Object.values(attendanceState).filter((s) => s.status === 'ML').length,
    unmarked: Object.values(attendanceState).filter((s) => !s.status).length,
  };

  const percentage = counts.total > 0 ? Math.round(((counts.present + counts.onDuty) / counts.total) * 100) : 0;

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validation
    if (counts.unmarked > 0) {
      setError(`All students must have an attendance status. ${counts.unmarked} student(s) remain unmarked.`);
      return;
    }

    if (!selectedMappingId && !timetableId) {
      setError('Please select a valid subject/class mapping.');
      return;
    }

    try {
      setSubmitting(true);
      const recordsPayload = students.map((st) => ({
        studentId: st.id,
        status: attendanceState[st.id].status,
        remarks: attendanceState[st.id].remarks || '',
      }));

      const body = {
        attendanceDate,
        period: parseInt(period, 10),
        remarks: generalRemarks,
        records: recordsPayload,
      };

      if (timetableId) {
        body.timetableId = timetableId;
      } else {
        body.mappingId = selectedMappingId;
      }

      await attendanceApi.createSession(body);
      setSuccess('Attendance session recorded successfully!');
      setTimeout(() => {
        navigate('/faculty/history');
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to submit attendance session.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !sessionMeta) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-400 font-medium">Loading classroom roster...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="text-2xl font-bold text-white tracking-tight">Mark Attendance</h1>
          <p className="text-sm text-slate-400">
            Record classroom attendance for assigned courses and sections.
          </p>
        </div>

        {/* Live Counters Pill */}
        <div className="flex items-center gap-3 bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl text-sm">
          <div className="text-center px-2">
            <span className="block text-xs text-slate-400">Total</span>
            <span className="font-bold text-white">{counts.total}</span>
          </div>
          <div className="h-6 w-px bg-slate-800"></div>
          <div className="text-center px-2">
            <span className="block text-xs text-emerald-400">Present</span>
            <span className="font-bold text-emerald-400">{counts.present}</span>
          </div>
          <div className="h-6 w-px bg-slate-800"></div>
          <div className="text-center px-2">
            <span className="block text-xs text-rose-400">Absent</span>
            <span className="font-bold text-rose-400">{counts.absent}</span>
          </div>
          <div className="h-6 w-px bg-slate-800"></div>
          <div className="text-center px-2">
            <span className="block text-xs text-sky-400">OD</span>
            <span className="font-bold text-sky-400">{counts.onDuty}</span>
          </div>
          <div className="h-6 w-px bg-slate-800"></div>
          <div className="text-center px-2">
            <span className="block text-xs text-amber-400">ML</span>
            <span className="font-bold text-amber-400">{counts.medicalLeave}</span>
          </div>
        </div>
      </div>

      {/* Error / Success Notifications */}
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

      {/* Session Configuration Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-emerald-400" /> Session Configuration
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Mapping selector (if not bound to specific timetableId) */}
          {!timetableId && (
            <div className="space-y-1.5 lg:col-span-2">
              <label className="text-xs font-semibold text-slate-300">Subject & Class Cohort</label>
              <select
                value={selectedMappingId}
                onChange={handleMappingChange}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                {mappings.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.subjectId?.subjectCode} — {m.subjectId?.subjectName} ({m.classId?.name} - {m.sectionId?.displayName || m.sectionId?.name})
                  </option>
                ))}
              </select>
            </div>
          )}

          {timetableId && sessionMeta && (
            <div className="space-y-1.5 lg:col-span-2">
              <label className="text-xs font-semibold text-slate-300">Course & Section</label>
              <div className="bg-slate-800/60 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white font-medium">
                {sessionMeta.subjectInfo?.subjectCode} — {sessionMeta.subjectInfo?.subjectName} (
                {sessionMeta.classInfo?.name} - {sessionMeta.sectionInfo?.displayName})
              </div>
            </div>
          )}

          {/* Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" /> Attendance Date
            </label>
            <input
              type="date"
              value={attendanceDate}
              onChange={(e) => setAttendanceDate(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Period */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" /> Period / Hour
            </label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map((p) => (
                <option key={p} value={p}>
                  Period {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* General session remarks */}
        <div className="mt-4">
          <label className="text-xs font-semibold text-slate-300 block mb-1.5">
            Session Topic / Remarks (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Unit 3 - Relational Algebra & SQL Subqueries"
            value={generalRemarks}
            onChange={(e) => setGeneralRemarks(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Roster Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" /> Enrolled Students ({students.length})
          </span>
          <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
            {percentage}% Present
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleMarkAllPresent}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-all"
          >
            <CheckCheck className="w-3.5 h-3.5" /> Mark All Present
          </button>
          <button
            type="button"
            onClick={handleClearAll}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Clear All
          </button>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-800/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4">Register No</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Individual Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {students.map((st, index) => {
                const currentStatus = attendanceState[st.id]?.status || '';

                return (
                  <tr
                    key={st.id}
                    className={`transition-colors ${
                      currentStatus === 'A'
                        ? 'bg-rose-500/5 hover:bg-rose-500/10'
                        : currentStatus === 'OD'
                        ? 'bg-sky-500/5 hover:bg-sky-500/10'
                        : currentStatus === 'ML'
                        ? 'bg-amber-500/5 hover:bg-amber-500/10'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <td className="py-3.5 px-4 text-center text-xs text-slate-500">
                      {index + 1}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-200">
                      {st.registerNumber}
                    </td>
                    <td className="py-3.5 px-4 text-white font-medium">
                      {st.name}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Present */}
                        <button
                          type="button"
                          onClick={() => handleStatusChange(st.id, 'P')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            currentStatus === 'P'
                              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                              : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                          }`}
                        >
                          P
                        </button>

                        {/* Absent */}
                        <button
                          type="button"
                          onClick={() => handleStatusChange(st.id, 'A')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            currentStatus === 'A'
                              ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                              : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                          }`}
                        >
                          A
                        </button>

                        {/* On Duty */}
                        <button
                          type="button"
                          onClick={() => handleStatusChange(st.id, 'OD')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            currentStatus === 'OD'
                              ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20'
                              : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                          }`}
                          title="On Duty"
                        >
                          OD
                        </button>

                        {/* Medical Leave */}
                        <button
                          type="button"
                          onClick={() => handleStatusChange(st.id, 'ML')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            currentStatus === 'ML'
                              ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                              : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                          }`}
                          title="Medical Leave"
                        >
                          ML
                        </button>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <input
                        type="text"
                        placeholder="Optional remarks"
                        value={attendanceState[st.id]?.remarks || ''}
                        onChange={(e) => handleStudentRemarkChange(st.id, e.target.value)}
                        className="w-full bg-slate-800/80 border border-slate-700/80 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-800/60 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-400">
            {counts.unmarked > 0 ? (
              <span className="text-rose-400 font-medium flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" /> {counts.unmarked} student(s) not marked
              </span>
            ) : (
              <span className="text-emerald-400 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> All {students.length} students marked
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/faculty/dashboard')}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting || counts.unmarked > 0}
              onClick={handleSubmit}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-bold tracking-wide shadow-lg shadow-emerald-500/20 transition-all"
            >
              <Save className="w-4 h-4" />
              {submitting ? 'Saving Session...' : 'Submit Attendance'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
