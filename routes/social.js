const express = require('express');
const { getMutualFriends, getFriendSuggestions, bulkFollowStatus } = require('../controllers/socialController');
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

// Bulk follow status check
router.post('/users/follow-status',
  getGeneralLimiter(),
  ensureBodyExists,
  bulkFollowStatus
);

module.exports = router; 