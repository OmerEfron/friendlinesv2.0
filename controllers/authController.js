// Authentication controller for Friendlines
// Contains business logic for user authentication

const { readJson, writeJson, generateId } = require("../utils/dbUtils");
const { isValidId, validateProfileUpdateData, validatePaginationParams } = require("../utils/validation");
const { registerDevice, sendPush, getFriendTokens } = require("../utils/notificationService");

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
        // Friendship features
        friends: [], // Array of user IDs who are friends with this user
        friendRequests: [], // Array of user IDs who sent friend requests
        sentFriendRequests: [], // Array of user IDs to whom this user sent friend requests
        friendsCount: 0, // Denormalized count for performance
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
      // Friendship features
      friendsCount: user.friendsCount || 0,
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
      // Friendship features
      friendsCount: user.friendsCount || 0,
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
      // Friendship features
      friendsCount: user.friendsCount || 0,
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
 * Send friend request to a user
 * POST /users/:id/friend-request
 */
const sendFriendRequest = async (req, res) => {
  try {
    const { id } = req.params; // Target user ID
    const { userId } = req.body; // Current user ID

    // Validate userId
    if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
        error: "Valid user ID must be provided to send a friend request",
        timestamp: new Date().toISOString(),
      });
    }

    // Prevent users from sending friend request to themselves
    if (id === userId) {
      return res.status(400).json({
        success: false,
        message: "Cannot send friend request to yourself",
        error: "Users cannot send friend requests to themselves",
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

    // Initialize friendship-related arrays if they don't exist
    if (!targetUser.friendRequests) targetUser.friendRequests = [];
    if (!currentUser.sentFriendRequests) currentUser.sentFriendRequests = [];
    if (!targetUser.friends) targetUser.friends = [];
    if (!currentUser.friends) currentUser.friends = [];

    // Check if they're already friends
    if (targetUser.friends.includes(userId)) {
      return res.status(400).json({
        success: false,
        message: "You are already friends with this user",
        timestamp: new Date().toISOString(),
      });
    }

    // Check if friend request already exists
    if (targetUser.friendRequests.includes(userId)) {
      return res.status(400).json({
        success: false,
        message: "Friend request already sent",
        timestamp: new Date().toISOString(),
      });
    }

    // Check if target user has already sent a request to current user
    if (currentUser.friendRequests && currentUser.friendRequests.includes(id)) {
      return res.status(400).json({
        success: false,
        message: "This user has already sent you a friend request. Accept it instead.",
        timestamp: new Date().toISOString(),
      });
    }

    // Add friend request
    targetUser.friendRequests.push(userId);
    currentUser.sentFriendRequests.push(id);

    // Update timestamps
    targetUser.updatedAt = new Date().toISOString();
    currentUser.updatedAt = new Date().toISOString();

    // Update users in array
    users[targetUserIndex] = targetUser;
    users[currentUserIndex] = currentUser;

    // Save updated users
    await writeJson("users.json", users);

    // Send push notification to target user (non-blocking)
    try {
      if (targetUser.expoPushToken) {
        const notificationResult = await sendPush(
          [targetUser.expoPushToken],
          "New Friend Request!",
          `${currentUser.fullName} sent you a friend request`,
          {
            type: "friend_request",
            requesterId: userId,
            requesterName: currentUser.fullName,
            targetUserId: id,
            targetUserName: targetUser.fullName
          },
          {
            channelId: "friend_requests",
            priority: "normal"
          }
        );
        
        if (notificationResult.success) {
          console.log(`Friend request notification sent to ${targetUser.fullName} from ${currentUser.fullName}`);
        } else {
          console.error(`Failed to send friend request notification to ${targetUser.fullName}:`, notificationResult.error);
        }
      }
    } catch (notificationError) {
      // Don't fail the friend request if notifications fail
      console.error("Friend request notification error:", notificationError);
    }

    console.log(`${currentUser.fullName} sent friend request to ${targetUser.fullName}`);

    res.status(200).json({
      success: true,
      message: "Friend request sent successfully",
      data: {
        targetUserId: id,
        currentUserId: userId,
        requestSent: true,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Send friend request error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error sending friend request",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Something went wrong",
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Accept friend request from a user
 * POST /users/:id/accept-friend
 */
const acceptFriendRequest = async (req, res) => {
  try {
    const { id } = req.params; // User who sent the request
    const { userId } = req.body; // Current user ID (who is accepting)

    // Validate userId
    if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
        error: "Valid user ID must be provided to accept a friend request",
        timestamp: new Date().toISOString(),
      });
    }

    // Read users
    const users = await readJson("users.json");

    // Find both users
    const requesterUserIndex = users.findIndex((u) => u.id === id);
    const currentUserIndex = users.findIndex((u) => u.id === userId);

    if (requesterUserIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Requester user not found",
        error: "No user found with the provided requester ID",
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

    const requesterUser = users[requesterUserIndex];
    const currentUser = users[currentUserIndex];

    // Initialize arrays if they don't exist
    if (!currentUser.friendRequests) currentUser.friendRequests = [];
    if (!requesterUser.sentFriendRequests) requesterUser.sentFriendRequests = [];
    if (!currentUser.friends) currentUser.friends = [];
    if (!requesterUser.friends) requesterUser.friends = [];

    // Check if friend request exists
    if (!currentUser.friendRequests.includes(id)) {
      return res.status(400).json({
        success: false,
        message: "No friend request found from this user",
        timestamp: new Date().toISOString(),
      });
    }

    // Remove from friend requests and sent requests
    currentUser.friendRequests = currentUser.friendRequests.filter(reqId => reqId !== id);
    requesterUser.sentFriendRequests = requesterUser.sentFriendRequests.filter(reqId => reqId !== userId);

    // Add to friends lists
    currentUser.friends.push(id);
    requesterUser.friends.push(userId);

    // Update friend counts
    currentUser.friendsCount = currentUser.friends.length;
    requesterUser.friendsCount = requesterUser.friends.length;

    // Update timestamps
    currentUser.updatedAt = new Date().toISOString();
    requesterUser.updatedAt = new Date().toISOString();

    // Update users in array
    users[currentUserIndex] = currentUser;
    users[requesterUserIndex] = requesterUser;

    // Save updated users
    await writeJson("users.json", users);

    // Send push notification to requester (non-blocking)
    try {
      if (requesterUser.expoPushToken) {
        const notificationResult = await sendPush(
          [requesterUser.expoPushToken],
          "Friend Request Accepted!",
          `${currentUser.fullName} accepted your friend request`,
          {
            type: "friend_request_accepted",
            accepterId: userId,
            accepterName: currentUser.fullName,
            requesterId: id,
            requesterName: requesterUser.fullName
          },
          {
            channelId: "friend_requests",
            priority: "normal"
          }
        );
        
        if (notificationResult.success) {
          console.log(`Friend request acceptance notification sent to ${requesterUser.fullName} from ${currentUser.fullName}`);
        } else {
          console.error(`Failed to send friend request acceptance notification to ${requesterUser.fullName}:`, notificationResult.error);
        }
      }
    } catch (notificationError) {
      // Don't fail the acceptance if notifications fail
      console.error("Friend request acceptance notification error:", notificationError);
    }

    console.log(`${currentUser.fullName} accepted friend request from ${requesterUser.fullName}`);

    res.status(200).json({
      success: true,
      message: "Friend request accepted successfully",
      data: {
        requesterUserId: id,
        currentUserId: userId,
        areFriends: true,
        friendsCount: currentUser.friendsCount,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Accept friend request error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error accepting friend request",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Something went wrong",
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Reject friend request from a user
 * POST /users/:id/reject-friend
 */
const rejectFriendRequest = async (req, res) => {
  try {
    const { id } = req.params; // User who sent the request
    const { userId } = req.body; // Current user ID (who is rejecting)

    // Validate userId
    if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
        error: "Valid user ID must be provided to reject a friend request",
        timestamp: new Date().toISOString(),
      });
    }

    // Read users
    const users = await readJson("users.json");

    // Find both users
    const requesterUserIndex = users.findIndex((u) => u.id === id);
    const currentUserIndex = users.findIndex((u) => u.id === userId);

    if (requesterUserIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Requester user not found",
        error: "No user found with the provided requester ID",
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

    const requesterUser = users[requesterUserIndex];
    const currentUser = users[currentUserIndex];

    // Initialize arrays if they don't exist
    if (!currentUser.friendRequests) currentUser.friendRequests = [];
    if (!requesterUser.sentFriendRequests) requesterUser.sentFriendRequests = [];

    // Check if friend request exists
    if (!currentUser.friendRequests.includes(id)) {
      return res.status(400).json({
        success: false,
        message: "No friend request found from this user",
        timestamp: new Date().toISOString(),
      });
    }

    // Remove from friend requests and sent requests
    currentUser.friendRequests = currentUser.friendRequests.filter(reqId => reqId !== id);
    requesterUser.sentFriendRequests = requesterUser.sentFriendRequests.filter(reqId => reqId !== userId);

    // Update timestamps
    currentUser.updatedAt = new Date().toISOString();
    requesterUser.updatedAt = new Date().toISOString();

    // Update users in array
    users[currentUserIndex] = currentUser;
    users[requesterUserIndex] = requesterUser;

    // Save updated users
    await writeJson("users.json", users);

    console.log(`${currentUser.fullName} rejected friend request from ${requesterUser.fullName}`);

    res.status(200).json({
      success: true,
      message: "Friend request rejected successfully",
      data: {
        requesterUserId: id,
        currentUserId: userId,
        requestRejected: true,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Reject friend request error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error rejecting friend request",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Something went wrong",
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Cancel sent friend request
 * POST /users/:id/cancel-friend-request
 */
const cancelFriendRequest = async (req, res) => {
  try {
    const { id } = req.params; // Target user ID
    const { userId } = req.body; // Current user ID (who is canceling)

    // Validate userId
    if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
        error: "Valid user ID must be provided to cancel a friend request",
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

    // Initialize arrays if they don't exist
    if (!targetUser.friendRequests) targetUser.friendRequests = [];
    if (!currentUser.sentFriendRequests) currentUser.sentFriendRequests = [];

    // Check if friend request exists
    if (!currentUser.sentFriendRequests.includes(id)) {
      return res.status(400).json({
        success: false,
        message: "No friend request found to this user",
        timestamp: new Date().toISOString(),
      });
    }

    // Remove from friend requests and sent requests
    targetUser.friendRequests = targetUser.friendRequests.filter(reqId => reqId !== userId);
    currentUser.sentFriendRequests = currentUser.sentFriendRequests.filter(reqId => reqId !== id);

    // Update timestamps
    targetUser.updatedAt = new Date().toISOString();
    currentUser.updatedAt = new Date().toISOString();

    // Update users in array
    users[targetUserIndex] = targetUser;
    users[currentUserIndex] = currentUser;

    // Save updated users
    await writeJson("users.json", users);

    console.log(`${currentUser.fullName} canceled friend request to ${targetUser.fullName}`);

    res.status(200).json({
      success: true,
      message: "Friend request canceled successfully",
      data: {
        targetUserId: id,
        currentUserId: userId,
        requestCanceled: true,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cancel friend request error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error canceling friend request",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Something went wrong",
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Remove friendship with a user
 * POST /users/:id/unfriend
 */
const removeFriendship = async (req, res) => {
  try {
    const { id } = req.params; // Friend user ID
    const { userId } = req.body; // Current user ID

    // Validate userId
    if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
        error: "Valid user ID must be provided to remove friendship",
        timestamp: new Date().toISOString(),
      });
    }

    // Prevent users from unfriending themselves
    if (id === userId) {
      return res.status(400).json({
        success: false,
        message: "Cannot unfriend yourself",
        error: "Users cannot unfriend themselves",
        timestamp: new Date().toISOString(),
      });
    }

    // Read users
    const users = await readJson("users.json");

    // Find both users
    const friendUserIndex = users.findIndex((u) => u.id === id);
    const currentUserIndex = users.findIndex((u) => u.id === userId);

    if (friendUserIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Friend user not found",
        error: "No user found with the provided friend ID",
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

    const friendUser = users[friendUserIndex];
    const currentUser = users[currentUserIndex];

    // Initialize arrays if they don't exist
    if (!currentUser.friends) currentUser.friends = [];
    if (!friendUser.friends) friendUser.friends = [];

    // Check if they are friends
    if (!currentUser.friends.includes(id)) {
      return res.status(400).json({
        success: false,
        message: "You are not friends with this user",
        timestamp: new Date().toISOString(),
      });
    }

    // Remove from friends lists
    currentUser.friends = currentUser.friends.filter(friendId => friendId !== id);
    friendUser.friends = friendUser.friends.filter(friendId => friendId !== userId);

    // Update friend counts
    currentUser.friendsCount = currentUser.friends.length;
    friendUser.friendsCount = friendUser.friends.length;

    // Update timestamps
    currentUser.updatedAt = new Date().toISOString();
    friendUser.updatedAt = new Date().toISOString();

    // Update users in array
    users[currentUserIndex] = currentUser;
    users[friendUserIndex] = friendUser;

    // Save updated users
    await writeJson("users.json", users);

    console.log(`${currentUser.fullName} unfriended ${friendUser.fullName}`);

    res.status(200).json({
      success: true,
      message: "Friendship removed successfully",
      data: {
        friendUserId: id,
        currentUserId: userId,
        areFriends: false,
        friendsCount: currentUser.friendsCount,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Remove friendship error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error removing friendship",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Something went wrong",
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get friends for a user
 * GET /users/:id/friends
 */
const getFriends = async (req, res) => {
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

    // Ensure friends array exists
    const friends = targetUser.friends || [];

    // Calculate pagination
    const totalFriends = friends.length;
    const totalPages = Math.ceil(totalFriends / validatedParams.limit);
    const startIndex = (validatedParams.page - 1) * validatedParams.limit;
    const endIndex = startIndex + validatedParams.limit;

    // Get paginated friend IDs
    const paginatedFriendIds = friends.slice(startIndex, endIndex);

    // Create a user lookup map for better performance
    const userMap = users.reduce((map, user) => {
      map[user.id] = user;
      return map;
    }, {});

    // Enrich friends with user information
    const enrichedFriends = paginatedFriendIds.map((friendId) => {
      const friend = userMap[friendId];
      return {
        id: friendId,
        fullName: friend ? friend.fullName : "Unknown User",
        email: friend ? friend.email : null,
        friendsCount: friend ? (friend.friendsCount || 0) : 0,
      };
    });

    res.status(200).json({
      success: true,
      message: "User friends retrieved successfully",
      data: {
        userId: id,
        userName: targetUser.fullName,
        friendsCount: totalFriends,
        friends: enrichedFriends,
      },
      pagination: {
        page: validatedParams.page,
        limit: validatedParams.limit,
        totalFriends,
        totalPages,
        hasNextPage: validatedParams.page < totalPages,
        hasPrevPage: validatedParams.page > 1,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Get friends error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error retrieving friends",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Something went wrong",
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get pending friend requests for a user
 * GET /users/:id/friend-requests
 */
const getPendingRequests = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20, type = 'received' } = req.query;

    // Validate pagination parameters
    const validatedParams = { page: parseInt(page) || 1, limit: Math.min(parseInt(limit) || 20, 50) };
    
    if (validatedParams.page < 1) validatedParams.page = 1;
    if (validatedParams.limit < 1) validatedParams.limit = 20;

    // Validate type parameter
    if (!['received', 'sent'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid type parameter. Must be 'received' or 'sent'",
        timestamp: new Date().toISOString(),
      });
    }

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

    // Get the appropriate requests array
    const requests = type === 'received' 
      ? (targetUser.friendRequests || [])
      : (targetUser.sentFriendRequests || []);

    // Calculate pagination
    const totalRequests = requests.length;
    const totalPages = Math.ceil(totalRequests / validatedParams.limit);
    const startIndex = (validatedParams.page - 1) * validatedParams.limit;
    const endIndex = startIndex + validatedParams.limit;

    // Get paginated request IDs
    const paginatedRequestIds = requests.slice(startIndex, endIndex);

    // Create a user lookup map for better performance
    const userMap = users.reduce((map, user) => {
      map[user.id] = user;
      return map;
    }, {});

    // Enrich requests with user information
    const enrichedRequests = paginatedRequestIds.map((requestId) => {
      const user = userMap[requestId];
      return {
        id: requestId,
        fullName: user ? user.fullName : "Unknown User",
        email: user ? user.email : null,
        friendsCount: user ? (user.friendsCount || 0) : 0,
      };
    });

    res.status(200).json({
      success: true,
      message: `${type === 'received' ? 'Received' : 'Sent'} friend requests retrieved successfully`,
      data: {
        userId: id,
        userName: targetUser.fullName,
        requestsCount: totalRequests,
        requestType: type,
        requests: enrichedRequests,
      },
      pagination: {
        page: validatedParams.page,
        limit: validatedParams.limit,
        totalRequests,
        totalPages,
        hasNextPage: validatedParams.page < totalPages,
        hasPrevPage: validatedParams.page > 1,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Get pending requests error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error retrieving friend requests",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Something went wrong",
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get friendship status between two users
 * GET /users/:id/friendship-status
 */
const getFriendshipStatus = async (req, res) => {
  try {
    const { id } = req.params; // Target user ID
    const { userId } = req.query; // Current user ID

    // Validate userId query parameter
    if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Missing userId in query parameters",
        error: "Valid user ID must be provided in query parameters",
        timestamp: new Date().toISOString(),
      });
    }

    // Validate ID format using the same validation as other endpoints
    if (!/^[a-zA-Z0-9]+$/.test(id) || !/^[a-zA-Z0-9]+$/.test(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format",
        error: "User IDs must contain only alphanumeric characters",
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

    // Initialize arrays if they don't exist
    const currentUserFriends = currentUser.friends || [];
    const currentUserSentRequests = currentUser.sentFriendRequests || [];
    const currentUserReceivedRequests = currentUser.friendRequests || [];

    // Determine friendship status
    const areFriends = currentUserFriends.includes(id);
    const requestSent = currentUserSentRequests.includes(id);
    const requestReceived = currentUserReceivedRequests.includes(id);

    let status = 'none';
    if (areFriends) {
      status = 'friends';
    } else if (requestSent) {
      status = 'request_sent';
    } else if (requestReceived) {
      status = 'request_received';
    }

    res.status(200).json({
      success: true,
      message: "Friendship status retrieved successfully",
      data: {
        targetUserId: id,
        targetUserName: targetUser.fullName,
        currentUserId: userId,
        currentUserName: currentUser.fullName,
        status: status,
        areFriends: areFriends,
        requestSent: requestSent,
        requestReceived: requestReceived,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Get friendship status error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error retrieving friendship status",
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
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  removeFriendship,
  getFriends,
  getPendingRequests,
  getFriendshipStatus,
  registerPushToken,
  updateUserProfile
};
