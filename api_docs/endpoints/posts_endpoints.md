## Posts Endpoints

### GET /api/posts
Get all posts (newsflashes) with pagination and audience filtering.

**Query Parameters:**
- `page`: Page number (default: 1, min: 1)
- `limit`: Items per page (default: 20, max: 100)
- `currentUserId`: (Optional) Current user ID for audience filtering

**Example:** `GET /api/posts?page=1&limit=10&currentUserId=u123456789`

**Note:** If `currentUserId` is provided, posts will be filtered based on audience targeting and friendship relationships. Without it, only public posts (for backward compatibility) will be shown.

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
      "audienceType": "friends",
      "targetFriendId": null,
      "groupIds": [],
      "visibility": "friends_only",
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
Get posts by a specific user with pagination and audience filtering.

**Parameters:**
- `userId`: User ID (required)

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `currentUserId`: (Optional) Current user ID for audience filtering
- `includeFriends`: (Optional) Include friends' posts when set to "true" (default: false)

**Examples:**
- Get only user's posts: `GET /api/posts/u123456789`
- Get user's posts and friends' posts: `GET /api/posts/u123456789?includeFriends=true`
- With pagination and audience filtering: `GET /api/posts/u123456789?includeFriends=true&page=1&limit=10&currentUserId=u123456789`

**Note:** 
- Posts will be filtered based on audience targeting. Users can only see posts they're authorized to view.
- When `includeFriends=true`, the endpoint returns posts from both the target user and their friends, sorted by timestamp (newest first).
- The `includeFriends` flag respects the same audience targeting rules - you'll only see friends' posts that you're authorized to view.

**Response:**
```json
{
  "success": true,
  "message": "Posts by John Doe and their friends retrieved successfully",
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
      "audienceType": "friends",
      "targetFriendId": null,
      "groupIds": [],
      "visibility": "friends_only",
      "likesCount": 0,
      "commentsCount": 0,
      "sharesCount": 0
    },
    {
      "id": "p987654322",
      "userId": "u987654321",
      "userFullName": "Jane Smith",
      "rawText": "Great coffee this morning! ☕",
      "generatedText": "BREAKING: Jane Smith reports excellent coffee quality! ☕",
      "timestamp": "2025-06-14T17:30:00.000Z",
      "createdAt": "2025-06-14T17:30:00.000Z",
      "updatedAt": "2025-06-14T17:30:00.000Z",
      "audienceType": "friends",
      "targetFriendId": null,
      "groupIds": [],
      "visibility": "friends_only",

      "sharesCount": 0
    }
  ],
  "user": {
    "id": "u123456789",
    "fullName": "John Doe",
    "email": "john@example.com"
  },
  "includeFriends": true,
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalPosts": 2,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPrevPage": false
  },
  "timestamp": "2025-06-14T18:00:00.000Z"
}
```

**Response Fields:**
- `includeFriends`: Boolean indicating whether friends' posts were included in the results
- `userFullName`: The actual author's name for each post (since posts can come from different users when `includeFriends=true`)

**Error Responses:**
- `400`: Invalid user ID format
- `404`: User not found
- `422`: Unprocessable Entity (validation errors)
- `500`: Server error

---

### POST /api/posts
Create a new post with automatic newsflash generation and audience targeting.

**Request Body:**
```json
{
  "rawText": "I just got a new dog! 🐶",
  "userId": "u123456789",
  "audienceType": "friends",
  "targetFriendId": null,
  "groupIds": [],
  "generate": true,
  "tone": "satirical",
  "length": "short",
  "temperature": 0.7
}
```

