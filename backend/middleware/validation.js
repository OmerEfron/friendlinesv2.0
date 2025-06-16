// Validation middleware for Express routes
// Contains middleware functions for input validation

const {
  validateUserData,
  validatePostData,
  validatePostUpdate,
  validateGroupData,
  validateInviteData,
  validateUserActionData,
  isValidId,
} = require("../utils/validation");

/**
 * Middleware to validate user login/registration data
 */
const validateUserMiddleware = (req, res, next) => {
  const validation = validateUserData(req.body);

  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: validation.errors,
      timestamp: new Date().toISOString(),
    });
  }

  // Attach sanitized data to request
  req.validatedData = validation.sanitizedData;
  next();
};

/**
 * Middleware to validate post creation data
 */
const validatePostMiddleware = (req, res, next) => {
  const validation = validatePostData(req.body);

  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: validation.errors,
      timestamp: new Date().toISOString(),
    });
  }

  // Attach sanitized data to request
  req.validatedData = validation.sanitizedData;
  next();
};

/**
 * Middleware to validate post update data
 */
const validatePostUpdateMiddleware = (req, res, next) => {
  const validation = validatePostUpdate(req.body);

  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: validation.errors,
      timestamp: new Date().toISOString(),
    });
  }

  // Attach sanitized data to request
  req.validatedData = validation.sanitizedData;
  next();
};

/**
 * Middleware to validate ID parameters in URLs
 */
const validateIdMiddleware = (paramName = "id") => {
  return (req, res, next) => {
    const id = req.params[paramName];

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid ${paramName} format`,
        errors: [`${paramName} must be a valid identifier`],
        timestamp: new Date().toISOString(),
      });
    }

    next();
  };
};

/**
 * Middleware to validate userId parameter specifically
 */
const validateUserIdMiddleware = validateIdMiddleware("userId");

/**
 * Middleware to validate postId parameter specifically
 */
const validatePostIdMiddleware = validateIdMiddleware("id");

/**
 * Generic error handler for validation errors
 */
const handleValidationError = (error, req, res, next) => {
  if (error.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: [error.message],
      timestamp: new Date().toISOString(),
    });
  }

  // Pass to next error handler if not a validation error
  next(error);
};

/**
 * Middleware to ensure request body exists and is not empty
 */
const ensureBodyExists = (req, res, next) => {
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({
      success: false,
      message: "Request body is required",
      errors: ["Request body cannot be empty"],
      timestamp: new Date().toISOString(),
    });
  }

  next();
};

/**
 * Middleware to validate content-type header for POST/PUT requests
 */
const validateContentType = (req, res, next) => {
  if (["POST", "PUT", "PATCH"].includes(req.method)) {
    const contentType = req.get("Content-Type");

    if (!contentType || !contentType.includes("application/json")) {
      return res.status(400).json({
        success: false,
        message: "Invalid content type",
        errors: ["Content-Type must be application/json"],
        timestamp: new Date().toISOString(),
      });
    }
  }

  next();
};

/**
 * Middleware to validate group creation data
 */
const validateGroupMiddleware = (req, res, next) => {
  const validation = validateGroupData(req.body);

  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: validation.errors,
      timestamp: new Date().toISOString(),
    });
  }

  // Attach sanitized data to request
  req.validatedData = validation.sanitizedData;
  next();
};

/**
 * Middleware to validate group invitation data
 */
const validateInviteMiddleware = (req, res, next) => {
  // Combine body data with any userId from params or body
  const inviteData = {
    ...req.body,
    userId: req.body.userId || req.params.userId
  };

  const validation = validateInviteData(inviteData);

  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: validation.errors,
      timestamp: new Date().toISOString(),
    });
  }

  // Attach sanitized data to request
  req.validatedData = validation.sanitizedData;
  next();
};

/**
 * Middleware to validate user action data
 */
const validateUserActionMiddleware = (req, res, next) => {
  const validation = validateUserActionData(req.body);

  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: validation.errors,
      timestamp: new Date().toISOString(),
    });
  }

  // Attach sanitized data to request
  req.validatedData = validation.sanitizedData;
  next();
};

module.exports = {
  validateUserMiddleware,
  validatePostMiddleware,
  validatePostUpdateMiddleware,
  validateGroupMiddleware,
  validateInviteMiddleware,
  validateUserActionMiddleware,
  validateIdMiddleware,
  validateUserIdMiddleware,
  validatePostIdMiddleware,
  handleValidationError,
  ensureBodyExists,
  validateContentType,
};
