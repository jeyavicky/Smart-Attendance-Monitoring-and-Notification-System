const express = require('express');
const router = express.Router();
const controller = require('../controllers/reportController');
const authMiddleware = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const dbGuard = require('../middleware/dbGuard');
const { ROLES } = require('../config/constants');

router.use(dbGuard);

// All reports are accessible to Admin; Faculty can view student/class/subject/shortage reports
router.get(
  '/student/:studentId',
  authMiddleware,
  authorizeRoles(ROLES.ADMIN, ROLES.FACULTY),
  controller.getStudentReport
);

router.get(
  '/class/:classId',
  authMiddleware,
  authorizeRoles(ROLES.ADMIN, ROLES.FACULTY),
  controller.getClassReport
);

router.get(
  '/subject/:subjectId',
  authMiddleware,
  authorizeRoles(ROLES.ADMIN, ROLES.FACULTY),
  controller.getSubjectReport
);

router.get(
  '/shortage',
  authMiddleware,
  authorizeRoles(ROLES.ADMIN, ROLES.FACULTY),
  controller.getShortageReport
);

module.exports = router;
