// Main server entry point for Friendlines Backend
// This file will initialize Express server and configure routes

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
const { initializeDatabase, initializeDataFiles, closeDatabase } = require("./utils/dbUtils");
const { initializeDevData } = require("./utils/devDataInitializer");
const uploadRoutes = require('./routes/upload');
const notificationRoutes = require('./routes/notifications');
const socialRoutes = require('./routes/social');

// Initialize Express app
const app = express();

// Environment variables
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || "development";

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    crossOriginEmbedderPolicy: false, // Disable for development
  })
);

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    // In development, allow all origins
    if (NODE_ENV === "development") {
      return callback(null, true);
    }

    // In production, you would specify allowed origins
    const allowedOrigins = [
      "http://localhost:3000",
      "http://localhost:19006", // Expo development server
      "exp://localhost:19000", // Expo development server
      // Add your production frontend URL here
    ];

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Trust proxy (for rate limiting behind reverse proxy)
app.set("trust proxy", 1);

// Request logging middleware (development only)
if (NODE_ENV === "development") {
  app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(
      `[${timestamp}] ${req.method} ${req.path}`,
      req.body && Object.keys(req.body).length > 0 ? req.body : ""
    );
    next();
  });
}

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Friendlines Backend is running",
    data: {
      status: "healthy",
      environment: NODE_ENV,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: "1.0.0",
    },
  });
});

// API routes
app.use("/api", require("./routes/auth")); // Auth routes (login, users)
app.use("/api/posts", require("./routes/posts")); // Posts routes
app.use("/api/groups", require("./routes/groups")); // Groups routes
app.use("/api/reset", require("./routes/reset")); // Reset routes (development only)

// Serve static files (for uploaded images in development)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// New routes
app.use('/api/upload', uploadRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/social', socialRoutes);

// Root endpoint
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to Friendlines API",
    data: {
      name: "Friendlines Backend",
      version: "1.0.0",
      description:
        "Satirical social news API - Transform everyday updates into newsflashes",
      environment: NODE_ENV,
      endpoints: {
        health: "GET /health",
        auth: {
          login: "POST /api/login",
          users: "GET /api/users",
          userProfile: "GET /api/users/:id",
          updateProfile: "PUT /api/users/:id",
          checkUser: "POST /api/users/check",
          userStats: "GET /api/users/stats",
          friendRequest: "POST /api/users/:id/friend-request",
          acceptFriend: "POST /api/users/:id/accept-friend",
          rejectFriend: "POST /api/users/:id/reject-friend",
          unfriend: "POST /api/users/:id/unfriend",
          friends: "GET /api/users/:id/friends",
          friendRequests: "GET /api/users/:id/friend-requests",
          friendshipStatus: "GET /api/users/:id/friendship-status"
        },
        posts: {
          getAllPosts: "GET /api/posts",
          getUserPosts: "GET /api/posts/:userId",
          createPost: "POST /api/posts",
          updatePost: "PUT /api/posts/:id",
          deletePost: "DELETE /api/posts/:id",
          getPostDetails: "GET /api/posts/:id/details",
          postStats: "GET /api/posts/:id/stats",
          generateNewsflashPreview: "POST /api/posts/preview"
        },
        groups: {
          createGroup: "POST /api/groups/:userId",
          inviteToGroup: "POST /api/groups/:id/invite",
          acceptInvitation: "POST /api/groups/:id/accept",
          leaveGroup: "POST /api/groups/:id/leave",
          getGroup: "GET /api/groups/:id",
          getUserGroups: "GET /api/groups/user/:userId"
        },
        // upload: {
        //   uploadAvatar: "POST /api/upload/avatar/:id"
        // },
        notifications: {
          getUserNotifications: "GET /api/notifications/:id",
          markAsRead: "PUT /api/notifications/mark-read",
          registerPushToken: "POST /api/users/:id/push-token"
        },
        social: {
          mutualFriends: "GET /api/social/users/:id/mutual-friends",
          friendSuggestions: "GET /api/social/users/:id/friend-suggestions",
          bulkFriendshipStatus: "POST /api/social/users/friendship-status"
        },
        reset: {
          resetAll: "POST /api/reset",
          resetStatus: "GET /api/reset/status",
          resetUsers: "POST /api/reset/users",
          resetPosts: "POST /api/reset/posts"
        }
      },
      timestamp: new Date().toISOString(),
    },
  });
});

// 404 handler for unmatched routes
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Endpoint not found",
    error: `Cannot ${req.method} ${req.originalUrl}`,
    availableEndpoints: [
      "GET /",
      "GET /health",
      "POST /api/login",
      "GET /api/posts",
      "POST /api/posts",
      "POST /api/groups/:userId",
      "GET /api/groups/:id",
      "POST /api/reset",
    ],
    timestamp: new Date().toISOString(),
  });
});

// Global error handling middleware
app.use((error, req, res, next) => {
  console.error("Global error handler:", error);

  // Handle specific error types
  if (error.type === "entity.parse.failed") {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON format",
      error: "Request body contains invalid JSON",
      timestamp: new Date().toISOString(),
    });
  }

  if (error.type === "entity.too.large") {
    return res.status(413).json({
      success: false,
      message: "Request too large",
      error: "Request body exceeds size limit",
      timestamp: new Date().toISOString(),
    });
  }

  if (error.message && error.message.includes("CORS")) {
    return res.status(403).json({
      success: false,
      message: "CORS error",
      error: "Request blocked by CORS policy",
      timestamp: new Date().toISOString(),
    });
  }

  // Default error response
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: NODE_ENV === "development" ? error.message : "Something went wrong",
    timestamp: new Date().toISOString(),
  });
});

// Graceful shutdown handling
process.on("SIGTERM", () => {
  console.log("📦 SIGTERM received, shutting down gracefully...");
  closeDatabase();
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("📦 SIGINT received, shutting down gracefully...");
  closeDatabase();
  process.exit(0);
});

// Initialize data files and start server
const startServer = async () => {
  try {
    console.log("🔧 Initializing Friendlines Backend...");

    // Initialize database
    await initializeDatabase();
    console.log("✅ Database initialized");

    // Initialize data files (includes migration)
    await initializeDataFiles();
    console.log("✅ Data files initialized");

    // Initialize development data if in development mode
    if (NODE_ENV === "development") {
      await initializeDevData();
      console.log("✅ Development data initialized");
    }

    // Start server
    const server = app.listen(PORT, () => {
      console.log("🚀 Friendlines Backend Server Started!");
      console.log(`📡 Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${NODE_ENV}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log(`📚 API Documentation: http://localhost:${PORT}/`);
      console.log("📝 Ready to transform everyday updates into newsflashes!");

      if (NODE_ENV === "development") {
        console.log(
          "🛠️  Development mode - Reset endpoint available at POST /api/reset"
        );
        console.log("🧪 Test user: test@example.com (ID: utest123456789)");
      }
    });

    // Handle server errors
    server.on("error", (error) => {
      if (error.code === "EADDRINUSE") {
        console.error(`💥 Port ${PORT} is already in use`);
        process.exit(1);
      } else {
        console.error("💥 Server error:", error);
        process.exit(1);
      }
    });
  } catch (error) {
    console.error("💥 Failed to start server:", error);
    process.exit(1);
  }
};

// Start the server
startServer();

// Export app for testing
module.exports = app;
