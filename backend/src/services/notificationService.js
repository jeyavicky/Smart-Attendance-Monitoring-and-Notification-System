const Notification = require('../models/Notification');
const Student = require('../models/Student');
const Subject = require('../models/Subject');
const AttendanceRecord = require('../models/AttendanceRecord');
const attendanceCalculationService = require('./attendanceCalculationService');
const { NOTIFICATION_LEVELS, ATTENDANCE_TIERS } = require('../config/constants');

class NotificationService {
  /**
   * Evaluate a single student's subject status after attendance creation/update.
   * Generates a notification only when entering a caution/shortage tier or recovering from one.
   * Prevents spamming duplicate notifications for the same status tier consecutively.
   */
  async evaluateStudentSubjectStatus(studentId, subjectId) {
    try {
      const student = await Student.findById(studentId);
      if (!student || !student.userId) return null;

      const subject = await Subject.findById(subjectId);
      if (!subject) return null;

      const summary = await attendanceCalculationService.getStudentSummary(studentId);
      const subData = summary.subjects.find(
        (s) => s.subjectId.toString() === subjectId.toString()
      );

      if (!subData || subData.conducted === 0) return null;

      const currentTier = subData.status; // EXCELLENT, SAFE, CAUTION, WARNING, CRITICAL
      const percentage = subData.percentage;
      const recoveryClasses = subData.classesToRecover;

      // Find the most recent notification for this student + subject
      const latestNotification = await Notification.findOne({
        studentId,
        subjectId,
      }).sort({ createdAt: -1 });

      const prevStatus = latestNotification ? latestNotification.status : null;
      const prevType = latestNotification ? latestNotification.type : null;

      // Status change conditions:
      // 1. Transition into CAUTION (75% - 79.99%) from SAFE/EXCELLENT (or no previous notification)
      // 2. Transition into WARNING (65% - 74.99%) from CAUTION/SAFE/EXCELLENT
      // 3. Transition into CRITICAL (<65%) from WARNING/CAUTION/SAFE/EXCELLENT
      // 4. Transition into RECOVERY: previous was WARNING/CRITICAL/CAUTION, but now >= 75% (SAFE or EXCELLENT)

      let shouldNotify = false;
      let notificationType = null;
      let title = '';
      let message = '';

      if (currentTier === ATTENDANCE_TIERS.CAUTION) {
        if (!prevStatus || prevStatus === ATTENDANCE_TIERS.SAFE || prevStatus === ATTENDANCE_TIERS.EXCELLENT) {
          shouldNotify = true;
          notificationType = NOTIFICATION_LEVELS.CAUTION;
          title = 'Attendance Caution';
          message = `Your attendance in ${subject.subjectName} (${subject.subjectCode}) is at ${percentage}%, nearing the 75% threshold. Stay regular to avoid shortage.`;
        }
      } else if (currentTier === ATTENDANCE_TIERS.WARNING) {
        if (prevStatus !== ATTENDANCE_TIERS.WARNING && prevStatus !== ATTENDANCE_TIERS.CRITICAL) {
          shouldNotify = true;
          notificationType = NOTIFICATION_LEVELS.WARNING;
          title = 'Attendance Warning';
          message = `Your attendance in ${subject.subjectName} (${subject.subjectCode}) has dropped to ${percentage}%. Required attendance: 75%. Attend the next ${recoveryClasses} classes continuously to reach the required percentage.`;
        }
      } else if (currentTier === ATTENDANCE_TIERS.CRITICAL) {
        if (prevStatus !== ATTENDANCE_TIERS.CRITICAL) {
          shouldNotify = true;
          notificationType = NOTIFICATION_LEVELS.CRITICAL;
          title = 'Critical Attendance Shortage';
          message = `URGENT: Your attendance in ${subject.subjectName} (${subject.subjectCode}) is critically low at ${percentage}%. Attend the next ${recoveryClasses} classes continuously to recover. Please consult your course instructor.`;
        }
      } else if (
        (currentTier === ATTENDANCE_TIERS.SAFE || currentTier === ATTENDANCE_TIERS.EXCELLENT) &&
        (prevStatus === ATTENDANCE_TIERS.WARNING || prevStatus === ATTENDANCE_TIERS.CRITICAL || prevType === NOTIFICATION_LEVELS.WARNING || prevType === NOTIFICATION_LEVELS.CRITICAL)
      ) {
        // Recovery notification!
        shouldNotify = true;
        notificationType = NOTIFICATION_LEVELS.RECOVERY;
        title = 'Attendance Recovered';
        message = `Great news! Your attendance in ${subject.subjectName} (${subject.subjectCode}) has reached ${percentage}%, successfully clearing the shortage threshold. Keep it up!`;
      }

      if (shouldNotify) {
        return await Notification.create({
          userId: student.userId,
          studentId: student._id,
          subjectId: subject._id,
          type: notificationType,
          title,
          message,
          attendancePercentage: percentage,
          status: currentTier,
          classesToRecover: recoveryClasses,
          isRead: false,
        });
      }

      return null;
    } catch (err) {
      console.error('Error evaluating student subject notification:', err.message);
      return null;
    }
  }

  /**
   * Process all students affected by an attendance session
   */
  async processSessionNotifications(sessionId) {
    try {
      const records = await AttendanceRecord.find({ sessionId }).select('studentId sessionId');
      if (!records || records.length === 0) return [];

      const AttendanceSession = require('../models/AttendanceSession');
      const session = await AttendanceSession.findById(sessionId).select('subjectId');
      if (!session || !session.subjectId) return [];

      const results = [];
      for (const rec of records) {
        const notif = await this.evaluateStudentSubjectStatus(rec.studentId, session.subjectId);
        if (notif) results.push(notif);
      }
      return results;
    } catch (err) {
      console.error('Error processing session notifications:', err.message);
      return [];
    }
  }

  /**
   * Get notifications for the authenticated user
   */
  async getUserNotifications(userId, queryParams = {}) {
    const { page = 1, limit = 20, unreadOnly } = queryParams;

    const filter = { userId };
    if (unreadOnly === 'true' || unreadOnly === true) {
      filter.isRead = false;
    }

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (parsedPage - 1) * parsedLimit;

    const [items, totalItems, unreadCount] = await Promise.all([
      Notification.find(filter)
        .populate('subjectId', 'subjectCode subjectName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit),
      Notification.countDocuments(filter),
      Notification.countDocuments({ userId, isRead: false }),
    ]);

    return {
      items,
      unreadCount,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        totalItems,
        totalPages: Math.ceil(totalItems / parsedLimit) || 1,
      },
    };
  }

  /**
   * Mark a single notification as read
   */
  async markAsRead(notificationId, userId) {
    const notification = await Notification.findOne({ _id: notificationId, userId });
    if (!notification) return null;

    notification.isRead = true;
    await notification.save();
    return notification;
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId) {
    const result = await Notification.updateMany({ userId, isRead: false }, { $set: { isRead: true } });
    return { modifiedCount: result.modifiedCount };
  }
}

module.exports = new NotificationService();
