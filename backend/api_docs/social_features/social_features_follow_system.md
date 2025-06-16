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
