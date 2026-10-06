import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  Users,
  TrendingUp,
  Download,
  Building2,
  BookOpen,
  Layers,
} from 'lucide-react';
import attendanceApi from '../../api/attendanceApi';
import { departmentApi, classApi, subjectApi } from '../../api/academicApi';

export default function ShortageList() {
  const [shortages, setShortages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter options
  const [departments, setDepartments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);

  // Selected filters
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTier, setSelectedTier] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Initial Load: Filter Options
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [deptRes, clsRes, subRes] = await Promise.all([
          departmentApi.getAll({ limit: 100 }),
          classApi.getAll({ limit: 100 }),
          subjectApi.getAll({ limit: 100 }),
        ]);
        setDepartments(deptRes.data || []);
        setClasses(clsRes.data || []);
        setSubjects(subRes.data || []);
      } catch (err) {
        console.error('Failed to load filter options:', err);
      }
    };
    fetchOptions();
  }, []);

  // 2. Fetch Shortage List
  const fetchShortages = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (selectedDept) params.departmentId = selectedDept;
      if (selectedClass) params.classId = selectedClass;
      if (selectedSubject) params.subjectId = selectedSubject;
      if (selectedTier) params.statusTier = selectedTier;

      const res = await attendanceApi.getShortageList(params);
      setShortages(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch shortage roster');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShortages();
  }, [selectedDept, selectedClass, selectedSubject, selectedTier]);

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
            <ShieldAlert className="w-6 h-6 text-rose-400" /> Institutional Shortage List
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            System-wide detection of students with attendance below 75% across academic departments.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-xs font-semibold text-slate-300">
          Total Flagged Entries:{' '}
          <span className="text-rose-400 font-bold text-sm ml-1">
            {shortages.length}
          </span>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
          {error}
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Department */}
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d._id} value={d._id}>
                {d.name} ({d.code})
              </option>
            ))}
          </select>

          {/* Class */}
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="">All Cohorts</option>
            {classes.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Subject */}
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="">All Subjects</option>
            {subjects.map((s) => (
              <option key={s._id} value={s._id}>
                {s.subjectCode} — {s.subjectName}
              </option>
            ))}
          </select>

          {/* Status Tier */}
          <select
            value={selectedTier}
            onChange={(e) => setSelectedTier(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="">All Shortage Tiers</option>
            <option value="CRITICAL">Critical (&lt; 65%)</option>
            <option value="WARNING">Warning (65% – 74.9%)</option>
            <option value="CAUTION">Caution (75% – 79.9%)</option>
          </select>
        </div>

        {/* Search Input */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative w-full max-w-sm">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by student or course..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {(selectedDept || selectedClass || selectedSubject || selectedTier || searchTerm) && (
            <button
              onClick={() => {
                setSelectedDept('');
                setSelectedClass('');
                setSelectedSubject('');
                setSelectedTier('');
                setSearchTerm('');
              }}
              className="text-xs text-slate-400 hover:text-white transition-colors underline"
            >
              Reset All Filters
            </button>
          )}
        </div>
      </div>

      {/* Shortages Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12">
            <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-slate-400 text-sm">Scanning institutional records...</p>
          </div>
        ) : filteredShortages.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <Users className="w-12 h-12 text-emerald-400 mb-3" />
            <p className="text-white font-semibold">No attendance shortage entries</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              All students matching the selected query maintain regular attendance &ge; 75%.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Register No</th>
                  <th className="py-3.5 px-4">Student Name</th>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4">Cohort</th>
                  <th className="py-3.5 px-4">Course</th>
                  <th className="py-3.5 px-4 text-center">Attended / Total</th>
                  <th className="py-3.5 px-4 text-center">Percentage</th>
                  <th className="py-3.5 px-4 text-center">Tier</th>
                  <th className="py-3.5 px-4 text-center">Required Recovery</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredShortages.map((s, idx) => (
                  <tr key={`${s.studentId}_${s.subjectCode}_${idx}`} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-200">
                      {s.registerNumber}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-white">{s.name}</td>
                    <td className="py-3.5 px-4 text-xs text-slate-400 font-mono">
                      {s.departmentCode || s.department}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-300 whitespace-nowrap">
                      {s.className} ({s.sectionName})
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">{s.subjectCode}</div>
                      <div className="text-xs text-slate-400 truncate max-w-[160px]">{s.subjectName}</div>
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
