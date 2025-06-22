# Enhanced Social Features

## GET /api/social/users/:id/mutual-friends
Get mutual friends between two users with pagination support.

**Parameters:**
- `id`: Target user ID (required)

**Query Parameters:**
- `userId`: Current user ID (required)
- `page`: Page number (optional, default: 1)
- `limit`: Number of friends per page (optional, default: 20, max: 50)

**Response:**
```json
{
  "success": true,
  "message": "Mutual friends retrieved successfully",
  "data": [
    {
      "id": "u555666777",
      "fullName": "Bob Wilson",
      "email": "bob@example.com",
      "followersCount": 10,
      "followingCount": 15,
      "avatar": "/uploads/avatars/u555666777.jpg",
      "mutualConnectionsSince": "2025-06-10T12:00:00.000Z"
    },
    {
      "id": "u888999000",
      "fullName": "Alice Brown", 
      "email": "alice@example.com",
      "followersCount": 8,
      "followingCount": 12,
      "avatar": "/uploads/avatars/u888999000.jpg",
      "mutualConnectionsSince": "2025-06-12T15:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalMutualFriends": 2,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPrevPage": false
  },
  "timestamp": "2025-06-14T18:00:00.000Z"
}
```

**Error Responses:**
- `400`: Invalid user ID format or pagination parameters
- `404`: One or both users not found
- `500`: Server error

**Example:**
```bash
curl -X GET "http://localhost:3000/api/social/users/u987654321/mutual-friends?userId=u123456789&page=1&limit=10"
```

---

## GET /api/social/users/:id/friend-suggestions
Get friend suggestions based on mutual connections and network analysis.

**Parameters:**
- `id`: User ID (required)

**Query Parameters:**
- `limit`: Number of suggestions (optional, default: 10, max: 20)

**Response:**
```json
{
  "success": true,
  "message": "Friend suggestions retrieved successfully",
  "data": [
    {
      "id": "u111222333",
      "fullName": "Charlie Davis",
      "email": "charlie@example.com",
      "followersCount": 25,
      "followingCount": 30,
      "avatar": "/uploads/avatars/u111222333.jpg",
      "mutualFriends": 3,
      "mutualFriendsNames": ["Bob Wilson", "Alice Brown", "David Lee"],
      "suggestionScore": 0.85,
      "suggestionReason": "mutual_friends"
    },
    {
      "id": "u444555666",
      "fullName": "Emma Johnson",
      "email": "emma@example.com", 
      "followersCount": 18,
      "followingCount": 22,
      "avatar": "/uploads/avatars/u444555666.jpg",
      "mutualFriends": 2,
      "mutualFriendsNames": ["Bob Wilson", "Charlie Davis"],
      "suggestionScore": 0.72,
      "suggestionReason": "mutual_friends"
    }
  ],
  "metadata": {
    "totalSuggestions": 2,
    "algorithm": "mutual_friends_v1",
    "lastUpdated": "2025-06-14T17:45:00.000Z"
  },
  "timestamp": "2025-06-14T18:00:00.000Z"
}
```

**Error Responses:**
- `400`: Invalid user ID format or limit parameter
- `404`: User not found
- `500`: Server error

**Example:**
```bash
curl -X GET "http://localhost:3000/api/social/users/u123456789/friend-suggestions?limit=5"
```

---

## POST /api/social/users/follow-status
Get follow status for multiple users in a single request (bulk operation).

**Request Body:**
```json
{
  "userId": "u123456789",
  "targetUserIds": ["u987654321", "u555666777", "u888999000"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Bulk follow status retrieved successfully",
  "data": {
    "currentUserId": "u123456789",
    "results": [
      {
        "userId": "u987654321",
        "userName": "Jane Smith",
        "isFollowing": true,
        "isFollowedBy": false,
        "mutualFollow": false,
        "followersCount": 20,
        "avatar": "/uploads/avatars/u987654321.jpg"
      },
      {
        "userId": "u555666777",
        "userName": "Bob Wilson",
        "isFollowing": false,
        "isFollowedBy": true,
        "mutualFollow": false,
        "followersCount": 10,
        "avatar": "/uploads/avatars/u555666777.jpg"
      },
      {
        "userId": "u888999000",
        "userName": "Alice Brown",
        "isFollowing": true,
        "isFollowedBy": true,
        "mutualFollow": true,
        "followersCount": 8,
        "avatar": "/uploads/avatars/u888999000.jpg"
      }
    ],
    "invalidUserIds": [],
    "totalQueried": 3,
    "totalValid": 3
  },
  "timestamp": "2025-06-14T18:00:00.000Z"
}
```

**Validation Rules:**
- `userId`: Required, valid user ID format
- `targetUserIds`: Required, array of valid user IDs, max 50 IDs per request
- Duplicate IDs are automatically removed
- Invalid IDs are reported in `invalidUserIds` array

**Error Responses:**
- `400`: Invalid user ID format, missing fields, or validation failed
- `404`: Current user not found
- `500`: Server error

**Example:**
```bash
curl -X POST http://localhost:3000/api/social/users/follow-status \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "u123456789",
    "targetUserIds": ["u987654321", "u555666777"]
  }'
```

---

## Algorithm Details

### Mutual Friends
- Calculates intersection of following lists between two users
- Excludes the users themselves from the result
- Sorted by most recent mutual connection
- Includes timestamps for when mutual connections were established

### Friend Suggestions
- **Primary Algorithm:** Mutual friends analysis
- **Scoring:** Based on number of mutual connections and network distance
- **Exclusions:** Already followed users, blocked users, private accounts
- **Ranking:** Suggestion score from 0.0 to 1.0 (higher = better match)
- **Refresh Rate:** Suggestions updated every 24 hours

### Rate Limiting
- Mutual friends: Standard rate limits apply (same as other API endpoints)
- Friend suggestions: Cached for 1 hour per user to improve performance
- Bulk follow status: Limited to 50 user IDs per request

--- 