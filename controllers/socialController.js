const { db } = require('../utils/database');
const { isValidId, validatePaginationParams } = require('../utils/validation');
const { sendPush } = require('../utils/notificationService');

const getMutualFriends = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId, page = 1, limit = 20 } = req.query;

    if (!isValidId(id) || !isValidId(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format',
        timestamp: new Date().toISOString()
      });
    }

    const pagination = validatePaginationParams({ page, limit });
    if (!pagination.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pagination parameters',
        errors: pagination.errors,
        timestamp: new Date().toISOString()
      });
    }

    const user1 = await db.getUserById(id);
    const user2 = await db.getUserById(userId);

    if (!user1 || !user2) {
      return res.status(404).json({
        success: false,
        message: 'One or both users not found',
        timestamp: new Date().toISOString()
      });
    }

    // Get friends for both users
    const user1Friends = await db.getUserFriends(id);
    const user2Friends = await db.getUserFriends(userId);
    
    const user1FriendIds = user1Friends.map(f => f.id);
    const user2FriendIds = user2Friends.map(f => f.id);
    
    // Find mutual friends
    const mutualFriendIds = user1FriendIds.filter(friendId => user2FriendIds.includes(friendId));
    
    // Get user details for mutual friends
    const mutualFriends = [];
    for (const friendId of mutualFriendIds) {
      const friend = await db.getUserById(friendId);
      if (friend) {
        const friendsCount = await db.getUserFriends(friendId);
        mutualFriends.push({
          id: friend.id,
          fullName: friend.fullName,
          avatar: friend.avatar,
          friendsCount: friendsCount.length
        });
      }
    }

    // Implement pagination
    const startIndex = (pagination.page - 1) * pagination.limit;
    const endIndex = startIndex + pagination.limit;
    const paginatedFriends = mutualFriends.slice(startIndex, endIndex);

    const totalPages = Math.ceil(mutualFriends.length / pagination.limit);

    res.status(200).json({
      success: true,
      message: 'Mutual friends retrieved successfully',
      data: paginatedFriends,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        totalMutualFriends: mutualFriends.length,
        totalPages,
        hasNextPage: pagination.page < totalPages,
        hasPrevPage: pagination.page > 1
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting mutual friends:', error);
    next(error);
  }
};

const getFriendSuggestions = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { limit = 10 } = req.query;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format',
        timestamp: new Date().toISOString()
      });
    }

    const currentUser = await db.getUserById(id);

    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        timestamp: new Date().toISOString()
      });
    }

    const friends = await db.getUserFriends(id);
    const friendIds = friends.map(f => f.id);

    // Simple suggestion algorithm: friends of friends who user isn't friends with
    const suggestions = new Set();
    
    // Get people who are friends with your friends
    for (const friend of friends) {
      const friendsOfFriend = await db.getUserFriends(friend.id);
      for (const suggestedFriend of friendsOfFriend) {
        if (suggestedFriend.id !== id && !friendIds.includes(suggestedFriend.id)) {
          suggestions.add(suggestedFriend.id);
        }
      }
    }

    // Get user details for suggestions
    const suggestionUsers = [];
    let count = 0;
    for (const suggestedId of suggestions) {
      if (count >= parseInt(limit)) break;
      
      const user = await db.getUserById(suggestedId);
      if (user) {
        const userFriends = await db.getUserFriends(suggestedId);
        const mutualFriends = userFriends.filter(f => friendIds.includes(f.id)).length;
        
        suggestionUsers.push({
          id: user.id,
          fullName: user.fullName,
          avatar: user.avatar,
          friendsCount: userFriends.length,
          mutualFriends
        });
        count++;
      }
    }

    res.status(200).json({
      success: true,
      message: 'Friend suggestions retrieved successfully',
      data: suggestionUsers,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting friend suggestions:', error);
    next(error);
  }
};

