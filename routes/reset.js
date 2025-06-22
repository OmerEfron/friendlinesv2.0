// Reset routes for Friendlines
// Development-only endpoint to clear all data

const express = require("express");
const router = express.Router();
const { writeJson } = require("../utils/dbUtils");
const { resetLimiter } = require("../middleware/rateLimiter");

/**
 * POST /reset
 * Development-only endpoint to clear all data
 * Resets users.json and posts.json to empty arrays
 */
router.post("/", resetLimiter, async (req, res) => {
  try {
    // Only allow in development mode
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
        error: "Reset endpoint is not available in production",
        timestamp: new Date().toISOString(),
      });
    }

    console.log("🔄 Resetting all data...");

    // Reset users.json to empty array
    await writeJson("users.json", []);
    console.log("✅ Users data cleared");

    // Reset posts.json to empty array
    await writeJson("posts.json", []);
    console.log("✅ Posts data cleared");

    console.log("🎉 All data has been reset successfully");

    res.status(200).json({
      success: true,
      message: "All data has been reset successfully",
      data: {
        usersCleared: true,
        postsCleared: true,
        resetAt: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Reset error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during reset",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Something went wrong",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /reset/status
 * Get information about the reset endpoint and current data state
 */
router.get("/status", async (req, res) => {
  try {
    // Only allow in development mode
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
        error: "Reset status endpoint is not available in production",
        timestamp: new Date().toISOString(),
      });
    }

    const { readJson } = require("../utils/dbUtils");

    // Read current data to show status
    const users = await readJson("users.json");
    const posts = await readJson("posts.json");

    res.status(200).json({
      success: true,
      message: "Reset status retrieved successfully",
      data: {
        environment: process.env.NODE_ENV || "development",
        resetAvailable: true,
        currentData: {
          totalUsers: users.length,
          totalPosts: posts.length,
          isEmpty: users.length === 0 && posts.length === 0,
        },
        usage: {
          endpoint: "POST /reset",
          description: "Clears all users and posts data",
          warning: "This action cannot be undone",
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Reset status error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error getting reset status",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Something went wrong",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /reset/users
 * Development-only endpoint to clear only users data
 */
router.post("/users", resetLimiter, async (req, res) => {
  try {
    // Only allow in development mode
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
        error: "Reset users endpoint is not available in production",
        timestamp: new Date().toISOString(),
      });
    }

    console.log("🔄 Resetting users data...");

    // Reset users.json to empty array
    await writeJson("users.json", []);
    console.log("✅ Users data cleared");

    res.status(200).json({
      success: true,
      message: "Users data has been reset successfully",
      data: {
        usersCleared: true,
        resetAt: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Reset users error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during users reset",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Something went wrong",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /reset/posts
 * Development-only endpoint to clear only posts data
 */
router.post("/posts", resetLimiter, async (req, res) => {
  try {
    // Only allow in development mode
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
        error: "Reset posts endpoint is not available in production",
        timestamp: new Date().toISOString(),
      });
    }

    console.log("🔄 Resetting posts data...");

    // Reset posts.json to empty array
    await writeJson("posts.json", []);
    console.log("✅ Posts data cleared");

    res.status(200).json({
      success: true,
      message: "Posts data has been reset successfully",
      data: {
        postsCleared: true,
        resetAt: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Reset posts error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during posts reset",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Something went wrong",
      timestamp: new Date().toISOString(),
    });
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
