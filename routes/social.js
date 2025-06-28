// Social routes for Friendlines
// Handles friend requests, friendships, and social interactions

const express = require("express");
const router = express.Router();

// Import controllers
const {
  getMutualFriends,
  getFriendSuggestions,
  bulkFriendshipStatus,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  removeFriendship,
  getFriends,
  getPendingRequests,
  getFriendshipStatus,
} = require("../controllers/socialController");

// Import middleware
const {
  validateIdMiddleware,
  ensureBodyExists,
  validateContentType,
} = require("../middleware/validation");
const { authenticateToken, optionalAuth } = require("../middleware/auth");
const { getGeneralLimiter } = require("../middleware/rateLimiter");

// Apply general rate limiting to all social routes
router.use(getGeneralLimiter());

/**
 * @swagger
 * /api/social/users/{id}/mutual-friends:
 *   get:
 *     tags: [Social]
 *     summary: Get mutual friends between two users
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: Other user ID to compare with
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Mutual friends retrieved successfully
 */
router.get(
  "/users/:id/mutual-friends",
  validateIdMiddleware("id"),
  getMutualFriends
);

/**
 * @swagger
 * /api/social/users/{id}/friend-suggestions:
 *   get:
 *     tags: [Social]
 *     summary: Get friend suggestions for a user
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Friend suggestions retrieved successfully
 */
router.get(
  "/users/:id/friend-suggestions",
  validateIdMiddleware("id"),
  getFriendSuggestions
);

/**
 * @swagger
 * /api/social/bulk-friendship-status:
 *   post:
 *     tags: [Social]
 *     summary: Get friendship status for multiple users
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *               targetUserIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Friendship statuses retrieved successfully
 */
router.post(
  "/bulk-friendship-status",
  validateContentType,
  ensureBodyExists,
  bulkFriendshipStatus
);

// === AUTHENTICATED ROUTES ===
// All routes below require authentication

/**
 * @swagger
 * /api/social/users/{id}/friend-request:
 *   post:
 *     tags: [Social]
 *     summary: Send friend request to a user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Target user ID
 *     responses:
 *       200:
 *         description: Friend request sent successfully
 *       400:
 *         description: Bad request (already friends, request already sent, etc.)
 *       401:
 *         description: Authentication required
 *       404:
 *         description: User not found
 */
router.post(
  "/users/:id/friend-request",
  authenticateToken,
  validateIdMiddleware("id"),
  sendFriendRequest
);

/**
 * @swagger
 * /api/social/users/{id}/accept-friend:
 *   post:
 *     tags: [Social]
 *     summary: Accept friend request from a user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Requester user ID
 *     responses:
 *       200:
 *         description: Friend request accepted successfully
 *       400:
 *         description: Bad request (no pending request, etc.)
 *       401:
 *         description: Authentication required
 *       404:
 *         description: User not found
 */
router.post(
  "/users/:id/accept-friend",
  authenticateToken,
  validateIdMiddleware("id"),
  acceptFriendRequest
);

/**
 * @swagger
 * /api/social/users/{id}/reject-friend:
 *   post:
 *     tags: [Social]
 *     summary: Reject friend request from a user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Requester user ID
 *     responses:
 *       200:
 *         description: Friend request rejected successfully
 *       400:
 *         description: Bad request (no pending request, etc.)
 *       401:
 *         description: Authentication required
 *       404:
 *         description: User not found
 */
router.post(
  "/users/:id/reject-friend",
  authenticateToken,
  validateIdMiddleware("id"),
  rejectFriendRequest
);

/**
 * @swagger
 * /api/social/users/{id}/cancel-friend-request:
 *   post:
 *     tags: [Social]
 *     summary: Cancel sent friend request
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Target user ID
 *     responses:
 *       200:
 *         description: Friend request canceled successfully
 *       400:
 *         description: Bad request (no pending request, etc.)
 *       401:
 *         description: Authentication required
 *       404:
 *         description: User not found
 */
router.post(
  "/users/:id/cancel-friend-request",
  authenticateToken,
  validateIdMiddleware("id"),
  cancelFriendRequest
);

/**
 * @swagger
 * /api/social/users/{id}/friendship:
 *   delete:
 *     tags: [Social]
 *     summary: Remove friendship (unfriend)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Friend user ID
 *     responses:
 *       200:
 *         description: Friendship removed successfully
 *       400:
 *         description: Bad request (not friends, etc.)
 *       401:
 *         description: Authentication required
 *       404:
 *         description: User not found
 */
router.delete(
  "/users/:id/friendship",
  authenticateToken,
  validateIdMiddleware("id"),
  removeFriendship
);

/**
 * @swagger
 * /api/social/users/{id}/friends:
 *   get:
 *     tags: [Social]
 *     summary: Get user's friends list
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Friends retrieved successfully
 *       401:
 *         description: Authentication required
 *       404:
 *         description: User not found
 */
router.get(
  "/users/:id/friends",
  optionalAuth, // Optional auth for now - could be made stricter
  validateIdMiddleware("id"),
  getFriends
);

/**
 * @swagger
 * /api/social/users/{id}/friend-requests:
 *   get:
 *     tags: [Social]
 *     summary: Get pending friend requests for a user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [received, sent]
 *           default: received
 *         description: Type of requests to retrieve
 *     responses:
 *       200:
 *         description: Friend requests retrieved successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Access denied (can only access own requests)
 *       404:
 *         description: User not found
 */
router.get(
  "/users/:id/friend-requests",
  authenticateToken,
  validateIdMiddleware("id"),
  getPendingRequests
);

/**
 * @swagger
 * /api/social/users/{id}/friendship-status:
 *   get:
 *     tags: [Social]
 *     summary: Get friendship status between authenticated user and target user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Target user ID
 *     responses:
 *       200:
 *         description: Friendship status retrieved successfully
 *       401:
 *         description: Authentication required
 *       404:
 *         description: User not found
 */
router.get(
  "/users/:id/friendship-status",
  authenticateToken,
  validateIdMiddleware("id"),
  getFriendshipStatus
);

// Error handling middleware for social routes
router.use((error, req, res, next) => {
  console.error("Social route error:", error);

  res.status(500).json({
    success: false,
    message: "Internal server error in social operations",
    error:
      process.env.NODE_ENV === "development"
        ? error.message
        : "Something went wrong",
    timestamp: new Date().toISOString(),
  });
});

module.exports = router; 