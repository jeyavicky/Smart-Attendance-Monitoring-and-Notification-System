import React, { useState, useEffect } from 'react';
import { facultyMappingApi } from '../../api/academicApi';
import {
  Users,
  GraduationCap,
  Building2,
  Calendar,
  Layers,
  CheckCircle2,
  Loader2,
  RefreshCw,
} from 'lucide-react';

export default function MyClasses() {
  const [mappings, setMappings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchClasses = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await facultyMappingApi.getMyMappings();
      if (res.success) {
        setMappings(res.data.mappings || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load assigned classes');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  // Group mappings by class and section
  const classMap = new Map();
  mappings.forEach((m) => {
    const key = `${m.classId?._id || m.classId}_${m.sectionId?._id || m.sectionId}`;
    if (!classMap.has(key)) {
      classMap.set(key, {
        classId: m.classId,
        sectionId: m.sectionId,
        department: m.departmentId,
        academicYear: m.academicYearId,
        subjects: [],
      });
    }
    classMap.get(key).subjects.push(m.subjectId);
  });

  const uniqueClassList = Array.from(classMap.values());

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 text-xs font-semibold mb-1 border border-teal-200">
            <Users className="w-3.5 h-3.5 text-teal-600" />
            <span>Assigned Class Batches</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            My Classes & Cohorts
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Student cohorts and sections you are currently assigned to instruct.
          </p>
        </div>

        <button
          onClick={fetchClasses}
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
      ) : uniqueClassList.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {uniqueClassList.map((c, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-teal-400 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200 uppercase font-mono">
                    Year {c.classId?.year} • Sem {c.classId?.semester}
                  </span>
                  <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                    {c.sectionId?.displayName || `Sec ${c.sectionId?.name}`}
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 text-base">
                  {c.classId?.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Department of {c.department?.name || 'Engineering'}
                </p>
              </div>

              <div className="space-y-2 pt-3 border-t border-slate-100">
                <span className="text-[11px] font-semibold text-slate-500 block">
                  Assigned Subjects ({c.subjects.length}):
                </span>
                <div className="space-y-1">
                  {c.subjects.map((sub, sIdx) => (
                    <div
                      key={sIdx}
                      className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded-lg"
                    >
                      <span className="font-semibold text-slate-800 truncate max-w-[180px]">
                        {sub?.subjectName}
                      </span>
                      <span className="font-mono text-[11px] font-bold text-teal-700">
                        {sub?.subjectCode}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Class Capacity: {c.sectionId?.capacity || 60} Students</span>
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Active
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
          <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No classes assigned</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            You do not currently have any class batches assigned. Academic admin allocates classes via Faculty Mapping.
          </p>
        </div>
      )}
    </div>
  );
}
