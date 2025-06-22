const { readJson } = require('../utils/dbUtils');
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

    const users = await readJson('users');
    
    const user1 = users.find(u => u.id === id);
    const user2 = users.find(u => u.id === userId);

    if (!user1 || !user2) {
      return res.status(404).json({
        success: false,
        message: 'One or both users not found',
        timestamp: new Date().toISOString()
      });
    }

    // Find mutual connections (users who follow both)
    const user1Following = user1.following || [];
    const user2Following = user2.following || [];
    
    const mutualFriendIds = user1Following.filter(id => user2Following.includes(id));
    
    // Get user details for mutual friends
    const mutualFriends = users
      .filter(u => mutualFriendIds.includes(u.id))
      .map(u => ({
        id: u.id,
        fullName: u.fullName,
        avatar: u.avatar,
        followersCount: u.followersCount || 0,
        followingCount: u.followingCount || 0
      }));

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

    const users = await readJson('users');
    const currentUser = users.find(u => u.id === id);

    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        timestamp: new Date().toISOString()
      });
    }

    const following = currentUser.following || [];
    const followers = currentUser.followers || [];

    // Simple suggestion algorithm: friends of friends who user doesn't follow
    const suggestions = new Set();
    
    // Get people followed by people you follow
    following.forEach(followingId => {
      const followedUser = users.find(u => u.id === followingId);
      if (followedUser?.following) {
        followedUser.following.forEach(suggestedId => {
          if (suggestedId !== id && !following.includes(suggestedId)) {
            suggestions.add(suggestedId);
          }
        });
      }
    });

    // Get user details for suggestions
    const suggestionUsers = Array.from(suggestions)
      .slice(0, parseInt(limit))
      .map(suggestedId => {
        const user = users.find(u => u.id === suggestedId);
        return user ? {
          id: user.id,
          fullName: user.fullName,
          avatar: user.avatar,
          followersCount: user.followersCount || 0,
          mutualFriends: (user.followers || []).filter(f => following.includes(f)).length
        } : null;
      })
      .filter(Boolean);

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

const bulkFollowStatus = async (req, res, next) => {
  try {
    const { userId, targetUserIds } = req.body;

    if (!isValidId(userId) || !Array.isArray(targetUserIds)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid userId or targetUserIds format',
        timestamp: new Date().toISOString()
      });
    }

    const users = await readJson('users');
    const currentUser = users.find(u => u.id === userId);

    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        timestamp: new Date().toISOString()
      });
    }

    const following = currentUser.following || [];
    const followers = currentUser.followers || [];

    const statusResults = targetUserIds.map(targetId => {
      if (!isValidId(targetId)) {
        return { userId: targetId, error: 'Invalid user ID format' };
      }

      const targetUser = users.find(u => u.id === targetId);
      if (!targetUser) {
        return { userId: targetId, error: 'User not found' };
      }

      const targetFollowing = targetUser.following || [];

      return {
        userId: targetId,
        fullName: targetUser.fullName,
        isFollowing: following.includes(targetId),
        isFollowedBy: targetFollowing.includes(userId),
        mutualFollow: following.includes(targetId) && targetFollowing.includes(userId)
      };
    });

    res.status(200).json({
      success: true,
      message: 'Bulk follow status retrieved successfully',
      data: statusResults,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting bulk follow status:', error);
    next(error);
  }
};

module.exports = {
  getMutualFriends,
  getFriendSuggestions,
  bulkFollowStatus
}; 