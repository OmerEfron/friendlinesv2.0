// Groups routes for Friendlines
// Handles CRUD operations for group management

const express = require("express");
const router = express.Router();

// Import controllers
const {
  createGroup,
  inviteToGroup,
  acceptInvitation,
  leaveGroup,
  getGroup,
  getUserGroups,
  getGroupPosts,
} = require("../controllers/groupController");

// Import middleware
const {
  validateGroupMiddleware,
  validateInviteMiddleware,
  validateUserActionMiddleware,
  validateIdMiddleware,
  validateUserIdMiddleware,
  ensureBodyExists,
  validateContentType,
} = require("../middleware/validation");
const {
  getGeneralLimiter,
} = require("../middleware/rateLimiter");
const { authenticateToken, optionalAuth } = require("../middleware/auth");

// Apply general rate limiting to all group routes
router.use(getGeneralLimiter());

/**
 * POST /groups
 * Create a new group
 * Body: { name, description }
 */
router.post(
  "/",
  authenticateToken, // Require authentication
  validateContentType, // Ensure JSON content type
  ensureBodyExists, // Ensure request body exists
  validateGroupMiddleware, // Validate and sanitize group data
  createGroup // Controller function
);

/**
 * POST /groups/:id/invite
 * Invite users to a group
 * Body: { userIds }
 */
router.post(
  "/:id/invite",
  authenticateToken, // Require authentication
  validateIdMiddleware("id"), // Validate group ID parameter
  validateContentType, // Ensure JSON content type
  ensureBodyExists, // Ensure request body exists
  validateInviteMiddleware, // Validate and sanitize invite data
  inviteToGroup // Controller function
);

/**
 * POST /groups/:id/accept
 * Accept a group invitation
 */
router.post(
  "/:id/accept",
  authenticateToken, // Require authentication
  validateIdMiddleware("id"), // Validate group ID parameter
  acceptInvitation // Controller function
);

/**
 * POST /groups/:id/leave
 * Leave a group
 */
router.post(
  "/:id/leave",
  authenticateToken, // Require authentication
  validateIdMiddleware("id"), // Validate group ID parameter
  leaveGroup // Controller function
);

/**
 * GET /groups/:id
 * Get group details
 */
router.get(
  "/:id",
  optionalAuth, // Optional auth for access control
  validateIdMiddleware("id"), // Validate group ID parameter
  getGroup // Controller function
);

/**
 * GET /groups/user/:userId
 * Get groups for a user (owned, member, invited)
 */
router.get(
  "/user/:userId",
  authenticateToken, // Require authentication
  validateUserIdMiddleware, // Validate user ID parameter
  getUserGroups // Controller function
);

/**
 * GET /groups/:id/posts
 * Get posts for a specific group
 * Query params: page, limit
 */
router.get(
  "/:id/posts",
  authenticateToken, // Require authentication for group access
  validateIdMiddleware("id"), // Validate group ID parameter
  getGroupPosts // Controller function
);

// Error handling middleware for group routes
router.use((error, req, res, next) => {
  console.error("Groups route error:", error);

  // Check if it's a validation error
  if (error.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }

  // Check if it's a group access error
  if (error.message && error.message.includes("access")) {
    return res.status(403).json({
      success: false,
      message: "Access denied",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }

  // Check if it's a group not found error
  if (error.message && error.message.includes("not found")) {
    return res.status(404).json({
      success: false,
      message: "Resource not found",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }

  // Default server error
  res.status(500).json({
    success: false,
    message: "Internal server error in groups",
    error:
      process.env.NODE_ENV === "development"
        ? error.message
        : "Something went wrong",
    timestamp: new Date().toISOString(),
  });
});

module.exports = router; 