import React, { useState, useEffect, useCallback } from 'react';
import { departmentApi } from '../../api/academicApi';
import DataTable from '../../components/common/DataTable';
import Pagination from '../../components/common/Pagination';
import SearchInput from '../../components/common/SearchInput';
import FormModal from '../../components/common/FormModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import {
  Building2,
  Plus,
  Edit2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

export default function Departments() {
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
    code: '',
    name: '',
    shortName: '',
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
      const res = await departmentApi.getAll({
        page,
        limit: currentLimit,
        search: query,
        sortBy: 'code',
        sortOrder: 'asc',
      });
      if (res.success) {
        setData(res.data.items || []);
        setPagination(res.data.pagination || { page: 1, limit: currentLimit, totalItems: 0, totalPages: 1 });
      }
    } catch (err) {
      setError(err.message || 'Failed to load Departments');
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
    setFormData({ code: '', name: '', shortName: '' });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      name: item.name,
      shortName: item.shortName || item.code,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.code.trim()) errs.code = 'Department code is required (e.g. IT, CSE)';
    if (!formData.name.trim()) errs.name = 'Department name is required';
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
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim(),
        shortName: (formData.shortName || formData.code).trim().toUpperCase(),
      };

      if (editingItem) {
        await departmentApi.update(editingItem.id || editingItem._id, payload);
        setSuccessMsg(`Department '${payload.code}' updated successfully.`);
      } else {
        await departmentApi.create(payload);
        setSuccessMsg(`Department '${payload.code}' created successfully.`);
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
      await departmentApi.toggleStatus(
        confirmDialog.item.id || confirmDialog.item._id,
        !confirmDialog.item.isActive
      );
      setSuccessMsg(
        `Department '${confirmDialog.item.code}' ${
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
      header: 'Code',
      accessor: 'code',
      render: (val) => (
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200 font-mono">
          {val}
        </span>
      ),
    },
    {
      header: 'Department Name',
      accessor: 'name',
      render: (val, row) => (
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-teal-600 shrink-0" />
          <span className="font-semibold text-slate-900">{val}</span>
        </div>
      ),
    },
    {
      header: 'Short Name',
      accessor: 'shortName',
      render: (val, row) => <span className="text-slate-600">{val || row.code}</span>,
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
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Departments</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage academic faculties, codes, and operational organizational units.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl shadow-sm hover:shadow transition"
        >
          <Plus className="w-4 h-4" />
          Add Department
        </button>
      </div>

      {/* Alerts */}
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

      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <SearchInput
          value={search}
          onChange={handleSearchChange}
          placeholder="Search by code or name..."
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
        emptyMessage="No departments found"
        emptySubtext="Create your first department (e.g. IT, CSE) to begin academic setup."
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
        title={editingItem ? 'Edit Department' : 'Add Department'}
        subtitle="Specify code, formal name, and shorthand abbreviation."
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        submitText={editingItem ? 'Update Department' : 'Create Department'}
      >
        <div className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Department Code <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              placeholder="e.g. IT, CSE, ECE"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 uppercase font-mono"
            />
            {formErrors.code && <p className="text-[11px] text-rose-500 mt-1">{formErrors.code}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Department Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Information Technology"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
            {formErrors.name && <p className="text-[11px] text-rose-500 mt-1">{formErrors.name}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Short Name / Acronym
            </label>
            <input
              type="text"
              value={formData.shortName}
              onChange={(e) => setFormData({ ...formData, shortName: e.target.value.toUpperCase() })}
              placeholder="e.g. IT"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 uppercase font-mono"
            />
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
          confirmDialog.action === 'deactivate'
            ? 'Deactivate Department?'
            : 'Activate Department?'
        }
        message={`Are you sure you want to ${confirmDialog.action} '${confirmDialog.item?.code} - ${confirmDialog.item?.name}'?`}
        confirmText={confirmDialog.action === 'deactivate' ? 'Deactivate' : 'Activate'}
        isDestructive={confirmDialog.action === 'deactivate'}
      />
    </div>
  );
}
