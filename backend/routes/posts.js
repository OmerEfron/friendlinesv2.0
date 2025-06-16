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
  likePost,
  getLikes,
  addComment,
  getComments,
  deleteComment,
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

// Apply general rate limiting to all post routes
router.use(getGeneralLimiter());

/**
 * GET /posts
 * Get all posts (newsflashes) with pagination
 * Query params: page, limit
 */
router.get(
  "/",
  getAllPosts // Controller function
);

/**
 * GET /posts/stats
 * Get post statistics (development only)
 * Must be defined before /:userId route to avoid conflicts
 */
router.get(
  "/stats",
  getPostStats // Controller function (checks NODE_ENV internally)
);

/**
 * GET /posts/single/:id
 * Get a specific post by ID
 * Must be defined before /:userId route to avoid conflicts
 */
router.get(
  "/single/:id",
  validateIdMiddleware("id"), // Validate post ID parameter
  getPostById // Controller function
);

/**
 * POST /posts/:id/like
 * Toggle like on a post
 * Body: { userId }
 */
router.post(
  "/:id/like",
  validateIdMiddleware("id"), // Validate post ID parameter
  validateContentType, // Ensure JSON content type
  ensureBodyExists, // Ensure request body exists
  likePost // Controller function
);

/**
 * GET /posts/:id/likes
 * Get likes for a post
 */
router.get(
  "/:id/likes",
  validateIdMiddleware("id"), // Validate post ID parameter
  getLikes // Controller function
);

/**
 * POST /posts/:id/comments
 * Add a comment to a post
 * Body: { userId, text }
 */
router.post(
  "/:id/comments",
  validateIdMiddleware("id"), // Validate post ID parameter
  validateContentType, // Ensure JSON content type
  ensureBodyExists, // Ensure request body exists
  addComment // Controller function
);

/**
 * GET /posts/:id/comments
 * Get comments for a post
 * Query params: page, limit
 */
router.get(
  "/:id/comments",
  validateIdMiddleware("id"), // Validate post ID parameter
  getComments // Controller function
);

/**
 * DELETE /posts/:postId/comments/:commentId
 * Delete a comment from a post
 * Body: { userId }
 */
router.delete(
  "/:postId/comments/:commentId",
  validateIdMiddleware("postId"), // Validate post ID parameter
  validateIdMiddleware("commentId"), // Validate comment ID parameter
  validateContentType, // Ensure JSON content type
  ensureBodyExists, // Ensure request body exists
  deleteComment // Controller function
);

/**
 * GET /posts/:userId
 * Get posts by specific user with pagination
 * Query params: page, limit
 */
router.get(
  "/:userId",
  validateUserIdMiddleware, // Validate user ID parameter
  getPostsByUser // Controller function
);

/**
 * POST /posts
 * Create a new post with generated newsflash
 * Body: { rawText, userId }
 */
router.post(
  "/",
  postCreationLimiter, // Rate limiting for post creation
  validateContentType, // Ensure JSON content type
  ensureBodyExists, // Ensure request body exists
  validatePostMiddleware, // Validate and sanitize post data
  createPost // Controller function
);

/**
 * PUT /posts/:id
 * Update an existing post (regenerates newsflash)
 * Body: { rawText }
 */
router.put(
  "/:id",
  postUpdateLimiter, // Rate limiting for post updates
  validateIdMiddleware("id"), // Validate post ID parameter
  validateContentType, // Ensure JSON content type
  ensureBodyExists, // Ensure request body exists
  validatePostUpdateMiddleware, // Validate and sanitize update data
  updatePost // Controller function
);

/**
 * DELETE /posts/:id
 * Delete a post
 */
router.delete(
  "/:id",
  validateIdMiddleware("id"), // Validate post ID parameter
  deletePost // Controller function
);

// Error handling middleware for post routes
router.use((error, req, res, next) => {
  console.error("Posts route error:", error);

  // Check if it's a validation error
  if (error.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }

  // Check if it's a newsflash generation error
  if (error.message && error.message.includes("newsflash")) {
    return res.status(400).json({
      success: false,
      message: "Newsflash generation failed",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }

  // General server error
  res.status(500).json({
    success: false,
    message: "Internal server error in posts",
    error:
      process.env.NODE_ENV === "development"
        ? error.message
        : "Something went wrong",
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
