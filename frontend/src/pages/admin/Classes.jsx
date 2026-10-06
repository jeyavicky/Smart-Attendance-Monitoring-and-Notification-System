import React, { useState, useEffect, useCallback } from 'react';
import { classApi, departmentApi, academicYearApi } from '../../api/academicApi';
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
  Filter,
} from 'lucide-react';

export default function Classes() {
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalItems: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    department: '',
    academicYear: '',
    year: '',
    semester: '',
  });

  // Master Dropdown Options
  const [departments, setDepartments] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    departmentId: '',
    academicYearId: '',
    year: 1,
    semester: 1,
    programme: 'B.Tech',
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Confirm Status Dialog
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, item: null, action: null });
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Load departments and academic years for dropdowns
  useEffect(() => {
    const loadDropdownOptions = async () => {
      try {
        const [deptRes, ayRes] = await Promise.all([
          departmentApi.getAll({ limit: 100 }),
          academicYearApi.getAll({ limit: 100 }),
        ]);
        if (deptRes.success) setDepartments(deptRes.data.items || []);
        if (ayRes.success) setAcademicYears(ayRes.data.items || []);
      } catch (err) {
        console.error('Failed to load filter options:', err);
      }
    };
    loadDropdownOptions();
  }, []);

  const fetchData = useCallback(
    async (page = 1, currentLimit = pagination.limit, query = search, currentFilters = filters) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await classApi.getAll({
          page,
          limit: currentLimit,
          search: query,
          department: currentFilters.department || undefined,
          academicYear: currentFilters.academicYear || undefined,
          year: currentFilters.year || undefined,
          semester: currentFilters.semester || undefined,
          sortBy: 'year',
          sortOrder: 'asc',
        });
        if (res.success) {
          setData(res.data.items || []);
          setPagination(res.data.pagination || { page: 1, limit: currentLimit, totalItems: 0, totalPages: 1 });
        }
      } catch (err) {
        setError(err.message || 'Failed to load Classes');
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

  const openAddModal = () => {
    setEditingItem(null);
    const defaultAy = academicYears.find((a) => a.isCurrent) || academicYears[0];
    const defaultDept = departments[0];

    setFormData({
      name: '',
      departmentId: defaultDept ? defaultDept.id || defaultDept._id : '',
      academicYearId: defaultAy ? defaultAy.id || defaultAy._id : '',
      year: 1,
      semester: 1,
      programme: 'B.Tech',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name || '',
      departmentId: item.departmentId?._id || item.departmentId?.id || item.departmentId || '',
      academicYearId: item.academicYearId?._id || item.academicYearId?.id || item.academicYearId || '',
      year: item.year,
      semester: item.semester,
      programme: item.programme || 'B.Tech',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // When study year changes, validate and constrain semester
  const handleYearChange = (yearVal) => {
    const newYear = Number(yearVal);
    const sem1 = (newYear - 1) * 2 + 1;
    setFormData((prev) => ({
      ...prev,
      year: newYear,
      semester: sem1, // automatically default to first semester of that year
    }));
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.departmentId) errs.departmentId = 'Department is required';
    if (!formData.academicYearId) errs.academicYearId = 'Academic Year is required';
    if (!formData.year) errs.year = 'Study year is required';
    if (!formData.semester) errs.semester = 'Semester is required';

    const minSem = (formData.year - 1) * 2 + 1;
    const maxSem = formData.year * 2;
    if (formData.semester < minSem || formData.semester > maxSem) {
      errs.semester = `Year ${formData.year} must be Semester ${minSem} or ${maxSem}`;
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
      if (editingItem) {
        await classApi.update(editingItem.id || editingItem._id, formData);
        setSuccessMsg(`Class cohort updated successfully.`);
      } else {
        await classApi.create(formData);
        setSuccessMsg(`Class cohort created successfully.`);
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
      await classApi.toggleStatus(
        confirmDialog.item.id || confirmDialog.item._id,
        !confirmDialog.item.isActive
      );
      setSuccessMsg(
        `Class cohort ${confirmDialog.item.isActive ? 'deactivated' : 'activated'} successfully.`
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
      header: 'Class Cohort',
      accessor: 'name',
      render: (val, row) => (
        <div>
          <span className="font-semibold text-slate-900 block">{val}</span>
          <span className="text-[11px] text-slate-500">
            {row.programme || 'B.Tech'} &bull; Year {row.year} (Sem {row.semester})
          </span>
        </div>
      ),
    },
    {
      header: 'Department',
      accessor: (r) => r.departmentId?.name || r.departmentId?.code || '—',
      render: (_, row) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
          {row.departmentId?.code || 'DEPT'}
        </span>
      ),
    },
    {
      header: 'Academic Year',
      accessor: (r) => r.academicYearId?.name || '—',
    },
    {
      header: 'Year / Sem',
      render: (_, row) => (
        <span className="text-xs text-slate-700 font-medium">
          Year {row.year} &bull; Sem {row.semester}
        </span>
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
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Classes</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage student cohorts, year-semester levels, and academic degree tracks.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl shadow-sm hover:shadow transition"
        >
          <Plus className="w-4 h-4" />
          Add Class
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
          placeholder="Search classes..."
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

        {/* Academic Year Filter */}
        <select
          value={filters.academicYear}
          onChange={(e) => handleFilterChange('academicYear', e.target.value)}
          aria-label="Filter by academic year"
          className="bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-500"
        >
          <option value="">All Academic Years</option>
          {academicYears.map((ay) => (
            <option key={ay.id || ay._id} value={ay.id || ay._id}>
              {ay.name} {ay.isCurrent ? '(Current)' : ''}
            </option>
          ))}
        </select>

        {/* Study Year Filter */}
        <select
          value={filters.year}
          onChange={(e) => handleFilterChange('year', e.target.value)}
          aria-label="Filter by study year"
          className="bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-500"
        >
          <option value="">All Years</option>
          <option value="1">Year 1</option>
          <option value="2">Year 2</option>
          <option value="3">Year 3</option>
          <option value="4">Year 4</option>
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
        emptyMessage="No classes found"
        emptySubtext="Create class cohorts for your departments to organize students and sections."
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
        title={editingItem ? 'Edit Class Cohort' : 'Add Class Cohort'}
        subtitle="Establish student groups tied to an academic year, department, and study semester."
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        submitText={editingItem ? 'Update Class' : 'Create Class'}
      >
        <div className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Class Cohort Name <span className="text-slate-400 font-normal">(optional, auto-derived)</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. B.Tech IT - Year 3 (Sem 5)"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Programme <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.programme}
                onChange={(e) => setFormData({ ...formData, programme: e.target.value })}
                placeholder="B.Tech"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Department <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.departmentId}
                onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
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

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Academic Year <span className="text-rose-500">*</span>
            </label>
            <select
              value={formData.academicYearId}
              onChange={(e) => setFormData({ ...formData, academicYearId: e.target.value })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Study Year <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.year}
                onChange={(e) => handleYearChange(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              >
                <option value={1}>1st Year</option>
                <option value={2}>2nd Year</option>
                <option value={3}>3rd Year</option>
                <option value={4}>4th Year</option>
              </select>
              {formErrors.year && (
                <p className="text-[11px] text-rose-500 mt-1">{formErrors.year}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Semester <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.semester}
                onChange={(e) => setFormData({ ...formData, semester: Number(e.target.value) })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              >
                <option value={(formData.year - 1) * 2 + 1}>
                  Semester {(formData.year - 1) * 2 + 1}
                </option>
                <option value={formData.year * 2}>
                  Semester {formData.year * 2}
                </option>
              </select>
              {formErrors.semester && (
                <p className="text-[11px] text-rose-500 mt-1">{formErrors.semester}</p>
              )}
            </div>
          </div>
        </div>
      </FormModal>

      {/* Confirm Deactivation */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, item: null, action: null })}
        onConfirm={handleToggleStatus}
        isLoading={isActionLoading}
        title={
          confirmDialog.action === 'deactivate' ? 'Deactivate Class?' : 'Activate Class?'
        }
        message={`Are you sure you want to ${confirmDialog.action} '${confirmDialog.item?.name}'?`}
        confirmText={confirmDialog.action === 'deactivate' ? 'Deactivate' : 'Activate'}
        isDestructive={confirmDialog.action === 'deactivate'}
      />
    </div>
  );
}
