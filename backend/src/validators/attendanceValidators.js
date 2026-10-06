const { body, query, validationResult } = require('express-validator');
const AppError = require('../utils/appError');
const { ATTENDANCE_STATUS } = require('../config/constants');

const ALLOWED_STATUSES = Object.values(ATTENDANCE_STATUS);

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value,
    }));
    return next(
      new AppError(formattedErrors[0].message, 400, formattedErrors)
    );
  }
  next();
};

const recordAttendanceValidationRules = [
  body('attendanceDate')
    .notEmpty()
    .withMessage('Attendance date is required')
    .isISO8601()
    .withMessage('Attendance date must be a valid ISO8601 date (YYYY-MM-DD)')
    .custom((val) => {
      const date = new Date(val);
      const now = new Date();
      // Don't allow attendance more than 7 days into the future
      const maxFuture = new Date();
      maxFuture.setDate(now.getDate() + 7);
      if (date > maxFuture) {
        throw new Error('Attendance cannot be marked for dates more than 7 days in the future');
      }
      return true;
    }),
  body('period')
    .notEmpty()
    .withMessage('Period number is required')
    .isInt({ min: 1, max: 10 })
    .withMessage('Period must be an integer between 1 and 10'),
  body('records')
    .isArray({ min: 1 })
    .withMessage('Student attendance records array is required and cannot be empty'),
  body('records.*.studentId')
    .notEmpty()
    .withMessage('Student identifier is required for each record')
    .isMongoId()
    .withMessage('Invalid student identifier'),
  body('records.*.status')
    .notEmpty()
    .withMessage('Status is required for each record')
    .isIn(ALLOWED_STATUSES)
    .withMessage(`Status must be one of: ${ALLOWED_STATUSES.join(', ')}`),
  body('remarks')
    .optional()
    .trim(),
  handleValidationErrors,
];

const updateAttendanceValidationRules = [
  body('records')
    .isArray({ min: 1 })
    .withMessage('Student attendance records array is required'),
  body('records.*.studentId')
    .notEmpty()
    .withMessage('Student identifier is required')
    .isMongoId()
    .withMessage('Invalid student identifier'),
  body('records.*.status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(ALLOWED_STATUSES)
    .withMessage(`Status must be one of: ${ALLOWED_STATUSES.join(', ')}`),
  handleValidationErrors,
];

module.exports = {
  recordAttendanceValidationRules,
  updateAttendanceValidationRules,
  handleValidationErrors,
};
