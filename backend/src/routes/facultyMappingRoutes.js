const express = require('express');
const router = express.Router();
const controller = require('../controllers/facultyMappingController');
const authMiddleware = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const dbGuard = require('../middleware/dbGuard');
const { facultyMappingValidationRules } = require('../validators/timetableValidators');
const { ROLES } = require('../config/constants');

router.use(dbGuard);

// Workload summary (Admin / Faculty)
router.get(
  '/workload',
  authMiddleware,
  authorizeRoles(ROLES.ADMIN),
  controller.getWorkload
);

// Faculty personal mappings
router.get(
  '/me',
  authMiddleware,
  authorizeRoles(ROLES.FACULTY),
  controller.getMyMappings
);

router.get(
  '/my-mappings',
  authMiddleware,
  authorizeRoles(ROLES.FACULTY),
  controller.getMyMappings
);

// Read endpoints
router.get('/', authMiddleware, controller.getAll);
router.get('/:id', authMiddleware, controller.getById);

// Write endpoints: Admin ONLY
router.post(
  '/',
  authMiddleware,
  authorizeRoles(ROLES.ADMIN),
  facultyMappingValidationRules,
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
