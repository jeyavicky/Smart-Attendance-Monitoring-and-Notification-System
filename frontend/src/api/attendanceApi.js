import apiClient from './apiClient';

export const attendanceApi = {
  // Roster & Today schedule
  getStudentsForMarking: (params) => apiClient.get('/attendance/students', { params }),
  getTodaySchedule: () => apiClient.get('/attendance/today'),

  // Sessions CRUD
  getSessions: (params) => apiClient.get('/attendance/sessions', { params }),
  getSessionById: (id) => apiClient.get(`/attendance/sessions/${id}`),
  createSession: (data) => apiClient.post('/attendance/sessions', data),
  updateSession: (id, data) => apiClient.put(`/attendance/sessions/${id}`, data),
  cancelSession: (id) => apiClient.patch(`/attendance/sessions/${id}/cancel`),

  // Student portal endpoints
  getStudentSummary: () => apiClient.get('/attendance/student/me'),
  getStudentSubjects: () => apiClient.get('/attendance/student/me/subjects'),
  getStudentHistory: (params) => apiClient.get('/attendance/student/me/history', { params }),

  // Shortage lists
  getShortageList: (params) => apiClient.get('/attendance/shortage', { params }),
  getFacultyShortage: () => apiClient.get('/attendance/faculty/shortage'),

  // Admin dashboard metrics
  getAdminOverview: () => apiClient.get('/attendance/admin/overview'),
};

export default attendanceApi;
