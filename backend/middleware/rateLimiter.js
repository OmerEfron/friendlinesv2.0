// Rate limiting middleware
// Implements rate limiting for API endpoints

const rateLimit = require("express-rate-limit");

/**
 * General rate limiter for all endpoints
 * Allows 100 requests per 15 minutes per IP
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: "Too many requests from this IP",
    error: "Rate limit exceeded. Please try again later.",
    retryAfter: 15 * 60, // 15 minutes in seconds
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "Too many requests from this IP",
      error: "Rate limit exceeded. Please try again later.",
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000),
      timestamp: new Date().toISOString(),
    });
  },
});

/**
 * Strict rate limiter for login endpoint
 * Allows 5 login attempts per 15 minutes per IP
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login requests per windowMs
  message: {
    success: false,
    message: "Too many login attempts",
    error: "Too many login attempts from this IP. Please try again later.",
    retryAfter: 15 * 60, // 15 minutes in seconds
    timestamp: new Date().toISOString(),
  },
  skipSuccessfulRequests: true, // Don't count successful requests
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "Too many login attempts",
      error: "Too many login attempts from this IP. Please try again later.",
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000),
      timestamp: new Date().toISOString(),
    });
  },
});

/**
 * Rate limiter for post creation
 * Allows 10 posts per hour per IP
 */
const postCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 post creations per hour
  message: {
    success: false,
    message: "Too many posts created",
    error: "Too many posts created from this IP. Please try again later.",
    retryAfter: 60 * 60, // 1 hour in seconds
    timestamp: new Date().toISOString(),
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "Too many posts created",
      error: "Too many posts created from this IP. Please try again later.",
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000),
      timestamp: new Date().toISOString(),
    });
  },
});

/**
 * Rate limiter for post updates/edits
 * Allows 20 updates per hour per IP
 */
const postUpdateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit each IP to 20 post updates per hour
  message: {
    success: false,
    message: "Too many post updates",
    error: "Too many post updates from this IP. Please try again later.",
    retryAfter: 60 * 60, // 1 hour in seconds
    timestamp: new Date().toISOString(),
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "Too many post updates",
      error: "Too many post updates from this IP. Please try again later.",
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000),
      timestamp: new Date().toISOString(),
    });
  },
});

/**
 * Very strict rate limiter for reset endpoint (development only)
 * Allows 3 resets per hour per IP
 */
const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 reset requests per hour
  message: {
    success: false,
    message: "Too many reset attempts",
    error: "Too many reset attempts from this IP. Please try again later.",
    retryAfter: 60 * 60, // 1 hour in seconds
    timestamp: new Date().toISOString(),
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "Too many reset attempts",
      error: "Too many reset attempts from this IP. Please try again later.",
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000),
      timestamp: new Date().toISOString(),
    });
  },
});

/**
 * Custom rate limiter factory for creating specific limiters
 * @param {Object} options - Rate limiter options
 * @returns {Function} - Express middleware function
 */
const createCustomLimiter = (options = {}) => {
  const defaultOptions = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: {
      success: false,
      message: "Rate limit exceeded",
      error: "Too many requests. Please try again later.",
      timestamp: new Date().toISOString(),
    },
    standardHeaders: true,
    legacyHeaders: false,
  };

  return rateLimit({ ...defaultOptions, ...options });
};

/**
 * Development mode rate limiter - more permissive
 * Allows 1000 requests per 15 minutes per IP
 */
const developmentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Much higher limit for development
  message: {
    success: false,
    message: "Development rate limit exceeded",
    error: "Too many requests. Please try again later.",
    timestamp: new Date().toISOString(),
  },
  skip: (req) => {
    // Skip rate limiting for localhost in development
    const isDevelopment = process.env.NODE_ENV === "development";
    const isLocalhost = req.ip === "127.0.0.1" || req.ip === "::1";
    return isDevelopment && isLocalhost;
  },
});

/**
 * Get the appropriate rate limiter based on environment
 * @returns {Function} - Rate limiter middleware
 */
const getGeneralLimiter = () => {
  return process.env.NODE_ENV === "development"
    ? developmentLimiter
    : generalLimiter;
};

module.exports = {
  generalLimiter,
  loginLimiter,
  postCreationLimiter,
  postUpdateLimiter,
  resetLimiter,
  createCustomLimiter,
  developmentLimiter,
  getGeneralLimiter,
};
