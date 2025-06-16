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
