// Enhanced notification service for handling push notifications
// Follows Expo's best practices for reliable delivery and error handling

const { Expo } = require('expo-server-sdk');
const { readJson, writeJson, generateId } = require('./dbUtils');
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
let db = null;

// Initialize database connection
const initializeReceiptDb = () => {
  if (!db) {
    db = new sqlite3.Database(dbPath, (err) => {
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
 * @param {Array} tickets - Array of push notification tickets
 * @param {string} notificationType - Type of notification for tracking
 */
const storeTicketsForReceiptCheck = async (tickets, notificationType) => {
  try {
    initializeReceiptDb();

    const validTickets = tickets.filter(ticket => 
      ticket.status === 'ok' && ticket.id
    );

    if (validTickets.length === 0) return;

    const now = new Date().toISOString();
    const checkAfter = new Date(Date.now() + RECEIPT_CHECK_DELAY).toISOString();

    // Insert receipts into database
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO push_receipts 
      (id, ticketId, notificationType, createdAt, checkAfter, retryCount)
      VALUES (?, ?, ?, ?, ?, 0)
    `);

    for (const ticket of validTickets) {
      const receiptId = generateId('pr');
      stmt.run(receiptId, ticket.id, notificationType, now, checkAfter);
    }

    stmt.finalize();
    console.log(`Stored ${validTickets.length} tickets for receipt checking`);
  } catch (error) {
    console.error('Error storing tickets for receipt check:', error);
  }
};

/**
 * Check push notification receipts and handle errors
 * Should be called periodically (e.g., every 30 minutes)
 */
const checkPushReceipts = async () => {
  try {
    initializeReceiptDb();

    const now = new Date().toISOString();
    
    // Get receipts ready to check from database
    const readyToCheck = await new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM push_receipts 
         WHERE checkAfter <= ? AND retryCount < ? AND status = 'pending'
         ORDER BY createdAt ASC`,
        [now, MAX_RECEIPT_RETRIES],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    if (readyToCheck.length === 0) {
      // Clean up old receipts (older than 24 hours)
      const cutoff = new Date(Date.now() - RECEIPT_CLEANUP_AFTER).toISOString();
      await new Promise((resolve, reject) => {
        db.run(
          'DELETE FROM push_receipts WHERE createdAt < ?',
          [cutoff],
          function(err) {
            if (err) reject(err);
            else {
              if (this.changes > 0) {
                console.log(`Cleaned up ${this.changes} old receipts`);
              }
              resolve();
            }
          }
        );
      });
      return;
    }

    console.log(`Checking ${readyToCheck.length} push notification receipts`);

    // Check receipts in batches of 1000 (Expo's limit)
    const batchSize = 1000;
    const invalidTokens = [];
    const processedIds = [];

    for (let i = 0; i < readyToCheck.length; i += batchSize) {
      const batch = readyToCheck.slice(i, i + batchSize);
      const receiptIds = batch.map(r => r.ticketId);

      try {
        const receipts = await expo.getPushNotificationReceiptsAsync(receiptIds);
        
        for (const receiptId in receipts) {
          const receipt = receipts[receiptId];
          const dbReceipt = batch.find(r => r.ticketId === receiptId);
          
          if (dbReceipt) {
            processedIds.push(dbReceipt.id);

            if (receipt.status === 'error') {
              console.error(`Push receipt error for ${receiptId}:`, receipt);
              
              // Update database with error
              await new Promise((resolve, reject) => {
                db.run(
                  `UPDATE push_receipts 
                   SET status = 'error', errorMessage = ?, errorDetails = ?
                   WHERE id = ?`,
                  [receipt.message || 'Unknown error', JSON.stringify(receipt.details || {}), dbReceipt.id],
                  (err) => {
                    if (err) reject(err);
                    else resolve();
                  }
                );
              });
              
              if (receipt.details && receipt.details.error === 'DeviceNotRegistered') {
                console.log('Device not registered - token should be removed');
                // We could implement token removal here if we track token-to-receipt mapping
              }
            } else if (receipt.status === 'ok') {
              console.log(`Push notification ${receiptId} delivered successfully`);
              
              // Update database with success
              await new Promise((resolve, reject) => {
                db.run(
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
        }
      } catch (error) {
        console.error('Error checking push receipts batch:', error);
        
        // Mark batch for retry with exponential backoff
        const retryAfter = new Date(Date.now() + Math.pow(2, batch[0].retryCount) * 60000).toISOString();
        
        for (const receipt of batch) {
          await new Promise((resolve, reject) => {
            db.run(
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
    const groups = await readJson('groups');
    const users = await readJson('users');
    
    const groupIdArray = Array.isArray(groupIds) ? groupIds : [groupIds];
    const allMemberIds = new Set();
    
    // Collect all unique member IDs from specified groups
    for (const groupId of groupIdArray) {
      const group = groups.find(g => g.id === groupId);
      if (group && group.members) {
        group.members.forEach(memberId => {
          if (memberId !== excludeUserId) {
            allMemberIds.add(memberId);
          }
        });
      }
    }
    
    // Get tokens for all unique members
    const memberTokens = users
      .filter(u => allMemberIds.has(u.id) && u.expoPushToken)
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