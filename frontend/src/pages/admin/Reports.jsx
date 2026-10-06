import React, { useState, useEffect } from 'react';
import {
  FileText,
  Users,
  BookOpen,
  Layers,
  ShieldAlert,
  Printer,
  Calendar,
  CheckCircle2,
  TrendingDown,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import reportApi from '../../api/reportApi';
import { studentApi, classApi, subjectApi } from '../../api/academicApi';

export default function Reports() {
  const [reportType, setReportType] = useState('class'); // 'class' | 'student' | 'subject' | 'shortage'
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState(null);

  // Options
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);

  // Selected targets
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');

  // 1. Fetch selection dropdown options
  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const [clsRes, stuRes, subRes] = await Promise.all([
          classApi.getAll({ limit: 100 }),
          studentApi.getAll({ limit: 100 }),
          subjectApi.getAll({ limit: 100 }),
        ]);

        const clList = clsRes.data || [];
        const stList = stuRes.data || [];
        const sbList = subRes.data || [];

        setClasses(clList);
        setStudents(stList);
        setSubjects(sbList);

        if (clList.length > 0) setSelectedClassId(clList[0]._id);
        if (stList.length > 0) setSelectedStudentId(stList[0]._id);
        if (sbList.length > 0) setSelectedSubjectId(sbList[0]._id);
      } catch (err) {
        console.error('Failed to load report dropdown options:', err);
      }
    };
    fetchDropdowns();
  }, []);

  // 2. Generate report on button click or target change
  const generateReport = async () => {
    try {
      setLoading(true);
      setError(null);
      setReportData(null);

      let res = null;
      if (reportType === 'class') {
        if (!selectedClassId) return;
        res = await reportApi.getClassReport(selectedClassId);
      } else if (reportType === 'student') {
        if (!selectedStudentId) return;
        res = await reportApi.getStudentReport(selectedStudentId);
      } else if (reportType === 'subject') {
        if (!selectedSubjectId) return;
        res = await reportApi.getSubjectReport(selectedSubjectId);
      } else if (reportType === 'shortage') {
        res = await reportApi.getShortageReport();
      }

      if (res?.success) {
        setReportData(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedClassId || selectedStudentId || selectedSubjectId || reportType === 'shortage') {
      generateReport();
    }
  }, [reportType, selectedClassId, selectedStudentId, selectedSubjectId]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-emerald-400" /> Institutional Attendance Reports
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Generate and print verified academic attendance audit reports.
          </p>
        </div>

        <button
          onClick={handlePrint}
          disabled={!reportData}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors self-start sm:self-auto"
        >
          <Printer className="w-4 h-4" /> Print Report
        </button>
      </div>

      {/* Report Type Selector Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Tabs */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => setReportType('class')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              reportType === 'class'
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Class Attendance Report
          </button>
          <button
            onClick={() => setReportType('student')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              reportType === 'student'
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Student Attendance Report
          </button>
          <button
            onClick={() => setReportType('subject')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              reportType === 'subject'
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Subject Attendance Report
          </button>
          <button
            onClick={() => setReportType('shortage')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              reportType === 'shortage'
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Institutional Shortage Report
          </button>
        </div>

        {/* Dynamic target selector */}
        <div className="w-full md:w-auto">
          {reportType === 'class' && (
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full md:w-64 bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              {classes.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}

          {reportType === 'student' && (
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full md:w-64 bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              {students.map((st) => (
                <option key={st._id} value={st._id}>
                  {st.registerNumber} — {st.name}
                </option>
              ))}
            </select>
          )}

          {reportType === 'subject' && (
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full md:w-64 bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              {subjects.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.subjectCode} — {s.subjectName}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
          {error}
        </div>
      )}

      {/* Report Canvas */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 bg-slate-900 border border-slate-800 rounded-2xl">
          <Loader2 className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin text-emerald-500" />
          <p className="mt-4 text-slate-400 text-sm">Compiling attendance statistics...</p>
        </div>
      ) : !reportData ? (
        <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl">
          <FileText className="w-12 h-12 text-slate-600 mx-auto mb-2" />
          <p className="text-white font-semibold">Select parameters to view report</p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          {/* Header of Report Document */}
          <div className="border-b border-slate-800 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                Official Report Document
              </span>
              <h2 className="text-xl font-bold text-white mt-1">
                {reportType === 'class' && `Class Attendance Report: ${reportData.class?.name}`}
                {reportType === 'student' && `Student Dossier: ${reportData.student?.name} (${reportData.student?.registerNumber})`}
                {reportType === 'subject' && `Subject Report: ${reportData.subject?.code} — ${reportData.subject?.name}`}
                {reportType === 'shortage' && 'Institutional Shortage Audit Report'}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Generated: {new Date(reportData.generatedAt).toLocaleString()}
              </p>
            </div>

            {/* Quick Stat Pill */}
            {reportData.stats && (
              <div className="flex items-center gap-3 bg-slate-800/80 p-3 rounded-xl border border-slate-700/60 text-xs text-slate-300">
                <div>
                  <span className="text-slate-400 block text-[10px]">Average</span>
                  <strong className="text-white text-base">{reportData.stats.averagePercentage}%</strong>
                </div>
                <div className="h-6 w-px bg-slate-700"></div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Shortages</span>
                  <strong className="text-rose-400 text-base">{reportData.stats.shortageCount}</strong>
                </div>
              </div>
            )}

            {reportData.overall && (
              <div className="flex items-center gap-3 bg-slate-800/80 p-3 rounded-xl border border-slate-700/60 text-xs text-slate-300">
                <div>
                  <span className="text-slate-400 block text-[10px]">Overall</span>
                  <strong className="text-white text-base">{reportData.overall.overallPercentage}%</strong>
                </div>
                <div className="h-6 w-px bg-slate-700"></div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Status</span>
                  <strong className="text-emerald-400 text-base">{reportData.overall.status}</strong>
                </div>
              </div>
            )}
          </div>

          {/* TABLE FOR CLASS REPORT */}
          {reportType === 'class' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800 text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-3">Register No</th>
                    <th className="py-3 px-3">Student Name</th>
                    <th className="py-3 px-3">Section</th>
                    <th className="py-3 px-3 text-center">Attended / Total</th>
                    <th className="py-3 px-3 text-center">Percentage</th>
                    <th className="py-3 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {reportData.students?.map((s) => (
                    <tr key={s.studentId} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-200">{s.registerNumber}</td>
                      <td className="py-2.5 px-3 font-medium text-white">{s.name}</td>
                      <td className="py-2.5 px-3 text-slate-400">{s.sectionName}</td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-300">{s.totalAttended} / {s.totalConducted}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-white">{s.overallPercentage}%</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${s.overallPercentage < 75 ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TABLE FOR STUDENT REPORT */}
          {reportType === 'student' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800 text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-3">Course Code</th>
                    <th className="py-3 px-3">Subject Name</th>
                    <th className="py-3 px-3">Faculty</th>
                    <th className="py-3 px-3 text-center">Conducted</th>
                    <th className="py-3 px-3 text-center">Attended</th>
                    <th className="py-3 px-3 text-center">Percentage</th>
                    <th className="py-3 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {reportData.subjects?.map((sub) => (
                    <tr key={sub.subjectId} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-mono font-semibold text-emerald-400">{sub.subjectCode}</td>
                      <td className="py-2.5 px-3 font-medium text-white">{sub.subjectName}</td>
                      <td className="py-2.5 px-3 text-slate-400">{sub.facultyName}</td>
                      <td className="py-2.5 px-3 text-center font-mono">{sub.conducted}</td>
                      <td className="py-2.5 px-3 text-center font-mono text-emerald-400">{sub.attended}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-white">{sub.percentage}%</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${sub.isShortage ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                          {sub.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TABLE FOR SUBJECT REPORT */}
          {reportType === 'subject' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800 text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-3">Register No</th>
                    <th className="py-3 px-3">Student Name</th>
                    <th className="py-3 px-3">Class</th>
                    <th className="py-3 px-3 text-center">Attended / Total</th>
                    <th className="py-3 px-3 text-center">Percentage</th>
                    <th className="py-3 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {reportData.students?.map((st) => (
                    <tr key={st.studentId} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-200">{st.registerNumber}</td>
                      <td className="py-2.5 px-3 font-medium text-white">{st.name}</td>
                      <td className="py-2.5 px-3 text-slate-400">{st.className} ({st.sectionName})</td>
                      <td className="py-2.5 px-3 text-center font-mono">{st.attended} / {st.conducted}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-white">{st.percentage}%</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${st.percentage < 75 ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                          {st.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TABLE FOR SHORTAGE REPORT */}
          {reportType === 'shortage' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800 text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-3">Register No</th>
                    <th className="py-3 px-3">Student Name</th>
                    <th className="py-3 px-3">Department</th>
                    <th className="py-3 px-3">Class</th>
                    <th className="py-3 px-3">Course</th>
                    <th className="py-3 px-3 text-center">Attended / Total</th>
                    <th className="py-3 px-3 text-center">Percentage</th>
                    <th className="py-3 px-3 text-center">Recovery Classes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {reportData.shortages?.map((sh, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-200">{sh.registerNumber}</td>
                      <td className="py-2.5 px-3 font-medium text-white">{sh.name}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-400">{sh.departmentCode || sh.department}</td>
                      <td className="py-2.5 px-3 text-slate-400">{sh.className} ({sh.sectionName})</td>
                      <td className="py-2.5 px-3 text-white">{sh.subjectCode} - {sh.subjectName}</td>
                      <td className="py-2.5 px-3 text-center font-mono">{sh.attended} / {sh.conducted}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-rose-400">{sh.percentage}%</td>
                      <td className="py-2.5 px-3 text-center text-emerald-400 font-bold">+{sh.classesToRecover} classes</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
