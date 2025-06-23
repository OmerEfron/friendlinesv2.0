# Post Audience Targeting - Live Demo

> **Note**: This document is part of the [project changelog](../CHANGELOG.md). For current API documentation, see [Post Audience Targeting](../../api_docs/social_features/post_audience_targeting.md).

## 🎯 Overview
The new audience targeting feature allows users to post to:
1. **All friends** (`audienceType: "friends"`)
2. **Specific groups** (`audienceType: "groups"`)  
3. **A single friend** (`audienceType: "friend"`)

## 📝 API Usage Examples

### 1. Creating a User (Login/Register)
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Alice Smith",
    "email": "alice@example.com"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "User logged in successfully",
  "data": {
    "id": "u123456789",
    "fullName": "Alice Smith", 
    "email": "alice@example.com"
  }
}
```

### 2. Post to All Friends
```bash
curl -X POST http://localhost:3000/api/posts \
  -H "Content-Type: application/json" \
  -d '{
    "rawText": "Just finished my morning workout! 💪",
    "userId": "u123456789",
    "audienceType": "friends"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Post created successfully",
  "data": {
    "id": "p987654321",
    "userId": "u123456789",
    "userFullName": "Alice Smith",
    "rawText": "Just finished my morning workout! 💪",
    "generatedText": "BREAKING: Alice Smith just finished morning workout! 💪. Stay tuned.",
    "audienceType": "friends",
    "visibility": "friends_only",
    "targetFriendId": null,
    "groupIds": [],
    "timestamp": "2025-06-23T15:00:00.000Z"
  }
}
```

### 3. Post to a Specific Friend
```bash
curl -X POST http://localhost:3000/api/posts \
  -H "Content-Type: application/json" \
  -d '{
    "rawText": "Happy birthday! Hope you have an amazing day! 🎂",
    "userId": "u123456789",
    "audienceType": "friend",
    "targetFriendId": "u987654321"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Post created successfully", 
  "data": {
    "id": "p555666777",
    "userId": "u123456789",
    "userFullName": "Alice Smith",
    "rawText": "Happy birthday! Hope you have an amazing day! 🎂",
    "generatedText": "URGENT: Alice Smith wishes happy birthday! Hope you have an amazing day! 🎂. This just in.",
    "audienceType": "friend",
    "visibility": "friend_only",
    "targetFriendId": "u987654321",
    "groupIds": [],
    "timestamp": "2025-06-23T15:00:00.000Z"
  }
}
```

### 4. Post to Specific Groups
```bash
curl -X POST http://localhost:3000/api/posts \
  -H "Content-Type: application/json" \
  -d '{
    "rawText": "Team meeting moved to 3 PM today!",
    "userId": "u123456789",
    "audienceType": "groups",
    "groupIds": ["g111222333", "g444555666"]
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Post created successfully",
  "data": {
    "id": "p777888999", 
    "userId": "u123456789",
    "userFullName": "Alice Smith",
    "rawText": "Team meeting moved to 3 PM today!",
    "generatedText": "BREAKING: Alice Smith announces team meeting moved to 3 PM today! More details soon.",
    "audienceType": "groups",
    "visibility": "groups_only",
    "targetFriendId": null,
    "groupIds": ["g111222333", "g444555666"],
    "timestamp": "2025-06-23T15:00:00.000Z"
  }
}
```

### 5. Retrieve Posts with Audience Filtering
```bash
curl "http://localhost:3000/api/posts?currentUserId=u123456789&page=1&limit=10"
```

**Response:**
```json
{
  "success": true,
  "message": "Posts retrieved successfully",
  "data": [
    {
      "id": "p777888999",
      "userId": "u123456789", 
      "userFullName": "Alice Smith",
      "rawText": "Team meeting moved to 3 PM today!",
      "generatedText": "BREAKING: Alice Smith announces team meeting moved to 3 PM today!",
      "audienceType": "groups",
      "visibility": "groups_only",
      "targetFriendId": null,
      "groupIds": ["g111222333"],
      "timestamp": "2025-06-23T15:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalPosts": 1,
    "totalPages": 1
  }
}
```

## 🔒 Privacy & Filtering Rules

### Visibility Matrix
| Audience Type | Who Can See |
|---------------|-------------|
| `friends` | All users in author's friends list |
| `friend` | Only the specific target friend |
| `groups` | All members of specified groups |
| `public` | Everyone (backward compatibility) |

### Access Rules
1. **Post author** can always see their own posts
2. **Unauthenticated users** only see public posts
3. **Friends posts** require mutual friendship
4. **Friend posts** require the viewer to be the target friend
5. **Group posts** require group membership

## 🔄 Backward Compatibility

### Legacy Posts
- Posts without `audienceType` are treated as `public`
- Existing `groupIds` automatically set `audienceType` to `groups`
- API works with both old and new post formats

### Migration-Free
- No database migration required
- New fields have sensible defaults
- Existing tests continue to work

## 🚨 Error Handling

### Validation Errors (400)
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    "Target friend ID is required for friend posts"
  ]
}
```

### Access Denied (403)
```json
{
  "success": false,
  "message": "Access denied",
  "error": "You can only post to users who are your friends"
}
```

### Not Found (404)
```json
{
  "success": false,
  "message": "Target friend not found",
  "error": "The specified friend does not exist"
}
```

## 📱 Push Notifications

### Notification Types
- **Friends posts**: All friends receive "New Friends Newsflash!"
- **Friend posts**: Target friend receives "Personal Newsflash!"  
- **Group posts**: Group members receive "New Group Newsflash!"

### Notification Data
Each notification includes:
- `type`: `friends_post`, `friend_post`, or `group_post`
- `postId`: ID of the created post
- `userId`: Author's user ID
- `userFullName`: Author's display name
- `targetFriendId`: (For friend posts)
- `groupIds`: (For group posts)

## 🧪 Testing Commands

### 1. Create Test User
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"fullName": "Test User", "email": "test@example.com"}'
```

### 2. Create Friends Post
```bash
curl -X POST http://localhost:3000/api/posts \
  -H "Content-Type: application/json" \
  -d '{
    "rawText": "Testing friends post!",
    "userId": "REPLACE_WITH_USER_ID",
    "audienceType": "friends"
  }'
```

### 3. Get Filtered Posts
```bash
curl "http://localhost:3000/api/posts?currentUserId=REPLACE_WITH_USER_ID"
```

## ✅ Implementation Status

- ✅ **Validation**: Audience type validation with error handling
- ✅ **Post Creation**: Support for all three audience types
- ✅ **Post Filtering**: Smart filtering based on relationships
- ✅ **Notifications**: Targeted push notifications
- ✅ **Documentation**: Comprehensive API docs
- ✅ **Backward Compatibility**: Works with existing posts
- ✅ **Error Handling**: Clear error messages

## 🚀 Ready to Use!

The audience targeting feature is fully implemented and ready for production use. Users can now control exactly who sees their posts, creating a more private and targeted social experience. 