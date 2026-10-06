const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const dbGuard = require('../middleware/dbGuard');
const { ROLES } = require('../config/constants');

router.use(dbGuard);

// Admin dashboard summary statistics
router.get(
  '/dashboard/summary',
  authMiddleware,
  authorizeRoles(ROLES.ADMIN),
  dashboardController.getAdminSummary
);

module.exports = router;
