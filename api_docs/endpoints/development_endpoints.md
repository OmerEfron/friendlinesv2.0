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
