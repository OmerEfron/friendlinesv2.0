// Notification service for handling push notifications
// Contains device registration and notification sending functionality

const { Expo } = require('expo-server-sdk');
const { readJson, writeJson } = require('./fileUtils');

// Create Expo SDK instance
const expo = new Expo();

/**
 * Validate Expo push token format
 * @param {string} token - The Expo push token to validate
 * @returns {boolean} - True if token is valid
 */
const isValidExpoPushToken = (token) => {
  return Expo.isExpoPushToken(token);
};

/**
 * Register or update a device's push notification token
 * @param {string} userId - The user ID
 * @param {string} expoPushToken - The Expo push token
 * @returns {Promise<{success: boolean, message?: string, error?: string}>}
 */
const registerDevice = async (userId, expoPushToken) => {
  try {
    // Validate token format
    if (!isValidExpoPushToken(expoPushToken)) {
      return {
        success: false,
        error: 'Invalid Expo push token format'
      };
    }

    // Read existing users
    const users = await readJson('users.json');
    
    // Find user by ID
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      return {
        success: false,
        error: 'User not found'
      };
    }

    // Update user with new push token
    users[userIndex].expoPushToken = expoPushToken;
    users[userIndex].updatedAt = new Date().toISOString();

    // Save updated users
    await writeJson('users.json', users);

    console.log(`Push token registered for user ${userId}`);
    
    return {
      success: true,
      message: 'Push token registered successfully'
    };
  } catch (error) {
    console.error('Error registering device:', error);
    return {
      success: false,
      error: 'Failed to register push token'
    };
  }
};

/**
 * Send push notifications to multiple devices
 * @param {string[]} tokens - Array of Expo push tokens
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Object} data - Additional data payload
 * @returns {Promise<{success: boolean, results?: any[], errors?: any[]}>}
 */
const sendPush = async (tokens, title, body, data = {}) => {
  try {
    // Filter out invalid tokens
    const validTokens = tokens.filter(token => isValidExpoPushToken(token));
    
    if (validTokens.length === 0) {
      return {
        success: false,
        error: 'No valid push tokens provided'
      };
    }

    // Create messages array
    const messages = validTokens.map(token => ({
      to: token,
      title,
      body,
      data: {
        ...data,
        timestamp: new Date().toISOString()
      },
      sound: 'default',
      priority: 'high'
    }));

    // Send notifications in chunks of 100 (Expo's limit)
    const chunks = expo.chunkPushNotifications(messages);
    const results = [];
    const errors = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        results.push(...ticketChunk);
        
        // Log successful sends
        console.log(`Sent ${chunk.length} push notifications`);
      } catch (error) {
        console.error('Error sending notification chunk:', error);
        errors.push(error);
      }
    }

    // Handle any invalid tokens or errors from the results
    await handlePushErrors(results);

    return {
      success: true,
      results,
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (error) {
    console.error('Error in sendPush:', error);
    return {
      success: false,
      error: 'Failed to send push notifications'
    };
  }
};

/**
 * Handle push notification errors and remove invalid tokens
 * @param {Array} results - Results from expo.sendPushNotificationsAsync
 */
const handlePushErrors = async (results) => {
  try {
    const invalidTokens = [];
    
    // Check for errors in results
    results.forEach((result, index) => {
      if (result.status === 'error') {
        console.error(`Push notification error:`, result);
        
        // Check if the error is due to invalid token
        if (result.details && result.details.error === 'DeviceNotRegistered') {
          // We would need the original token to remove it
          // For now, just log it
          console.log('Device not registered error detected');
        }
      }
    });

    // If we have invalid tokens, we could remove them from user records
    // This would require keeping track of which tokens correspond to which results
    // For now, we'll implement basic logging
    if (invalidTokens.length > 0) {
      console.log(`Found ${invalidTokens.length} invalid tokens to clean up`);
    }
  } catch (error) {
    console.error('Error handling push errors:', error);
  }
};

/**
 * Get followers' push tokens for a user
 * @param {string} userId - The user ID whose followers we want to notify
 * @returns {Promise<string[]>} - Array of valid push tokens
 */
