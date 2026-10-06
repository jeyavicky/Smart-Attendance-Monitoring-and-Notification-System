import apiClient from './apiClient';

export const notificationApi = {
  getMyNotifications: (params) => apiClient.get('/notifications/me', { params }),
  markRead: (id) => apiClient.patch(`/notifications/${id}/read`),
  markAllRead: () => apiClient.patch('/notifications/read-all'),
};

export default notificationApi;
