// Enhanced notification service for handling push notifications
// Follows Expo's best practices for reliable delivery and error handling

const { Expo } = require('expo-server-sdk');
const { db } = require('./database');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Firebase Admin SDK for FCM V1
let admin = null;
let firebaseInitialized = false;

// Initialize Firebase Admin SDK
const initializeFirebase = () => {
  if (firebaseInitialized) return;
  
  try {
    const admin = require('firebase-admin');
    const serviceAccountPath = path.join(__dirname, '../firebase-admin-key.json');
    
    // Check if service account file exists
    const fs = require('fs');
    if (!fs.existsSync(serviceAccountPath)) {
      console.warn('⚠️ Firebase service account key not found. FCM V1 will use Expo access token fallback.');
      return;
    }
    
    const serviceAccount = require(serviceAccountPath);
    
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('✅ Firebase Admin SDK initialized for FCM V1');
    }
    
    firebaseInitialized = true;
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin SDK:', error);
    console.warn('⚠️ Falling back to Expo access token for push notifications');
  }
};

// Initialize Firebase on module load
initializeFirebase();

// Create Expo SDK instance with FCM V1 support
const expo = new Expo({
  accessToken: process.env.EXPO_ACCESS_TOKEN,
  useFcmV1: firebaseInitialized, // Only use FCM V1 if Firebase is properly initialized
});

// Database connection for receipt tracking
const dbPath = path.join(__dirname, '../data/friendlines.db');
let receiptDb = null;

// Initialize database connection
const initializeReceiptDb = () => {
  if (!receiptDb) {
    receiptDb = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening receipt tracking database:', err);
      }
    });
  }
};

// Rate limiting configuration (600 notifications per second max)
const RATE_LIMIT = {
  maxPerSecond: 600,
  queue: [],
  lastProcessed: 0,
  processing: false
};

// Receipt checking configuration
const RECEIPT_CHECK_DELAY = 15 * 60 * 1000; // 15 minutes
const MAX_RECEIPT_RETRIES = 3;
const RECEIPT_CLEANUP_AFTER = 24 * 60 * 60 * 1000; // 24 hours

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

    // Update user with new push token using modern database
    const updateResult = await db.updateUser(userId, {
      expoPushToken: expoPushToken,
      updatedAt: new Date().toISOString()
    });

    if (!updateResult.success) {
      return {
        success: false,
        error: updateResult.error || 'User not found'
      };
    }

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
 * Rate limited queue processor for notifications
 */
const processNotificationQueue = async () => {
  if (RATE_LIMIT.processing || RATE_LIMIT.queue.length === 0) {
    return;
  }

  RATE_LIMIT.processing = true;

  while (RATE_LIMIT.queue.length > 0) {
    const now = Date.now();
    const timeSinceLastProcess = now - RATE_LIMIT.lastProcessed;
    
    // Ensure we don't exceed rate limit
    if (timeSinceLastProcess < 1000) {
      await new Promise(resolve => setTimeout(resolve, 1000 - timeSinceLastProcess));
    }

    // Process up to rate limit
    const batch = RATE_LIMIT.queue.splice(0, Math.min(RATE_LIMIT.maxPerSecond, RATE_LIMIT.queue.length));
    
    for (const notificationTask of batch) {
      try {
        await sendPushImmediate(notificationTask);
      } catch (error) {
        console.error('Failed to process notification:', error);
        // Add to retry queue if it hasn't exceeded max retries
        if ((notificationTask.retryCount || 0) < 3) {
          notificationTask.retryCount = (notificationTask.retryCount || 0) + 1;
          RATE_LIMIT.queue.push(notificationTask);
        }
      }
    }

    RATE_LIMIT.lastProcessed = Date.now();
  }

  RATE_LIMIT.processing = false;
};

/**
 * Send push notifications with rate limiting and retry logic
 * @param {string[]} tokens - Array of Expo push tokens
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Object} data - Additional data payload
 * @param {Object} options - Additional notification options
 * @returns {Promise<{success: boolean, tickets?: any[], errors?: any[]}>}
 */
const sendPush = async (tokens, title, body, data = {}, options = {}) => {
  try {
    // Filter out invalid tokens
    const validTokens = tokens.filter(token => isValidExpoPushToken(token));
    
    if (validTokens.length === 0) {
      return {
        success: false,
        error: 'No valid push tokens provided'
      };
    }

    // Add to rate-limited queue
    const notificationTask = {
      tokens: validTokens,
      title,
      body,
      data: {
        ...data,
        timestamp: new Date().toISOString()
      },
      options: {
        sound: 'default',
        priority: 'high',
        channelId: options.channelId || 'default',
        ...options
      },
      retryCount: 0
    };

    RATE_LIMIT.queue.push(notificationTask);
    
    // Start processing queue
    processNotificationQueue();

    return {
      success: true,
      message: `${validTokens.length} notifications queued for delivery`
    };
  } catch (error) {
    console.error('Error in sendPush:', error);
    return {
      success: false,
      error: 'Failed to queue push notifications'
    };
  }
};

