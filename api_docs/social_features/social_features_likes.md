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
