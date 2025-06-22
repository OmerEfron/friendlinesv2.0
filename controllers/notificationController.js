const { readJson, writeJson, generateId } = require('../utils/dbUtils');
const { isValidId, validatePaginationParams } = require('../utils/validation');

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

    const pagination = validatePaginationParams({ page, limit });
    if (!pagination.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pagination parameters',
        errors: pagination.errors,
        timestamp: new Date().toISOString()
      });
    }

    // Initialize notifications file if it doesn't exist
    let notifications;
    try {
      notifications = await readJson('notifications');
    } catch (error) {
      notifications = [];
      await writeJson('notifications', notifications);
    }

    // Filter notifications for this user
    let userNotifications = notifications.filter(notif => notif.userId === id);

    // Filter for unread only if requested
    if (unreadOnly === 'true') {
      userNotifications = userNotifications.filter(notif => !notif.isRead);
    }

    // Sort by creation date (newest first)
    userNotifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Implement pagination
    const startIndex = (pagination.page - 1) * pagination.limit;
    const endIndex = startIndex + pagination.limit;
    const paginatedNotifications = userNotifications.slice(startIndex, endIndex);

    const totalPages = Math.ceil(userNotifications.length / pagination.limit);

    res.status(200).json({
      success: true,
      message: 'Notifications retrieved successfully',
      data: paginatedNotifications,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        totalNotifications: userNotifications.length,
        totalPages,
        hasNextPage: pagination.page < totalPages,
        hasPrevPage: pagination.page > 1
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting user notifications:', error);
    next(error);
  }
};

const markNotificationsAsRead = async (req, res, next) => {
  try {
    const { notificationIds, userId } = req.body;

    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'NotificationIds must be a non-empty array',
        timestamp: new Date().toISOString()
      });
    }

    if (!isValidId(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format',
        timestamp: new Date().toISOString()
      });
    }

    let notifications;
    try {
      notifications = await readJson('notifications');
    } catch (error) {
      notifications = [];
    }

    let markedCount = 0;
    notifications = notifications.map(notif => {
      if (notificationIds.includes(notif.id) && notif.userId === userId) {
        markedCount++;
        return { ...notif, isRead: true };
      }
      return notif;
    });

    await writeJson('notifications', notifications);

    res.status(200).json({
      success: true,
      message: `${markedCount} notifications marked as read`,
      data: {
        markedCount,
        requestedCount: notificationIds.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error marking notifications as read:', error);
    next(error);
  }
};

const createNotification = async (userId, type, title, message, data = {}) => {
  try {
    let notifications;
    try {
      notifications = await readJson('notifications');
    } catch (error) {
      notifications = [];
    }

    const notification = {
      id: generateId('n'),
      userId,
      type,
      title,
      message,
      data,
      isRead: false,
      createdAt: new Date().toISOString()
    };

    notifications.push(notification);
    await writeJson('notifications', notifications);

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

module.exports = {
  getUserNotifications,
  markNotificationsAsRead,
  createNotification
}; 