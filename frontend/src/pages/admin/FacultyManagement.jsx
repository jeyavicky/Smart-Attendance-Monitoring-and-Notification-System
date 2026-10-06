import React, { useState, useEffect, useCallback } from 'react';
import { facultyApi, departmentApi } from '../../api/academicApi';
import DataTable from '../../components/common/DataTable';
import Pagination from '../../components/common/Pagination';
import SearchInput from '../../components/common/SearchInput';
import FormModal from '../../components/common/FormModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import {
  Users,
  Plus,
  Edit2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Mail,
  Phone,
} from 'lucide-react';

export default function FacultyManagement() {
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalItems: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('');

  const [departments, setDepartments] = useState([]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    employeeId: '',
    name: '',
    email: '',
    phone: '',
    departmentId: '',
    designation: 'Assistant Professor',
    qualification: 'M.Tech, Ph.D',
    initialPassword: 'FacultyPassword123!',
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Confirm Status Dialog
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, item: null, action: null });
  const [isActionLoading, setIsActionLoading] = useState(false);

  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const res = await departmentApi.getAll({ limit: 100 });
        if (res.success) setDepartments(res.data.items || []);
      } catch (err) {
        console.error('Failed to load departments:', err);
      }
    };
    loadDepartments();
  }, []);

  const fetchData = useCallback(
    async (page = 1, currentLimit = pagination.limit, query = search, deptFilter = selectedDeptFilter) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await facultyApi.getAll({
          page,
          limit: currentLimit,
          search: query,
          department: deptFilter || undefined,
          sortBy: 'employeeId',
          sortOrder: 'asc',
        });
        if (res.success) {
          setData(res.data.items || []);
          setPagination(res.data.pagination || { page: 1, limit: currentLimit, totalItems: 0, totalPages: 1 });
        }
      } catch (err) {
        setError(err.message || 'Failed to load Faculty records');
      } finally {
        setIsLoading(false);
      }
    },
    [pagination.limit, search, selectedDeptFilter]
  );

  useEffect(() => {
    fetchData(1);
  }, []);

  const handleDeptFilterChange = (deptId) => {
    setSelectedDeptFilter(deptId);
    fetchData(1, pagination.limit, search, deptId);
  };

  const openAddModal = () => {
    setEditingItem(null);
    const defaultDept = departments[0];
    setFormData({
      employeeId: '',
      name: '',
      email: '',
      phone: '',
      departmentId: defaultDept ? defaultDept.id || defaultDept._id : '',
      designation: 'Assistant Professor',
      qualification: 'M.Tech, Ph.D',
      initialPassword: 'FacultyPassword123!',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      employeeId: item.employeeId,
      name: item.name,
      email: item.email,
      phone: item.phone || '',
      departmentId: item.departmentId?._id || item.departmentId?.id || item.departmentId || '',
      designation: item.designation || 'Assistant Professor',
      qualification: item.qualification || '',
      initialPassword: '',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Faculty name is required';
    if (!formData.employeeId.trim()) errs.employeeId = 'Employee ID is required (e.g. FAC001)';
    if (!formData.email.trim()) {
      errs.email = 'Email address is required';
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      errs.email = 'Valid institutional email required';
    }
    if (!formData.departmentId) errs.departmentId = 'Department is required';
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
        name: formData.name.trim(),
        employeeId: formData.employeeId.trim().toUpperCase(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        departmentId: formData.departmentId,
        designation: formData.designation.trim(),
        qualification: formData.qualification.trim(),
      };

      if (!editingItem) {
        payload.initialPassword = formData.initialPassword;
      }

      if (editingItem) {
        await facultyApi.update(editingItem.id || editingItem._id, payload);
        setSuccessMsg(`Faculty member '${payload.name}' updated successfully.`);
      } else {
        await facultyApi.create(payload);
        setSuccessMsg(`Faculty member '${payload.name}' and linked user account created.`);
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
      await facultyApi.toggleStatus(
        confirmDialog.item.id || confirmDialog.item._id,
        !confirmDialog.item.isActive
      );
      setSuccessMsg(
        `Faculty member '${confirmDialog.item.name}' ${
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
      header: 'Employee ID',
      accessor: 'employeeId',
      render: (val) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200 font-mono">
          {val}
        </span>
      ),
    },
    {
      header: 'Faculty Name',
      accessor: 'name',
      render: (val, row) => (
        <div>
          <span className="font-semibold text-slate-900 block">{val}</span>
          <span className="text-[11px] text-slate-500">{row.designation || 'Faculty'}</span>
        </div>
      ),
    },
    {
      header: 'Contact Info',
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
      accessor: (r) => r.departmentId?.name || r.departmentId?.code || '—',
      render: (_, row) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
          {row.departmentId?.code || 'IT'}
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
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Faculty Directory</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage teaching faculty academic profiles and synchronized system accounts.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl shadow-sm hover:shadow transition"
        >
          <Plus className="w-4 h-4" />
          Add Faculty
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

      {/* Filters and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            fetchData(1, pagination.limit, v, selectedDeptFilter);
          }}
          placeholder="Search by name, ID, or email..."
          className="w-full sm:w-64"
        />

        {/* Department Filter */}
        <select
          value={selectedDeptFilter}
          onChange={(e) => handleDeptFilterChange(e.target.value)}
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
        emptyMessage="No faculty members found"
        emptySubtext="Add faculty members with employee credentials and department associations."
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
        title={editingItem ? 'Edit Faculty Profile' : 'Add Faculty Member'}
        subtitle="Creating a faculty profile automatically provisions a synchronized login account."
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        submitText={editingItem ? 'Update Faculty' : 'Create Faculty & Account'}
      >
        <div className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Employee ID <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value.toUpperCase() })}
                disabled={Boolean(editingItem)}
                placeholder="e.g. FAC001"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 uppercase font-mono disabled:bg-slate-50 disabled:text-slate-500"
              />
              {formErrors.employeeId && (
                <p className="text-[11px] text-rose-500 mt-1">{formErrors.employeeId}</p>
              )}
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
              Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Dr. Jane Smith"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
            {formErrors.name && <p className="text-[11px] text-rose-500 mt-1">{formErrors.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value.toLowerCase() })}
                placeholder="faculty@attendance.local"
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Designation</label>
              <input
                type="text"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                placeholder="e.g. Associate Professor"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Qualification</label>
              <input
                type="text"
                value={formData.qualification}
                onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                placeholder="e.g. M.E., Ph.D"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>
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
          confirmDialog.action === 'deactivate' ? 'Deactivate Faculty?' : 'Activate Faculty?'
        }
        message={`Deactivating '${confirmDialog.item?.name}' will also disable their linked login user account.`}
        confirmText={confirmDialog.action === 'deactivate' ? 'Deactivate' : 'Activate'}
        isDestructive={confirmDialog.action === 'deactivate'}
      />
    </div>
  );
}
