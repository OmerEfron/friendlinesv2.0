// Posts routes for Friendlines
// Handles CRUD operations for newsflash posts

const express = require("express");
const router = express.Router();

// Import controllers
const {
  getAllPosts,
  getPostsByUser,
  createPost,
  updatePost,
  deletePost,
  getPostById,
  getPostStats,
  generateNewsflashPreview,
  getAllPostsDev,
} = require("../controllers/postController");

// Import middleware
const {
  validatePostMiddleware,
  validatePostUpdateMiddleware,
  validateIdMiddleware,
  validateUserIdMiddleware,
  ensureBodyExists,
  validateContentType,
} = require("../middleware/validation");
const {
  postCreationLimiter,
  postUpdateLimiter,
  getGeneralLimiter,
} = require("../middleware/rateLimiter");
const { authenticateToken, optionalAuth } = require("../middleware/auth");

// Apply general rate limiting to all post routes
router.use(getGeneralLimiter());

/**
 * GET /posts
 * Get all posts with pagination and audience filtering
 * Query params: page, limit, currentUserId
 */
router.get("/", optionalAuth, getAllPosts);

/**
 * GET /posts/dev
 * Get all posts (development only - no pagination, no filtering)
 */
router.get("/dev", getAllPostsDev);

/**
 * GET /posts/:userId
 * Get posts by user with pagination and audience filtering
 * Query params: page, limit, currentUserId, includeFriends
 */
router.get(
  "/:userId",
  optionalAuth, // Optional auth to show appropriate content
  validateIdMiddleware("userId"), // Validate user ID parameter
  getPostsByUser // Controller function
);

/**
 * POST /posts
 * Create a new post
 * Body: { rawText, audienceType, targetFriendId?, groupIds?, generate?, tone?, length?, temperature? }
 */
router.post(
  "/",
  authenticateToken, // Require authentication
  postCreationLimiter, // Rate limiting for post creation
  validateContentType, // Ensure JSON content type
  ensureBodyExists, // Ensure request body exists
  validatePostMiddleware, // Validate post data
  createPost // Controller function
);

/**
 * PUT /posts/:id
 * Update an existing post
 * Body: { rawText?, generate?, tone?, length?, temperature? }
 */
router.put(
  "/:id",
  authenticateToken, // Require authentication
  postUpdateLimiter, // Rate limiting for post updates
  validateIdMiddleware("id"), // Validate post ID parameter
  validateContentType, // Ensure JSON content type
  ensureBodyExists, // Ensure request body exists
  validatePostUpdateMiddleware, // Validate update data
  updatePost // Controller function
);

/**
 * DELETE /posts/:id
 * Delete a post
 */
router.delete(
  "/:id",
  authenticateToken, // Require authentication
  validateIdMiddleware("id"), // Validate post ID parameter
  deletePost // Controller function
);

/**
 * GET /posts/:id/details
 * Get a specific post by ID with user info and stats
 */
router.get(
  "/:id/details",
  optionalAuth, // Optional auth to show appropriate content
  validateIdMiddleware("id"), // Validate post ID parameter
  getPostById // Controller function
);

/**
 * GET /posts/:id/stats
 * Get statistics for a specific post
 */
router.get(
  "/:id/stats",
  validateIdMiddleware("id"), // Validate post ID parameter
  getPostStats // Controller function
);

/**
 * POST /posts/preview
 * Generate a newsflash preview without saving the post
 * Body: { rawText, tone?, length?, temperature? }
 */
router.post(
  "/preview",
  authenticateToken, // Require authentication
  postCreationLimiter, // Use same rate limit as post creation
  validateContentType, // Ensure JSON content type
  ensureBodyExists, // Ensure request body exists
  generateNewsflashPreview // Controller function
);

module.exports = router;
