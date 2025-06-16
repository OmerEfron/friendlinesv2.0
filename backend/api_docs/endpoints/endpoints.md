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
      "groups": {
        "createGroup": "POST /api/groups/:userId",
        "inviteToGroup": "POST /api/groups/:id/invite",
        "acceptInvitation": "POST /api/groups/:id/accept",
        "leaveGroup": "POST /api/groups/:id/leave",
        "getGroup": "GET /api/groups/:id",
        "getUserGroups": "GET /api/groups/user/:userId"
      },
      "notifications": {
        "registerPushToken": "POST /api/users/:id/push-token"
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

## Detailed Documentation

For detailed endpoint documentation, see the specific files:

- **[Authentication Endpoints](./authentication_endpoints.md)** - User login, profile management, and social features
- **[Posts Endpoints](./posts_endpoints.md)** - Post creation, management, likes, and comments  
- **[Groups Endpoints](./groups_endpoints.md)** - Group management, invitations, and membership
- **[Notification Endpoints](./notification_endpoints.md)** - Push notification registration and automatic delivery
- **[Development Endpoints](./development_endpoints.md)** - Development and testing utilities

---
