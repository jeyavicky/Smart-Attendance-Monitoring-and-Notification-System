const express = require('express');
const router = express.Router();
const controller = require('../controllers/timetableController');
const authMiddleware = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const dbGuard = require('../middleware/dbGuard');
const { timetableValidationRules } = require('../validators/timetableValidators');
const { ROLES } = require('../config/constants');

router.use(dbGuard);

// Personal Faculty Timetable & Schedule Endpoints
router.get(
  '/me',
  authMiddleware,
  authorizeRoles(ROLES.FACULTY),
  controller.getMyTimetable
);

router.get(
  '/my-timetable',
  authMiddleware,
  authorizeRoles(ROLES.FACULTY),
  controller.getMyTimetable
);

router.get(
  '/dashboard-summary',
  authMiddleware,
  authorizeRoles(ROLES.FACULTY),
  controller.getFacultyDashboardSummary
);

// Read endpoints (Available to authenticated users: Admin, Faculty, Student)
router.get('/', authMiddleware, controller.getAll);
router.get('/:id', authMiddleware, controller.getById);

// Write endpoints: Admin ONLY
router.post(
  '/',
  authMiddleware,
  authorizeRoles(ROLES.ADMIN),
  timetableValidationRules,
  controller.create
);

router.put(
  '/:id',
  authMiddleware,
  authorizeRoles(ROLES.ADMIN),
  controller.update
);

router.patch(
  '/:id/status',
  authMiddleware,
  authorizeRoles(ROLES.ADMIN),
  controller.toggleStatus
);

router.delete(
  '/:id',
  authMiddleware,
  authorizeRoles(ROLES.ADMIN),
  controller.remove
);

module.exports = router;
