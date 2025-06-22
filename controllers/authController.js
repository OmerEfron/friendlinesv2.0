// Authentication controller for Friendlines
// Contains business logic for user authentication

const { readJson, writeJson } = require("../utils/dbUtils");
const { generateId, isValidId, validateProfileUpdateData } = require("../utils/validation");
const { registerDevice } = require("../utils/notificationService");

/**
 * Handle user login (create or retrieve user)
 * POST /login
 */
const login = async (req, res) => {
  try {
    // Get validated data from middleware
    const { fullName, email } = req.validatedData;

    // Read existing users
    const users = await readJson("users.json");

    // Check if user already exists by email
    let user = users.find((u) => u.email === email);

    if (user) {
      // Update user's full name if it has changed
      if (user.fullName !== fullName) {
        user.fullName = fullName;
        user.updatedAt = new Date().toISOString();

        // Save updated user data
        await writeJson("users.json", users);
      }

      console.log(`Existing user logged in: ${user.email}`);
    } else {
      // Create new user
      user = {
        id: generateId("u"),
        fullName,
        email,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // Social features
        followers: [], // Array of user IDs who follow this user
        following: [], // Array of user IDs this user follows
        followersCount: 0, // Denormalized count for performance
        followingCount: 0, // Denormalized count for performance
      };

      users.push(user);
      await writeJson("users.json", users);

      console.log(`New user created: ${user.email}`);
    }

    // Return user data (excluding sensitive info, though there's none in this POC)
    const userResponse = {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      // Social features
      followersCount: user.followersCount || 0,
      followingCount: user.followingCount || 0,
    };

    res.status(200).json({
      success: true,
      message:
        user.createdAt === user.updatedAt
          ? "User created successfully"
          : "User logged in successfully",
      data: userResponse,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during login",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Something went wrong",
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get user profile by ID
 * GET /users/:id
 */
const getUserProfile = async (req, res) => {
  try {
    const { id } = req.params;

    // Read users
    const users = await readJson("users.json");

    // Find user by ID
    const user = users.find((u) => u.id === id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        error: "No user found with the provided ID",
        timestamp: new Date().toISOString(),
      });
    }

    // Return user profile (excluding sensitive data)
    const userProfile = {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      // Social features
      followersCount: user.followersCount || 0,
      followingCount: user.followingCount || 0,
    };

    res.status(200).json({
      success: true,
      message: "User profile retrieved successfully",
      data: userProfile,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Get user profile error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error retrieving user profile",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Something went wrong",
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get all users (for admin/development purposes)
 * GET /users
 */
const getAllUsers = async (req, res) => {
  try {
    // Only allow in development mode
    if (process.env.NODE_ENV !== "development") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
        error: "This endpoint is only available in development mode",
        timestamp: new Date().toISOString(),
      });
    }

    // Read users
    const users = await readJson("users.json");

    // Return all users (excluding sensitive data)
    const userList = users.map((user) => ({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      // Social features
      followersCount: user.followersCount || 0,
      followingCount: user.followingCount || 0,
    }));

    res.status(200).json({
      success: true,
      message: "All users retrieved successfully",
      data: userList,
      count: userList.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Get all users error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error retrieving users",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Something went wrong",
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Check if a user exists by email
 * POST /users/check
 */
const checkUserExists = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== "string") {
      return res.status(400).json({
        success: false,
        message: "Email is required",
        error: "Valid email address must be provided",
        timestamp: new Date().toISOString(),
      });
    }

    // Read users
    const users = await readJson("users.json");

    // Check if user exists
    const userExists = users.some(
      (u) => u.email === email.toLowerCase().trim()
    );

    res.status(200).json({
      success: true,
      message: "User existence check completed",
      data: {
        exists: userExists,
        email: email.toLowerCase().trim(),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Check user exists error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error checking user existence",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Something went wrong",
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get user statistics (development only)
 * GET /users/stats
 */
const getUserStats = async (req, res) => {
  try {
    // Only allow in development mode
    if (process.env.NODE_ENV !== "development") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
        error: "This endpoint is only available in development mode",
        timestamp: new Date().toISOString(),
      });
    }

    // Read users and posts
    const users = await readJson("users.json");
    const posts = await readJson("posts.json");

    // Calculate statistics
    const stats = {
      totalUsers: users.length,
      totalPosts: posts.length,
      postsPerUser:
        users.length > 0 ? (posts.length / users.length).toFixed(2) : 0,
      recentUsers: users
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5)
        .map((user) => ({
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          createdAt: user.createdAt,
        })),
    };

    res.status(200).json({
      success: true,
      message: "User statistics retrieved successfully",
      data: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Get user stats error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error retrieving user statistics",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Something went wrong",
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Follow or unfollow a user
 * POST /users/:id/follow
 */
const followUser = async (req, res) => {
  try {
    const { id } = req.params; // Target user ID
    const { userId } = req.body; // Current user ID

    // Validate userId
    if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
        error: "Valid user ID must be provided to follow a user",
        timestamp: new Date().toISOString(),
      });
    }

    // Prevent users from following themselves
    if (id === userId) {
      return res.status(400).json({
        success: false,
        message: "Cannot follow yourself",
        error: "Users cannot follow themselves",
        timestamp: new Date().toISOString(),
      });
    }

    // Read users
    const users = await readJson("users.json");

    // Find both users
    const targetUserIndex = users.findIndex((u) => u.id === id);
    const currentUserIndex = users.findIndex((u) => u.id === userId);

    if (targetUserIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Target user not found",
        error: "No user found with the provided target ID",
        timestamp: new Date().toISOString(),
      });
    }

    if (currentUserIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Current user not found",
        error: "No user found with the provided current user ID",
        timestamp: new Date().toISOString(),
      });
    }

    const targetUser = users[targetUserIndex];
    const currentUser = users[currentUserIndex];

    // Ensure follow arrays exist (for backward compatibility)
    if (!targetUser.followers) {
      targetUser.followers = [];
    }
    if (!currentUser.following) {
      currentUser.following = [];
    }

    // Check if current user is already following target user
    const isFollowing = targetUser.followers.includes(userId);
    let action = "";

    if (isFollowing) {
      // Unfollow: remove from both arrays
      targetUser.followers = targetUser.followers.filter((followerId) => followerId !== userId);
      currentUser.following = currentUser.following.filter((followingId) => followingId !== id);
      action = "unfollowed";
    } else {
      // Follow: add to both arrays
      targetUser.followers.push(userId);
      currentUser.following.push(id);
      action = "followed";
    }

    // Update denormalized counts
    targetUser.followersCount = targetUser.followers.length;
    currentUser.followingCount = currentUser.following.length;

    // Update timestamps
    targetUser.updatedAt = new Date().toISOString();
    currentUser.updatedAt = new Date().toISOString();

    // Update users in array
    users[targetUserIndex] = targetUser;
    users[currentUserIndex] = currentUser;

    // Save updated users
    await writeJson("users.json", users);

    console.log(`${currentUser.fullName} ${action} ${targetUser.fullName}`);

    res.status(200).json({
      success: true,
      message: `User ${action} successfully`,
      data: {
        targetUserId: id,
        currentUserId: userId,
        isFollowing: !isFollowing,
        followersCount: targetUser.followersCount,
        followingCount: currentUser.followingCount,
        action: action,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Follow user error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error following user",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Something went wrong",
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get followers for a user
 * GET /users/:id/followers
 */
const getFollowers = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    // Validate pagination parameters
    const validatedParams = { page: parseInt(page) || 1, limit: Math.min(parseInt(limit) || 20, 50) };
    
    if (validatedParams.page < 1) validatedParams.page = 1;
    if (validatedParams.limit < 1) validatedParams.limit = 20;

    // Read users
    const users = await readJson("users.json");

    // Find the target user
    const targetUser = users.find((u) => u.id === id);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        error: "No user found with the provided ID",
        timestamp: new Date().toISOString(),
      });
    }

    // Ensure followers array exists (for backward compatibility)
    const followers = targetUser.followers || [];

    // Calculate pagination
    const totalFollowers = followers.length;
    const totalPages = Math.ceil(totalFollowers / validatedParams.limit);
    const startIndex = (validatedParams.page - 1) * validatedParams.limit;
    const endIndex = startIndex + validatedParams.limit;

    // Get paginated follower IDs
    const paginatedFollowerIds = followers.slice(startIndex, endIndex);

    // Create a user lookup map for better performance
    const userMap = users.reduce((map, user) => {
      map[user.id] = user;
      return map;
    }, {});

    // Enrich followers with user information
    const enrichedFollowers = paginatedFollowerIds.map((followerId) => {
      const follower = userMap[followerId];
      return {
        id: followerId,
        fullName: follower ? follower.fullName : "Unknown User",
        email: follower ? follower.email : null,
        followersCount: follower ? (follower.followersCount || 0) : 0,
        followingCount: follower ? (follower.followingCount || 0) : 0,
      };
    });

    res.status(200).json({
      success: true,
      message: "User followers retrieved successfully",
      data: {
        userId: id,
        userName: targetUser.fullName,
        followersCount: totalFollowers,
        followers: enrichedFollowers,
      },
      pagination: {
        page: validatedParams.page,
        limit: validatedParams.limit,
        totalFollowers,
        totalPages,
        hasNextPage: validatedParams.page < totalPages,
        hasPrevPage: validatedParams.page > 1,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Get followers error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error retrieving followers",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Something went wrong",
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get following for a user
 * GET /users/:id/following
 */
const getFollowing = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    // Validate pagination parameters
    const validatedParams = { page: parseInt(page) || 1, limit: Math.min(parseInt(limit) || 20, 50) };
    
    if (validatedParams.page < 1) validatedParams.page = 1;
    if (validatedParams.limit < 1) validatedParams.limit = 20;

    // Read users
    const users = await readJson("users.json");

    // Find the target user
    const targetUser = users.find((u) => u.id === id);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        error: "No user found with the provided ID",
        timestamp: new Date().toISOString(),
      });
    }

    // Ensure following array exists (for backward compatibility)
    const following = targetUser.following || [];

    // Calculate pagination
    const totalFollowing = following.length;
    const totalPages = Math.ceil(totalFollowing / validatedParams.limit);
    const startIndex = (validatedParams.page - 1) * validatedParams.limit;
    const endIndex = startIndex + validatedParams.limit;

    // Get paginated following IDs
    const paginatedFollowingIds = following.slice(startIndex, endIndex);

    // Create a user lookup map for better performance
    const userMap = users.reduce((map, user) => {
      map[user.id] = user;
      return map;
    }, {});

    // Enrich following with user information
    const enrichedFollowing = paginatedFollowingIds.map((followingId) => {
      const followedUser = userMap[followingId];
      return {
        id: followingId,
        fullName: followedUser ? followedUser.fullName : "Unknown User",
        email: followedUser ? followedUser.email : null,
        followersCount: followedUser ? (followedUser.followersCount || 0) : 0,
        followingCount: followedUser ? (followedUser.followingCount || 0) : 0,
      };
    });

    res.status(200).json({
      success: true,
      message: "User following retrieved successfully",
      data: {
        userId: id,
        userName: targetUser.fullName,
        followingCount: totalFollowing,
        following: enrichedFollowing,
      },
      pagination: {
        page: validatedParams.page,
        limit: validatedParams.limit,
        totalFollowing,
        totalPages,
        hasNextPage: validatedParams.page < totalPages,
        hasPrevPage: validatedParams.page > 1,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Get following error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error retrieving following",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Something went wrong",
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get follow status between two users
 * GET /users/:id/follow-status?userId=currentUserId
 */
const getFollowStatus = async (req, res) => {
  try {
    const { id } = req.params; // Target user ID
    const { userId } = req.query; // Current user ID

    // Validate userId
    if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
        error: "Valid user ID must be provided as query parameter",
        timestamp: new Date().toISOString(),
      });
    }

    // Read users
    const users = await readJson("users.json");

    // Find both users  
    const targetUser = users.find((u) => u.id === id);
    const currentUser = users.find((u) => u.id === userId);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "Target user not found",
        error: "No user found with the provided target ID",
        timestamp: new Date().toISOString(),
      });
    }

    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: "Current user not found", 
        error: "No user found with the provided current user ID",
        timestamp: new Date().toISOString(),
      });
    }

    // Check follow status
    const isFollowing = targetUser.followers ? targetUser.followers.includes(userId) : false;
    const isFollowedBy = currentUser.followers ? currentUser.followers.includes(id) : false;

    res.status(200).json({
      success: true,
      message: "Follow status retrieved successfully",
      data: {
        targetUserId: id,
        targetUserName: targetUser.fullName,
        currentUserId: userId,
        currentUserName: currentUser.fullName,
        isFollowing: isFollowing, // Current user follows target user
        isFollowedBy: isFollowedBy, // Target user follows current user
        mutualFollow: isFollowing && isFollowedBy,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Get follow status error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error retrieving follow status",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Something went wrong",
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Register push notification token for a user
 * POST /users/:id/push-token
 */
const registerPushToken = async (req, res) => {
  try {
    const { id } = req.params;
    const { expoPushToken } = req.body;

    // Validate expoPushToken
    if (!expoPushToken || typeof expoPushToken !== "string" || expoPushToken.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Push token is required",
        error: "Valid Expo push token must be provided",
        timestamp: new Date().toISOString(),
      });
    }

    // Use notification service to register device
    const result = await registerDevice(id, expoPushToken.trim());

    if (!result.success) {
      const statusCode = result.error === 'User not found' ? 404 : 
                        result.error === 'Invalid Expo push token format' ? 400 : 500;
      
      return res.status(statusCode).json({
        success: false,
        message: "Failed to register push token",
        error: result.error,
        timestamp: new Date().toISOString(),
      });
    }

    res.status(200).json({
      success: true,
      message: "Push token registered successfully",
      data: {
        userId: id,
        tokenRegistered: true,
        updatedAt: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Register push token error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error registering push token",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Something went wrong",
      timestamp: new Date().toISOString(),
    });
  }
};

const updateUserProfile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { fullName, bio, location, website, avatar } = req.body;

    // Note: ID validation and profile data validation are handled by middleware

    const users = await readJson('users.json');
    const userIndex = users.findIndex(user => user.id === id);

    if (userIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        timestamp: new Date().toISOString()
      });
    }

    const user = users[userIndex];

    // Update only provided fields
    const updatedUser = {
      ...user,
      ...(fullName && { fullName }),
      ...(bio !== undefined && { bio }),
      ...(location !== undefined && { location }),
      ...(website !== undefined && { website }),
      ...(avatar !== undefined && { avatar }),
      updatedAt: new Date().toISOString()
    };

    users[userIndex] = updatedUser;
    await writeJson('users.json', users);

    // Remove sensitive fields from response
    const { ...responseUser } = updatedUser;

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: responseUser,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error updating user profile:', error);
    next(error);
  }
};

module.exports = {
  login,
  getUserProfile,
  getAllUsers,
  checkUserExists,
  getUserStats,
  followUser,
  getFollowers,
  getFollowing,
  getFollowStatus,
  registerPushToken,
  updateUserProfile
};