const getFollowersTokens = async (userId) => {
  try {
    const users = await readJson('users.json');
    
    // Find the user
    const user = users.find(u => u.id === userId);
    if (!user || !user.followers) {
      return [];
    }

    // Get tokens for all followers
    const followerTokens = users
      .filter(u => user.followers.includes(u.id) && u.expoPushToken)
      .map(u => u.expoPushToken)
      .filter(token => isValidExpoPushToken(token));

    return followerTokens;
  } catch (error) {
    console.error('Error getting followers tokens:', error);
    return [];
  }
};

/**
 * Get group members' push tokens for multiple groups
 * @param {string[]} groupIds - Array of group IDs to notify
 * @param {string} excludeUserId - User ID to exclude from notifications (usually the post creator)
 * @returns {Promise<string[]>} - Array of valid push tokens
 */
const getGroupMembersTokens = async (groupIds, excludeUserId) => {
  try {
    const users = await readJson('users.json');
    const groups = await readJson('groups.json');
    
    // Get all unique member IDs from the specified groups
    const memberIds = new Set();
    
    for (const groupId of groupIds) {
      const group = groups.find(g => g.id === groupId);
      if (group && group.members) {
        group.members.forEach(memberId => {
          if (memberId !== excludeUserId) { // Don't notify the post creator
            memberIds.add(memberId);
          }
        });
      }
    }

    // Get tokens for all group members
    const memberTokens = users
      .filter(u => memberIds.has(u.id) && u.expoPushToken)
      .map(u => u.expoPushToken)
      .filter(token => isValidExpoPushToken(token));

    return memberTokens;
  } catch (error) {
    console.error('Error getting group members tokens:', error);
    return [];
  }
};

/**
 * Get friends' push tokens for a user
 * @param {string} userId - The user ID whose friends we want to notify
 * @returns {Promise<string[]>} - Array of valid push tokens
 */
const getFriendsTokens = async (userId) => {
  try {
    const users = await readJson('users.json');
    
    // Find the user
    const user = users.find(u => u.id === userId);
    if (!user || !user.friends) {
      return [];
    }

    // Get tokens for all friends
    const friendTokens = users
      .filter(u => user.friends.includes(u.id) && u.expoPushToken)
      .map(u => u.expoPushToken)
      .filter(token => isValidExpoPushToken(token));

    return friendTokens;
  } catch (error) {
    console.error('Error getting friends tokens:', error);
    return [];
  }
};

/**
 * Get push tokens for a specific friend
 * @param {string} friendId - The friend's user ID to notify
 * @returns {Promise<string[]>} - Array containing the friend's push token (if valid)
 */
const getFriendTokens = async (friendId) => {
  try {
    const users = await readJson('users.json');
    
    // Find the friend
    const friend = users.find(u => u.id === friendId);
    if (!friend || !friend.expoPushToken) {
      return [];
    }

    // Return token if valid
    if (isValidExpoPushToken(friend.expoPushToken)) {
      return [friend.expoPushToken];
    }

    return [];
  } catch (error) {
    console.error('Error getting friend token:', error);
    return [];
  }
};

/**
 * Remove invalid tokens from user records
 * @param {string[]} invalidTokens - Array of invalid tokens to remove
 */
const removeInvalidTokens = async (invalidTokens) => {
  try {
    const users = await readJson('users.json');
    let updated = false;

    // Remove invalid tokens from users
    users.forEach(user => {
      if (user.expoPushToken && invalidTokens.includes(user.expoPushToken)) {
        delete user.expoPushToken;
        user.updatedAt = new Date().toISOString();
        updated = true;
        console.log(`Removed invalid token for user ${user.id}`);
      }
    });

    // Save if any changes were made
    if (updated) {
      await writeJson('users.json', users);
    }
  } catch (error) {
    console.error('Error removing invalid tokens:', error);
  }
};

module.exports = {
  registerDevice,
  sendPush,
  getFollowersTokens,
  getGroupMembersTokens,
  getFriendsTokens,
  getFriendTokens,
  removeInvalidTokens,
  isValidExpoPushToken
}; 