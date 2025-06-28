// Authentication middleware for Friendlines
// Handles JWT token verification and user authentication

const jwt = require('jsonwebtoken');
const { db } = require('../utils/database');

const JWT_SECRET = process.env.JWT_SECRET || 'friendlines-dev-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Generate JWT token for a user
 * @param {Object} user - User object
 * @returns {string} JWT token
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

/**
 * Authentication middleware - verifies JWT token and attaches user to request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required',
        error: 'Authorization header with Bearer token is required',
        timestamp: new Date().toISOString(),
      });
    }

    // Verify token
    const decoded = verifyToken(token);
    
    // Verify user still exists in database
    const user = await db.getUserById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
        error: 'Token is valid but user no longer exists',
        timestamp: new Date().toISOString(),
      });
    }

    // Attach user to request object
    req.user = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired token',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Optional authentication middleware - doesn't fail if no token provided
 * Useful for endpoints that work differently for authenticated vs anonymous users
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      // No token provided, continue without authentication
      req.user = null;
      return next();
    }

    // Verify token if provided
    const decoded = verifyToken(token);
    const user = await db.getUserById(decoded.id);
    
    if (user) {
      req.user = {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
      };
    } else {
      req.user = null;
    }

    next();
  } catch (error) {
    // Token was provided but invalid - continue without authentication
    console.warn('Optional auth failed:', error.message);
    req.user = null;
    next();
  }
};

/**
 * Middleware to ensure user can only access their own resources
 * Should be used after authenticateToken
 */
const requireSelfOrAdmin = (paramName = 'id') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        timestamp: new Date().toISOString(),
      });
    }

    const resourceUserId = req.params[paramName];
    
    // Allow access if user is accessing their own resource
    if (req.user.id === resourceUserId) {
      return next();
    }

    // For now, we don't have admin roles, so deny access
    return res.status(403).json({
      success: false,
      message: 'Access denied',
      error: 'You can only access your own resources',
      timestamp: new Date().toISOString(),
    });
  };
};

module.exports = {
  generateToken,
  verifyToken,
  authenticateToken,
  optionalAuth,
  requireSelfOrAdmin,
}; 