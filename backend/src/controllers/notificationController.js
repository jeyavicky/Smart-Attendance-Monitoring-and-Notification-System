const notificationService = require('../services/notificationService');
const { sendSuccess } = require('../utils/apiResponse');
const AppError = require('../utils/appError');

class NotificationController {
  async getMe(req, res, next) {
    try {
      const result = await notificationService.getUserNotifications(req.user._id, req.query);
      return sendSuccess(res, 200, 'User notifications retrieved', result);
    } catch (err) {
      next(err);
    }
  }

  async markRead(req, res, next) {
    try {
      const result = await notificationService.markAsRead(req.params.id, req.user._id);
      if (!result) {
        throw new AppError('Notification not found or unauthorized', 404);
      }
      return sendSuccess(res, 200, 'Notification marked as read', result);
    } catch (err) {
      next(err);
    }
  }

  async markAllRead(req, res, next) {
    try {
      const result = await notificationService.markAllAsRead(req.user._id);
      return sendSuccess(res, 200, 'All notifications marked as read', result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new NotificationController();