const bulkFriendshipStatus = async (req, res, next) => {
  try {
    const { userId, targetUserIds } = req.body;

    if (!isValidId(userId) || !Array.isArray(targetUserIds)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid userId or targetUserIds format',
        timestamp: new Date().toISOString()
      });
    }

    const currentUser = await db.getUserById(userId);

    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        timestamp: new Date().toISOString()
      });
    }

    const statusResults = [];
    
    for (const targetId of targetUserIds) {
      if (!isValidId(targetId)) {
        statusResults.push({ userId: targetId, error: 'Invalid user ID format' });
        continue;
      }

      const targetUser = await db.getUserById(targetId);
      if (!targetUser) {
        statusResults.push({ userId: targetId, error: 'User not found' });
        continue;
      }

      const friendshipStatus = await db.getFriendshipStatus(userId, targetId);
      
      let status = 'none';
      if (friendshipStatus) {
        if (friendshipStatus.status === 'accepted') {
          status = 'friends';
        } else if (friendshipStatus.status === 'pending') {
          status = friendshipStatus.requesterId === userId ? 'request_sent' : 'request_received';
        }
      }

      statusResults.push({
        userId: targetId,
        status,
        mutualFriends: 0 // Could be calculated if needed
      });
    }

    res.status(200).json({
      success: true,
      message: 'Friendship statuses retrieved successfully',
      data: statusResults,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting bulk friendship status:', error);
    next(error);
  }
};

/**
 * Send friend request to a user
 * POST /api/social/users/:id/friend-request
 * Requires authentication - uses req.user.id as the sender
 */
