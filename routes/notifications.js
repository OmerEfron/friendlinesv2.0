const express = require('express');
const { getUserNotifications, markNotificationsAsRead } = require('../controllers/notificationController');
const { validateIdMiddleware, ensureBodyExists } = require('../middleware/validation');
const { getGeneralLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Get user notifications
router.get('/:id',
  getGeneralLimiter(),
  validateIdMiddleware(),
  getUserNotifications
);

// Mark notifications as read
router.put('/mark-read',
  getGeneralLimiter(),
  ensureBodyExists,
  markNotificationsAsRead
);

module.exports = router; 