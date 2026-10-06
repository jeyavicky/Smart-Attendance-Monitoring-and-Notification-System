import React, { useState, useEffect, useCallback } from 'react';
import { academicYearApi } from '../../api/academicApi';
import DataTable from '../../components/common/DataTable';
import Pagination from '../../components/common/Pagination';
import SearchInput from '../../components/common/SearchInput';
import FormModal from '../../components/common/FormModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import {
  Calendar,
  Plus,
  Edit2,
  CheckCircle2,
  XCircle,
  Star,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

export default function AcademicYears() {
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalItems: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    startYear: new Date().getFullYear(),
    endYear: new Date().getFullYear() + 1,
    startDate: '',
    endDate: '',
    isCurrent: false,
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Confirm Status Dialog
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, item: null, action: null });
  const [isActionLoading, setIsActionLoading] = useState(false);

  const fetchData = useCallback(async (page = 1, currentLimit = pagination.limit, query = search) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await academicYearApi.getAll({
        page,
        limit: currentLimit,
        search: query,
        sortBy: 'name',
        sortOrder: 'desc',
      });
      if (res.success) {
        setData(res.data.items || []);
        setPagination(res.data.pagination || { page: 1, limit: currentLimit, totalItems: 0, totalPages: 1 });
      }
    } catch (err) {
      setError(err.message || 'Failed to load Academic Years');
    } finally {
      setIsLoading(false);
    }
  }, [pagination.limit, search]);

  useEffect(() => {
    fetchData(1);
  }, []);

  const handleSearchChange = (val) => {
    setSearch(val);
    fetchData(1, pagination.limit, val);
  };

  const openAddModal = () => {
    setEditingItem(null);
    const currYear = new Date().getFullYear();
    setFormData({
      name: `${currYear}-${(currYear + 1).toString().slice(-2)}`,
      startYear: currYear,
      endYear: currYear + 1,
      startDate: `${currYear}-06-01`,
      endDate: `${currYear + 1}-05-31`,
      isCurrent: false,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      startYear: item.startYear,
      endYear: item.endYear,
      startDate: item.startDate ? item.startDate.split('T')[0] : '',
      endDate: item.endDate ? item.endDate.split('T')[0] : '',
      isCurrent: item.isCurrent,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Academic year name is required (e.g. 2026-27)';
    if (!formData.startYear || formData.startYear < 2000) errs.startYear = 'Valid start year required';
    if (!formData.endYear || formData.endYear <= formData.startYear)
      errs.endYear = 'End year must be strictly after start year';
    if (!formData.startDate) errs.startDate = 'Start date is required';
    if (!formData.endDate) errs.endDate = 'End date is required';
    if (formData.startDate && formData.endDate && formData.startDate >= formData.endDate) {
      errs.endDate = 'End date must be strictly after start date';
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
        await academicYearApi.update(editingItem.id || editingItem._id, formData);
        setSuccessMsg(`Academic Year '${formData.name}' updated successfully.`);
      } else {
        await academicYearApi.create(formData);
        setSuccessMsg(`Academic Year '${formData.name}' created successfully.`);
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

  const handleSetCurrent = async (item) => {
    setIsActionLoading(true);
    try {
      await academicYearApi.setCurrent(item.id || item._id);
      setSuccessMsg(`'${item.name}' is now marked as the current academic year.`);
      fetchData(pagination.page);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setError(err.message || 'Failed to update current academic year');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!confirmDialog.item) return;
    setIsActionLoading(true);
    try {
      await academicYearApi.toggleStatus(
        confirmDialog.item.id || confirmDialog.item._id,
        !confirmDialog.item.isActive
      );
      setSuccessMsg(
        `Academic year '${confirmDialog.item.name}' ${
          confirmDialog.item.isActive ? 'deactivated' : 'activated'
        } successfully.`
      );
      setConfirmDialog({ isOpen: false, item: null, action: null });
      fetchData(pagination.page);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setError(err.message || 'Failed to change status');
    } finally {
      setIsActionLoading(false);
    }
  };

  const columns = [
    {
      header: 'Academic Year',
      accessor: 'name',
      render: (val, row) => (
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-teal-600 shrink-0" />
          <span className="font-semibold text-slate-900">{val}</span>
          {row.isCurrent && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Star className="w-3 h-3 fill-emerald-500 text-emerald-500" />
              Current
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Start Date',
      accessor: (r) => (r.startDate ? new Date(r.startDate).toLocaleDateString() : '—'),
    },
    {
      header: 'End Date',
      accessor: (r) => (r.endDate ? new Date(r.endDate).toLocaleDateString() : '—'),
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
          {!row.isCurrent && row.isActive && (
            <button
              onClick={() => handleSetCurrent(row)}
              disabled={isActionLoading}
              className="text-xs font-medium text-teal-600 hover:text-teal-800 px-2 py-1 rounded hover:bg-teal-50 border border-teal-200 transition"
              title="Set as Current Academic Year"
            >
              Set Current
            </button>
          )}
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
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Academic Years</h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure institutional academic sessions and define the active working calendar.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl shadow-sm hover:shadow transition"
        >
          <Plus className="w-4 h-4" />
          Add Academic Year
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

      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <SearchInput
          value={search}
          onChange={handleSearchChange}
          placeholder="Search academic years..."
          className="w-full sm:w-72"
        />
        <button
          onClick={() => fetchData(pagination.page)}
          className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition self-end sm:self-auto"
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
        emptyMessage="No academic years found"
        emptySubtext="Create an academic year (e.g. 2026-27) to begin scheduling cohorts."
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
        title={editingItem ? 'Edit Academic Year' : 'Add Academic Year'}
        subtitle="Manage calendar tenure and session boundaries."
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        submitText={editingItem ? 'Update Year' : 'Create Year'}
      >
        <div className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Academic Year Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. 2026-27"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
            {formErrors.name && <p className="text-[11px] text-rose-500 mt-1">{formErrors.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Start Year <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                value={formData.startYear}
                onChange={(e) => setFormData({ ...formData, startYear: Number(e.target.value) })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
              {formErrors.startYear && (
                <p className="text-[11px] text-rose-500 mt-1">{formErrors.startYear}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                End Year <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                value={formData.endYear}
                onChange={(e) => setFormData({ ...formData, endYear: Number(e.target.value) })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
              {formErrors.endYear && (
                <p className="text-[11px] text-rose-500 mt-1">{formErrors.endYear}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Start Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
              {formErrors.startDate && (
                <p className="text-[11px] text-rose-500 mt-1">{formErrors.startDate}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                End Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
              {formErrors.endDate && (
                <p className="text-[11px] text-rose-500 mt-1">{formErrors.endDate}</p>
              )}
            </div>
          </div>

          {!editingItem && (
            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="isCurrentCheck"
                checked={formData.isCurrent}
                onChange={(e) => setFormData({ ...formData, isCurrent: e.target.checked })}
                className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 h-4 w-4"
              />
              <label htmlFor="isCurrentCheck" className="text-xs font-medium text-slate-700">
                Mark as currently active academic year
              </label>
            </div>
          )}
        </div>
      </FormModal>

      {/* Confirm Status Modal */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, item: null, action: null })}
        onConfirm={handleToggleStatus}
        isLoading={isActionLoading}
        title={
          confirmDialog.action === 'deactivate'
            ? 'Deactivate Academic Year?'
            : 'Activate Academic Year?'
        }
        message={`Are you sure you want to ${confirmDialog.action} '${confirmDialog.item?.name}'? Historical data will be preserved.`}
        confirmText={confirmDialog.action === 'deactivate' ? 'Deactivate' : 'Activate'}
        isDestructive={confirmDialog.action === 'deactivate'}
      />
    </div>
  );
}
