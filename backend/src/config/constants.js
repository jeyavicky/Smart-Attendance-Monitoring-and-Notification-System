/**
 * System-wide constants and enumerations
 */

const ROLES = Object.freeze({
  ADMIN: 'admin',
  FACULTY: 'faculty',
  STUDENT: 'student',
});

const ATTENDANCE_STATUS = Object.freeze({
  PRESENT: 'P',
  ABSENT: 'A',
  ON_DUTY: 'OD',
  MEDICAL_LEAVE: 'ML',
});

const SESSION_STATUS = Object.freeze({
  SUBMITTED: 'SUBMITTED',
  DRAFT: 'DRAFT',
  CANCELLED: 'CANCELLED',
});

const NOTIFICATION_LEVELS = Object.freeze({
  INFO: 'INFO',
  CAUTION: 'CAUTION',
  WARNING: 'WARNING',
  CRITICAL: 'CRITICAL',
  RECOVERY: 'RECOVERY',
});

const ATTENDANCE_TIERS = Object.freeze({
  EXCELLENT: 'EXCELLENT',
  SAFE: 'SAFE',
  CAUTION: 'CAUTION',
  WARNING: 'WARNING',
  CRITICAL: 'CRITICAL',
});

const DEFAULT_THRESHOLDS = Object.freeze({
  MINIMUM_REQUIRED: 75,
  EXCELLENT: 90,
  SAFE: 80,
  CAUTION: 75,
  WARNING: 65,
  CRITICAL: 65,
});

module.exports = {
  ROLES,
  ATTENDANCE_STATUS,
  SESSION_STATUS,
  NOTIFICATION_LEVELS,
  ATTENDANCE_TIERS,
  DEFAULT_THRESHOLDS,
};
