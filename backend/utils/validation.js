/**
 * Validation utilities for Friendlines backend
 * Contains functions to validate user inputs, posts, and other data
 */

/**
 * Validate email format
 * @param {string} email - Email address to validate
 * @returns {boolean} - True if email is valid
 */
const isValidEmail = (email) => {
  if (!email || typeof email !== "string") {
    return false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

/**
 * Validate full name
 * @param {string} fullName - Full name to validate
 * @returns {boolean} - True if name is valid
 */
const isValidFullName = (fullName) => {
  if (!fullName || typeof fullName !== "string") {
    return false;
  }

  const trimmedName = fullName.trim();

  // Must be at least 2 characters and contain at least one space (first and last name)
  if (trimmedName.length < 2) {
    return false;
  }

  // Should contain only letters, spaces, hyphens, and apostrophes
  const nameRegex = /^[a-zA-Z\s\-']+$/;
  return nameRegex.test(trimmedName);
};

/**
 * Validate post text content
 * @param {string} text - Post text to validate
 * @returns {Object} - Validation result with isValid and errors
 */
const validatePostText = (text) => {
  const errors = [];

  if (!text || typeof text !== "string") {
    errors.push("Post text is required and must be a string");
  } else {
    const trimmedText = text.trim();

    if (trimmedText.length === 0) {
      errors.push("Post text cannot be empty");
    } else if (trimmedText.length > 280) {
      errors.push("Post text cannot exceed 280 characters");
    } else if (trimmedText.length < 1) {
      errors.push("Post text must be at least 1 character long");
    }

    // Check for potentially harmful content (basic)
    const bannedWords = [
      "<script",
      "</script",
      "javascript:",
      "onclick",
      "onerror",
    ];
    const lowerText = trimmedText.toLowerCase();

    for (const word of bannedWords) {
      if (lowerText.includes(word)) {
        errors.push("Post contains potentially harmful content");
        break;
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validate user registration data
 * @param {Object} userData - User data to validate
 * @returns {Object} - Validation result with isValid and errors
 */
const validateUserData = (userData) => {
  const errors = [];

  if (!userData || typeof userData !== "object") {
    errors.push("User data is required and must be an object");
    return { isValid: false, errors };
  }

  const { fullName, email } = userData;

  // Validate full name
  if (!isValidFullName(fullName)) {
    errors.push(
      "Full name is required and must contain at least first and last name with valid characters"
    );
  }

  // Validate email
  if (!isValidEmail(email)) {
    errors.push("Valid email address is required");
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData: {
      fullName: fullName ? fullName.trim() : "",
      email: email ? email.trim().toLowerCase() : "",
    },
  };
};

/**
 * Validate post creation data
 * @param {Object} postData - Post data to validate
 * @returns {Object} - Validation result with isValid and errors
 */
const validatePostData = (postData) => {
  const errors = [];

  if (!postData || typeof postData !== "object") {
    errors.push("Post data is required and must be an object");
    return { isValid: false, errors };
  }

  const { rawText, userId } = postData;

  // Validate user ID
  if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
    errors.push("User ID is required");
  }

  // Validate post text
  const textValidation = validatePostText(rawText);
  if (!textValidation.isValid) {
    errors.push(...textValidation.errors);
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData: {
      rawText: rawText ? rawText.trim() : "",
      userId: userId ? userId.trim() : "",
    },
  };
};

/**
 * Validate update data for post editing
 * @param {Object} updateData - Data for updating a post
 * @returns {Object} - Validation result
 */
const validatePostUpdate = (updateData) => {
  const errors = [];

  if (!updateData || typeof updateData !== "object") {
    errors.push("Update data is required and must be an object");
    return { isValid: false, errors };
  }

  const { rawText } = updateData;

  // Validate new text if provided
  if (rawText !== undefined) {
    const textValidation = validatePostText(rawText);
    if (!textValidation.isValid) {
      errors.push(...textValidation.errors);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData: {
      rawText: rawText ? rawText.trim() : undefined,
    },
  };
};

/**
 * Sanitize text input to prevent XSS and other attacks
 * @param {string} text - Text to sanitize
 * @returns {string} - Sanitized text
 */
const sanitizeText = (text) => {
  if (!text || typeof text !== "string") {
    return "";
  }

  return text
    .trim()
    .replace(/[<>]/g, "") // Remove < and > characters
    .replace(/javascript:/gi, "") // Remove javascript: protocol
    .replace(/on\w+=/gi, "") // Remove event handlers
    .slice(0, 1000); // Limit length
};

/**
 * Validate ID format (for posts, users, etc.)
 * @param {string} id - ID to validate
 * @returns {boolean} - True if ID is valid
 */
const isValidId = (id) => {
  if (!id || typeof id !== "string") {
    return false;
  }

  // IDs should be alphanumeric and at least 1 character
  const idRegex = /^[a-zA-Z0-9_-]+$/;
  return idRegex.test(id.trim()) && id.trim().length > 0;
};

/**
 * Generate a unique ID for posts or users
 * @param {string} prefix - Prefix for the ID (e.g., 'u' for user, 'p' for post)
 * @returns {string} - Unique ID
 */
const generateId = (prefix = "") => {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substr(2, 5);
  return `${prefix}${timestamp}${randomPart}`;
};

/**
 * Validate pagination parameters
 * @param {Object} params - Pagination parameters
 * @returns {Object} - Validated pagination parameters
 */
const validatePaginationParams = (params = {}) => {
  let { page = 1, limit = 20 } = params;

  // Ensure page is a positive integer
  page = parseInt(page, 10);
  if (isNaN(page) || page < 1) {
    page = 1;
  }

  // Ensure limit is a positive integer within reasonable bounds
  limit = parseInt(limit, 10);
  if (isNaN(limit) || limit < 1) {
    limit = 20;
  } else if (limit > 100) {
    limit = 100; // Cap at 100 items per page
  }

  return { page, limit };
};

module.exports = {
  isValidEmail,
  isValidFullName,
  validatePostText,
  validateUserData,
  validatePostData,
  validatePostUpdate,
  sanitizeText,
  isValidId,
  generateId,
  validatePaginationParams,
};
