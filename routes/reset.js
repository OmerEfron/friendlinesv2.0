// Reset routes for Friendlines
// Development-only endpoint to clear all data

const express = require("express");
const { db } = require("../utils/database");
const { resetLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

/**
 * POST /reset
 * Development-only endpoint to clear all data
 * Resets users.json and posts.json to empty arrays
 */
router.post("/", resetLimiter, async (req, res, next) => {
  try {
    if (process.env.NODE_ENV !== "development") {
      return res.status(403).json({
        success: false,
        message: "Reset endpoint is only available in development mode",
        timestamp: new Date().toISOString(),
      });
    }

    console.log("🔄 Resetting all data...");

    // Clear all tables using modern database
    await db.runQuery('DELETE FROM post_likes');
    await db.runQuery('DELETE FROM post_groups');
    await db.runQuery('DELETE FROM group_invites');
    await db.runQuery('DELETE FROM group_members');
    await db.runQuery('DELETE FROM friendships');
    await db.runQuery('DELETE FROM notifications');
    await db.runQuery('DELETE FROM push_receipts');
    await db.runQuery('DELETE FROM posts');
    await db.runQuery('DELETE FROM groups');
    await db.runQuery('DELETE FROM users');

    console.log("✅ All data reset successfully");

    res.status(200).json({
      success: true,
      message: "All data has been reset successfully",
      data: {
        clearedTables: [
          'users',
          'posts', 
          'groups',
          'friendships',
          'group_members',
          'group_invites',
          'post_groups',
          'post_likes',
          'notifications',
          'push_receipts'
        ]
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error resetting data:", error);
    next(error);
  }
});

/**
 * GET /reset/status
 * Get information about the reset endpoint and current data state
 */
router.get("/status", resetLimiter, async (req, res, next) => {
  try {
    if (process.env.NODE_ENV !== "development") {
      return res.status(403).json({
        success: false,
        message: "Reset endpoint is only available in development mode",
        timestamp: new Date().toISOString(),
      });
    }

    // Get counts from all tables
    const userCount = await db.getMany('SELECT COUNT(*) as count FROM users');
    const postCount = await db.getMany('SELECT COUNT(*) as count FROM posts');
    const groupCount = await db.getMany('SELECT COUNT(*) as count FROM groups');
    const friendshipCount = await db.getMany('SELECT COUNT(*) as count FROM friendships');
    const notificationCount = await db.getMany('SELECT COUNT(*) as count FROM notifications');

    const stats = {
      users: userCount[0]?.count || 0,
      posts: postCount[0]?.count || 0,
      groups: groupCount[0]?.count || 0,
      friendships: friendshipCount[0]?.count || 0,
      notifications: notificationCount[0]?.count || 0,
      lastReset: "N/A", // Could be tracked if needed
      canReset: true,
    };

    res.status(200).json({
      success: true,
      message: "Reset status retrieved successfully",
      data: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error getting reset status:", error);
    next(error);
  }
});

/**
 * POST /reset/users
 * Development-only endpoint to clear only users data
 */
router.post("/users", resetLimiter, async (req, res, next) => {
  try {
    if (process.env.NODE_ENV !== "development") {
      return res.status(403).json({
        success: false,
        message: "Reset endpoint is only available in development mode",
        timestamp: new Date().toISOString(),
      });
    }

    console.log("🔄 Resetting users data...");

    // Clear user-related data in proper order (due to foreign key constraints)
    await db.runQuery('DELETE FROM post_likes');
    await db.runQuery('DELETE FROM group_members');
    await db.runQuery('DELETE FROM group_invites');
    await db.runQuery('DELETE FROM friendships');
    await db.runQuery('DELETE FROM notifications');
    await db.runQuery('DELETE FROM posts WHERE userId IN (SELECT id FROM users)');
    await db.runQuery('DELETE FROM groups WHERE ownerId IN (SELECT id FROM users)');
    await db.runQuery('DELETE FROM users');

    console.log("✅ Users data reset successfully");

    res.status(200).json({
      success: true,
      message: "Users data has been reset successfully",
      data: {
        clearedTables: [
          'users',
          'friendships', 
          'notifications',
          'related posts',
          'related groups'
        ]
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error resetting users data:", error);
    next(error);
  }
});

/**
 * POST /reset/posts
 * Development-only endpoint to clear only posts data
 */
router.post("/posts", resetLimiter, async (req, res, next) => {
  try {
    if (process.env.NODE_ENV !== "development") {
      return res.status(403).json({
        success: false,
        message: "Reset endpoint is only available in development mode",
        timestamp: new Date().toISOString(),
      });
    }

    console.log("🔄 Resetting posts data...");

    // Clear post-related data in proper order
    await db.runQuery('DELETE FROM post_likes');
    await db.runQuery('DELETE FROM post_groups');
    await db.runQuery('DELETE FROM posts');

    console.log("✅ Posts data reset successfully");

    res.status(200).json({
      success: true,
      message: "Posts data has been reset successfully",
      data: {
        clearedTables: [
          'posts',
          'post_likes',
          'post_groups'
        ]
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error resetting posts data:", error);
    next(error);
  }
});

// Error handling middleware for reset routes
router.use((error, req, res, next) => {
  console.error("Reset route error:", error);

  res.status(500).json({
    success: false,
    message: "Internal server error in reset functionality",
    error:
      process.env.NODE_ENV === "development"
        ? error.message
        : "Something went wrong",
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
