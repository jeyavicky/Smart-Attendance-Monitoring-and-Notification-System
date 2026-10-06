const express = require('express');
const router = express.Router();
const controller = require('../controllers/attendanceController');
const authMiddleware = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const dbGuard = require('../middleware/dbGuard');
const {
  recordAttendanceValidationRules,
  updateAttendanceValidationRules,
} = require('../validators/attendanceValidators');
const { ROLES } = require('../config/constants');

// Database guard prevents silent in-memory fallback
router.use(dbGuard);

// 1. Student roster retrieval for marking (Admin or Faculty)
router.get(
  '/students',
  authMiddleware,
  authorizeRoles(ROLES.ADMIN, ROLES.FACULTY),
  controller.getStudents
);

// 2. Today's attendance-eligible timetable sessions (Faculty only)
router.get(
  '/today',
  authMiddleware,
  authorizeRoles(ROLES.FACULTY),
  controller.getToday
);

// 3. Faculty specific routes
router.get(
  '/faculty/sessions',
  authMiddleware,
  authorizeRoles(ROLES.FACULTY),
  controller.getAll
);

router.get(
  '/faculty/shortage',
  authMiddleware,
  authorizeRoles(ROLES.FACULTY),
  controller.getFacultyShortage
);

// 4. Student specific routes
router.get(
  '/student/me',
  authMiddleware,
  authorizeRoles(ROLES.STUDENT),
  controller.getStudentMe
);

router.get(
  '/student/me/subjects',
  authMiddleware,
  authorizeRoles(ROLES.STUDENT),
  controller.getStudentSubjects
);

router.get(
  '/student/me/history',
  authMiddleware,
  authorizeRoles(ROLES.STUDENT),
  controller.getStudentHistory
);

// 5. Shortage & Admin metrics
router.get(
  '/shortage',
  authMiddleware,
  authorizeRoles(ROLES.ADMIN, ROLES.FACULTY),
  controller.getShortage
);

router.get(
  '/admin/overview',
  authMiddleware,
  authorizeRoles(ROLES.ADMIN),
  controller.getAdminOverview
);

// 6. Attendance sessions list (Admin: institutional view; Faculty: personal sessions)
router.get(
  '/sessions',
  authMiddleware,
  authorizeRoles(ROLES.ADMIN, ROLES.FACULTY),
  controller.getAll
);

// 7. Session detail with student roster (Admin or Faculty owner)
router.get(
  '/sessions/:id',
  authMiddleware,
  authorizeRoles(ROLES.ADMIN, ROLES.FACULTY),
  controller.getById
);

// 8. Submit attendance (Faculty or Admin)
router.post(
  '/sessions',
  authMiddleware,
  authorizeRoles(ROLES.ADMIN, ROLES.FACULTY),
  recordAttendanceValidationRules,
  controller.create
);

// 9. Update attendance records (Faculty owner or Admin)
router.put(
  '/sessions/:id',
  authMiddleware,
  authorizeRoles(ROLES.ADMIN, ROLES.FACULTY),
  updateAttendanceValidationRules,
  controller.update
);

// 10. Cancel / Deactivate session
router.patch(
  '/sessions/:id/cancel',
  authMiddleware,
  authorizeRoles(ROLES.ADMIN, ROLES.FACULTY),
  controller.cancel
);

router.delete(
  '/sessions/:id',
  authMiddleware,
  authorizeRoles(ROLES.ADMIN, ROLES.FACULTY),
  controller.cancel
);

module.exports = router;
