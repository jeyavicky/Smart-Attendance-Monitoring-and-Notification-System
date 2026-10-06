import apiClient from './apiClient';

/**
 * Academic Master Data API Services
 */

// 1. Academic Years
export const academicYearApi = {
  getAll: (params) => apiClient.get('/academic-years', { params }),
  getById: (id) => apiClient.get(`/academic-years/${id}`),
  create: (data) => apiClient.post('/academic-years', data),
  update: (id, data) => apiClient.put(`/academic-years/${id}`, data),
  toggleStatus: (id, isActive) => apiClient.patch(`/academic-years/${id}/status`, { isActive }),
  setCurrent: (id) => apiClient.patch(`/academic-years/${id}/set-current`),
};

// 2. Departments
export const departmentApi = {
  getAll: (params) => apiClient.get('/departments', { params }),
  getById: (id) => apiClient.get(`/departments/${id}`),
  create: (data) => apiClient.post('/departments', data),
  update: (id, data) => apiClient.put(`/departments/${id}`, data),
  toggleStatus: (id, isActive) => apiClient.patch(`/departments/${id}/status`, { isActive }),
  delete: (id) => apiClient.delete(`/departments/${id}`),
};

// 3. Classes
export const classApi = {
  getAll: (params) => apiClient.get('/classes', { params }),
  getById: (id) => apiClient.get(`/classes/${id}`),
  create: (data) => apiClient.post('/classes', data),
  update: (id, data) => apiClient.put(`/classes/${id}`, data),
  toggleStatus: (id, isActive) => apiClient.patch(`/classes/${id}/status`, { isActive }),
  delete: (id) => apiClient.delete(`/classes/${id}`),
};

// 4. Sections
export const sectionApi = {
  getAll: (params) => apiClient.get('/sections', { params }),
  getById: (id) => apiClient.get(`/sections/${id}`),
  create: (data) => apiClient.post('/sections', data),
  update: (id, data) => apiClient.put(`/sections/${id}`, data),
  toggleStatus: (id, isActive) => apiClient.patch(`/sections/${id}/status`, { isActive }),
  delete: (id) => apiClient.delete(`/sections/${id}`),
};

// 5. Subjects
export const subjectApi = {
  getAll: (params) => apiClient.get('/subjects', { params }),
  getById: (id) => apiClient.get(`/subjects/${id}`),
  create: (data) => apiClient.post('/subjects', data),
  update: (id, data) => apiClient.put(`/subjects/${id}`, data),
  toggleStatus: (id, isActive) => apiClient.patch(`/subjects/${id}/status`, { isActive }),
  delete: (id) => apiClient.delete(`/subjects/${id}`),
};

// 6. Faculty
export const facultyApi = {
  getAll: (params) => apiClient.get('/faculty', { params }),
  getById: (id) => apiClient.get(`/faculty/${id}`),
  create: (data) => apiClient.post('/faculty', data),
  update: (id, data) => apiClient.put(`/faculty/${id}`, data),
  toggleStatus: (id, isActive) => apiClient.patch(`/faculty/${id}/status`, { isActive }),
  getProfileMe: () => apiClient.get('/faculty/profile/me'),
};

// 7. Students
export const studentApi = {
  getAll: (params) => apiClient.get('/students', { params }),
  getById: (id) => apiClient.get(`/students/${id}`),
  create: (data) => apiClient.post('/students', data),
  update: (id, data) => apiClient.put(`/students/${id}`, data),
  toggleStatus: (id, isActive) => apiClient.patch(`/students/${id}/status`, { isActive }),
  getProfileMe: () => apiClient.get('/students/profile/me'),
};

// 8. Admin Dashboard
export const adminApi = {
  getDashboardSummary: () => apiClient.get('/admin/dashboard/summary'),
};

// 9. Faculty Subject Mapping (Phase 4)
export const facultyMappingApi = {
  getAll: (params) => apiClient.get('/faculty-mappings', { params }),
  getById: (id) => apiClient.get(`/faculty-mappings/${id}`),
  create: (data) => apiClient.post('/faculty-mappings', data),
  update: (id, data) => apiClient.put(`/faculty-mappings/${id}`, data),
  toggleStatus: (id, isActive) => apiClient.patch(`/faculty-mappings/${id}/status`, { isActive }),
  delete: (id) => apiClient.delete(`/faculty-mappings/${id}`),
  getWorkload: () => apiClient.get('/faculty-mappings/workload'),
  getMyMappings: () => apiClient.get('/faculty-mappings/me'),
};

// 10. Timetable (Phase 4)
export const timetableApi = {
  getAll: (params) => apiClient.get('/timetable', { params }),
  getGrid: (params) => apiClient.get('/timetable', { params: { ...params, format: 'grid' } }),
  getById: (id) => apiClient.get(`/timetable/${id}`),
  create: (data) => apiClient.post('/timetable', data),
  update: (id, data) => apiClient.put(`/timetable/${id}`, data),
  toggleStatus: (id, isActive) => apiClient.patch(`/timetable/${id}/status`, { isActive }),
  delete: (id) => apiClient.delete(`/timetable/${id}`),
  getMyTimetable: (params) => apiClient.get('/timetable/me', { params }),
  getDashboardSummary: () => apiClient.get('/timetable/dashboard-summary'),
};
