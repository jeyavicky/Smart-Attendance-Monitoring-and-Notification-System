const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { authRateLimiter } = require('../middleware/rateLimiter');
const {
  loginValidationRules,
  changePasswordValidationRules,
} = require('../validators/authValidator');
const { ROLES } = require('../config/constants');

// Public authentication routes
router.post('/login', authRateLimiter, loginValidationRules, authController.login);
router.post('/logout', authController.logout);

// Protected routes (require valid JWT)
router.get('/me', authMiddleware, authController.getMe);
router.put(
  '/change-password',
  authMiddleware,
  changePasswordValidationRules,
  authController.changePassword
);

// Role authorization verification routes (used for automated and manual verification)
router.get(
  '/test/admin',
  authMiddleware,
  authorizeRoles(ROLES.ADMIN),
  authController.verifyRoleAccess(ROLES.ADMIN)
);

router.get(
  '/test/faculty',
  authMiddleware,
  authorizeRoles(ROLES.FACULTY),
  authController.verifyRoleAccess(ROLES.FACULTY)
);

router.get(
  '/test/student',
  authMiddleware,
  authorizeRoles(ROLES.STUDENT),
  authController.verifyRoleAccess(ROLES.STUDENT)
);

module.exports = router;
