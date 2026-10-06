const { body, param, validationResult } = require('express-validator');
const { sendError } = require('../utils/apiResponse');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().map((e) => ({
      field: e.path || e.param,
      message: e.msg,
      value: e.value,
    }));
    return sendError(res, 400, 'Invalid request data', formatted);
  }
  next();
};

const academicYearValidationRules = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Academic Year name is required (e.g. 2026-27)')
    .matches(/^\d{4}-\d{2,4}$/)
    .withMessage('Format must be YYYY-YY or YYYY-YYYY (e.g. 2026-27)'),
  body('startYear')
    .notEmpty()
    .withMessage('Start year is required')
    .isInt({ min: 2000, max: 2100 })
    .withMessage('Start year must be a valid 4-digit year'),
  body('endYear')
    .notEmpty()
    .withMessage('End year is required')
    .isInt({ min: 2000, max: 2100 })
    .withMessage('End year must be a valid 4-digit year'),
  body('startDate')
    .notEmpty()
    .withMessage('Start date is required')
    .isISO8601()
    .withMessage('Valid start date required'),
  body('endDate')
    .notEmpty()
    .withMessage('End date is required')
    .isISO8601()
    .withMessage('Valid end date required'),
  handleValidationErrors,
];

const departmentValidationRules = [
  body('code')
    .trim()
    .notEmpty()
    .withMessage('Department code is required (e.g. IT, CSE)')
    .isLength({ min: 2, max: 10 })
    .withMessage('Department code must be between 2 and 10 characters'),
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Department name is required')
    .isLength({ min: 3, max: 150 })
    .withMessage('Department name must be between 3 and 150 characters'),
  handleValidationErrors,
];

const classValidationRules = [
  body('departmentId')
    .notEmpty()
    .withMessage('Department is required')
    .isMongoId()
    .withMessage('Invalid Department identifier'),
  body('academicYearId')
    .notEmpty()
    .withMessage('Academic Year is required')
    .isMongoId()
    .withMessage('Invalid Academic Year identifier'),
  body('year')
    .notEmpty()
    .withMessage('Study year is required')
    .isInt({ min: 1, max: 4 })
    .withMessage('Study year must be between 1 and 4'),
  body('semester')
    .notEmpty()
    .withMessage('Semester is required')
    .isInt({ min: 1, max: 8 })
    .withMessage('Semester must be between 1 and 8'),
  handleValidationErrors,
];

const sectionValidationRules = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Section name is required (e.g. A, B)'),
  body('classId')
    .notEmpty()
    .withMessage('Class cohort reference is required')
    .isMongoId()
    .withMessage('Invalid Class identifier'),
  body('capacity')
    .optional()
    .isInt({ min: 1, max: 500 })
    .withMessage('Capacity must be between 1 and 500'),
  handleValidationErrors,
];

const subjectValidationRules = [
  body('subjectCode')
    .trim()
    .notEmpty()
    .withMessage('Subject code is required (e.g. IT3501)'),
  body('subjectName')
    .trim()
    .notEmpty()
    .withMessage('Subject name is required'),
  body('departmentId')
    .notEmpty()
    .withMessage('Department is required')
    .isMongoId()
    .withMessage('Invalid Department identifier'),
  body('academicYearId')
    .notEmpty()
    .withMessage('Academic Year is required')
    .isMongoId()
    .withMessage('Invalid Academic Year identifier'),
  body('year')
    .notEmpty()
    .withMessage('Study year is required')
    .isInt({ min: 1, max: 4 })
    .withMessage('Study year must be between 1 and 4'),
  body('semester')
    .notEmpty()
    .withMessage('Semester is required')
    .isInt({ min: 1, max: 8 })
    .withMessage('Semester must be between 1 and 8'),
  body('credits')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Credits must be between 1 and 10'),
  handleValidationErrors,
];

const facultyValidationRules = [
  body('employeeId')
    .trim()
    .notEmpty()
    .withMessage('Employee ID is required (e.g. FAC001)'),
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Faculty name is required'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email address is required')
    .isEmail()
    .withMessage('Please provide a valid email address'),
  body('departmentId')
    .notEmpty()
    .withMessage('Department is required')
    .isMongoId()
    .withMessage('Invalid Department identifier'),
  body('designation')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Designation cannot be empty if specified'),
  handleValidationErrors,
];

const studentValidationRules = [
  body('registerNumber')
    .trim()
    .notEmpty()
    .withMessage('Register number is required (e.g. 23IT001)'),
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Student name is required'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email address is required')
    .isEmail()
    .withMessage('Please provide a valid email address'),
  body('departmentId')
    .notEmpty()
    .withMessage('Department is required')
    .isMongoId()
    .withMessage('Invalid Department identifier'),
  body('academicYearId')
    .notEmpty()
    .withMessage('Academic Year is required')
    .isMongoId()
    .withMessage('Invalid Academic Year identifier'),
  body('classId')
    .notEmpty()
    .withMessage('Class is required')
    .isMongoId()
    .withMessage('Invalid Class identifier'),
  body('sectionId')
    .notEmpty()
    .withMessage('Section is required')
    .isMongoId()
    .withMessage('Invalid Section identifier'),
  handleValidationErrors,
];

module.exports = {
  academicYearValidationRules,
  departmentValidationRules,
  classValidationRules,
  sectionValidationRules,
  subjectValidationRules,
  facultyValidationRules,
  studentValidationRules,
  handleValidationErrors,
};
