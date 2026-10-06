import React, { useState, useEffect, useCallback } from 'react';
import { sectionApi, classApi } from '../../api/academicApi';
import DataTable from '../../components/common/DataTable';
import Pagination from '../../components/common/Pagination';
import SearchInput from '../../components/common/SearchInput';
import FormModal from '../../components/common/FormModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import {
  Layers,
  Plus,
  Edit2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

export default function Sections() {
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalItems: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('');

  // Class list for selectors
  const [classList, setClassList] = useState([]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: 'A',
    classId: '',
    capacity: 60,
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Selected class detail preview when creating/editing
  const selectedClassObj = classList.find(
    (c) => (c.id || c._id) === formData.classId
  );

  // Confirm Status Dialog
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, item: null, action: null });
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Load Classes for dropdown
  useEffect(() => {
    const loadClasses = async () => {
      try {
        const res = await classApi.getAll({ limit: 100 });
        if (res.success) setClassList(res.data.items || []);
      } catch (err) {
        console.error('Failed to load class list:', err);
      }
    };
    loadClasses();
  }, []);

  const fetchData = useCallback(
    async (page = 1, currentLimit = pagination.limit, query = search, classFilter = selectedClassFilter) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await sectionApi.getAll({
          page,
          limit: currentLimit,
          search: query,
          classId: classFilter || undefined,
          sortBy: 'name',
          sortOrder: 'asc',
        });
        if (res.success) {
          setData(res.data.items || []);
          setPagination(res.data.pagination || { page: 1, limit: currentLimit, totalItems: 0, totalPages: 1 });
        }
      } catch (err) {
        setError(err.message || 'Failed to load Sections');
      } finally {
        setIsLoading(false);
      }
    },
    [pagination.limit, search, selectedClassFilter]
  );

  useEffect(() => {
    fetchData(1);
  }, []);

  const handleClassFilterChange = (classId) => {
    setSelectedClassFilter(classId);
    fetchData(1, pagination.limit, search, classId);
  };

  const openAddModal = () => {
    setEditingItem(null);
    const firstClass = classList[0];
    setFormData({
      name: 'A',
      classId: firstClass ? firstClass.id || firstClass._id : '',
      capacity: 60,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      classId: item.classId?._id || item.classId?.id || item.classId || '',
      capacity: item.capacity || 60,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Section name is required (e.g. A, B, C)';
    if (!formData.classId) errs.classId = 'Target class cohort is required';
    if (!formData.capacity || formData.capacity < 1) errs.capacity = 'Capacity must be at least 1';
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
        name: formData.name.trim().toUpperCase(),
        classId: formData.classId,
        capacity: Number(formData.capacity) || 60,
      };

      if (editingItem) {
        await sectionApi.update(editingItem.id || editingItem._id, payload);
        setSuccessMsg(`Section '${payload.name}' updated successfully.`);
      } else {
        await sectionApi.create(payload);
        setSuccessMsg(`Section '${payload.name}' created successfully.`);
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
      await sectionApi.toggleStatus(
        confirmDialog.item.id || confirmDialog.item._id,
        !confirmDialog.item.isActive
      );
      setSuccessMsg(
        `Section '${confirmDialog.item.name}' ${
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
      header: 'Section',
      accessor: 'name',
      render: (val, row) => (
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center border border-teal-200">
            {val}
          </span>
          <span className="font-semibold text-slate-900">{row.displayName || `Section ${val}`}</span>
        </div>
      ),
    },
    {
      header: 'Class Cohort',
      accessor: (r) => r.classId?.name || '—',
      render: (val) => <span className="font-medium text-slate-800">{val}</span>,
    },
    {
      header: 'Department',
      accessor: (r) => r.departmentId?.code || '—',
      render: (val) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
          {val}
        </span>
      ),
    },
    {
      header: 'Year / Sem',
      render: (_, row) => (
        <span className="text-xs text-slate-600">
          Year {row.year ?? row.classId?.year} &bull; Sem {row.semester ?? row.classId?.semester}
        </span>
      ),
    },
    {
      header: 'Capacity',
      accessor: 'capacity',
      render: (val) => (
        <span className="text-xs font-medium text-slate-700">{val || 60} students</span>
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
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Sections</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage classroom batches and enrollment limits under each class cohort.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl shadow-sm hover:shadow transition"
        >
          <Plus className="w-4 h-4" />
          Add Section
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
            fetchData(1, pagination.limit, v, selectedClassFilter);
          }}
          placeholder="Search sections..."
          className="w-full sm:w-60"
        />

        {/* Filter by Class */}
        <select
          value={selectedClassFilter}
          onChange={(e) => handleClassFilterChange(e.target.value)}
          aria-label="Filter by class cohort"
          className="bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-500"
        >
          <option value="">All Classes</option>
          {classList.map((c) => (
            <option key={c.id || c._id} value={c.id || c._id}>
              {c.name}
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
        emptyMessage="No sections found"
        emptySubtext="Add sections (e.g. A, B) to your class cohorts to divide student enrollments."
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
        title={editingItem ? 'Edit Section' : 'Add Section'}
        subtitle="Sections inherit department, academic year, and level from the parent class."
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        submitText={editingItem ? 'Update Section' : 'Create Section'}
      >
        <div className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Class Cohort <span className="text-rose-500">*</span>
            </label>
            <select
              value={formData.classId}
              onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            >
              <option value="">Select Class Cohort</option>
              {classList
                .filter((c) => c.isActive)
                .map((c) => (
                  <option key={c.id || c._id} value={c.id || c._id}>
                    {c.name}
                  </option>
                ))}
            </select>
            {formErrors.classId && (
              <p className="text-[11px] text-rose-500 mt-1">{formErrors.classId}</p>
            )}
          </div>

          {/* Derived Hierarchy Auto-Display */}
          {selectedClassObj && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                Derived Hierarchy
              </span>
              <div className="flex justify-between text-slate-600">
                <span>Department:</span>
                <span className="font-semibold text-slate-800">
                  {selectedClassObj.departmentId?.name || selectedClassObj.departmentId?.code || '—'}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Academic Year:</span>
                <span className="font-semibold text-slate-800">
                  {selectedClassObj.academicYearId?.name || '—'}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Year / Semester:</span>
                <span className="font-semibold text-slate-800">
                  Year {selectedClassObj.year} &bull; Sem {selectedClassObj.semester}
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Section Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                placeholder="e.g. A, B, C"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 uppercase font-bold"
              />
              {formErrors.name && (
                <p className="text-[11px] text-rose-500 mt-1">{formErrors.name}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Student Capacity <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                max={500}
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
              {formErrors.capacity && (
                <p className="text-[11px] text-rose-500 mt-1">{formErrors.capacity}</p>
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
          confirmDialog.action === 'deactivate' ? 'Deactivate Section?' : 'Activate Section?'
        }
        message={`Are you sure you want to ${confirmDialog.action} '${confirmDialog.item?.name}'?`}
        confirmText={confirmDialog.action === 'deactivate' ? 'Deactivate' : 'Activate'}
        isDestructive={confirmDialog.action === 'deactivate'}
      />
    </div>
  );
}
