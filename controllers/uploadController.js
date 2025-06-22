const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { readJson, writeJson } = require('../utils/fileUtils');
const { isValidId } = require('../utils/validation');

// Configure multer for image uploads
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Accept only image files
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const error = new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.');
    error.status = 400;
    cb(error, false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1
  }
});

const uploadAvatar = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format',
        timestamp: new Date().toISOString()
      });
    }

    // Check if user exists
    const users = await readJson('users.json');
    const userIndex = users.findIndex(user => user.id === id);

    if (userIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
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

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'uploads', 'avatars');
    await fs.mkdir(uploadsDir, { recursive: true });

    // Generate filename
    const fileExtension = path.extname(req.file.originalname);
    const fileName = `${id}${fileExtension}`;
    const filePath = path.join(uploadsDir, fileName);

    // Save file
    await fs.writeFile(filePath, req.file.buffer);

    // For development, return local path. In production, this would be a CDN URL
    const avatarUrl = `/uploads/avatars/${fileName}`;

    // Update user record
    const user = users[userIndex];
    const updatedUser = {
      ...user,
      avatar: avatarUrl,
      updatedAt: new Date().toISOString()
    };

    users[userIndex] = updatedUser;
    await writeJson('users.json', users);

    res.status(200).json({
      success: true,
      message: 'Avatar uploaded successfully',
      data: {
        url: avatarUrl,
        fileSize: req.file.size,
        dimensions: {
          // In a real implementation, you'd extract dimensions from the image
          width: 400,
          height: 400
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error uploading avatar:', error);
    next(error);
  }
};

module.exports = {
  upload,
  uploadAvatar
}; 