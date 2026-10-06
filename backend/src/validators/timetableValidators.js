const { body, query, validationResult } = require('express-validator');
const AppError = require('../utils/appError');
const TimetableEntry = require('../models/TimetableEntry');

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

const facultyMappingValidationRules = [
  body('facultyId')
    .notEmpty()
    .withMessage('Faculty is required')
    .isMongoId()
    .withMessage('Invalid Faculty identifier'),
  body('subjectId')
    .notEmpty()
    .withMessage('Subject is required')
    .isMongoId()
    .withMessage('Invalid Subject identifier'),
  body('classId')
    .notEmpty()
    .withMessage('Class cohort is required')
    .isMongoId()
    .withMessage('Invalid Class identifier'),
  body('sectionId')
    .notEmpty()
    .withMessage('Section is required')
    .isMongoId()
    .withMessage('Invalid Section identifier'),
  body('departmentId')
    .optional()
    .isMongoId()
    .withMessage('Invalid Department identifier'),
  body('academicYearId')
    .optional()
    .isMongoId()
    .withMessage('Invalid Academic Year identifier'),
  body('year')
    .optional()
    .isInt({ min: 1, max: 4 })
    .withMessage('Study year must be between 1 and 4'),
  body('semester')
    .optional()
    .isInt({ min: 1, max: 8 })
    .withMessage('Semester must be between 1 and 8'),
  handleValidationErrors,
];

const timetableValidationRules = [
  body('facultyMappingId')
    .notEmpty()
    .withMessage('Faculty Mapping reference is required')
    .isMongoId()
    .withMessage('Invalid Faculty Mapping identifier'),
  body('dayOfWeek')
    .notEmpty()
    .withMessage('Day of week is required')
    .isIn(TimetableEntry.DAYS_OF_WEEK)
    .withMessage(`Day must be one of: ${TimetableEntry.DAYS_OF_WEEK.join(', ')}`),
  body('period')
    .notEmpty()
    .withMessage('Period number is required')
    .isInt({ min: 1, max: 10 })
    .withMessage('Period must be between 1 and 10'),
  body('startTime')
    .notEmpty()
    .withMessage('Start time is required (HH:MM)')
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage('Start time must be formatted as HH:MM (24-hour)'),
  body('endTime')
    .notEmpty()
    .withMessage('End time is required (HH:MM)')
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage('End time must be formatted as HH:MM (24-hour)')
    .custom((val, { req }) => {
      if (req.body.startTime && val <= req.body.startTime) {
        throw new Error('End time must be strictly after start time');
      }
      return true;
    }),
  body('room')
    .optional()
    .trim(),
  handleValidationErrors,
];

module.exports = {
  facultyMappingValidationRules,
  timetableValidationRules,
  handleValidationErrors,
};
