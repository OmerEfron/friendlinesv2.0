const express = require('express');
const { getUserNotifications, markNotificationsAsRead } = require('../controllers/notificationController');
const { validateIdMiddleware, ensureBodyExists } = require('../middleware/validation');
const { getGeneralLimiter } = require('../middleware/rateLimiter');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get user notifications
router.get('/:id',
  authenticateToken,
  getGeneralLimiter(),
  validateIdMiddleware("id"),
  getUserNotifications
);

// Mark notifications as read
router.put('/mark-read',
  authenticateToken,
  getGeneralLimiter(),
  ensureBodyExists,
  markNotificationsAsRead
);

module.exports = router; 