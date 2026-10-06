const express = require('express');
const router = express.Router();
const controller = require('../controllers/classController');
const authMiddleware = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const dbGuard = require('../middleware/dbGuard');
const { classValidationRules } = require('../validators/academicValidators');
const { ROLES } = require('../config/constants');

router.use(dbGuard);

// Read endpoints
router.get('/', authMiddleware, controller.getAll);
router.get('/:id', authMiddleware, controller.getById);

// Write endpoints: Admin ONLY
router.post(
  '/',
  authMiddleware,
  authorizeRoles(ROLES.ADMIN),
  classValidationRules,
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
