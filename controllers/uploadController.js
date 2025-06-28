const multer = require('multer');
const path = require('path');
const { db } = require('../utils/database');
const { isValidId } = require('../utils/validation');

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

/**
 * Upload user avatar
 */
const uploadAvatar = async (req, res, next) => {
  try {
    const { id } = req.params;
    const authenticatedUserId = req.user.id;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format',
        timestamp: new Date().toISOString()
      });
    }

    // Check if the authenticated user is uploading their own avatar
    if (id !== authenticatedUserId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
        error: 'You can only upload your own avatar',
        timestamp: new Date().toISOString()
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
        timestamp: new Date().toISOString()
      });
    }

    // Check if user exists
    const user = await db.getUserById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        timestamp: new Date().toISOString()
      });
    }

    // Construct the avatar URL
    const avatarUrl = `/uploads/${req.file.filename}`;

    // Update user with new avatar using modern database
    const updateResult = await db.updateUser(id, {
      avatar: avatarUrl,
      updatedAt: new Date().toISOString()
    });

    if (!updateResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update user avatar',
        error: updateResult.error,
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      message: 'Avatar uploaded successfully',
      data: {
        userId: id,
        avatarUrl: avatarUrl,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error uploading avatar:', error);
    next(error);
  }
};

/**
 * Get user avatar
 */
const getUserAvatar = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format',
        timestamp: new Date().toISOString()
      });
    }

    const user = await db.getUserById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      message: 'User avatar retrieved successfully',
      data: {
        userId: id,
        avatarUrl: user.avatar || null,
        hasAvatar: !!user.avatar
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting user avatar:', error);
    next(error);
  }
};

/**
 * Delete user avatar
 */
const deleteUserAvatar = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format',
        timestamp: new Date().toISOString()
      });
    }

    const user = await db.getUserById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        timestamp: new Date().toISOString()
      });
    }

    // Remove avatar from user record
    const updateResult = await db.updateUser(id, {
      avatar: null,
      updatedAt: new Date().toISOString()
    });

    if (!updateResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to delete user avatar',
        error: updateResult.error,
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      message: 'Avatar deleted successfully',
      data: {
        userId: id,
        avatarUrl: null
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error deleting user avatar:', error);
    next(error);
  }
};

module.exports = {
  upload,
  uploadAvatar,
  getUserAvatar,
  deleteUserAvatar
}; 