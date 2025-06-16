# Friendlines API Documentation

**Base URL**: `http://localhost:3000`  
**Version**: 1.0.0  
**Environment**: Development

## Overview

The Friendlines API transforms everyday life updates into satirical newsflashes. This RESTful API provides endpoints for user management, post creation with automatic newsflash generation, social features (likes, comments, follows), and development utilities.

## Quick Start

```bash
# Start the backend server
cd backend
npm install
npm start
```

The server runs on `http://localhost:3000` by default.

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **General**: 100 requests per 15 minutes per IP (1000 in development)
- **Login**: 5 attempts per 15 minutes per IP  
- **Post Creation**: 10 posts per hour per IP
- **Post Updates**: 20 updates per hour per IP
- **Reset**: 3 resets per hour per IP (development only)

Rate limit headers are included in responses:
- `RateLimit-Limit`: Request limit per window
- `RateLimit-Remaining`: Remaining requests in current window
- `RateLimit-Reset`: Time when the rate limit resets

## Authentication

The API uses a simplified authentication system suitable for the POC:
- No passwords required
- Users are created/logged in with email + full name
- No JWT tokens or sessions (stateless)
- User ID must be passed with requests that require user context

## Response Format

All API responses follow this standard format:

```json
{
  "success": true|false,
  "message": "Human readable message",
  "data": {}, // Response data (varies by endpoint)
  "timestamp": "2025-06-14T18:00:00.000Z",
  "pagination": {} // Only for paginated endpoints
}
```

### Error Response Format

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message",
  "errors": ["Array of validation errors"], // For validation failures
  "timestamp": "2025-06-14T18:00:00.000Z"
}
```

## Endpoints

### Health Check

#### GET /health
Check if the server is running.

**Response:**
```json
{
  "success": true,
  "message": "Friendlines Backend is running",
  "data": {
    "status": "healthy",
    "environment": "development",
    "timestamp": "2025-06-14T18:00:00.000Z",
    "uptime": 1234.567,
    "version": "1.0.0"
  }
}
```

### GET /
Root endpoint with API overview and available endpoints.

**Response:**
```json
{
  "success": true,
  "message": "Welcome to Friendlines API",
  "data": {
    "name": "Friendlines Backend",
    "version": "1.0.0",
    "description": "Satirical social news API - Transform everyday updates into newsflashes",
    "environment": "development",
    "endpoints": {
      "health": "GET /health",
      "auth": {
        "login": "POST /api/login",
        "users": "GET /api/users",
        "userProfile": "GET /api/users/:id",
        "checkUser": "POST /api/users/check",
        "userStats": "GET /api/users/stats",
        "follow": "POST /api/users/:id/follow",
        "followers": "GET /api/users/:id/followers",
        "following": "GET /api/users/:id/following",
        "followStatus": "GET /api/users/:id/follow-status"
      },
      "posts": {
        "getAllPosts": "GET /api/posts",
        "getUserPosts": "GET /api/posts/:userId",
        "createPost": "POST /api/posts",
        "updatePost": "PUT /api/posts/:id",
        "deletePost": "DELETE /api/posts/:id",
        "getPost": "GET /api/posts/single/:id",
        "postStats": "GET /api/posts/stats",
        "likePost": "POST /api/posts/:id/like",
        "getLikes": "GET /api/posts/:id/likes",
        "addComment": "POST /api/posts/:id/comments",
        "getComments": "GET /api/posts/:id/comments",
        "deleteComment": "DELETE /api/posts/:postId/comments/:commentId"
      },
      "reset": {
        "resetAll": "POST /api/reset",
        "resetStatus": "GET /api/reset/status",
        "resetUsers": "POST /api/reset/users",
        "resetPosts": "POST /api/reset/posts"
      }
    },
    "timestamp": "2025-06-14T18:00:00.000Z"
  }
}
```

---

## Authentication Endpoints

### POST /api/login
Create a new user or log in an existing user.

**Request Body:**
```json
{
  "fullName": "John Doe",
  "email": "john@example.com"
}
```

**Validation Rules:**
- `fullName`: Required, must contain first and last name, letters/spaces/hyphens/apostrophes only
- `email`: Required, valid email format

**Response (201 for new user, 200 for existing):**
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "id": "u123456789",
    "fullName": "John Doe",
    "email": "john@example.com",
    "createdAt": "2025-06-14T18:00:00.000Z",
    "updatedAt": "2025-06-14T18:00:00.000Z",
    "followersCount": 0,
    "followingCount": 0
  },
  "timestamp": "2025-06-14T18:00:00.000Z"
}
```