const sendFriendRequest = async (req, res, next) => {
  try {
    const { id } = req.params; // Target user ID
    const currentUserId = req.user.id; // Get from authenticated user

    // Prevent users from sending friend request to themselves
    if (id === currentUserId) {
      return res.status(400).json({
        success: false,
        message: "Cannot send friend request to yourself",
        error: "Users cannot send friend requests to themselves",
        timestamp: new Date().toISOString(),
      });
    }

    // Find both users
    const targetUser = await db.getUserById(id);
    const currentUser = await db.getUserById(currentUserId);

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
        error: "Authenticated user not found in database",
        timestamp: new Date().toISOString(),
      });
    }

    // Check if friendship already exists
    const existingFriendship = await db.getFriendshipStatus(currentUserId, id);
    
    if (existingFriendship) {
      if (existingFriendship.status === 'accepted') {
        return res.status(400).json({
          success: false,
          message: "You are already friends with this user",
          timestamp: new Date().toISOString(),
        });
      }
      
      if (existingFriendship.status === 'pending') {
        if (existingFriendship.requesterId === currentUserId) {
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
    await db.sendFriendRequest(currentUserId, id);

    // Send push notification to target user (non-blocking)
    try {
      if (targetUser.expoPushToken) {
        const notificationResult = await sendPush(
          [targetUser.expoPushToken],
          "New Friend Request!",
          `${currentUser.fullName} sent you a friend request`,
          {
            type: "friend_request",
            requesterId: currentUserId,
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
        currentUserId: currentUserId,
        requestSent: true,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Send friend request error:", error);
    next(error);
  }
};

/**
 * Accept friend request
 * POST /api/social/users/:id/accept-friend
 * Requires authentication - uses req.user.id as the accepter
 */
const acceptFriendRequest = async (req, res, next) => {
  try {
    const { id } = req.params; // Requester user ID
    const currentUserId = req.user.id; // Get from authenticated user

    // Prevent users from accepting their own request
    if (id === currentUserId) {
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
      db.getUserById(currentUserId)
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
        error: "Authenticated user not found in database",
        timestamp: new Date().toISOString(),
      });
    }

    // Check if there's a pending friend request
    const friendshipStatus = await db.getFriendshipStatus(id, currentUserId);
    
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
    await db.acceptFriendRequest(id, currentUserId);

    // Send push notification to requester (non-blocking)
    try {
      if (requesterUser.expoPushToken) {
        const notificationResult = await sendPush(
          [requesterUser.expoPushToken],
          "Friend Request Accepted!",
          `${currentUser.fullName} accepted your friend request`,
          {
            type: "friend_request_accepted",
            accepterId: currentUserId,
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
        accepterId: currentUserId,
        accepterName: currentUser.fullName,
        acceptedAt: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Accept friend request error:", error);
    next(error);
  }
};

/**
 * Reject friend request
 * POST /api/social/users/:id/reject-friend
 * Requires authentication - uses req.user.id as the rejecter
 */
const rejectFriendRequest = async (req, res, next) => {
  try {
    const { id } = req.params; // Requester user ID
    const currentUserId = req.user.id; // Get from authenticated user

    if (id === currentUserId) {
      return res.status(400).json({
        success: false,
        message: "Cannot reject your own friend request",
        timestamp: new Date().toISOString(),
      });
    }

    // Check if both users exist
    const [requesterUser, currentUser] = await Promise.all([
      db.getUserById(id),
      db.getUserById(currentUserId)
    ]);

    if (!requesterUser || !currentUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        timestamp: new Date().toISOString(),
      });
    }

    // Check if there's a pending friend request
    const friendshipStatus = await db.getFriendshipStatus(id, currentUserId);
    
    if (!friendshipStatus || friendshipStatus.status !== 'pending' || friendshipStatus.requesterId !== id) {
      return res.status(400).json({
        success: false,
        message: "No pending friend request found to reject",
        timestamp: new Date().toISOString(),
      });
    }

    // Reject the friend request
    await db.rejectFriendRequest(id, currentUserId);

    res.status(200).json({
      success: true,
      message: "Friend request rejected successfully",
      data: {
        requesterId: id,
        requesterName: requesterUser.fullName,
        rejecterId: currentUserId,
        rejecterName: currentUser.fullName,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Reject friend request error:", error);
    next(error);
  }
};

/**
 * Cancel friend request
 * POST /api/social/users/:id/cancel-friend-request
 * Requires authentication - uses req.user.id as the canceler
 */
const cancelFriendRequest = async (req, res, next) => {
  try {
    const { id } = req.params; // Target user ID
    const currentUserId = req.user.id; // Get from authenticated user

    if (id === currentUserId) {
      return res.status(400).json({
        success: false,
        message: "Cannot cancel friend request to yourself",
        timestamp: new Date().toISOString(),
      });
    }

    // Check if both users exist
    const [targetUser, currentUser] = await Promise.all([
      db.getUserById(id),
      db.getUserById(currentUserId)
    ]);

    if (!targetUser || !currentUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        timestamp: new Date().toISOString(),
      });
    }

    // Check if there's a pending friend request sent by current user
    const friendshipStatus = await db.getFriendshipStatus(currentUserId, id);
    
    if (!friendshipStatus || friendshipStatus.status !== 'pending' || friendshipStatus.requesterId !== currentUserId) {
      return res.status(400).json({
        success: false,
        message: "No pending friend request found to cancel",
        timestamp: new Date().toISOString(),
      });
    }

    // Cancel the friend request
    await db.rejectFriendRequest(currentUserId, id);

    res.status(200).json({
      success: true,
      message: "Friend request canceled successfully",
      data: {
        targetId: id,
        targetName: targetUser.fullName,
        senderId: currentUserId,
        senderName: currentUser.fullName,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cancel friend request error:", error);
    next(error);
  }
};

/**
 * Remove friendship (unfriend)
 * DELETE /api/social/users/:id/friendship
 * Requires authentication - uses req.user.id as the user unfriending
 */
const removeFriendship = async (req, res, next) => {
  try {
    const { id } = req.params; // Friend user ID
    const currentUserId = req.user.id; // Get from authenticated user

    if (id === currentUserId) {
      return res.status(400).json({
        success: false,
        message: "Cannot unfriend yourself",
        timestamp: new Date().toISOString(),
      });
    }

    // Check if both users exist
    const [friendUser, currentUser] = await Promise.all([
      db.getUserById(id),
      db.getUserById(currentUserId)
    ]);

    if (!friendUser || !currentUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        timestamp: new Date().toISOString(),
      });
    }

    // Check if they are actually friends
    const friendshipStatus = await db.getFriendshipStatus(currentUserId, id);
    
    if (!friendshipStatus || friendshipStatus.status !== 'accepted') {
      return res.status(400).json({
        success: false,
        message: "No friendship found to remove",
        timestamp: new Date().toISOString(),
      });
    }

    // Remove the friendship
    await db.removeFriendship(currentUserId, id);

    res.status(200).json({
      success: true,
      message: "Friendship removed successfully",
      data: {
        friendId: id,
        friendName: friendUser.fullName,
        userId: currentUserId,
        userName: currentUser.fullName,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Remove friendship error:", error);
    next(error);
  }
};

/**
 * Get user's friends list
 * GET /api/social/users/:id/friends
 * Requires authentication - can only access own friends or use optional auth for public profiles
 */
const getFriends = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const currentUserId = req.user?.id;

    // Validate pagination
    const pagination = validatePaginationParams({ page, limit });
    if (!pagination.isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid pagination parameters",
        errors: pagination.errors,
        timestamp: new Date().toISOString(),
      });
    }

    // Check if user exists
    const user = await db.getUserById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        timestamp: new Date().toISOString(),
      });
    }

    // For now, allow anyone to see friends list (could be made private later)
    const friends = await db.getUserFriends(id);
    
    // Implement pagination
    const startIndex = (pagination.page - 1) * pagination.limit;
    const endIndex = startIndex + pagination.limit;
    const paginatedFriends = friends.slice(startIndex, endIndex);

    const totalPages = Math.ceil(friends.length / pagination.limit);

    const formattedFriends = paginatedFriends.map(friend => ({
      id: friend.id,
      fullName: friend.fullName,
      email: friend.email,
      bio: friend.bio,
      avatar: friend.avatar,
      friendsCount: friend.friendsCount || 0,
    }));

    res.status(200).json({
      success: true,
      message: "Friends retrieved successfully",
      data: formattedFriends,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        totalFriends: friends.length,
        totalPages,
        hasNextPage: pagination.page < totalPages,
        hasPrevPage: pagination.page > 1,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Get friends error:", error);
    next(error);
  }
};

/**
 * Get pending friend requests
 * GET /api/social/users/:id/friend-requests
 * Requires authentication - can only access own friend requests
 */
const getPendingRequests = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { type = 'received' } = req.query; // 'received' or 'sent'
    const currentUserId = req.user.id;

    // Users can only access their own friend requests
    if (id !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
        error: "You can only access your own friend requests",
        timestamp: new Date().toISOString(),
      });
    }

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
    next(error);
  }
};

/**
 * Get friendship status between two users
 * GET /api/social/users/:id/friendship-status
 * Requires authentication - uses req.user.id as one of the users
 */
const getFriendshipStatus = async (req, res, next) => {
  try {
    const { id } = req.params; // Target user ID
    const currentUserId = req.user.id; // Get from authenticated user

    if (id === currentUserId) {
      return res.status(400).json({
        success: false,
        message: "Cannot get friendship status with yourself",
        timestamp: new Date().toISOString(),
      });
    }

    // Check if both users exist
    const [targetUser, currentUser] = await Promise.all([
      db.getUserById(id),
      db.getUserById(currentUserId)
    ]);

    if (!targetUser || !currentUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        timestamp: new Date().toISOString(),
      });
    }

    // Get friendship status
    const friendshipStatus = await db.getFriendshipStatus(currentUserId, id);
    
    let status = 'none';
    let requesterId = null;
    let createdAt = null;

    if (friendshipStatus) {
      if (friendshipStatus.status === 'accepted') {
        status = 'friends';
      } else if (friendshipStatus.status === 'pending') {
        status = friendshipStatus.requesterId === currentUserId ? 'request_sent' : 'request_received';
        requesterId = friendshipStatus.requesterId;
      }
      createdAt = friendshipStatus.createdAt;
    }

    res.status(200).json({
      success: true,
      message: "Friendship status retrieved successfully",
      data: {
        targetUserId: id,
        targetUserName: targetUser.fullName,
        currentUserId: currentUserId,
        currentUserName: currentUser.fullName,
        status: status,
        requesterId: requesterId,
        createdAt: createdAt,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Get friendship status error:", error);
    next(error);
  }
};

module.exports = {
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
  getFriendshipStatus
}; 