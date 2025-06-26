const express = require('express');
const { getMutualFriends, getFriendSuggestions, bulkFriendshipStatus } = require('../controllers/socialController');
const { validateIdMiddleware, ensureBodyExists } = require('../middleware/validation');
const { getGeneralLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Get mutual friends
router.get('/users/:id/mutual-friends',
  getGeneralLimiter(),
  validateIdMiddleware(),
  getMutualFriends
);

// Get friend suggestions
router.get('/users/:id/friend-suggestions',
  getGeneralLimiter(),
  validateIdMiddleware(),
  getFriendSuggestions
);

// Bulk friendship status check
router.post('/users/friendship-status',
  getGeneralLimiter(),
  ensureBodyExists,
  bulkFriendshipStatus
);

module.exports = router; 