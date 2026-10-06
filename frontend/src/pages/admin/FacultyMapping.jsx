import React, { useState, useEffect, useCallback } from 'react';
import {
  facultyMappingApi,
  facultyApi,
  subjectApi,
  classApi,
  sectionApi,
  departmentApi,
  academicYearApi,
} from '../../api/academicApi';
import DataTable from '../../components/common/DataTable';
import Pagination from '../../components/common/Pagination';
import SearchInput from '../../components/common/SearchInput';
import FormModal from '../../components/common/FormModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  BookOpen,
  GraduationCap,
  Building2,
  Calendar,
  Layers,
  BarChart2,
} from 'lucide-react';

export default function FacultyMapping() {
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalItems: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    department: '',
    classId: '',
    facultyId: '',
    status: '',
  });

  // Dropdown lists
  const [departments, setDepartments] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [facultyList, setFacultyList] = useState([]);

  // Workload summary
  const [workloadData, setWorkloadData] = useState([]);
  const [showWorkload, setShowWorkload] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    facultyId: '',
    subjectId: '',
    classId: '',
    sectionId: '',
    departmentId: '',
    academicYearId: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Status & Delete Dialogs
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, item: null, action: null });
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Load all master dropdowns once
  useEffect(() => {
    const loadPrerequisites = async () => {
      try {
        const [deptRes, ayRes, classRes, secRes, subRes, facRes] = await Promise.all([
          departmentApi.getAll({ limit: 100 }),
          academicYearApi.getAll({ limit: 100 }),
          classApi.getAll({ limit: 100 }),
          sectionApi.getAll({ limit: 100 }),
          subjectApi.getAll({ limit: 100 }),
          facultyApi.getAll({ limit: 100 }),
        ]);

        if (deptRes.success) setDepartments(deptRes.data.items || []);
        if (ayRes.success) setAcademicYears(ayRes.data.items || []);
        if (classRes.success) setClasses(classRes.data.items || []);
        if (secRes.success) setSections(secRes.data.items || []);
        if (subRes.success) setSubjects(subRes.data.items || []);
        if (facRes.success) setFacultyList(facRes.data.items || []);
      } catch (err) {
        console.error('Failed to load master dropdown prerequisites:', err);
      }
    };
    loadPrerequisites();
  }, []);

  const fetchData = useCallback(
    async (page = 1, currentLimit = pagination.limit, query = search, currentFilters = filters) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await facultyMappingApi.getAll({
          page,
          limit: currentLimit,
          search: query,
          department: currentFilters.department || undefined,
          classId: currentFilters.classId || undefined,
          facultyId: currentFilters.facultyId || undefined,
          status: currentFilters.status || undefined,
          sortBy: 'createdAt',
          sortOrder: 'desc',
        });
        if (res.success) {
          setData(res.data.items || []);
          setPagination(res.data.pagination || { page: 1, limit: currentLimit, totalItems: 0, totalPages: 1 });
        }
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to retrieve faculty mappings');
      } finally {
        setIsLoading(false);
      }
    },
    [search, filters, pagination.limit]
  );

  const fetchWorkload = async () => {
    try {
      const res = await facultyMappingApi.getWorkload();
      if (res.success) {
        setWorkloadData(res.data || []);
      }
    } catch (err) {
      console.error('Failed to retrieve faculty workload summary:', err);
    }
  };

  useEffect(() => {
    fetchData(pagination.page, pagination.limit, search, filters);
  }, [fetchData, pagination.page, pagination.limit, search, filters]);

  const handleSearchChange = (val) => {
    setSearch(val);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const resetFilters = () => {
    setFilters({ department: '', classId: '', facultyId: '', status: '' });
    setSearch('');
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Modal Open Handlers
  const handleOpenAddModal = () => {
    setEditingItem(null);
    const defaultAy = academicYears.find((ay) => ay.isCurrent) || academicYears[0];
    setFormData({
      facultyId: '',
      subjectId: '',
      classId: '',
      sectionId: '',
      departmentId: '',
      academicYearId: defaultAy?._id || defaultAy?.id || '',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      facultyId: item.facultyId?._id || item.facultyId?.id || item.facultyId || '',
      subjectId: item.subjectId?._id || item.subjectId?.id || item.subjectId || '',
      classId: item.classId?._id || item.classId?.id || item.classId || '',
      sectionId: item.sectionId?._id || item.sectionId?.id || item.sectionId || '',
      departmentId: item.departmentId?._id || item.departmentId?.id || item.departmentId || '',
      academicYearId: item.academicYearId?._id || item.academicYearId?.id || item.academicYearId || '',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Cascading helpers in Modal
  const selectedClass = classes.find(
    (c) => (c._id || c.id) === formData.classId
  );

  // Available sections for chosen class
  const availableSections = sections.filter((s) => {
    const sClassId = s.classId?._id || s.classId?.id || s.classId;
    return sClassId === formData.classId;
  });

  // Available subjects for chosen class (matches department and semester!)
  const availableSubjects = subjects.filter((s) => {
    const sDeptId = s.departmentId?._id || s.departmentId?.id || s.departmentId;
    if (selectedClass) {
      const clsDeptId = selectedClass.departmentId?._id || selectedClass.departmentId?.id || selectedClass.departmentId;
      return sDeptId === clsDeptId && s.semester === selectedClass.semester;
    }
    if (formData.departmentId) {
      return sDeptId === formData.departmentId;
    }
    return true;
  });

  // Available faculty (preferably matching department if selected)
  const availableFaculty = facultyList.filter((f) => {
    if (!formData.departmentId) return true;
    const fDeptId = f.departmentId?._id || f.departmentId?.id || f.departmentId;
    return fDeptId === formData.departmentId;
  });

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };

      // If class changes, auto-set department & academic year from class
      if (name === 'classId') {
        const cls = classes.find((c) => (c._id || c.id) === value);
        if (cls) {
          updated.departmentId = cls.departmentId?._id || cls.departmentId?.id || cls.departmentId;
          updated.academicYearId = cls.academicYearId?._id || cls.academicYearId?.id || cls.academicYearId;
          updated.sectionId = '';
          updated.subjectId = '';
        }
      }
      return updated;
    });

    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.facultyId) errors.facultyId = 'Faculty selection is required';
    if (!formData.classId) errors.classId = 'Class cohort is required';
    if (!formData.sectionId) errors.sectionId = 'Section is required';
    if (!formData.subjectId) errors.subjectId = 'Subject course is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setFormErrors({});
    try {
      if (editingItem) {
        await facultyMappingApi.update(editingItem.id || editingItem._id, formData);
        setSuccessMsg('Faculty mapping updated successfully');
      } else {
        await facultyMappingApi.create(formData);
        setSuccessMsg('Faculty mapped to subject and section successfully');
      }
      setIsModalOpen(false);
      fetchData(pagination.page, pagination.limit, search, filters);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Operation failed';
      setFormErrors({ submit: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Status toggle handler
  const handleToggleStatus = async () => {
    if (!confirmDialog.item) return;
    setIsActionLoading(true);
    try {
      const newStatus = !confirmDialog.item.isActive;
      await facultyMappingApi.toggleStatus(confirmDialog.item.id || confirmDialog.item._id, newStatus);
      setSuccessMsg(`Faculty mapping ${newStatus ? 'activated' : 'deactivated'} successfully`);
      fetchData(pagination.page, pagination.limit, search, filters);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update status');
    } finally {
      setIsActionLoading(false);
      setConfirmDialog({ isOpen: false, item: null, action: null });
    }
  };

  // Delete handler
  const handleDelete = async () => {
    if (!confirmDialog.item) return;
    setIsActionLoading(true);
    try {
      await facultyMappingApi.delete(confirmDialog.item.id || confirmDialog.item._id);
      setSuccessMsg('Faculty mapping deleted successfully');
      fetchData(pagination.page, pagination.limit, search, filters);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete mapping');
    } finally {
      setIsActionLoading(false);
      setConfirmDialog({ isOpen: false, item: null, action: null });
    }
  };

  const columns = [
    {
      header: 'Faculty Member',
      accessor: 'facultyId',
      render: (item) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 font-bold text-xs flex items-center justify-center shrink-0">
            {item.facultyId?.name ? item.facultyId.name.charAt(0).toUpperCase() : 'F'}
          </div>
          <div>
            <div className="font-semibold text-slate-900 text-xs sm:text-sm">
              {item.facultyId?.name || 'Unknown Faculty'}
            </div>
            <div className="text-[11px] font-mono text-slate-500">
              {item.facultyId?.employeeId || '—'}
            </div>
          </div>
        </div>
      ),
    },
    {
      header: 'Subject / Course',
      accessor: 'subjectId',
      render: (item) => (
        <div>
          <div className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
            <span className="font-mono text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
              {item.subjectId?.subjectCode}
            </span>
            <span className="truncate max-w-[180px]">{item.subjectId?.subjectName}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {item.subjectId?.credits} Credits • {item.subjectId?.subjectType || 'Core'}
          </div>
        </div>
      ),
    },
    {
      header: 'Class & Section',
      accessor: 'classId',
      render: (item) => (
        <div>
          <div className="font-medium text-slate-800 text-xs">
            {item.classId?.name || 'Class cohort'}
          </div>
          <div className="text-[11px] text-slate-500 font-semibold">
            {item.sectionId?.displayName || `Sec ${item.sectionId?.name}`}
          </div>
        </div>
      ),
    },
    {
      header: 'Department & AY',
      accessor: 'departmentId',
      render: (item) => (
        <div>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700">
            {item.departmentId?.code || 'DEPT'}
          </span>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {item.academicYearId?.name || 'AY'}
          </div>
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: 'isActive',
      render: (item) =>
        item.isActive ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Active
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-300">
            <XCircle className="w-3 h-3 text-slate-400" />
            Inactive
          </span>
        ),
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (item) => (
        <div className="flex items-center gap-1.5 justify-end">
          <button
            onClick={() => handleOpenEditModal(item)}
            className="p-1.5 text-slate-600 hover:text-teal-700 hover:bg-slate-100 rounded-lg transition-colors"
            title="Edit Mapping"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() =>
              setConfirmDialog({
                isOpen: true,
                item,
                action: 'toggle',
              })
            }
            className={`p-1.5 rounded-lg transition-colors ${
              item.isActive
                ? 'text-amber-600 hover:bg-amber-50'
                : 'text-emerald-600 hover:bg-emerald-50'
            }`}
            title={item.isActive ? 'Deactivate' : 'Activate'}
          >
            {item.isActive ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          </button>
          <button
            onClick={() =>
              setConfirmDialog({
                isOpen: true,
                item,
                action: 'delete',
              })
            }
            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            title="Delete Mapping"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 text-xs font-semibold mb-1 border border-teal-200">
            <Users className="w-3.5 h-3.5 text-teal-600" />
            <span>Academic Allocation Module</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Faculty Subject Mapping
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Assign instructors to curriculum courses and class cohort sections.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              if (!showWorkload) fetchWorkload();
              setShowWorkload(!showWorkload);
            }}
            className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-sm transition-all flex items-center gap-1.5"
          >
            <BarChart2 className="w-4 h-4 text-teal-600" />
            <span>{showWorkload ? 'Hide Workload' : 'View Workload'}</span>
          </button>

          <button
            onClick={() => fetchData(pagination.page, pagination.limit, search, filters)}
            disabled={isLoading}
            className="p-2 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-sm transition-all disabled:opacity-50"
            title="Refresh Table"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-teal-600' : ''}`} />
          </button>

          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-sm shadow-teal-600/20 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Map Faculty</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-600 hover:text-rose-800 font-bold">
            ×
          </button>
        </div>
      )}

      {/* Faculty Workload Summary Cards (Collapsible) */}
      {showWorkload && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-teal-600" />
              Faculty Allocation & Weekly Workload Overview
            </h3>
            <span className="text-xs text-slate-500">{workloadData.length} Active Faculty Members</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {workloadData.map((w) => (
              <div key={w.facultyId} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-slate-800 text-xs">{w.name}</span>
                  <span className="text-[10px] font-mono text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                    {w.employeeId}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2 text-center text-[11px]">
                  <div className="bg-white p-1.5 rounded-lg border border-slate-200">
                    <div className="font-bold text-teal-700">{w.totalMappings}</div>
                    <div className="text-[10px] text-slate-500">Mappings</div>
                  </div>
                  <div className="bg-white p-1.5 rounded-lg border border-slate-200">
                    <div className="font-bold text-indigo-700">{w.uniqueSections}</div>
                    <div className="text-[10px] text-slate-500">Batches</div>
                  </div>
                  <div className="bg-white p-1.5 rounded-lg border border-slate-200">
                    <div className="font-bold text-amber-700">{w.weeklyPeriods}</div>
                    <div className="text-[10px] text-slate-500">Periods/Wk</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search & Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="lg:col-span-2">
            <SearchInput
              value={search}
              onChange={handleSearchChange}
              placeholder="Search faculty name, subject code..."
            />
          </div>

          <div>
            <select
              name="department"
              value={filters.department}
              onChange={handleFilterChange}
              className="w-full text-xs font-medium text-slate-700 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d._id || d.id} value={d._id || d.id}>
                  {d.code} - {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              name="classId"
              value={filters.classId}
              onChange={handleFilterChange}
              className="w-full text-xs font-medium text-slate-700 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
            >
              <option value="">All Class Cohorts</option>
              {classes.map((c) => (
                <option key={c._id || c.id} value={c._id || c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="w-full text-xs font-medium text-slate-700 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
            >
              <option value="">All Statuses</option>
              <option value="true">Active Only</option>
              <option value="false">Inactive Only</option>
            </select>
          </div>
        </div>

        {(filters.department || filters.classId || filters.status || search) && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-500">Filtered View Active</span>
            <button
              onClick={resetFilters}
              className="text-teal-700 hover:text-teal-900 font-semibold text-xs"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>

      {/* Main Table */}
      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        emptyMessage="No faculty subject mappings recorded. Click 'Map Faculty' to assign teaching responsibilities."
      />

      {/* Pagination Controls */}
      <Pagination
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        totalItems={pagination.totalItems}
        limit={pagination.limit}
        onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
        onLimitChange={(l) => setPagination((prev) => ({ ...prev, limit: l, page: 1 }))}
      />

      {/* Modal Dialog: Add / Edit Mapping */}
      <FormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Faculty Assignment' : 'Assign Faculty to Subject & Class'}
        isSubmitting={isSubmitting}
      >
        <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
          {formErrors.submit && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{formErrors.submit}</span>
            </div>
          )}

          {/* Class Cohort Selection */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Class Cohort <span className="text-rose-500">*</span>
            </label>
            <select
              name="classId"
              value={formData.classId}
              onChange={handleFormChange}
              className="w-full text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            >
              <option value="">-- Select Class Cohort --</option>
              {classes.map((cls) => (
                <option key={cls._id || cls.id} value={cls._id || cls.id}>
                  {cls.name} (Sem {cls.semester})
                </option>
              ))}
            </select>
            {formErrors.classId && (
              <p className="text-rose-600 text-[11px] mt-1">{formErrors.classId}</p>
            )}
          </div>

          {/* Section Selection */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Section <span className="text-rose-500">*</span>
            </label>
            <select
              name="sectionId"
              value={formData.sectionId}
              onChange={handleFormChange}
              disabled={!formData.classId}
              className="w-full text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 disabled:bg-slate-100 disabled:text-slate-400"
            >
              <option value="">
                {formData.classId ? '-- Select Section --' : '-- Choose Class First --'}
              </option>
              {availableSections.map((sec) => (
                <option key={sec._id || sec.id} value={sec._id || sec.id}>
                  {sec.displayName || `Section ${sec.name}`} (Cap: {sec.capacity || 60})
                </option>
              ))}
            </select>
            {formErrors.sectionId && (
              <p className="text-rose-600 text-[11px] mt-1">{formErrors.sectionId}</p>
            )}
          </div>

          {/* Subject Course Selection */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Subject Course <span className="text-rose-500">*</span>
            </label>
            <select
              name="subjectId"
              value={formData.subjectId}
              onChange={handleFormChange}
              disabled={!formData.classId}
              className="w-full text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 disabled:bg-slate-100 disabled:text-slate-400"
            >
              <option value="">
                {formData.classId
                  ? '-- Select Semester-Matching Subject --'
                  : '-- Choose Class First --'}
              </option>
              {availableSubjects.map((sub) => (
                <option key={sub._id || sub.id} value={sub._id || sub.id}>
                  {sub.subjectCode} - {sub.subjectName} ({sub.credits} credits)
                </option>
              ))}
            </select>
            {formErrors.subjectId && (
              <p className="text-rose-600 text-[11px] mt-1">{formErrors.subjectId}</p>
            )}
            {selectedClass && (
              <p className="text-[11px] text-slate-500 mt-1">
                Showing courses mapped for Semester {selectedClass.semester}.
              </p>
            )}
          </div>

          {/* Faculty Selection */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Assigned Faculty Member <span className="text-rose-500">*</span>
            </label>
            <select
              name="facultyId"
              value={formData.facultyId}
              onChange={handleFormChange}
              className="w-full text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            >
              <option value="">-- Select Faculty Instructor --</option>
              {availableFaculty.map((f) => (
                <option key={f._id || f.id} value={f._id || f.id}>
                  {f.name} ({f.employeeId}) • {f.departmentId?.code || 'Dept'}
                </option>
              ))}
            </select>
            {formErrors.facultyId && (
              <p className="text-rose-600 text-[11px] mt-1">{formErrors.facultyId}</p>
            )}
          </div>

          {/* Footer Submit Buttons */}
          <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>{editingItem ? 'Update Assignment' : 'Create Mapping'}</span>
            </button>
          </div>
        </form>
      </FormModal>

      {/* Confirmation Dialog for Status or Delete */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, item: null, action: null })}
        onConfirm={confirmDialog.action === 'delete' ? handleDelete : handleToggleStatus}
        isLoading={isActionLoading}
        title={
          confirmDialog.action === 'delete'
            ? 'Delete Faculty Mapping'
            : `${confirmDialog.item?.isActive ? 'Deactivate' : 'Activate'} Faculty Mapping`
        }
        message={
          confirmDialog.action === 'delete'
            ? `Are you sure you want to permanently delete the assignment of ${confirmDialog.item?.facultyId?.name} for ${confirmDialog.item?.subjectId?.subjectCode}? This will fail if timetable entries are scheduled.`
            : `Are you sure you want to ${confirmDialog.item?.isActive ? 'deactivate' : 'activate'} this faculty mapping? Inactive mappings cannot have new timetable periods scheduled.`
        }
        confirmText={
          confirmDialog.action === 'delete'
            ? 'Yes, Delete'
            : confirmDialog.item?.isActive
            ? 'Yes, Deactivate'
            : 'Yes, Activate'
        }
        type={confirmDialog.action === 'delete' || confirmDialog.item?.isActive ? 'danger' : 'info'}
      />
    </div>
  );
}
