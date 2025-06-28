const { db } = require('../utils/database');
const { isValidId } = require('../utils/validation');

/**
 * Get user notifications with pagination
 */
const getUserNotifications = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20, unreadOnly = false } = req.query;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format',
        timestamp: new Date().toISOString()
      });
    }

    // Get notifications using modern database
    const notifications = await db.getUserNotifications(
      id, 
      parseInt(limit), 
      (parseInt(page) - 1) * parseInt(limit)
    );

    // Filter for unread only if requested
    const filteredNotifications = unreadOnly === 'true' 
      ? notifications.filter(n => !n.isRead)
      : notifications;

    res.status(200).json({
      success: true,
      message: 'Notifications retrieved successfully',
      data: filteredNotifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: filteredNotifications.length === parseInt(limit)
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting user notifications:', error);
    next(error);
  }
};

/**
 * Mark notifications as read
 */
const markNotificationsAsRead = async (req, res, next) => {
  try {
    const { notificationIds, userId } = req.body;

    if (!Array.isArray(notificationIds) || !isValidId(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid notification IDs or user ID format',
        timestamp: new Date().toISOString()
      });
    }

    // Mark each notification as read using modern database
    const results = [];
    for (const notificationId of notificationIds) {
      if (isValidId(notificationId)) {
        const result = await db.markNotificationAsRead(notificationId);
        results.push({
          notificationId,
          success: result.success,
          error: result.error
        });
      } else {
        results.push({
          notificationId,
          success: false,
          error: 'Invalid notification ID format'
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const errorCount = results.length - successCount;

    res.status(200).json({
      success: true,
      message: `${successCount} notifications marked as read`,
      data: {
        processed: results.length,
        successful: successCount,
        errors: errorCount,
        results: results.filter(r => !r.success) // Only return failed ones
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error marking notifications as read:', error);
    next(error);
  }
};

/**
 * Create a new notification (internal use)
 */
const createNotification = async (notificationData) => {
  try {
    const notification = {
      id: db.generateId('n'),
      userId: notificationData.userId,
      type: notificationData.type,
      title: notificationData.title,
      message: notificationData.message,
      data: notificationData.data || {},
      isRead: false,
      createdAt: new Date().toISOString()
    };

    const result = await db.createNotification(notification);
    
    if (result.success) {
      console.log(`Notification created for user ${notificationData.userId}: ${notificationData.title}`);
      return { success: true, data: notification };
    } else {
      console.error('Failed to create notification:', result.error);
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error('Error creating notification:', error);
    return { success: false, error: 'Failed to create notification' };
  }
};

/**
 * Get notification statistics for a user
 */
const getNotificationStats = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format',
        timestamp: new Date().toISOString()
      });
    }

    // Get all notifications for the user
    const allNotifications = await db.getUserNotifications(id, 1000, 0);
    
    const stats = {
      total: allNotifications.length,
      unread: allNotifications.filter(n => !n.isRead).length,
      read: allNotifications.filter(n => n.isRead).length,
      byType: {}
    };

    // Count by notification type
    allNotifications.forEach(notification => {
      const type = notification.type || 'unknown';
      stats.byType[type] = (stats.byType[type] || 0) + 1;
    });

    res.status(200).json({
      success: true,
      message: 'Notification statistics retrieved successfully',
      data: stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting notification stats:', error);
    next(error);
  }
};

module.exports = {
  getUserNotifications,
  markNotificationsAsRead,
  createNotification,
  getNotificationStats
}; 