**Error Responses:**
- `400`: Validation failed
- `429`: Too many login attempts (rate limited)
- `500`: Server error

---

### GET /api/users/:id
Get user profile by ID.

**Parameters:**
- `id`: User ID (required)

**Response:**
```json
{
  "success": true,
  "message": "User profile retrieved successfully",
  "data": {
    "id": "u123456789",
    "fullName": "John Doe",
    "email": "john@example.com",
    "createdAt": "2025-06-14T18:00:00.000Z",
    "updatedAt": "2025-06-14T18:00:00.000Z",
    "followersCount": 0,
    "followingCount": 0
  },
  "timestamp": "2025-06-14T18:00:00.000Z"
}
```

**Error Responses:**
- `400`: Invalid user ID format
- `404`: User not found
- `500`: Server error

---

### POST /api/users/check
Check if a user exists by email.

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User existence check completed",
  "data": {
    "exists": true,
    "email": "john@example.com"
  },
  "timestamp": "2025-06-14T18:00:00.000Z"
}
```

---

## Posts Endpoints

### GET /api/posts
Get all posts (newsflashes) with pagination.

**Query Parameters:**
- `page`: Page number (default: 1, min: 1)
- `limit`: Items per page (default: 20, max: 100)

**Example:** `GET /api/posts?page=1&limit=10`

**Response:**
```json
{
  "success": true,
  "message": "Posts retrieved successfully",
  "data": [
    {
      "id": "p987654321",
      "userId": "u123456789",
      "userFullName": "John Doe",
      "rawText": "I just got a new dog! 🐶",
      "generatedText": "URGENT: John Doe just got a new dog! 🐶. - Sources confirm.",
      "timestamp": "2025-06-14T18:00:00.000Z",
      "createdAt": "2025-06-14T18:00:00.000Z",
      "updatedAt": "2025-06-14T18:00:00.000Z",
      "likesCount": 0,
      "commentsCount": 0,
      "sharesCount": 0
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalPosts": 1,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPrevPage": false
  },
  "timestamp": "2025-06-14T18:00:00.000Z"
}
```

---

### GET /api/posts/:userId
Get posts by a specific user with pagination.

**Parameters:**
- `userId`: User ID (required)

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

**Response:**
```json
{
  "success": true,
  "message": "Posts by John Doe retrieved successfully",
  "data": [
    {
      "id": "p987654321",
      "userId": "u123456789",
      "userFullName": "John Doe",
      "rawText": "I just got a new dog! 🐶",
      "generatedText": "URGENT: John Doe just got a new dog! 🐶. - Sources confirm.",
      "timestamp": "2025-06-14T18:00:00.000Z",
      "createdAt": "2025-06-14T18:00:00.000Z",
      "updatedAt": "2025-06-14T18:00:00.000Z",
      "likesCount": 0,
      "commentsCount": 0,
      "sharesCount": 0
    }
  ],
  "user": {
    "id": "u123456789",
    "fullName": "John Doe",
    "email": "john@example.com"
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalPosts": 1,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPrevPage": false
  },
  "timestamp": "2025-06-14T18:00:00.000Z"
}
```

**Error Responses:**
- `400`: Invalid user ID format
- `404`: User not found
- `500`: Server error

---

### POST /api/posts
Create a new post with automatic newsflash generation.

**Request Body:**
```json
{
  "rawText": "I just got a new dog! 🐶",
  "userId": "u123456789"
}
```

**Validation Rules:**
- `rawText`: Required, 1-280 characters, no HTML/script tags
- `userId`: Required, valid user ID format

**Response (201):**
```json
{
  "success": true,
  "message": "Post created successfully",
  "data": {
    "id": "p987654321",
    "userId": "u123456789",
    "userFullName": "John Doe",
    "rawText": "I just got a new dog! 🐶",
    "generatedText": "URGENT: John Doe just got a new dog! 🐶. - Sources confirm.",
    "timestamp": "2025-06-14T18:00:00.000Z",
    "createdAt": "2025-06-14T18:00:00.000Z",
    "updatedAt": "2025-06-14T18:00:00.000Z",
    "likesCount": 0,
    "commentsCount": 0,
    "sharesCount": 0
  },
  "timestamp": "2025-06-14T18:00:00.000Z"
}
```

**Error Responses:**
- `400`: Validation failed or newsflash generation failed
- `404`: User not found
- `429`: Too many posts created (rate limited)
- `500`: Server error

---

### GET /api/posts/single/:id
Get a specific post by ID.

**Parameters:**
- `id`: Post ID (required)

**Response:**
```json
{
  "success": true,
  "message": "Post retrieved successfully",
  "data": {
    "id": "p987654321",
    "userId": "u123456789",
    "userFullName": "John Doe",
    "rawText": "I just got a new dog! 🐶",
    "generatedText": "URGENT: John Doe just got a new dog! 🐶. - Sources confirm.",
    "timestamp": "2025-06-14T18:00:00.000Z",
    "createdAt": "2025-06-14T18:00:00.000Z",
    "updatedAt": "2025-06-14T18:00:00.000Z",
    "likesCount": 0,
    "commentsCount": 0,
    "sharesCount": 0
  },
  "timestamp": "2025-06-14T18:00:00.000Z"
}
```

**Error Responses:**
- `400`: Invalid post ID format
- `404`: Post not found
- `500`: Server error

---

### PUT /api/posts/:id
Update an existing post (regenerates newsflash).

**Parameters:**
- `id`: Post ID (required)

**Request Body:**
```json
{
  "rawText": "I just adopted two puppies! 🐶🐶"
}
```

**Validation Rules:**
- `rawText`: Required, 1-280 characters, no HTML/script tags

**Response:**
```json
{
  "success": true,
  "message": "Post updated successfully",
  "data": {
    "id": "p987654321",
    "userId": "u123456789",
    "userFullName": "John Doe",
    "rawText": "I just adopted two puppies! 🐶🐶",
    "generatedText": "URGENT: John Doe just adopted two puppies! 🐶🐶. - Sources confirm.",
    "timestamp": "2025-06-14T18:40:00.000Z",
    "createdAt": "2025-06-14T18:40:00.000Z",
    "updatedAt": "2025-06-14T18:40:00.000Z",
    "likesCount": 0,
    "commentsCount": 0,
    "sharesCount": 0
  },
  "timestamp": "2025-06-14T18:40:00.000Z"
}
```

**Error Responses:**
- `400`: Invalid post ID format or validation failed
- `404`: Post not found or post owner not found
- `429`: Too many post updates (rate limited)
- `500`: Server error

---

### DELETE /api/posts/:id
Delete a post.

**Parameters:**
- `id`: Post ID (required)

**Response:**
```json
{
  "success": true,
  "message": "Post deleted successfully",
  "data": {
    "id": "p987654321",
    "deletedAt": "2025-06-14T18:45:00.000Z"
  },
  "timestamp": "2025-06-14T18:45:00.000Z"
}
```

**Error Responses:**
- `400`: Invalid post ID format
- `404`: Post not found
- `500`: Server error

---

## Social Features - Likes

### POST /api/posts/:id/like
Toggle like on a post (like if not liked, unlike if already liked).

**Parameters:**
- `id`: Post ID (required)

**Request Body:**
```json
{
  "userId": "u123456789"
}
```

**Validation Rules:**
- `userId`: Required, valid user ID format

**Response:**
```json
{
  "success": true,
  "message": "Post liked successfully",
  "data": {
    "postId": "p987654321",
    "userId": "u123456789",
    "isLiked": true,
    "likesCount": 1,
    "action": "liked"
  },
  "timestamp": "2025-06-14T18:00:00.000Z"
}
```

**Response for Unlike:**
```json
{
  "success": true,
  "message": "Post unliked successfully",
  "data": {
    "postId": "p987654321",
    "userId": "u123456789",
    "isLiked": false,
    "likesCount": 0,
    "action": "unliked"
  },
  "timestamp": "2025-06-14T18:00:00.000Z"
}
```

**Error Responses:**
- `400`: Invalid post ID format or missing user ID
- `404`: Post not found or user not found
- `500`: Server error

---

### GET /api/posts/:id/likes
Get all likes for a specific post.

**Parameters:**
- `id`: Post ID (required)

**Response:**
```json
{
  "success": true,
  "message": "Post likes retrieved successfully",
  "data": {
    "postId": "p987654321",
    "likesCount": 2,
    "likes": [
      {
        "userId": "u123456789",
        "fullName": "John Doe",
        "email": "john@example.com"
      },
      {
        "userId": "u987654321",
        "fullName": "Jane Smith",
        "email": "jane@example.com"
      }
    ]
  },
  "timestamp": "2025-06-14T18:00:00.000Z"
}
```

**Error Responses:**
- `400`: Invalid post ID format
- `404`: Post not found
- `500`: Server error

---

## Social Features - Comments

### POST /api/posts/:id/comments
Add a comment to a specific post.

**Parameters:**
- `id`: Post ID (required)

**Request Body:**
```json
{
  "userId": "u123456789",
  "text": "Great post! Thanks for sharing."
}
```

**Validation Rules:**
- `userId`: Required, valid user ID format
- `text`: Required, 1-500 characters

**Response:**
```json
{
  "success": true,
  "message": "Comment added successfully",
  "data": {
    "postId": "p987654321",
    "comment": {
      "id": "c123456789",
      "userId": "u123456789",
      "text": "Great post! Thanks for sharing.",
      "timestamp": "2025-06-14T18:00:00.000Z",
      "createdAt": "2025-06-14T18:00:00.000Z",
      "userFullName": "John Doe"
    },
    "commentsCount": 1
  },
  "timestamp": "2025-06-14T18:00:00.000Z"
}
```

**Error Responses:**
- `400`: Missing required fields (userId, text) or text too long (>500 chars)
- `404`: Post not found or user not found
- `500`: Server error

---

### GET /api/posts/:id/comments
Get all comments for a specific post with pagination.

**Parameters:**
- `id`: Post ID (required)

**Query Parameters:**
- `page`: Page number (optional, default: 1)
- `limit`: Number of comments per page (optional, default: 20, max: 50)

**Response:**
```json
{
  "success": true,
  "message": "Post comments retrieved successfully",
  "data": {
    "postId": "p987654321",
    "commentsCount": 2,
    "comments": [
      {
        "id": "c987654321",
        "userId": "u987654321",
        "userFullName": "Jane Smith",
        "text": "This is amazing!",
        "timestamp": "2025-06-14T18:05:00.000Z",
        "createdAt": "2025-06-14T18:05:00.000Z"
      },
      {
        "id": "c123456789",
        "userId": "u123456789",
        "userFullName": "John Doe",
        "text": "Great post! Thanks for sharing.",
        "timestamp": "2025-06-14T18:00:00.000Z",
        "createdAt": "2025-06-14T18:00:00.000Z"
      }
    ]
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalComments": 2,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPrevPage": false
  },
  "timestamp": "2025-06-14T18:00:00.000Z"
}
```

**Error Responses:**
- `400`: Invalid post ID format or pagination parameters
- `404`: Post not found
- `500`: Server error

---

### DELETE /api/posts/:postId/comments/:commentId
Delete a comment from a post. Only the comment author can delete their own comments.

**Parameters:**
- `postId`: Post ID (required)
- `commentId`: Comment ID (required)

**Request Body:**
```json
{
  "userId": "u123456789"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Comment deleted successfully",
  "data": {
    "postId": "p987654321",
    "commentId": "c123456789",
    "commentsCount": 0
  },
  "timestamp": "2025-06-14T18:00:00.000Z"
}
```

**Error Responses:**
- `400`: Missing userId or invalid ID formats
- `403`: Unauthorized (can only delete own comments)
- `404`: Post not found, comment not found, or user not found
- `500`: Server error

---

## Social Features - Follow System

### POST /api/users/:id/follow
Follow or unfollow a user (toggle functionality).

**Parameters:**
- `id`: Target user ID to follow/unfollow (required)

**Request Body:**
```json
{
  "userId": "u123456789"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User followed successfully",
  "data": {
    "targetUserId": "u987654321",
    "currentUserId": "u123456789",
    "isFollowing": true,
    "followersCount": 1,
    "followingCount": 1,
    "action": "followed"
  },
  "timestamp": "2025-06-14T18:00:00.000Z"
}
```

**Response for Unfollow:**
```json
{
  "success": true,
  "message": "User unfollowed successfully",
  "data": {
    "targetUserId": "u987654321",
    "currentUserId": "u123456789",
    "isFollowing": false,
    "followersCount": 0,
    "followingCount": 0,
    "action": "unfollowed"
  },
  "timestamp": "2025-06-14T18:00:00.000Z"
}
```

**Error Responses:**
- `400`: Missing userId, invalid ID formats, or cannot follow yourself
- `404`: Target user not found or current user not found
- `500`: Server error

---

### GET /api/users/:id/followers
Get list of users following a specific user with pagination.

**Parameters:**
- `id`: User ID (required)

**Query Parameters:**
- `page`: Page number (optional, default: 1)
- `limit`: Number of followers per page (optional, default: 20, max: 50)

**Response:**
```json
{
  "success": true,
  "message": "User followers retrieved successfully",
  "data": {
    "userId": "u987654321",
    "userName": "Jane Smith",
    "followersCount": 2,
    "followers": [
      {
        "id": "u123456789",
        "fullName": "John Doe",
        "email": "john@example.com",
        "followersCount": 0,
        "followingCount": 1
      },
      {
        "id": "u555666777",
        "fullName": "Bob Wilson",
        "email": "bob@example.com",
        "followersCount": 1,
        "followingCount": 2
      }
    ]
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalFollowers": 2,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPrevPage": false
  },
  "timestamp": "2025-06-14T18:00:00.000Z"
}
```

**Error Responses:**
- `400`: Invalid user ID format or pagination parameters
- `404`: User not found
- `500`: Server error

---

### GET /api/users/:id/following
Get list of users that a specific user is following with pagination.

**Parameters:**
- `id`: User ID (required)

**Query Parameters:**
- `page`: Page number (optional, default: 1)
- `limit`: Number of following per page (optional, default: 20, max: 50)

**Response:**
```json
{
  "success": true,
  "message": "User following retrieved successfully",
  "data": {
    "userId": "u123456789",
    "userName": "John Doe",
    "followingCount": 1,
    "following": [
      {
        "id": "u987654321",
        "fullName": "Jane Smith",
        "email": "jane@example.com",
        "followersCount": 2,
        "followingCount": 0
      }
    ]
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalFollowing": 1,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPrevPage": false
  },
  "timestamp": "2025-06-14T18:00:00.000Z"
}
```

**Error Responses:**
- `400`: Invalid user ID format or pagination parameters
- `404`: User not found
- `500`: Server error

---

### GET /api/users/:id/follow-status
Check follow relationship status between two users.

**Parameters:**
- `id`: Target user ID (required)

**Query Parameters:**
- `userId`: Current user ID (required)

**Example Request:**
```
GET /api/users/u987654321/follow-status?userId=u123456789
```

**Response:**
```json
{
  "success": true,
  "message": "Follow status retrieved successfully",
  "data": {
    "targetUserId": "u987654321",
    "targetUserName": "Jane Smith",
    "currentUserId": "u123456789",
    "currentUserName": "John Doe",
    "isFollowing": true,
    "isFollowedBy": false,
    "mutualFollow": false
  },
  "timestamp": "2025-06-14T18:00:00.000Z"
}
```

**Error Responses:**
- `400`: Missing userId query parameter or invalid ID formats
- `404`: Target user not found or current user not found
- `500`: Server error

---

## Development Endpoints

*These endpoints are only available when `NODE_ENV=development`*

### GET /api/users
Get all users (admin/development only).

**Response:**
```json
{
  "success": true,
  "message": "All users retrieved successfully",
  "data": [
    {
      "id": "u123456789",
      "fullName": "John Doe",
      "email": "john@example.com",
      "createdAt": "2025-06-14T18:00:00.000Z",
      "updatedAt": "2025-06-14T18:00:00.000Z",
      "followersCount": 0,
      "followingCount": 0
    }
  ],
  "count": 1,
  "timestamp": "2025-06-14T18:00:00.000Z"
}
```

---

### GET /api/users/stats
Get user statistics.

**Response:**
```json
{
  "success": true,
  "message": "User statistics retrieved successfully",
  "data": {
    "totalUsers": 2,
    "totalPosts": 3,
    "postsPerUser": "1.50",
    "recentUsers": [
      {
        "id": "u123456789",
        "fullName": "John Doe",
        "email": "john@example.com",
        "createdAt": "2025-06-14T18:00:00.000Z"
      }
    ]
  },
  "timestamp": "2025-06-14T18:00:00.000Z"
}
```

---

### GET /api/posts/stats
Get post statistics.

**Response:**
```json
{
  "success": true,
  "message": "Post statistics retrieved successfully",
  "data": {
    "totalPosts": 2,
    "totalUsers": 2,
    "postsLast24Hours": 2,
    "postsLastWeek": 2,
    "averagePostLength": 25,
    "mostActiveUser": {
      "userId": "u123456789",
      "fullName": "John Doe",
      "postCount": 1
    },
    "recentPosts": [
      {
        "id": "p987654321",
        "userId": "u123456789",
        "rawText": "I just got a new dog! 🐶",
        "createdAt": "2025-06-14T18:00:00.000Z"
      }
    ]
  },
  "timestamp": "2025-06-14T18:00:00.000Z"
}
```

---

### POST /api/reset
Clear all data (development only).

**Response:**
```json
{
  "success": true,
  "message": "All data has been reset successfully",
  "data": {
    "usersCleared": true,
    "postsCleared": true,
    "resetAt": "2025-06-14T18:50:00.000Z"
  },
  "timestamp": "2025-06-14T18:50:00.000Z"
}
```

---

### GET /api/reset/status
Get reset endpoint status and current data overview.

**Response:**
```json
{
  "success": true,
  "message": "Reset status retrieved successfully",
  "data": {
    "environment": "development",
    "resetAvailable": true,
    "currentData": {
      "totalUsers": 0,
      "totalPosts": 0,
      "isEmpty": true
    },
    "usage": {
      "endpoint": "POST /api/reset",
      "description": "Clears all users and posts data",
      "warning": "This action cannot be undone"
    }
  },
  "timestamp": "2025-06-14T18:50:00.000Z"
}
```

---

### POST /api/reset/users
Clear only users data (development only).

**Response:**
```json
{
  "success": true,
  "message": "Users data has been reset successfully",
  "data": {
    "usersCleared": true,
    "resetAt": "2025-06-14T18:50:00.000Z"
  },
  "timestamp": "2025-06-14T18:50:00.000Z"
}
```

---

### POST /api/reset/posts
Clear only posts data (development only).

**Response:**
```json
{
  "success": true,
  "message": "Posts data has been reset successfully",
  "data": {
    "postsCleared": true,
    "resetAt": "2025-06-14T18:50:00.000Z"
  },
  "timestamp": "2025-06-14T18:50:00.000Z"
}
```

---

## Newsflash Generation

The API automatically transforms first-person updates into third-person news-style announcements:

### Transformation Rules

1. **Pronoun Conversion**: "I" → "John Doe", "my" → "John Doe's"
2. **Verb Tense**: Present → Past ("am working" → "was working") 
3. **News Prefixes**: BREAKING, URGENT, EXCLUSIVE, DEVELOPING, etc.
4. **Smart Prefix Selection**:
   - EXCLUSIVE: Contains "secret" or "surprise"
   - URGENT: Contains "just" or "finally"  
   - DEVELOPING: Contains "working" or "starting"
   - BREAKING: Default

### Examples

| Input | Output |
|-------|--------|
| "I just got a new job!" | "URGENT: John Doe just got a new job!" |
| "I am working on a secret project 🚀" | "EXCLUSIVE: John Doe was working on a secret project 🚀." |
| "I'm eating pizza 🍕" | "BREAKING: John Doe is eating pizza 🍕." |

---

## Data Structure

### Social Features

All API responses now include social features:

**Posts include social metrics:**
- `likesCount: 0` - Number of likes on the post
- `commentsCount: 0` - Number of comments on the post  
- `sharesCount: 0` - Number of shares (reserved for future use)

**Users include social metrics:**
- `followersCount: 0` - Number of users following this user
- `followingCount: 0` - Number of users this user is following

### Backend Data Storage

**User Data Model:**
```json
{
  "id": "u123456789",
  "fullName": "John Doe",
  "email": "john@example.com",
  "createdAt": "2025-06-14T18:00:00.000Z",
  "updatedAt": "2025-06-14T18:00:00.000Z",
  "followers": ["u987654321"],
  "following": ["u555666777"],
  "followersCount": 1,
  "followingCount": 1
}
```

**Post Data Model:**
```json
{
  "id": "p987654321",
  "userId": "u123456789",
  "rawText": "I just got a new dog! 🐶",
  "generatedText": "URGENT: John Doe just got a new dog! 🐶.",
  "timestamp": "2025-06-14T18:00:00.000Z",
  "createdAt": "2025-06-14T18:00:00.000Z",
  "updatedAt": "2025-06-14T18:00:00.000Z",
  "likes": ["u987654321", "u555666777"],
  "comments": [
    {
      "id": "c123456789",
      "userId": "u987654321",
      "text": "Great post!",
      "timestamp": "2025-06-14T18:05:00.000Z",
      "createdAt": "2025-06-14T18:05:00.000Z"
    }
  ],
  "likesCount": 2,
  "commentsCount": 1,
  "sharesCount": 0
}
```

### Data Storage Notes
- Posts contain `likes: []` array of user IDs who liked the post
- Posts contain `comments: []` array of comment objects
- Users contain `followers: []` array of user IDs who follow this user  
- Users contain `following: []` array of user IDs this user follows
- All counts are denormalized for optimal performance
- JSON files are used for POC simplicity (`data/users.json`, `data/posts.json`)

---

## HTTP Status Codes

- **200 OK**: Successful GET, PUT, DELETE
- **201 Created**: Successful POST (resource created)
- **400 Bad Request**: Invalid request data/format
- **403 Forbidden**: Access denied (production endpoints in dev mode)
- **404 Not Found**: Resource not found
- **413 Payload Too Large**: Request body too large
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Server error

---

## Security & Validation

### Input Validation
- All endpoints validate input data using middleware
- Email format validation using regex
- Full name validation (letters, spaces, hyphens, apostrophes only)
- Post text validation (1-280 characters, no script tags)
- Comment text validation (1-500 characters)
- ID format validation (alphanumeric, underscores, hyphens)

### Security Headers
- Helmet.js for security headers
- Content Security Policy configured
- CORS configured with allowed origins
- Request size limits (10MB max)

### Rate Limiting
- Express-rate-limit for API protection
- Different limits for different endpoint types
- IP-based tracking
- Graceful error responses with retry information

### Content Security
- XSS protection through input sanitization
- HTML/script tag filtering
- Event handler removal from user input

---

## Frontend Integration Tips

### User Session Management
```javascript
// Store user data after login
const loginUser = async (fullName, email) => {
  const response = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullName, email })
  });
  
  const result = await response.json();
  if (result.success) {
    // Store user data (localStorage, AsyncStorage, etc.)
    localStorage.setItem('user', JSON.stringify(result.data));
    return result.data;
  }
  throw new Error(result.message);
};
```

### Creating Posts
```javascript
const createPost = async (rawText, userId) => {
  const response = await fetch('/api/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rawText, userId })
  });
  
  const result = await response.json();
  if (result.success) {
    return result.data; // Includes generated newsflash
  }
  throw new Error(result.message);
};
```

### Social Features Integration
```javascript
// Like/Unlike a post
const toggleLike = async (postId, userId) => {
  const response = await fetch(`/api/posts/${postId}/like`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId })
  });
  
  const result = await response.json();
  if (result.success) {
    return result.data; // Contains isLiked, likesCount, action
  }
  throw new Error(result.message);
};

