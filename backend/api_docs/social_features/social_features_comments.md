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
