const express = require('express');
const router = express.Router();
const controller = require('../controllers/academicYearController');
const authMiddleware = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const dbGuard = require('../middleware/dbGuard');
const { academicYearValidationRules } = require('../validators/academicValidators');
const { ROLES } = require('../config/constants');

// Apply database readiness check across all master data operations
router.use(dbGuard);

// Read endpoints: authenticated users
router.get('/', authMiddleware, controller.getAll);
router.get('/:id', authMiddleware, controller.getById);

// Write endpoints: Admin ONLY
router.post(
  '/',
  authMiddleware,
  authorizeRoles(ROLES.ADMIN),
  academicYearValidationRules,
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

router.patch(
  '/:id/set-current',
  authMiddleware,
  authorizeRoles(ROLES.ADMIN),
  controller.setCurrent
);

router.delete(
  '/:id',
  authMiddleware,
  authorizeRoles(ROLES.ADMIN),
  controller.remove
);

module.exports = router;