// Add a comment
const addComment = async (postId, userId, text) => {
  const response = await fetch(`/api/posts/${postId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, text })
  });
  
  const result = await response.json();
  if (result.success) {
    return result.data; // Contains comment data and updated count
  }
  throw new Error(result.message);
};

// Follow/Unfollow a user
const toggleFollow = async (targetUserId, currentUserId) => {
  const response = await fetch(`/api/users/${targetUserId}/follow`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: currentUserId })
  });
  
  const result = await response.json();
  if (result.success) {
    return result.data; // Contains follow status and counts
  }
  throw new Error(result.message);
};
```

### Pagination Handling
```javascript
const loadPosts = async (page = 1, limit = 20) => {
  const response = await fetch(`/api/posts?page=${page}&limit=${limit}`);
  const result = await response.json();
  
  if (result.success) {
    return {
      posts: result.data,
      pagination: result.pagination
    };
  }
  throw new Error(result.message);
};
```

### Error Handling
```javascript
const handleApiError = (error) => {
  if (error.status === 429) {
    // Rate limited
    return 'Too many requests. Please wait and try again.';
  } else if (error.status === 400) {
    // Validation error
    return error.errors ? error.errors.join(', ') : error.message;
  } else if (error.status >= 500) {
    // Server error
    return 'Server error. Please try again later.';
  }
  return error.message || 'An unexpected error occurred.';
};
```

---

## Development Utilities

### Testing the API

#### Health Check
```bash
curl http://localhost:3000/health
```

#### User Management
```bash
# Create user
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"fullName": "John Doe", "email": "john@example.com"}'

# Get user profile
curl http://localhost:3000/api/users/USER_ID_HERE

# Get all users (dev only)
curl http://localhost:3000/api/users
```

#### Post Management
```bash
# Create post
curl -X POST http://localhost:3000/api/posts \
  -H "Content-Type: application/json" \
  -d '{"rawText": "I just got a new dog! 🐶", "userId": "USER_ID_HERE"}'

# Get all posts
curl http://localhost:3000/api/posts

# Get posts by user
curl http://localhost:3000/api/posts/USER_ID_HERE

# Update post
curl -X PUT http://localhost:3000/api/posts/POST_ID_HERE \
  -H "Content-Type: application/json" \
  -d '{"rawText": "Updated post text"}'
```

#### Social Features
```bash
# Like a post
curl -X POST http://localhost:3000/api/posts/POST_ID_HERE/like \
  -H "Content-Type: application/json" \
  -d '{"userId": "USER_ID_HERE"}'

# Get likes for a post
curl http://localhost:3000/api/posts/POST_ID_HERE/likes

# Add comment
curl -X POST http://localhost:3000/api/posts/POST_ID_HERE/comments \
  -H "Content-Type: application/json" \
  -d '{"userId": "USER_ID_HERE", "text": "Great post!"}'

# Get comments
curl http://localhost:3000/api/posts/POST_ID_HERE/comments

# Follow user
curl -X POST http://localhost:3000/api/users/TARGET_USER_ID/follow \
  -H "Content-Type: application/json" \
  -d '{"userId": "CURRENT_USER_ID"}'

# Get followers
curl http://localhost:3000/api/users/USER_ID_HERE/followers

# Get following
curl http://localhost:3000/api/users/USER_ID_HERE/following
```

#### Development Tools
```bash
# Reset all data (development only)
curl -X POST http://localhost:3000/api/reset

# Get reset status
curl http://localhost:3000/api/reset/status

# Get statistics
curl http://localhost:3000/api/users/stats
curl http://localhost:3000/api/posts/stats
```

### Environment Setup
Make sure your frontend can handle:
- CORS requests to `http://localhost:3000`
- JSON request/response format
- Rate limiting responses (429 status codes)
- Proper error handling for all status codes
- Social features (likes, comments, follows)
- Pagination for lists

### CORS Configuration
The backend is configured to accept requests from:
- `http://localhost:3000`
- `http://localhost:19006` (Expo development server)
- `exp://localhost:19000` (Expo development server)
- All origins in development mode

---

**Need help?** Check the server logs or contact the backend team!

The API is fully functional with all social features implemented including likes, comments, follows, and comprehensive user/post management. All endpoints are rate-limited and validated for security. 