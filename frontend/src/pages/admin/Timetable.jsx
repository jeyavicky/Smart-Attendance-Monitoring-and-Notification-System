import React, { useState, useEffect, useCallback } from 'react';
import {
  timetableApi,
  facultyMappingApi,
  departmentApi,
  classApi,
  sectionApi,
  facultyApi,
} from '../../api/academicApi';
import DataTable from '../../components/common/DataTable';
import Pagination from '../../components/common/Pagination';
import FormModal from '../../components/common/FormModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import {
  Calendar,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  LayoutGrid,
  List,
  Clock,
  DoorOpen,
  BookOpen,
  GraduationCap,
  Users,
  Building2,
} from 'lucide-react';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DEFAULT_PERIODS = [
  { period: 1, start: '09:00', end: '09:50' },
  { period: 2, start: '09:50', end: '10:40' },
  { period: 3, start: '10:55', end: '11:45' },
  { period: 4, start: '11:45', end: '12:35' },
  { period: 5, start: '13:30', end: '14:20' },
  { period: 6, start: '14:20', end: '15:10' },
  { period: 7, start: '15:25', end: '16:15' },
  { period: 8, start: '16:15', end: '17:05' },
];

export default function Timetable() {
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [data, setData] = useState([]);
  const [gridData, setGridData] = useState({});
  const [pagination, setPagination] = useState({ page: 1, limit: 20, totalItems: 0, totalPages: 1 });

  const [filters, setFilters] = useState({
    department: '',
    classId: '',
    sectionId: '',
    facultyId: '',
    dayOfWeek: '',
  });

  // Dropdown data
  const [departments, setDepartments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [facultyList, setFacultyList] = useState([]);
  const [activeMappings, setActiveMappings] = useState([]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    facultyMappingId: '',
    dayOfWeek: 'Monday',
    period: 1,
    startTime: '09:00',
    endTime: '09:50',
    room: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Confirm Status / Delete Dialog
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, item: null, action: null });
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Load dropdown lists
  useEffect(() => {
    const loadPrerequisites = async () => {
      try {
        const [deptRes, classRes, secRes, facRes, mapRes] = await Promise.all([
          departmentApi.getAll({ limit: 100 }),
          classApi.getAll({ limit: 100 }),
          sectionApi.getAll({ limit: 100 }),
          facultyApi.getAll({ limit: 100 }),
          facultyMappingApi.getAll({ limit: 200, status: 'true' }),
        ]);

        if (deptRes.success) setDepartments(deptRes.data.items || []);
        if (classRes.success) setClasses(classRes.data.items || []);
        if (secRes.success) setSections(secRes.data.items || []);
        if (facRes.success) setFacultyList(facRes.data.items || []);
        if (mapRes.success) setActiveMappings(mapRes.data.items || []);
      } catch (err) {
        console.error('Failed to load timetable prerequisites:', err);
      }
    };
    loadPrerequisites();
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (viewMode === 'grid') {
        const res = await timetableApi.getGrid({
          department: filters.department || undefined,
          classId: filters.classId || undefined,
          sectionId: filters.sectionId || undefined,
          facultyId: filters.facultyId || undefined,
        });
        if (res.success) {
          setGridData(res.data.grid || {});
        }
      } else {
        const res = await timetableApi.getAll({
          page: pagination.page,
          limit: pagination.limit,
          department: filters.department || undefined,
          classId: filters.classId || undefined,
          sectionId: filters.sectionId || undefined,
          facultyId: filters.facultyId || undefined,
          dayOfWeek: filters.dayOfWeek || undefined,
        });
        if (res.success) {
          setData(res.data.items || []);
          setPagination(res.data.pagination || { page: 1, limit: pagination.limit, totalItems: 0, totalPages: 1 });
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch timetable schedules');
    } finally {
      setIsLoading(false);
    }
  }, [viewMode, filters, pagination.page, pagination.limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === 'classId') {
        updated.sectionId = '';
      }
      return updated;
    });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const resetFilters = () => {
    setFilters({ department: '', classId: '', sectionId: '', facultyId: '', dayOfWeek: '' });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleOpenAddModal = (presetDay = 'Monday', presetPeriod = 1) => {
    setEditingItem(null);
    const pInfo = DEFAULT_PERIODS.find((p) => p.period === presetPeriod) || DEFAULT_PERIODS[0];
    setFormData({
      facultyMappingId: '',
      dayOfWeek: presetDay,
      period: presetPeriod,
      startTime: pInfo.start,
      endTime: pInfo.end,
      room: '',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      facultyMappingId: item.facultyMappingId?._id || item.facultyMappingId?.id || item.facultyMappingId || '',
      dayOfWeek: item.dayOfWeek,
      period: item.period,
      startTime: item.startTime,
      endTime: item.endTime,
      room: item.room || '',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      // Auto adjust timings when period changes
      if (name === 'period') {
        const pNum = parseInt(value, 10);
        const pInfo = DEFAULT_PERIODS.find((p) => p.period === pNum);
        if (pInfo) {
          updated.startTime = pInfo.start;
          updated.endTime = pInfo.end;
        }
      }
      return updated;
    });

    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.facultyMappingId && !editingItem) {
      setFormErrors({ facultyMappingId: 'Please select an assigned faculty mapping' });
      return;
    }

    setIsSubmitting(true);
    setFormErrors({});
    try {
      if (editingItem) {
        await timetableApi.update(editingItem.id || editingItem._id, formData);
        setSuccessMsg('Timetable schedule entry updated successfully');
      } else {
        await timetableApi.create(formData);
        setSuccessMsg('Class period scheduled successfully into timetable');
      }
      setIsModalOpen(false);
      fetchData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Operation failed';
      setFormErrors({ submit: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!confirmDialog.item) return;
    setIsActionLoading(true);
    try {
      const newStatus = !confirmDialog.item.isActive;
      await timetableApi.toggleStatus(confirmDialog.item.id || confirmDialog.item._id, newStatus);
      setSuccessMsg(`Timetable period ${newStatus ? 'activated' : 'deactivated'} successfully`);
      fetchData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update entry status');
    } finally {
      setIsActionLoading(false);
      setConfirmDialog({ isOpen: false, item: null, action: null });
    }
  };

  const handleDelete = async () => {
    if (!confirmDialog.item) return;
    setIsActionLoading(true);
    try {
      await timetableApi.delete(confirmDialog.item.id || confirmDialog.item._id);
      setSuccessMsg('Timetable entry deleted successfully');
      fetchData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete timetable entry');
    } finally {
      setIsActionLoading(false);
      setConfirmDialog({ isOpen: false, item: null, action: null });
    }
  };

  const listColumns = [
    {
      header: 'Day & Period',
      accessor: 'dayOfWeek',
      render: (item) => (
        <div>
          <span className="font-semibold text-slate-900 text-xs">{item.dayOfWeek}</span>
          <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500 font-mono">
            <span className="px-1.5 py-0.5 rounded bg-slate-100 font-bold text-slate-700">
              Period {item.period}
            </span>
            <span>{item.startTime} - {item.endTime}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Class & Section',
      accessor: 'classId',
      render: (item) => (
        <div>
          <div className="font-semibold text-slate-900 text-xs">{item.classId?.name}</div>
          <div className="text-[11px] text-slate-500 font-semibold">
            {item.sectionId?.displayName || `Sec ${item.sectionId?.name}`}
          </div>
        </div>
      ),
    },
    {
      header: 'Subject & Faculty',
      accessor: 'subjectId',
      render: (item) => (
        <div>
          <div className="font-semibold text-teal-800 text-xs flex items-center gap-1.5">
            <span className="font-mono bg-teal-50 px-1 rounded border border-teal-200">
              {item.subjectId?.subjectCode}
            </span>
            <span className="truncate max-w-[170px]">{item.subjectId?.subjectName}</span>
          </div>
          <div className="text-[11px] text-slate-600 mt-0.5">
            {item.facultyId?.name} ({item.facultyId?.employeeId})
          </div>
        </div>
      ),
    },
    {
      header: 'Room',
      accessor: 'room',
      render: (item) => (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
          <DoorOpen className="w-3 h-3 text-slate-500" />
          {item.room || '—'}
        </span>
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
            title="Edit Schedule"
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
              item.isActive ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'
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
            title="Delete Entry"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 text-xs font-semibold mb-1 border border-teal-200">
            <Calendar className="w-3.5 h-3.5 text-teal-600" />
            <span>Weekly Scheduling System</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Timetable & Schedule Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Organize weekly period schedules, allocate classroom labs, and enforce multi-tier conflict safety.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* View mode toggle */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === 'grid'
                  ? 'bg-white text-teal-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Weekly Grid</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === 'list'
                  ? 'bg-white text-teal-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>List View</span>
            </button>
          </div>

          <button
            onClick={fetchData}
            disabled={isLoading}
            className="p-2 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-sm transition-all disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-teal-600' : ''}`} />
          </button>

          <button
            onClick={() => handleOpenAddModal('Monday', 1)}
            className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-sm shadow-teal-600/20 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Class Period</span>
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

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
              name="facultyId"
              value={filters.facultyId}
              onChange={handleFilterChange}
              className="w-full text-xs font-medium text-slate-700 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
            >
              <option value="">All Instructors</option>
              {facultyList.map((f) => (
                <option key={f._id || f.id} value={f._id || f.id}>
                  {f.name} ({f.employeeId})
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              name="dayOfWeek"
              value={filters.dayOfWeek}
              onChange={handleFilterChange}
              className="w-full text-xs font-medium text-slate-700 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
            >
              <option value="">All Days of Week</option>
              {DAYS_OF_WEEK.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </div>
        </div>

        {(filters.department || filters.classId || filters.facultyId || filters.dayOfWeek) && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-500">Filtered Schedule Active</span>
            <button
              onClick={resetFilters}
              className="text-teal-700 hover:text-teal-900 font-semibold text-xs"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* View Mode: Weekly Grid Matrix */}
      {viewMode === 'grid' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-3.5 text-left font-bold text-slate-700 w-28 uppercase tracking-wider text-[11px] border-r border-slate-200 sticky left-0 bg-slate-50 z-10">
                    Day / Period
                  </th>
                  {DEFAULT_PERIODS.map((p) => (
                    <th key={p.period} className="p-2.5 text-center font-bold text-slate-700 min-w-[130px] border-r border-slate-200 last:border-r-0">
                      <div>Period {p.period}</div>
                      <div className="text-[10px] font-normal text-slate-500 mt-0.5 font-mono">
                        {p.start} - {p.end}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {DAYS_OF_WEEK.map((day) => (
                  <tr key={day} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-3 font-bold text-slate-800 border-r border-slate-200 bg-slate-50/70 sticky left-0 z-10">
                      {day}
                    </td>
                    {DEFAULT_PERIODS.map((p) => {
                      const entry = gridData[day] ? gridData[day][p.period] : null;
                      return (
                        <td
                          key={p.period}
                          className="p-2 border-r border-slate-200 last:border-r-0 align-top"
                        >
                          {entry ? (
                            <div className="p-2 rounded-xl bg-teal-50/70 border border-teal-200/80 hover:border-teal-400 hover:bg-teal-50 transition-all text-left space-y-1 relative group shadow-sm">
                              <div className="font-bold text-teal-900 text-[11px] flex items-center justify-between">
                                <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-teal-200">
                                  {entry.subjectId?.subjectCode}
                                </span>
                                {entry.room && (
                                  <span className="text-[10px] text-slate-500 font-medium">
                                    {entry.room}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] font-semibold text-slate-800 line-clamp-1">
                                {entry.subjectId?.subjectName}
                              </div>
                              <div className="text-[10px] text-slate-600 flex items-center justify-between">
                                <span className="truncate max-w-[80px]">
                                  {entry.facultyId?.name?.split(' ')[0] || 'Faculty'}
                                </span>
                                <span className="text-teal-700 font-bold">
                                  {entry.sectionId?.name || 'A'}
                                </span>
                              </div>
                              <div className="absolute top-1 right-1 hidden group-hover:flex items-center gap-1 bg-white/90 p-0.5 rounded-lg shadow border border-slate-200">
                                <button
                                  onClick={() => handleOpenEditModal(entry)}
                                  className="p-1 hover:text-teal-700 rounded"
                                  title="Edit"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() =>
                                    setConfirmDialog({ isOpen: true, item: entry, action: 'delete' })
                                  }
                                  className="p-1 hover:text-rose-600 rounded"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleOpenAddModal(day, p.period)}
                              className="w-full h-16 rounded-xl border border-dashed border-slate-200 hover:border-teal-400 hover:bg-teal-50/30 transition-all flex items-center justify-center text-slate-400 hover:text-teal-600 group"
                              title={`Schedule on ${day} Period ${p.period}`}
                            >
                              <Plus className="w-4 h-4 opacity-40 group-hover:opacity-100 transition-opacity" />
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* View Mode: List View */
        <div className="space-y-4">
          <DataTable
            columns={listColumns}
            data={data}
            isLoading={isLoading}
            emptyMessage="No timetable entries scheduled. Click 'Add Class Period' to assign a weekly slot."
          />
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            limit={pagination.limit}
            onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
            onLimitChange={(l) => setPagination((prev) => ({ ...prev, limit: l, page: 1 }))}
          />
        </div>
      )}

      {/* Add / Edit Timetable Entry Modal */}
      <FormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Scheduled Period' : 'Schedule Class Period'}
        isSubmitting={isSubmitting}
      >
        <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
          {formErrors.submit && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{formErrors.submit}</span>
            </div>
          )}

          {/* Assigned Faculty Mapping Selection */}
          {!editingItem ? (
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Faculty Subject & Class Mapping <span className="text-rose-500">*</span>
              </label>
              <select
                name="facultyMappingId"
                value={formData.facultyMappingId}
                onChange={handleFormChange}
                className="w-full text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              >
                <option value="">-- Select Active Assignment --</option>
                {activeMappings.map((m) => (
                  <option key={m._id || m.id} value={m._id || m.id}>
                    {m.facultyId?.name} • {m.subjectId?.subjectCode} ({m.subjectId?.subjectName}) • {m.classId?.name} (Sec {m.sectionId?.name})
                  </option>
                ))}
              </select>
              {formErrors.facultyMappingId && (
                <p className="text-rose-600 text-[11px] mt-1">{formErrors.facultyMappingId}</p>
              )}
            </div>
          ) : (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700">
              <div className="font-semibold text-xs text-slate-900">
                {editingItem.subjectId?.subjectCode} - {editingItem.subjectId?.subjectName}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {editingItem.facultyId?.name} • {editingItem.classId?.name} - {editingItem.sectionId?.displayName}
              </div>
            </div>
          )}

          {/* Day of Week */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Day of Week <span className="text-rose-500">*</span>
              </label>
              <select
                name="dayOfWeek"
                value={formData.dayOfWeek}
                onChange={handleFormChange}
                className="w-full text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              >
                {DAYS_OF_WEEK.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Period Number */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Period Number <span className="text-rose-500">*</span>
              </label>
              <select
                name="period"
                value={formData.period}
                onChange={handleFormChange}
                className="w-full text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              >
                {DEFAULT_PERIODS.map((p) => (
                  <option key={p.period} value={p.period}>
                    Period {p.period} ({p.start} - {p.end})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Time Bounds */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Start Time (HH:MM) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="startTime"
                value={formData.startTime}
                onChange={handleFormChange}
                placeholder="09:00"
                className="w-full text-xs font-mono font-medium text-slate-800 bg-white border border-slate-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                End Time (HH:MM) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="endTime"
                value={formData.endTime}
                onChange={handleFormChange}
                placeholder="09:50"
                className="w-full text-xs font-mono font-medium text-slate-800 bg-white border border-slate-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>
          </div>

          {/* Room / Hall */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Classroom / Laboratory Hall
            </label>
            <input
              type="text"
              name="room"
              value={formData.room}
              onChange={handleFormChange}
              placeholder="e.g. Lab-1, LH-201, CS-Seminar"
              className="w-full text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Specifying a room automatically prevents simultaneous room double-booking.
            </p>
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
              <span>{editingItem ? 'Update Period' : 'Confirm Period'}</span>
            </button>
          </div>
        </form>
      </FormModal>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, item: null, action: null })}
        onConfirm={confirmDialog.action === 'delete' ? handleDelete : handleToggleStatus}
        isLoading={isActionLoading}
        title={
          confirmDialog.action === 'delete'
            ? 'Delete Timetable Period'
            : `${confirmDialog.item?.isActive ? 'Deactivate' : 'Activate'} Period`
        }
        message={
          confirmDialog.action === 'delete'
            ? `Permanently remove Period ${confirmDialog.item?.period} (${confirmDialog.item?.dayOfWeek}) for ${confirmDialog.item?.subjectId?.subjectCode}?`
            : `Set Period ${confirmDialog.item?.period} (${confirmDialog.item?.dayOfWeek}) as ${confirmDialog.item?.isActive ? 'inactive' : 'active'}?`
        }
        confirmText={confirmDialog.action === 'delete' ? 'Yes, Delete' : 'Confirm'}
        type={confirmDialog.action === 'delete' ? 'danger' : 'info'}
      />
    </div>
  );
}