/**
 * Immediate push notification sending (internal use)
 * @param {Object} notificationTask - The notification task to process
 */
const sendPushImmediate = async (notificationTask) => {
  const { tokens, title, body, data, options } = notificationTask;
  
  try {
    // Create messages array
    const messages = tokens.map(token => ({
      to: token,
      title,
      body,
      data,
      sound: options.sound || 'default',
      priority: options.priority || 'high',
      channelId: options.channelId || 'default',
      badge: options.badge,
      ttl: options.ttl,
      expiration: options.expiration,
      mutableContent: options.mutableContent || false,
      categoryId: options.categoryId
    }));

    // Send notifications in chunks of 100 (Expo's limit)
    const chunks = expo.chunkPushNotifications(messages);
    const allTickets = [];

    for (const chunk of chunks) {
      try {
        const tickets = await expo.sendPushNotificationsAsync(chunk);
        allTickets.push(...tickets);
        
        console.log(`Sent ${chunk.length} push notifications`);
      } catch (error) {
        console.error('Error sending notification chunk:', error);
        
        // Exponential backoff for retries
        if (notificationTask.retryCount < 3) {
          const delay = Math.pow(2, notificationTask.retryCount) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          throw error; // Will be caught by queue processor for retry
        }
      }
    }

    // Store tickets for receipt checking
    await storeTicketsForReceiptCheck(allTickets, data.type || 'unknown');

    return {
      success: true,
      tickets: allTickets
    };
  } catch (error) {
    console.error('Error in sendPushImmediate:', error);
    throw error;
  }
};

/**
 * Store notification tickets for later receipt checking
 * @param {Array} tickets - Notification tickets from Expo
 * @param {string} notificationType - Type of notification for tracking
 */
