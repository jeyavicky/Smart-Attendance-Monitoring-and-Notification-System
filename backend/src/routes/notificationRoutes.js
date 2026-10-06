const express = require('express');
const router = express.Router();
const controller = require('../controllers/notificationController');
const authMiddleware = require('../middleware/authMiddleware');
const dbGuard = require('../middleware/dbGuard');

router.use(dbGuard);

router.get('/me', authMiddleware, controller.getMe);
router.patch('/:id/read', authMiddleware, controller.markRead);
router.patch('/read-all', authMiddleware, controller.markAllRead);

module.exports = router;
