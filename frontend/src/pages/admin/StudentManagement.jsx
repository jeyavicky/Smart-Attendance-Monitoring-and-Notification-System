import React, { useState, useEffect, useCallback } from 'react';
import {
  studentApi,
  departmentApi,
  academicYearApi,
  classApi,
  sectionApi,
} from '../../api/academicApi';
import DataTable from '../../components/common/DataTable';
import Pagination from '../../components/common/Pagination';
import SearchInput from '../../components/common/SearchInput';
import FormModal from '../../components/common/FormModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import {
  GraduationCap,
  Plus,
  Edit2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Mail,
  Phone,
} from 'lucide-react';

export default function StudentManagement() {
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalItems: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    department: '',
    year: '',
    semester: '',
    section: '',
  });

  // Reference lists for dropdowns and dependent selections
  const [departments, setDepartments] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [allClasses, setAllClasses] = useState([]);
  const [allSections, setAllSections] = useState([]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    registerNumber: '',
    name: '',
    email: '',
    phone: '',
    departmentId: '',
    academicYearId: '',
    classId: '',
    sectionId: '',
    initialPassword: 'StudentPassword123!',
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Confirm Status Dialog
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, item: null, action: null });
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Load dropdown resources
  useEffect(() => {
    const loadDependencies = async () => {
      try {
        const [deptRes, ayRes, classRes, secRes] = await Promise.all([
          departmentApi.getAll({ limit: 100 }),
          academicYearApi.getAll({ limit: 100 }),
          classApi.getAll({ limit: 100 }),
          sectionApi.getAll({ limit: 100 }),
        ]);
        if (deptRes.success) setDepartments(deptRes.data.items || []);
        if (ayRes.success) setAcademicYears(ayRes.data.items || []);
        if (classRes.success) setAllClasses(classRes.data.items || []);
        if (secRes.success) setAllSections(secRes.data.items || []);
      } catch (err) {
        console.error('Failed to load dependencies:', err);
      }
    };
    loadDependencies();
  }, []);

  const fetchData = useCallback(
    async (page = 1, currentLimit = pagination.limit, query = search, currentFilters = filters) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await studentApi.getAll({
          page,
          limit: currentLimit,
          search: query,
          department: currentFilters.department || undefined,
          year: currentFilters.year || undefined,
          semester: currentFilters.semester || undefined,
          section: currentFilters.section || undefined,
          sortBy: 'registerNumber',
          sortOrder: 'asc',
        });
        if (res.success) {
          setData(res.data.items || []);
          setPagination(res.data.pagination || { page: 1, limit: currentLimit, totalItems: 0, totalPages: 1 });
        }
      } catch (err) {
        setError(err.message || 'Failed to load Student records');
      } finally {
        setIsLoading(false);
      }
    },
    [pagination.limit, search, filters]
  );

  useEffect(() => {
    fetchData(1);
  }, []);

  const handleFilterChange = (key, val) => {
    const updated = { ...filters, [key]: val };
    setFilters(updated);
    fetchData(1, pagination.limit, search, updated);
  };

  // Dependent dropdown filtering for the modal
  const filteredClassesForDept = allClasses.filter((c) => {
    const deptId = c.departmentId?._id || c.departmentId?.id || c.departmentId;
    const ayId = c.academicYearId?._id || c.academicYearId?.id || c.academicYearId;
    const matchDept = !formData.departmentId || deptId === formData.departmentId;
    const matchAy = !formData.academicYearId || ayId === formData.academicYearId;
    return matchDept && matchAy;
  });

  const filteredSectionsForClass = allSections.filter((s) => {
    const classId = s.classId?._id || s.classId?.id || s.classId;
    return !formData.classId || classId === formData.classId;
  });

  const selectedClassObj = allClasses.find(
    (c) => (c.id || c._id) === formData.classId
  );

  const openAddModal = () => {
    setEditingItem(null);
    const defaultAy = academicYears.find((a) => a.isCurrent) || academicYears[0];
    const defaultDept = departments[0];

    setFormData({
      registerNumber: '',
      name: '',
      email: '',
      phone: '',
      departmentId: defaultDept ? defaultDept.id || defaultDept._id : '',
      academicYearId: defaultAy ? defaultAy.id || defaultAy._id : '',
      classId: '',
      sectionId: '',
      initialPassword: 'StudentPassword123!',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      registerNumber: item.registerNumber,
      name: item.name,
      email: item.email,
      phone: item.phone || '',
      departmentId: item.departmentId?._id || item.departmentId?.id || item.departmentId || '',
      academicYearId: item.academicYearId?._id || item.academicYearId?.id || item.academicYearId || '',
      classId: item.classId?._id || item.classId?.id || item.classId || '',
      sectionId: item.sectionId?._id || item.sectionId?.id || item.sectionId || '',
      initialPassword: '',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Handle department change: reset class and section
  const handleDeptSelect = (deptId) => {
    setFormData((prev) => ({
      ...prev,
      departmentId: deptId,
      classId: '',
      sectionId: '',
    }));
  };

  // Handle class change: auto-align section
  const handleClassSelect = (classId) => {
    setFormData((prev) => ({
      ...prev,
      classId,
      sectionId: '',
    }));
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.registerNumber.trim())
      errs.registerNumber = 'Register number is required (e.g. 23IT001)';
    if (!formData.name.trim()) errs.name = 'Student name is required';
    if (!formData.email.trim()) {
      errs.email = 'Email address is required';
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      errs.email = 'Valid institutional email required';
    }
    if (!formData.departmentId) errs.departmentId = 'Department is required';
    if (!formData.academicYearId) errs.academicYearId = 'Academic Year is required';
    if (!formData.classId) errs.classId = 'Class cohort is required';
    if (!formData.sectionId) errs.sectionId = 'Section assignment is required';
    if (!editingItem && (!formData.initialPassword || formData.initialPassword.length < 8)) {
      errs.initialPassword = 'Initial password must be at least 8 characters';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const payload = {
        registerNumber: formData.registerNumber.trim().toUpperCase(),
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        departmentId: formData.departmentId,
        academicYearId: formData.academicYearId,
        classId: formData.classId,
        sectionId: formData.sectionId,
      };

      if (!editingItem) {
        payload.initialPassword = formData.initialPassword;
      }

      if (editingItem) {
        await studentApi.update(editingItem.id || editingItem._id, payload);
        setSuccessMsg(`Student '${payload.name}' updated successfully.`);
      } else {
        await studentApi.create(payload);
        setSuccessMsg(`Student '${payload.name}' registered with user login account.`);
      }
      setIsModalOpen(false);
      fetchData(pagination.page);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setError(err.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!confirmDialog.item) return;
    setIsActionLoading(true);
    try {
      await studentApi.toggleStatus(
        confirmDialog.item.id || confirmDialog.item._id,
        !confirmDialog.item.isActive
      );
      setSuccessMsg(
        `Student '${confirmDialog.item.name}' ${
          confirmDialog.item.isActive ? 'deactivated' : 'activated'
        } successfully.`
      );
      setConfirmDialog({ isOpen: false, item: null, action: null });
      fetchData(pagination.page);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setError(err.message || 'Failed to toggle status');
    } finally {
      setIsActionLoading(false);
    }
  };

  const columns = [
    {
      header: 'Reg. Number',
      accessor: 'registerNumber',
      render: (val) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200 font-mono">
          {val}
        </span>
      ),
    },
    {
      header: 'Student Name',
      accessor: 'name',
      render: (val) => (
        <div className="flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-teal-600 shrink-0" />
          <span className="font-semibold text-slate-900">{val}</span>
        </div>
      ),
    },
    {
      header: 'Email / Phone',
      render: (_, row) => (
        <div className="space-y-0.5 text-xs">
          <div className="flex items-center gap-1.5 text-slate-600">
            <Mail className="w-3.5 h-3.5 text-slate-400" />
            <span>{row.email}</span>
          </div>
          {row.phone && (
            <div className="flex items-center gap-1.5 text-slate-500">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span>{row.phone}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Department',
      accessor: (r) => r.departmentId?.code || '—',
      render: (val) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
          {val}
        </span>
      ),
    },
    {
      header: 'Cohort / Section',
      render: (_, row) => (
        <div className="text-xs">
          <span className="font-medium text-slate-800">
            Year {row.year} &bull; Sem {row.semester}
          </span>
          <span className="ml-1.5 px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-bold border border-slate-200">
            Sec {row.sectionId?.name || 'A'}
          </span>
        </div>
      ),
    },
    {
      header: 'Status',
      render: (_, row) => (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
            row.isActive
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-slate-100 text-slate-600 border border-slate-200'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              row.isActive ? 'bg-emerald-500' : 'bg-slate-400'
            }`}
          />
          {row.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      header: 'Actions',
      align: 'right',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => openEditModal(row)}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
            title="Edit"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() =>
              setConfirmDialog({
                isOpen: true,
                item: row,
                action: row.isActive ? 'deactivate' : 'activate',
              })
            }
            className={`p-1.5 rounded-lg transition ${
              row.isActive
                ? 'text-rose-500 hover:text-rose-700 hover:bg-rose-50'
                : 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50'
            }`}
            title={row.isActive ? 'Deactivate' : 'Activate'}
          >
            {row.isActive ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Student Directory</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage student academic profiles, class cohort assignments, and synced user identities.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl shadow-sm hover:shadow transition"
        >
          <Plus className="w-4 h-4" />
          Add Student
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            fetchData(1, pagination.limit, v, filters);
          }}
          placeholder="Search by name, reg. no., email..."
          className="w-full sm:w-60"
        />

        {/* Department Filter */}
        <select
          value={filters.department}
          onChange={(e) => handleFilterChange('department', e.target.value)}
          aria-label="Filter by department"
          className="bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-500"
        >
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d.id || d._id} value={d.id || d._id}>
              {d.code} - {d.name}
            </option>
          ))}
        </select>

        {/* Year Filter */}
        <select
          value={filters.year}
          onChange={(e) => handleFilterChange('year', e.target.value)}
          aria-label="Filter by year"
          className="bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-500"
        >
          <option value="">All Years</option>
          <option value="1">Year 1</option>
          <option value="2">Year 2</option>
          <option value="3">Year 3</option>
          <option value="4">Year 4</option>
        </select>

        {/* Semester Filter */}
        <select
          value={filters.semester}
          onChange={(e) => handleFilterChange('semester', e.target.value)}
          aria-label="Filter by semester"
          className="bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-500"
        >
          <option value="">All Semesters</option>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
            <option key={s} value={s}>
              Semester {s}
            </option>
          ))}
        </select>

        <button
          onClick={() => fetchData(pagination.page)}
          className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition ml-auto"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        emptyMessage="No students found"
        emptySubtext="Add students with register numbers and class section assignments."
      />

      {/* Pagination */}
      <Pagination
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        totalItems={pagination.totalItems}
        limit={pagination.limit}
        onPageChange={(p) => fetchData(p)}
        onLimitChange={(l) => fetchData(1, l)}
      />

      {/* Add / Edit Modal */}
      <FormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Student Profile' : 'Enroll Student'}
        subtitle="Registers student profile and automatically provisions authenticated user access."
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        submitText={editingItem ? 'Update Student' : 'Enroll Student & Create Account'}
      >
        <div className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Register Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.registerNumber}
                onChange={(e) => setFormData({ ...formData, registerNumber: e.target.value.toUpperCase() })}
                disabled={Boolean(editingItem)}
                placeholder="e.g. 23IT001"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 uppercase font-mono disabled:bg-slate-50 disabled:text-slate-500"
              />
              {formErrors.registerNumber && (
                <p className="text-[11px] text-rose-500 mt-1">{formErrors.registerNumber}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Alex Johnson"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
              {formErrors.name && (
                <p className="text-[11px] text-rose-500 mt-1">{formErrors.name}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Institutional Email <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value.toLowerCase() })}
                placeholder="student@attendance.local"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
              {formErrors.email && (
                <p className="text-[11px] text-rose-500 mt-1">{formErrors.email}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="e.g. +91 9876543210"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>
          </div>

          {/* Academic Hierarchy Dependent Dropdowns */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Academic Cohort Assignment
            </span>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Academic Year <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.academicYearId}
                  onChange={(e) => setFormData({ ...formData, academicYearId: e.target.value, classId: '', sectionId: '' })}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                >
                  <option value="">Select Academic Year</option>
                  {academicYears
                    .filter((ay) => ay.isActive)
                    .map((ay) => (
                      <option key={ay.id || ay._id} value={ay.id || ay._id}>
                        {ay.name} {ay.isCurrent ? '(Current)' : ''}
                      </option>
                    ))}
                </select>
                {formErrors.academicYearId && (
                  <p className="text-[11px] text-rose-500 mt-1">{formErrors.academicYearId}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Department <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.departmentId}
                  onChange={(e) => handleDeptSelect(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                >
                  <option value="">Select Department</option>
                  {departments
                    .filter((d) => d.isActive)
                    .map((d) => (
                      <option key={d.id || d._id} value={d.id || d._id}>
                        {d.code} - {d.name}
                      </option>
                    ))}
                </select>
                {formErrors.departmentId && (
                  <p className="text-[11px] text-rose-500 mt-1">{formErrors.departmentId}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Class Cohort <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.classId}
                  onChange={(e) => handleClassSelect(e.target.value)}
                  disabled={!formData.departmentId}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 disabled:bg-slate-100"
                >
                  <option value="">Select Class Cohort</option>
                  {filteredClassesForDept
                    .filter((c) => c.isActive)
                    .map((c) => (
                      <option key={c.id || c._id} value={c.id || c._id}>
                        {c.name} (Yr {c.year} Sem {c.semester})
                      </option>
                    ))}
                </select>
                {formErrors.classId && (
                  <p className="text-[11px] text-rose-500 mt-1">{formErrors.classId}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Section <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.sectionId}
                  onChange={(e) => setFormData({ ...formData, sectionId: e.target.value })}
                  disabled={!formData.classId}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 disabled:bg-slate-100"
                >
                  <option value="">Select Section</option>
                  {filteredSectionsForClass
                    .filter((s) => s.isActive)
                    .map((s) => (
                      <option key={s.id || s._id} value={s.id || s._id}>
                        Section {s.name} ({s.displayName || `Cap: ${s.capacity || 60}`})
                      </option>
                    ))}
                </select>
                {formErrors.sectionId && (
                  <p className="text-[11px] text-rose-500 mt-1">{formErrors.sectionId}</p>
                )}
              </div>
            </div>

            {selectedClassObj && (
              <div className="text-[11px] text-teal-800 bg-teal-50 border border-teal-200 rounded-lg px-3 py-1.5 font-medium">
                Enrolling into: Year {selectedClassObj.year} &bull; Semester {selectedClassObj.semester}
              </div>
            )}
          </div>

          {!editingItem && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Initial Account Password <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                value={formData.initialPassword}
                onChange={(e) => setFormData({ ...formData, initialPassword: e.target.value })}
                placeholder="At least 8 characters"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
              {formErrors.initialPassword && (
                <p className="text-[11px] text-rose-500 mt-1">{formErrors.initialPassword}</p>
              )}
            </div>
          )}
        </div>
      </FormModal>

      {/* Confirm Deactivation */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, item: null, action: null })}
        onConfirm={handleToggleStatus}
        isLoading={isActionLoading}
        title={
          confirmDialog.action === 'deactivate' ? 'Deactivate Student?' : 'Activate Student?'
        }
        message={`Deactivating '${confirmDialog.item?.name}' will disable their system login access while preserving all historical attendance.`}
        confirmText={confirmDialog.action === 'deactivate' ? 'Deactivate' : 'Activate'}
        isDestructive={confirmDialog.action === 'deactivate'}
      />
    </div>
  );
}