const storeTicketsForReceiptCheck = async (tickets, notificationType) => {
  if (!tickets || tickets.length === 0) return;

  try {
    const now = new Date().toISOString();
    const checkAfter = new Date(Date.now() + RECEIPT_CHECK_DELAY).toISOString();

    for (const ticket of tickets) {
      if (ticket.id) {
        await new Promise((resolve, reject) => {
          receiptDb.run(
            `INSERT INTO push_receipts (id, ticketId, notificationType, status, createdAt, checkAfter) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [db.generateId('r'), ticket.id, notificationType, 'pending', now, checkAfter],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });
      }
    }

    console.log(`Stored ${tickets.length} tickets for receipt checking`);
  } catch (error) {
    console.error('Error storing tickets for receipt check:', error);
  }
};

/**
 * Check push notification receipts and handle errors
 */
const checkPushReceipts = async () => {
  try {
    initializeReceiptDb();
    
    const now = new Date().toISOString();
    
    // Get receipts that are due for checking
    const receipts = await new Promise((resolve, reject) => {
      receiptDb.all(
        `SELECT * FROM push_receipts 
         WHERE status = 'pending' 
         AND checkAfter <= ? 
         AND retryCount < ?
         ORDER BY createdAt ASC 
         LIMIT 1000`,
        [now, MAX_RECEIPT_RETRIES],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    if (receipts.length === 0) {
      console.log('No receipts to check');
      return;
    }

    console.log(`Checking ${receipts.length} push receipts...`);

    // Group receipts by chunks of 1000 (Expo limit)
    const receiptIds = receipts.map(r => r.ticketId);
    const chunks = expo.chunkPushNotificationReceiptIds(receiptIds);
    
    const processedIds = [];
    const invalidTokens = [];

    for (const chunk of chunks) {
      try {
        const receiptResults = await expo.getPushNotificationReceiptsAsync(chunk);
        
        for (const receiptId of Object.keys(receiptResults)) {
          const receipt = receiptResults[receiptId];
          const dbReceipt = receipts.find(r => r.ticketId === receiptId);
          
          if (!dbReceipt) continue;
          
          processedIds.push(receiptId);
          
          if (receipt.status === 'error') {
            console.error(`Push notification error for ${receiptId}:`, receipt.message);
            
            // Handle invalid device tokens
            if (receipt.details?.error === 'DeviceNotRegistered') {
              invalidTokens.push(receiptId);
            }
            
            // Update database with error
            await new Promise((resolve, reject) => {
              receiptDb.run(
                `UPDATE push_receipts 
                 SET status = 'error', errorMessage = ?, errorDetails = ?
                 WHERE id = ?`,
                [receipt.message, JSON.stringify(receipt.details), dbReceipt.id],
                (err) => {
                  if (err) reject(err);
                  else resolve();
                }
              );
            });
          } else if (receipt.status === 'ok') {
            console.log(`Push notification ${receiptId} delivered successfully`);
            
            // Update database with success
            await new Promise((resolve, reject) => {
              receiptDb.run(
                `UPDATE push_receipts 
                 SET status = 'delivered', deliveredAt = ?
                 WHERE id = ?`,
                [new Date().toISOString(), dbReceipt.id],
                (err) => {
                  if (err) reject(err);
                  else resolve();
                }
              );
            });
          }
        }
      } catch (error) {
        console.error('Error checking push receipts batch:', error);
        
        // Mark batch for retry with exponential backoff
        const retryAfter = new Date(Date.now() + Math.pow(2, receipts[0].retryCount) * 60000).toISOString();
        
        for (const receipt of receipts) {
          await new Promise((resolve, reject) => {
            receiptDb.run(
              `UPDATE push_receipts 
               SET retryCount = retryCount + 1, checkAfter = ?
               WHERE id = ?`,
              [retryAfter, receipt.id],
              (err) => {
                if (err) reject(err);
                else resolve();
              }
            );
          });
        }
        continue;
      }
    }

    // Clean up invalid tokens if any were found
    if (invalidTokens.length > 0) {
      await removeInvalidTokens(invalidTokens);
    }

    console.log(`Receipt check complete. Processed: ${processedIds.length}`);
  } catch (error) {
    console.error('Error in checkPushReceipts:', error);
  }
};

/**
 * Get group members' push tokens for a group
 * @param {string|string[]} groupIds - The group ID(s) whose members we want to notify
 * @param {string} excludeUserId - User ID to exclude from notifications (usually the creator)
 * @returns {Promise<string[]>} Array of push tokens
 */
const getGroupMembersTokens = async (groupIds, excludeUserId = null) => {
  try {
    const groupIdArray = Array.isArray(groupIds) ? groupIds : [groupIds];
    const allMemberIds = new Set();
    
    // Collect all unique member IDs from specified groups
    for (const groupId of groupIdArray) {
      const members = await db.getGroupMembers(groupId);
      members.forEach(member => {
        if (member.userId !== excludeUserId) {
          allMemberIds.add(member.userId);
        }
      });
    }
    
    // Get tokens for all unique members
    const memberTokens = [];
    for (const memberId of allMemberIds) {
      const user = await db.getUserById(memberId);
      if (user && user.expoPushToken && isValidExpoPushToken(user.expoPushToken)) {
        memberTokens.push(user.expoPushToken);
      }
    }
    
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
    const friends = await db.getUserFriends(userId);
    
    const friendTokens = [];
    for (const friend of friends) {
      if (friend.expoPushToken && isValidExpoPushToken(friend.expoPushToken)) {
        friendTokens.push(friend.expoPushToken);
      }
    }

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
    const friend = await db.getUserById(friendId);
    
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
    // Get all users with push tokens
    const users = await db.getAllUsers(1000); // Get more users for cleanup
    let updated = false;

    // Remove invalid tokens from users
    for (const user of users) {
      if (user.expoPushToken && invalidTokens.includes(user.expoPushToken)) {
        await db.updateUser(user.id, {
          expoPushToken: null,
          updatedAt: new Date().toISOString()
        });
        updated = true;
        console.log(`Removed invalid token for user ${user.id}`);
      }
    }

    if (updated) {
      console.log(`Cleaned up ${invalidTokens.length} invalid push tokens`);
    }
  } catch (error) {
    console.error('Error removing invalid tokens:', error);
  }
};

/**
 * Initialize periodic receipt checking
 * Should be called on server startup
 */
const initializeReceiptChecking = () => {
  // Initialize database connection
  initializeReceiptDb();
  
  // Check receipts every 30 minutes
  setInterval(checkPushReceipts, 30 * 60 * 1000);
  console.log('Push notification receipt checking initialized');
};

module.exports = {
  registerDevice,
  sendPush,
  getFriendsTokens,
  getGroupMembersTokens,
  getFriendTokens,
  removeInvalidTokens,
  isValidExpoPushToken,
  checkPushReceipts,
  initializeReceiptChecking
}; 