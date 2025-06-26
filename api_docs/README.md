# Friendlines API Documentation

## 🚀 Overview
Friendlines is a social platform with newsflash-style posts, friendship system, and group functionality. This documentation covers the core API endpoints and features.

## 📚 Core Features

### 🔐 Authentication
- **User Management**: Login, profile management
- **Friendship System**: Send/accept friend requests, manage friendships
- **Push Notifications**: Device registration and notifications

### 📝 Posts & Newsflash
- **Post Creation**: Create posts with automatic newsflash generation
- **Audience Targeting**: Post to friends, groups, or specific friends
- **Social Features**: Likes, comments, and engagement
- **Privacy Control**: Granular audience targeting and filtering

### 👥 Groups
- **Group Management**: Create, join, and manage groups
- **Group Posts**: Post to specific groups with member notifications
- **Invitations**: Invite users to groups
- **Membership**: Manage group members and permissions

### 🤝 Friendship System
- **Friend Requests**: Send, accept, reject friend requests
- **Friend Management**: View friends, remove friendships
- **Status Tracking**: Check friendship status between users
- **Privacy**: Friend-only posts and content filtering

## 📖 Documentation Structure

### Endpoints
- **[Authentication](endpoints/authentication_endpoints.md)** - User auth, profiles, friendship management
- **[Posts](endpoints/posts_endpoints.md)** - Create posts, audience targeting, likes, comments
- **[Groups](endpoints/groups_endpoints.md)** - Group management, invitations, membership

### Features
- **[Friendship System](social_features/friendship_system.md)** - Complete friendship workflow
- **[Post Audience Targeting](social_features/post_audience_targeting.md)** - Privacy and targeting features

### Architecture
- **[Push Notifications Architecture](architecture/push_notifications_architecture.md)** - Notification delivery workflow
- **[HTTP Status Codes](architecture/http_status_codes.md)** - API response codes

### General
- **[Response Format](general/response_format.md)** - Standard API response structure
- **[Rate Limiting](general/rate_limiting.md)** - API rate limiting policies

## 🎯 Quick Start

### 1. Login/Create User
```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "John Doe",
    "email": "john@example.com"
  }'
```

### 2. Create a Post
```bash
# Post to all friends
curl -X POST http://localhost:3000/api/posts \
  -H "Content-Type: application/json" \
  -d '{
    "rawText": "Having a great day!",
    "userId": "u123456789",
    "audienceType": "friends"
  }'
```

### 3. Get Posts
```bash
# Get user's posts only
curl "http://localhost:3000/api/posts/u123456789"

# Get user's posts and their friends' posts
curl "http://localhost:3000/api/posts/u123456789?includeFriends=true"

# Get filtered posts with pagination
curl "http://localhost:3000/api/posts?currentUserId=u123456789&page=1&limit=10"
```

### 4. Manage Friendships
```bash
# Send friend request
curl -X POST http://localhost:3000/api/users/u987654321/friend-request \
  -H "Content-Type: application/json" \
  -d '{"userId": "u123456789"}'

# Get friends list
curl "http://localhost:3000/api/users/u123456789/friends"
```

### 5. Create a Group
```bash
# Create group
curl -X POST http://localhost:3000/api/groups/u123456789 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Group",
    "description": "A test group"
  }'
```

## Development

When running in development mode (`NODE_ENV=development`), the server automatically creates comprehensive test data including:

### Test User
- **Email**: `test@example.com`
- **Name**: Test User
- **ID**: `utest123456789`

### Test Data Includes
- 6 test users with various friendship relationships
- 3 test groups with different membership states
- 7 test posts with different audience types (public, friends, friend-specific, groups)
- 3 test notifications
- Complete social network with pending friend requests

### Quick Test Endpoints
```bash
# Test user's posts only
curl "http://localhost:3000/api/posts/utest123456789"

# Test user's posts + friends' posts
curl "http://localhost:3000/api/posts/utest123456789?includeFriends=true"

# Test user's friends
curl "http://localhost:3000/api/users/utest123456789/friends"

# Test user's groups
curl "http://localhost:3000/api/groups/user/utest123456789"

# Test user's notifications
curl "http://localhost:3000/api/notifications/utest123456789"
```

The test data demonstrates all features including:
- ✅ Public, friends-only, friend-specific, and group posts
- ✅ Likes and comments on posts
- ✅ Friendship system with pending requests
- ✅ Group memberships and invitations
- ✅ Push notifications
- ✅ Audience targeting and filtering

## 🔄 API Conventions

### Base URL
```
http://localhost:3000/api
```

### Request Headers
```
Content-Type: application/json
```

### Response Format
```json
{
  "success": true|false,
  "message": "Description of result",
  "data": { /* Response data */ },
  "timestamp": "2025-06-23T15:00:00.000Z"
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `403` - Forbidden
- `404` - Not Found
- `429` - Too Many Requests
- `500` - Internal Server Error

## 🌟 Key Features

### Audience Targeting
Posts can be targeted to:
- **All friends** (`audienceType: "friends"`)
- **Specific groups** (`audienceType: "groups"`)
- **Single friend** (`audienceType: "friend"`)

### Friendship System
- Mutual consent required (send/accept requests)
- Bidirectional relationships
- Privacy control through friendship status

### Push Notifications
- Real-time notifications for posts, friend requests
- Targeted notifications based on audience
- Device token management

### Rate Limiting
- Authentication: 5 requests/minute
- General API: 100 requests/minute
- Profile updates: 5 requests/hour

## 📱 Ready for Production
This API is production-ready with comprehensive validation, error handling, and security features.