**Validation Rules:**
- `rawText`: Required, 1-280 characters, no HTML/script tags
- `userId`: Required, valid user ID format
- `audienceType`: Required, one of: "friends", "groups", "friend"
- `targetFriendId`: Required if audienceType is "friend", must be a valid friend
- `groupIds`: Required if audienceType is "groups", max 5 group IDs, no duplicates
- `generate`: Optional, boolean (default: true) - when false, skips newsflash generation and uses raw text as generated text
- `tone`: Optional, newsflash tone (e.g., "satirical", "serious", "humorous", "sarcastic")
- `length`: Optional, "short" or "long" (affects GPT generation)
- `temperature`: Optional, 0-2 (GPT creativity level, default: 0.7)

**Audience Types:**
1. **"friends"**: Post visible to all user's friends
   - `targetFriendId` and `groupIds` should not be provided
   - Sets visibility to "friends_only"

2. **"friend"**: Post visible to a specific friend only
   - `targetFriendId` is required and must be an actual friend
   - `groupIds` should not be provided
   - Sets visibility to "friend_only"

3. **"groups"**: Post visible to members of specified groups
   - `groupIds` array is required with at least one group
   - User must be a member of all specified groups
   - `targetFriendId` should not be provided
   - Sets visibility to "groups_only"

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
    "audienceType": "friends",
    "targetFriendId": null,
    "groupIds": [],
    "visibility": "friends_only",
    "likesCount": 0,
    "commentsCount": 0,
    "sharesCount": 0
  },
  "timestamp": "2025-06-14T18:00:00.000Z"
}
```

**Newsflash Generation:**
- **Default Behavior** (`generate: true` or omitted):
  - **Development Mode**: Always uses deterministic generation for consistency
  - **Production Mode**: Uses OpenAI GPT if `OPENAI_API_KEY` environment variable is set
  - Falls back to deterministic generation if GPT fails or API key is missing
  - GPT generation supports configurable tone, length, and temperature
  - Deterministic generation uses rule-based text transformation
- **Skip Generation** (`generate: false`):
  - Uses the raw text as the generated text without any transformation
  - Useful for posts where users want to keep their original text as-is
  - Ignores tone, length, and temperature parameters

**Push Notifications:**
- **Friends posts**: Notify all user's friends
- **Friend posts**: Notify the specific target friend
- **Group posts**: Notify all group members (excluding author)

**Error Responses:**
- `400`: Validation failed or newsflash generation failed
- `403`: Access denied (not friends with target, or not member of groups)
- `404`: User not found or target friend not found
- `422`: Unprocessable Entity (semantic validation errors)
- `429`: Too many posts created (rate limited)
- `500`: Server error

---

### POST /api/posts/generate-newsflash
Generate a newsflash preview using GPT (without creating a post).

**Request Body:**
```json
{
  "rawText": "I just got a new dog! 🐶",
  "userId": "u123456789",
  "tone": "satirical",
  "length": "short",
  "temperature": 0.7
}
```

**Validation Rules:**
- `rawText`: Required, 1-280 characters, no HTML/script tags
- `userId`: Required, valid user ID format
- `tone`: Optional, newsflash tone (default: "satirical")
- `length`: Optional, "short" or "long" (default: "short")
- `temperature`: Optional, 0-2 (GPT creativity level, default: 0.7)

**Response (200):**
```json
{
  "success": true,
  "message": "Newsflash generated successfully",
  "data": {
    "rawText": "I just got a new dog! 🐶",
    "generatedText": "BREAKING: John Doe just adopted an adorable new canine companion! 🐶",
    "method": "gpt",
    "user": {
      "id": "u123456789",
      "fullName": "John Doe"
    },
    "options": {
      "tone": "satirical",
      "length": "short",
      "temperature": 0.7
    }
  },
  "timestamp": "2025-06-14T18:00:00.000Z"
}
```

**Generation Methods:**
- `"gpt"`: Generated using OpenAI GPT with provided options
- `"deterministic"`: Generated using rule-based transformation (fallback)

**Error Responses:**
- `400`: Invalid request format
- `404`: User not found
- `422`: Validation failed or newsflash generation failed
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
- `400`: Invalid post ID format
- `404`: Post not found or post owner not found
- `422`: Validation failed
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
