const { db } = require('../utils/database');
const { isValidId, validatePaginationParams } = require('../utils/validation');

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

module.exports = {
  getMutualFriends,
  getFriendSuggestions,
  bulkFriendshipStatus
}; 