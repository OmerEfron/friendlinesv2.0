// Authentication controller for Friendlines
// Contains business logic for user authentication

const { db } = require("../utils/database");
const { isValidId, validateProfileUpdateData, validatePaginationParams } = require("../utils/validation");
const { registerDevice, sendPush, getFriendTokens } = require("../utils/notificationService");
const { generateToken } = require("../middleware/auth");

/**
 * Handle user login (create or retrieve user)
 * POST /login
 */
const login = async (req, res) => {
  try {
    // Get validated data from middleware
    const { fullName, email } = req.validatedData;

    // Check if user already exists by email
    let user = await db.getUserByEmail(email);

    if (user) {
      // Update user's full name if it has changed
      if (user.fullName !== fullName) {
        user = await db.updateUser(user.id, { 
          fullName: fullName 
        });
      }

      console.log(`Existing user logged in: ${user.email}`);
    } else {
      // Create new user
      user = await db.createUser({
        fullName,
        email
      });

      console.log(`New user created: ${user.email}`);
    }

    // Get friend count for response
    const friends = await db.getUserFriends(user.id);
    const friendsCount = friends.length;

    // Generate JWT token
    const token = generateToken(user);

    // Return user data (excluding sensitive info, though there's none in this POC)
    const userResponse = {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      // Friendship features
      friendsCount: friendsCount,
    };

    res.status(200).json({
      success: true,
      message:
        user.createdAt === user.updatedAt
          ? "User created successfully"
          : "User logged in successfully",
      data: userResponse,
      token: token,
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

    // Find user by ID
    const user = await db.getUserById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        error: "No user found with the provided ID",
        timestamp: new Date().toISOString(),
      });
    }

    // Get friend count
    const friends = await db.getUserFriends(user.id);
    const friendsCount = friends.length;

    // Return user profile (excluding sensitive data)
    const userProfile = {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      bio: user.bio,
      location: user.location,
      website: user.website,
      avatar: user.avatar,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      // Friendship features
      friendsCount: friendsCount,
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

    // Validate pagination parameters
    const { page, limit } = validatePaginationParams(req.query);
    const offset = (page - 1) * limit;

    // Get users with pagination
    const users = await db.getAllUsers(limit, offset);

    // Get friend counts for each user (could be optimized with a join)
    const userList = await Promise.all(
      users.map(async (user) => {
        const friends = await db.getUserFriends(user.id);
        return {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          bio: user.bio,
          location: user.location,
          website: user.website,
          avatar: user.avatar,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          // Friendship features
          friendsCount: friends.length,
        };
      })
    );

    res.status(200).json({
      success: true,
      message: "All users retrieved successfully",
      data: userList,
      pagination: {
        page,
        limit,
        count: userList.length,
      },
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
 * Check if user exists by email
 * POST /users/check
 */
const checkUserExists = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== "string" || email.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
        error: "Please provide a valid email address",
        timestamp: new Date().toISOString(),
      });
    }

    // Check if user exists using modern database system
    const existingUser = await db.getUserByEmail(email.toLowerCase().trim());

    res.status(200).json({
      success: true,
      message: "User existence check completed",
      data: {
        exists: !!existingUser,
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

    // Get stats using modern database system
    const users = await db.getAllUsers(1000, 0); // Get up to 1000 users for stats
    const totalPostsCount = await db.getTotalPostsCount();

    // Calculate statistics
    const stats = {
      totalUsers: users.length,
      totalPosts: totalPostsCount,
      postsPerUser:
        users.length > 0 ? (totalPostsCount / users.length).toFixed(2) : 0,
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

    // Find both users
    const targetUser = await db.getUserById(id);
    const currentUser = await db.getUserById(userId);

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

    // Check if friendship already exists
    const existingFriendship = await db.getFriendshipStatus(userId, id);
    
    if (existingFriendship) {
      if (existingFriendship.status === 'accepted') {
        return res.status(400).json({
          success: false,
          message: "You are already friends with this user",
          timestamp: new Date().toISOString(),
        });
      }
      
      if (existingFriendship.status === 'pending') {
        if (existingFriendship.requesterId === userId) {
          return res.status(400).json({
            success: false,
            message: "Friend request already sent",
            timestamp: new Date().toISOString(),
          });
        } else {
          return res.status(400).json({
            success: false,
            message: "This user has already sent you a friend request. Accept it instead.",
            timestamp: new Date().toISOString(),
          });
        }
      }
    }

    // Send friend request
    await db.sendFriendRequest(userId, id);

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
 * Accept friend request
 * POST /users/:id/accept-friend
 */
const acceptFriendRequest = async (req, res) => {
  try {
    const { id } = req.params; // Requester user ID
    const { userId } = req.body; // Current user ID (who's accepting)

    // Validate userId
    if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
        error: "Valid user ID must be provided to accept a friend request",
        timestamp: new Date().toISOString(),
      });
    }

    // Prevent users from accepting their own request
    if (id === userId) {
      return res.status(400).json({
        success: false,
        message: "Cannot accept your own friend request",
        error: "Users cannot accept their own friend requests",
        timestamp: new Date().toISOString(),
      });
    }

    // Check if both users exist
    const [requesterUser, currentUser] = await Promise.all([
      db.getUserById(id),
      db.getUserById(userId)
    ]);

    if (!requesterUser) {
      return res.status(404).json({
        success: false,
        message: "Requester user not found",
        error: "No user found with the provided requester ID",
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

    // Check if there's a pending friend request
    const friendshipStatus = await db.getFriendshipStatus(id, userId);
    
    if (!friendshipStatus || friendshipStatus.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: "No pending friend request found",
        error: "Cannot accept a friend request that doesn't exist or isn't pending",
        timestamp: new Date().toISOString(),
      });
    }

    if (friendshipStatus.requesterId !== id) {
      return res.status(400).json({
        success: false,
        message: "Cannot accept this request",
        error: "You can only accept requests sent to you",
        timestamp: new Date().toISOString(),
      });
    }

    // Accept the friend request
    await db.acceptFriendRequest(id, userId);

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
          console.log(`Friend request acceptance notification sent to ${requesterUser.fullName}`);
        }
      }
    } catch (notificationError) {
      console.error("Notification error (non-blocking):", notificationError);
    }

    res.status(200).json({
      success: true,
      message: "Friend request accepted successfully",
      data: {
        requesterId: id,
        requesterName: requesterUser.fullName,
        accepterId: userId,
        accepterName: currentUser.fullName,
        acceptedAt: new Date().toISOString(),
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
 * Reject friend request
 * POST /users/:id/reject-friend
 */
const rejectFriendRequest = async (req, res) => {
  try {
    const { id } = req.params; // Requester user ID
    const { userId } = req.body; // Current user ID (who's rejecting)

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
        timestamp: new Date().toISOString(),
      });
    }

    if (id === userId) {
      return res.status(400).json({
        success: false,
        message: "Cannot reject your own friend request",
        timestamp: new Date().toISOString(),
      });
    }

    // Check if both users exist
    const [requesterUser, currentUser] = await Promise.all([
      db.getUserById(id),
      db.getUserById(userId)
    ]);

    if (!requesterUser || !currentUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        timestamp: new Date().toISOString(),
      });
    }

    // Check if there's a pending friend request
    const friendshipStatus = await db.getFriendshipStatus(id, userId);
    
    if (!friendshipStatus || friendshipStatus.status !== 'pending' || friendshipStatus.requesterId !== id) {
      return res.status(400).json({
        success: false,
        message: "No pending friend request found to reject",
        timestamp: new Date().toISOString(),
      });
    }

    // Reject the friend request
    await db.rejectFriendRequest(id, userId);

    res.status(200).json({
      success: true,
      message: "Friend request rejected successfully",
      data: {
        requesterId: id,
        requesterName: requesterUser.fullName,
        rejecterId: userId,
        rejecterName: currentUser.fullName,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Reject friend request error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error rejecting friend request",
      error: process.env.NODE_ENV === "development" ? error.message : "Something went wrong",
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Cancel friend request
 * POST /users/:id/cancel-friend-request
 */
const cancelFriendRequest = async (req, res) => {
  try {
    const { id } = req.params; // Target user ID
    const { userId } = req.body; // Current user ID (who's canceling)

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
        timestamp: new Date().toISOString(),
      });
    }

    if (id === userId) {
      return res.status(400).json({
        success: false,
        message: "Cannot cancel friend request to yourself",
        timestamp: new Date().toISOString(),
      });
    }

    // Check if both users exist
    const [targetUser, currentUser] = await Promise.all([
      db.getUserById(id),
      db.getUserById(userId)
    ]);

    if (!targetUser || !currentUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        timestamp: new Date().toISOString(),
      });
    }

    // Check if there's a pending friend request sent by current user
    const friendshipStatus = await db.getFriendshipStatus(userId, id);
    
    if (!friendshipStatus || friendshipStatus.status !== 'pending' || friendshipStatus.requesterId !== userId) {
      return res.status(400).json({
        success: false,
        message: "No pending friend request found to cancel",
        timestamp: new Date().toISOString(),
      });
    }

    // Cancel the friend request
    await db.rejectFriendRequest(userId, id);

    res.status(200).json({
      success: true,
      message: "Friend request canceled successfully",
      data: {
        targetId: id,
        targetName: targetUser.fullName,
        senderId: userId,
        senderName: currentUser.fullName,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cancel friend request error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error canceling friend request",
      error: process.env.NODE_ENV === "development" ? error.message : "Something went wrong",
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Remove friendship
 * POST /users/:id/unfriend
 */
const removeFriendship = async (req, res) => {
  try {
    const { id } = req.params; // Friend user ID
    const { userId } = req.body; // Current user ID

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
        timestamp: new Date().toISOString(),
      });
    }

    if (id === userId) {
      return res.status(400).json({
        success: false,
        message: "Cannot unfriend yourself",
        timestamp: new Date().toISOString(),
      });
    }

    // Check if both users exist
    const [friendUser, currentUser] = await Promise.all([
      db.getUserById(id),
      db.getUserById(userId)
    ]);

    if (!friendUser || !currentUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        timestamp: new Date().toISOString(),
      });
    }

    // Check if they are friends
    const friendshipStatus = await db.getFriendshipStatus(userId, id);
    
    if (!friendshipStatus || friendshipStatus.status !== 'accepted') {
      return res.status(400).json({
        success: false,
        message: "You are not friends with this user",
        timestamp: new Date().toISOString(),
      });
    }

    // Remove the friendship
    await db.removeFriendship(userId, id);

    res.status(200).json({
      success: true,
      message: "Friendship removed successfully",
      data: {
        removedFriendId: id,
        removedFriendName: friendUser.fullName,
        userId: userId,
        userName: currentUser.fullName,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Remove friendship error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error removing friendship",
      error: process.env.NODE_ENV === "development" ? error.message : "Something went wrong",
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

    // Check if user exists
    const user = await db.getUserById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        timestamp: new Date().toISOString(),
      });
    }

    // Calculate pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Get user's friends
    const friends = await db.getUserFriends(id, parseInt(limit), offset);

    const friendsList = friends.map(friend => ({
      id: friend.id,
      fullName: friend.fullName,
      email: friend.email,
      bio: friend.bio,
      avatar: friend.avatar,
      // Don't include sensitive information like push tokens
    }));

    res.status(200).json({
      success: true,
      message: "Friends retrieved successfully",
      data: friendsList,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        count: friendsList.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Get friends error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error retrieving friends",
      error: process.env.NODE_ENV === "development" ? error.message : "Something went wrong",
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get pending friend requests
 * GET /users/:id/friend-requests
 */
const getPendingRequests = async (req, res) => {
  try {
    const { id } = req.params;
    const { type = 'received' } = req.query; // 'received' or 'sent'

    // Check if user exists
    const user = await db.getUserById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        timestamp: new Date().toISOString(),
      });
    }

    let requests = [];

    if (type === 'received') {
      // Get requests sent TO this user
      requests = await db.getFriendRequests(id);
    } else if (type === 'sent') {
      // Get requests sent BY this user
      requests = await db.getMany(`
        SELECT u.*, f.createdAt as requestDate FROM users u
        INNER JOIN friendships f ON f.requesterId = ?
        WHERE ((f.userId1 = ? AND f.userId2 = u.id) OR (f.userId2 = ? AND f.userId1 = u.id))
          AND f.status = 'pending' AND u.id != ?
      `, [id, id, id, id]);
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid type parameter. Use 'received' or 'sent'",
        timestamp: new Date().toISOString(),
      });
    }

    const formattedRequests = requests.map(request => ({
      id: request.id,
      fullName: request.fullName,
      email: request.email,
      bio: request.bio,
      avatar: request.avatar,
      requestDate: request.requestDate,
    }));

    res.status(200).json({
      success: true,
      message: `${type} friend requests retrieved successfully`,
      data: formattedRequests,
      metadata: {
        type: type,
        count: formattedRequests.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Get pending requests error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error retrieving friend requests",
      error: process.env.NODE_ENV === "development" ? error.message : "Something went wrong",
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

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required in query parameters",
        timestamp: new Date().toISOString(),
      });
    }

    if (id === userId) {
      return res.status(400).json({
        success: false,
        message: "Cannot check friendship status with yourself",
        timestamp: new Date().toISOString(),
      });
    }

    // Check if both users exist
    const [targetUser, currentUser] = await Promise.all([
      db.getUserById(id),
      db.getUserById(userId)
    ]);

    if (!targetUser || !currentUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        timestamp: new Date().toISOString(),
      });
    }

    // Get friendship status
    const friendshipStatus = await db.getFriendshipStatus(userId, id);

    let status = 'none';
    let requesterId = null;
    let statusDetails = null;

    if (friendshipStatus) {
      status = friendshipStatus.status;
      requesterId = friendshipStatus.requesterId;
      statusDetails = {
        createdAt: friendshipStatus.createdAt,
        updatedAt: friendshipStatus.updatedAt,
      };
    }

    res.status(200).json({
      success: true,
      message: "Friendship status retrieved successfully",
      data: {
        targetUser: {
          id: targetUser.id,
          fullName: targetUser.fullName,
        },
        currentUser: {
          id: currentUser.id,
          fullName: currentUser.fullName,
        },
        status: status, // 'none', 'pending', 'accepted'
        requesterId: requesterId,
        canSendRequest: status === 'none',
        canAccept: status === 'pending' && requesterId !== userId,
        canCancel: status === 'pending' && requesterId === userId,
        areFriends: status === 'accepted',
        statusDetails: statusDetails,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Get friendship status error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error retrieving friendship status",
      error: process.env.NODE_ENV === "development" ? error.message : "Something went wrong",
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Register push token for a user
 * POST /users/:id/push-token
 */
const registerPushToken = async (req, res) => {
  try {
    const userId = req.user.id; // Get from authenticated user
    const { expoPushToken } = req.body;

    if (!expoPushToken || typeof expoPushToken !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Valid Expo push token is required',
        timestamp: new Date().toISOString()
      });
    }

    // Check if user exists
    const user = await db.getUserById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        timestamp: new Date().toISOString()
      });
    }

    // Update user with push token using modern database system
    await db.updateUser(userId, { expoPushToken });

    // Register device with notification service
    try {
      await registerDevice(expoPushToken, userId);
    } catch (registrationError) {
      console.warn('Failed to register device with notification service:', registrationError);
      // Don't fail the request if registration fails
    }

    res.status(200).json({
      success: true,
      message: 'Push token registered successfully',
      data: {
        userId: userId,
        expoPushToken: expoPushToken
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error registering push token:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Update user profile
 * PUT /users/:id
 */
const updateUserProfile = async (req, res, next) => {
  try {
    const userId = req.user.id; // Get from authenticated user
    const updates = req.body;

    // Validate the updates
    const validationResult = validateProfileUpdateData(updates);
    if (!validationResult.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationResult.errors,
        timestamp: new Date().toISOString()
      });
    }

    // Check if user exists
    const existingUser = await db.getUserById(userId);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        timestamp: new Date().toISOString()
      });
    }

    // Update user using modern database system
    const updatedUser = await db.updateUser(userId, validationResult.cleanData);

    // Get friend count for response
    const friends = await db.getUserFriends(userId);

    const userResponse = {
      id: updatedUser.id,
      fullName: updatedUser.fullName,
      email: updatedUser.email,
      bio: updatedUser.bio,
      location: updatedUser.location,
      website: updatedUser.website,
      avatar: updatedUser.avatar,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
      friendsCount: friends.length,
    };

    res.status(200).json({
      success: true,
      message: 'User profile updated successfully',
      data: userResponse,
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
  registerPushToken,
  updateUserProfile
};
