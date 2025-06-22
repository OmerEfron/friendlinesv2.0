const express = require('express');
const { upload, uploadAvatar } = require('../controllers/uploadController');
const { validateIdMiddleware } = require('../middleware/validation');
const { createCustomLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Rate limiter for uploads (10 per hour)
const uploadLimiter = createCustomLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: {
    success: false,
    message: 'Too many file uploads. Please wait before trying again.',
    timestamp: new Date().toISOString()
  }
});

// Upload avatar
router.post('/avatar/:id',
  uploadLimiter,
  validateIdMiddleware("id"),
  upload.single('avatar'),
  uploadAvatar
);

module.exports = router; 