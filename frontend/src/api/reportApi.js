import apiClient from './apiClient';

export const reportApi = {
  getStudentReport: (studentId) => apiClient.get(`/reports/student/${studentId}`),
  getClassReport: (classId, params) => apiClient.get(`/reports/class/${classId}`, { params }),
  getSubjectReport: (subjectId, params) => apiClient.get(`/reports/subject/${subjectId}`, { params }),
  getShortageReport: (params) => apiClient.get('/reports/shortage', { params }),
};

export default reportApi;
