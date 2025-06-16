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
  followUser,
  getFollowers,
  getFollowing,
  getFollowStatus,
} = require("../controllers/authController");

// Import middleware
const {
  validateUserMiddleware,
  validateIdMiddleware,
  ensureBodyExists,
  validateContentType,
} = require("../middleware/validation");
const {
  loginLimiter,
  getGeneralLimiter,
} = require("../middleware/rateLimiter");

// Apply general rate limiting to all auth routes
router.use(getGeneralLimiter());

/**
 * POST /login
 * User login/registration endpoint
 * Creates new user or logs in existing user (no password required)
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
 * GET /users/:id
 * Get user profile by ID
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
 * POST /users/:id/follow
 * Follow or unfollow a user
 * Body: { userId }
 */
router.post(
  "/users/:id/follow",
  validateIdMiddleware("id"), // Validate user ID parameter
  validateContentType, // Ensure JSON content type
  ensureBodyExists, // Ensure request body exists
  followUser // Controller function
);

/**
 * GET /users/:id/followers
 * Get followers for a user
 * Query params: page, limit
 */
router.get(
  "/users/:id/followers",
  validateIdMiddleware("id"), // Validate user ID parameter
  getFollowers // Controller function
);

/**
 * GET /users/:id/following
 * Get following for a user
 * Query params: page, limit
 */
router.get(
  "/users/:id/following",
  validateIdMiddleware("id"), // Validate user ID parameter
  getFollowing // Controller function
);

/**
 * GET /users/:id/follow-status
 * Get follow status between two users
 * Query params: userId (current user ID)
 */
router.get(
  "/users/:id/follow-status",
  validateIdMiddleware("id"), // Validate user ID parameter
  getFollowStatus // Controller function
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
