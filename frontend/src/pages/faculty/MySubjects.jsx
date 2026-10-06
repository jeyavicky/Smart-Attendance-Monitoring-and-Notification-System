import React, { useState, useEffect } from 'react';
import { facultyMappingApi } from '../../api/academicApi';
import {
  BookOpen,
  GraduationCap,
  Building2,
  Calendar,
  Layers,
  CheckCircle2,
  Loader2,
  RefreshCw,
} from 'lucide-react';

export default function MySubjects() {
  const [mappings, setMappings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSubjects = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await facultyMappingApi.getMyMappings();
      if (res.success) {
        setMappings(res.data.mappings || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load assigned subjects');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 text-xs font-semibold mb-1 border border-teal-200">
            <BookOpen className="w-3.5 h-3.5 text-teal-600" />
            <span>Curriculum Allocation</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            My Allocated Subjects
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Academic courses, syllabus credits, and sections under your instruction.
          </p>
        </div>

        <button
          onClick={fetchSubjects}
          disabled={isLoading}
          className="p-2 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-sm transition-all self-start sm:self-auto"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-teal-600' : ''}`} />
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
        </div>
      ) : mappings.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {mappings.map((m) => (
            <div
              key={m._id || m.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-teal-400 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200">
                    {m.subjectId?.subjectCode}
                  </span>
                  <span className="text-xs font-bold text-slate-600">
                    {m.subjectId?.credits} Credits
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 text-base">
                  {m.subjectId?.subjectName}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Type: {m.subjectId?.subjectType || 'Core Course'} • Semester {m.subjectId?.semester}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 text-xs space-y-1.5">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-slate-500">Assigned Cohort:</span>
                  <span className="font-semibold text-slate-900">{m.classId?.name}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-slate-500">Section:</span>
                  <span className="font-semibold text-teal-800">{m.sectionId?.displayName || `Sec ${m.sectionId?.name}`}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-slate-500">Academic Year:</span>
                  <span className="font-mono text-[11px] text-slate-700">{m.academicYearId?.name}</span>
                </div>
              </div>

              <div className="pt-2 text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Active Assignment
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No subjects allocated</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            You do not currently have any subjects allocated. Once allocated by administration, courses will display here.
          </p>
        </div>
      )}
    </div>
  );
}
