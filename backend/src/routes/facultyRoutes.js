const express = require('express');
const router = express.Router();
const controller = require('../controllers/facultyController');
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const dbGuard = require('../middleware/dbGuard');
const { facultyValidationRules } = require('../validators/academicValidators');
const { ROLES } = require('../config/constants');

router.use(dbGuard);

// Faculty personal profile endpoint
router.get(
  '/profile/me',
  authMiddleware,
  authorizeRoles(ROLES.FACULTY),
  dashboardController.getFacultyProfileMe
);

// Read endpoints
router.get('/', authMiddleware, controller.getAll);
router.get('/:id', authMiddleware, controller.getById);

// Write endpoints: Admin ONLY
router.post(
  '/',
  authMiddleware,
  authorizeRoles(ROLES.ADMIN),
  facultyValidationRules,
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
