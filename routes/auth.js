// Authentication routes for Friendlines
// Handles user login and session management

const express = require("express");
const router = express.Router();

// Import controllers
const {
  login,
  getUserProfile,
  getAllUsers,
  checkUserExists,
  getUserStats,
  registerPushToken,
  updateUserProfile,
} = require("../controllers/authController");

// Import middleware
const {
  validateUserMiddleware,
  validateIdMiddleware,
  ensureBodyExists,
  validateContentType,
  validateProfileUpdateMiddleware,
} = require("../middleware/validation");
const {
  loginLimiter,
  getGeneralLimiter,
  createCustomLimiter,
} = require("../middleware/rateLimiter");
const { authenticateToken } = require("../middleware/auth");

// Apply general rate limiting to all auth routes
router.use(getGeneralLimiter());

// Rate limiter for profile updates (5 per hour)
const profileUpdateLimiter = createCustomLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: {
    success: false,
    message: 'Too many profile updates. Please wait before trying again.',
    timestamp: new Date().toISOString()
  }
});

/**
 * @swagger
 * /api/login:
 *   post:
 *     tags: [Authentication]
 *     summary: User login/registration
 *     description: Creates new user or logs in existing user (no password required)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *             properties:
 *               username:
 *                 type: string
 *                 description: User display name
 *                 example: "john_doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User email address
 *                 example: "john@example.com"
 *               avatar:
 *                 type: string
 *                 description: URL to user avatar image
 *                 example: "https://example.com/avatar.jpg"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         description: Too many requests
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  "/login",
  loginLimiter, // Specific rate limiting for login attempts
  validateContentType, // Ensure JSON content type
  ensureBodyExists, // Ensure request body exists
  validateUserMiddleware, // Validate and sanitize user data
  login // Controller function
);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     tags: [Authentication]
 *     summary: Get user profile by ID
 *     description: Retrieve detailed user profile information
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *         example: "user_123"
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
  "/users/:id",
  validateIdMiddleware("id"), // Validate ID parameter
  getUserProfile // Controller function
);

/**
 * GET /users
 * Get all users (development only)
 */
router.get(
  "/users",
  getAllUsers // Controller function (checks NODE_ENV internally)
);

/**
 * POST /users/check
 * Check if user exists by email
 */
router.post(
  "/users/check",
  validateContentType, // Ensure JSON content type
  ensureBodyExists, // Ensure request body exists
  checkUserExists // Controller function
);

/**
 * GET /users/stats
 * Get user statistics (development only)
 */
router.get(
  "/users/stats",
  getUserStats // Controller function (checks NODE_ENV internally)
);

/**
 * POST /users/:id/push-token
 * Register push notification token for a user
 * Body: { expoPushToken }
 */
router.post(
  "/push-token",
  authenticateToken, // Require authentication
  validateContentType, // Ensure JSON content type
  ensureBodyExists, // Ensure request body exists
  registerPushToken // Controller function
);

// Update user profile
router.put('/profile', 
  authenticateToken, // Require authentication
  profileUpdateLimiter,
  validateContentType,
  ensureBodyExists,
  validateProfileUpdateMiddleware,
  updateUserProfile
);

// Error handling middleware for auth routes
router.use((error, req, res, next) => {
  console.error("Auth route error:", error);

  res.status(500).json({
    success: false,
    message: "Internal server error in authentication",
    error:
      process.env.NODE_ENV === "development"
        ? error.message
        : "Something went wrong",
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
