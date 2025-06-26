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

  const { rawText, userId, audienceType, targetFriendId, groupIds, generate } = postData;

  // Validate user ID
  if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
    errors.push("User ID is required");
  }

  // Validate post text
  const textValidation = validatePostText(rawText);
  if (!textValidation.isValid) {
    errors.push(...textValidation.errors);
  }

  // Validate generate field (optional, defaults to true)
  if (generate !== undefined && typeof generate !== "boolean") {
    errors.push("Generate field must be a boolean value");
  }

  // Validate audience type (optional for backward compatibility)
  const validAudienceTypes = ["friends", "groups", "friend"];
  if (audienceType && typeof audienceType === "string" && !validAudienceTypes.includes(audienceType)) {
    errors.push("Audience type must be one of: friends, groups, friend");
  }

  // Validate based on audience type if provided
  if (audienceType === "friend") {
    // For friend posts, targetFriendId is required
    if (!targetFriendId || typeof targetFriendId !== "string" || targetFriendId.trim().length === 0) {
      errors.push("Target friend ID is required for friend posts");
    }
    // groupIds should not be provided for friend posts
    if (groupIds && groupIds.length > 0) {
      errors.push("Group IDs should not be provided for friend posts");
    }
  } else if (audienceType === "groups") {
    // For group posts, groupIds are required
    if (!groupIds || !Array.isArray(groupIds) || groupIds.length === 0) {
      errors.push("At least one group ID is required for group posts");
    }
    // targetFriendId should not be provided for group posts
    if (targetFriendId) {
      errors.push("Target friend ID should not be provided for group posts");
    }
  } else if (audienceType === "friends") {
    // For friends posts, neither groupIds nor targetFriendId should be provided
    if (groupIds && groupIds.length > 0) {
      errors.push("Group IDs should not be provided for friends posts");
    }
    if (targetFriendId) {
      errors.push("Target friend ID should not be provided for friends posts");
    }
  }

  // Validate group IDs if provided (backward compatibility)
  if (groupIds !== undefined && Array.isArray(groupIds)) {
    if (groupIds.length > 5) {
      errors.push("Cannot post to more than 5 groups at once");
    } else {
      // Validate each group ID
      for (let i = 0; i < groupIds.length; i++) {
        const groupId = groupIds[i];
        if (!groupId || typeof groupId !== "string" || groupId.trim().length === 0) {
          errors.push(`Invalid group ID at position ${i + 1}`);
        }
      }

      // Check for duplicates
      const uniqueIds = [...new Set(groupIds)];
      if (uniqueIds.length !== groupIds.length) {
        errors.push("Duplicate group IDs are not allowed");
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData: {
      rawText: rawText ? rawText.trim() : "",
      userId: userId ? userId.trim() : "",
      audienceType: audienceType ? audienceType.trim() : undefined,
      targetFriendId: targetFriendId ? targetFriendId.trim() : undefined,
      groupIds: groupIds ? groupIds.map(id => id.trim()).filter(Boolean) : [],
      generate: generate !== undefined ? generate : true, // Default to true for backward compatibility
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
 * Validate group creation data
 * @param {Object} groupData - Group data to validate
 * @returns {Object} - Validation result with isValid and errors
 */
const validateGroupData = (groupData) => {
  const errors = [];

  if (!groupData || typeof groupData !== "object") {
    errors.push("Group data is required and must be an object");
    return { isValid: false, errors };
  }

  const { name, description } = groupData;

  // Validate group name
  if (!name || typeof name !== "string") {
    errors.push("Group name is required and must be a string");
  } else {
    const trimmedName = name.trim();
    if (trimmedName.length < 3) {
      errors.push("Group name must be at least 3 characters long");
    } else if (trimmedName.length > 50) {
      errors.push("Group name cannot exceed 50 characters");
    }
  }

  // Validate description (optional)
  if (description !== undefined && description !== null) {
    if (typeof description !== "string") {
      errors.push("Group description must be a string");
    } else if (description.trim().length > 200) {
      errors.push("Group description cannot exceed 200 characters");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData: {
      name: name ? name.trim() : "",
      description: description ? description.trim() : "",
    },
  };
};

/**
 * Validate group invitation data
 * @param {Object} inviteData - Invitation data to validate
 * @returns {Object} - Validation result with isValid and errors
 */
const validateInviteData = (inviteData) => {
  const errors = [];

  if (!inviteData || typeof inviteData !== "object") {
    errors.push("Invite data is required and must be an object");
    return { isValid: false, errors };
  }

  const { userIds, userId } = inviteData;

  // Validate userId (current user)
  if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
    errors.push("User ID is required");
  }

  // Validate userIds array
  if (!userIds || !Array.isArray(userIds)) {
    errors.push("User IDs must be provided as an array");
  } else {
    if (userIds.length === 0) {
      errors.push("At least one user ID must be provided");
    } else if (userIds.length > 10) {
      errors.push("Cannot invite more than 10 users at once");
    }

    // Validate each user ID
    for (let i = 0; i < userIds.length; i++) {
      const id = userIds[i];
      if (!id || typeof id !== "string" || id.trim().length === 0) {
        errors.push(`Invalid user ID at position ${i + 1}`);
      }
    }

    // Check for duplicates
    const uniqueIds = [...new Set(userIds)];
    if (uniqueIds.length !== userIds.length) {
      errors.push("Duplicate user IDs are not allowed");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData: {
      userIds: userIds ? userIds.map(id => id.trim()) : [],
      userId: userId ? userId.trim() : "",
    },
  };
};

/**
 * Validate user action data (for accept/leave/etc.)
 * @param {Object} actionData - Action data to validate
 * @returns {Object} - Validation result with isValid and errors
 */
const validateUserActionData = (actionData) => {
  const errors = [];

  if (!actionData || typeof actionData !== "object") {
    errors.push("Action data is required and must be an object");
    return { isValid: false, errors };
  }

  const { userId } = actionData;

  // Validate userId
  if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
    errors.push("User ID is required");
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData: {
      userId: userId ? userId.trim() : "",
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

const validateProfileUpdateData = (profileData) => {
  const errors = [];

  if (profileData.fullName !== undefined) {
    if (!profileData.fullName || typeof profileData.fullName !== 'string') {
      errors.push('Full name must be a non-empty string');
    } else if (!isValidFullName(profileData.fullName)) {
      errors.push('Full name must contain at least first and last name with valid characters');
    }
  }

  if (profileData.bio !== undefined) {
    if (typeof profileData.bio !== 'string') {
      errors.push('Bio must be a string');
    } else if (profileData.bio.length > 160) {
      errors.push('Bio must be 160 characters or less');
    }
  }

  if (profileData.location !== undefined) {
    if (typeof profileData.location !== 'string') {
      errors.push('Location must be a string');
    } else if (profileData.location.length > 100) {
      errors.push('Location must be 100 characters or less');
    }
  }

  if (profileData.website !== undefined) {
    if (typeof profileData.website !== 'string') {
      errors.push('Website must be a string');
    } else if (profileData.website && !isValidUrl(profileData.website)) {
      errors.push('Website must be a valid URL');
    }
  }

  if (profileData.avatar !== undefined) {
    if (typeof profileData.avatar !== 'string') {
      errors.push('Avatar must be a string (URL or base64)');
    } else if (profileData.avatar && profileData.avatar.length > 1000000) { // ~1MB for base64
      errors.push('Avatar data too large (max 1MB)');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

module.exports = {
  isValidEmail,
  isValidFullName,
  validatePostText,
  validateUserData,
  validatePostData,
  validatePostUpdate,
  validateGroupData,
  validateInviteData,
  validateUserActionData,
  sanitizeText,
  isValidId,
  generateId,
  validatePaginationParams,
  validateProfileUpdateData,
  isValidUrl
};
