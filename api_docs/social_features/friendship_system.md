# Friendship System API Documentation

The Friendlines app uses a bidirectional friendship system where users can send friend requests, accept/reject them, and manage their friendships.

## Friendship States

A relationship between two users can be in one of these states:
- **none**: No relationship exists
- **request_sent**: Current user has sent a friend request to the other user
- **request_received**: Current user has received a friend request from the other user  
- **friends**: Both users are friends (mutual acceptance)

## Endpoints

### POST /api/users/:id/friend-request
Send a friend request to a user.

**Parameters:**
- `id`: Target user ID to send friend request to (required)

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
  "message": "Friend request sent successfully",
  "data": {
    "targetUserId": "u987654321",
    "currentUserId": "u123456789",
    "requestSent": true
  },
  "timestamp": "2025-06-14T18:00:00.000Z"
}
```

**Error Responses:**
- `400`: Invalid request format
- `404`: Target user not found or current user not found
- `422`: Missing userId, invalid ID formats, cannot send request to yourself, request already sent, or user already a friend
- `500`: Server error

---

### POST /api/users/:id/accept-friend
Accept a friend request from a user.

**Parameters:**
- `id`: User ID who sent the friend request (required)

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
  "message": "Friend request accepted successfully",
  "data": {
    "requesterUserId": "u987654321",
    "currentUserId": "u123456789",
    "areFriends": true,
    "friendsCount": 5
  },
  "timestamp": "2025-06-14T18:00:00.000Z"
}
```

**Error Responses:**
- `400`: Invalid request format
- `404`: Requester user not found or current user not found
- `422`: Missing userId, invalid ID formats, or no friend request found
- `500`: Server error

---

### POST /api/users/:id/reject-friend
Reject a friend request from a user.

**Parameters:**
- `id`: User ID who sent the friend request (required)

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
  "message": "Friend request rejected successfully",
  "data": {
    "requesterUserId": "u987654321",
    "currentUserId": "u123456789",
    "requestRejected": true
  },
  "timestamp": "2025-06-14T18:00:00.000Z"
}
```

**Error Responses:**
- `400`: Invalid request format
- `404`: Requester user not found or current user not found
- `422`: Missing userId, invalid ID formats, or no friend request found
- `500`: Server error

---

### POST /api/users/:id/cancel-friend-request
Cancel a sent friend request.

**Parameters:**
- `id`: Target user ID to cancel request to (required)

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
  "message": "Friend request canceled successfully",
  "data": {
    "targetUserId": "u987654321",
    "currentUserId": "u123456789",
    "requestCanceled": true
  },
  "timestamp": "2025-06-14T18:00:00.000Z"
}
```

**Error Responses:**
- `400`: Invalid request format
- `404`: Target user not found or current user not found
- `422`: Missing userId, invalid ID formats, or no friend request found
- `500`: Server error

---

### POST /api/users/:id/unfriend
Remove friendship with a user (unfriend).

**Parameters:**
- `id`: Friend user ID to unfriend (required)

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
  "message": "Friendship removed successfully",
  "data": {
    "friendUserId": "u987654321",
    "currentUserId": "u123456789",
    "areFriends": false,
    "friendsCount": 4
  },
  "timestamp": "2025-06-14T18:00:00.000Z"
}
```

**Error Responses:**
- `400`: Invalid request format
- `404`: Friend user not found or current user not found
- `422`: Missing userId, invalid ID formats, cannot unfriend yourself, or not friends with user
- `500`: Server error

---

### GET /api/users/:id/friends
Get friends list for a user with pagination.

**Parameters:**
- `id`: User ID (required)

**Query Parameters:**
- `page`: Page number (optional, default: 1)
- `limit`: Number of friends per page (optional, default: 20, max: 50)

**Response:**
```json
{
  "success": true,
  "message": "User friends retrieved successfully",
  "data": {
    "userId": "u987654321",
    "userName": "Jane Smith",
    "friendsCount": 10,
    "friends": [
      {
        "id": "u123456789",
        "fullName": "John Doe",
        "email": "john@example.com",
        "friendsCount": 8
      },
      {
        "id": "u555666777",
        "fullName": "Bob Wilson",
        "email": "bob@example.com",
        "friendsCount": 12
      }
    ]
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalFriends": 10,
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

### GET /api/users/:id/friend-requests
Get pending friend requests for a user with pagination.

**Parameters:**
- `id`: User ID (required)

**Query Parameters:**
- `page`: Page number (optional, default: 1)
- `limit`: Number of requests per page (optional, default: 20, max: 50)
- `type`: Request type - "received" or "sent" (optional, default: "received")

**Response for Received Requests:**
```json
{
  "success": true,
  "message": "Received friend requests retrieved successfully",
  "data": {
    "userId": "u123456789",
    "userName": "John Doe",
    "requestsCount": 3,
    "requestType": "received",
    "requests": [
      {
        "id": "u987654321",
        "fullName": "Jane Smith",
        "email": "jane@example.com",
        "friendsCount": 10
      },
      {
        "id": "u555666777",
        "fullName": "Bob Wilson",
        "email": "bob@example.com",
        "friendsCount": 5
      }
    ]
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalRequests": 3,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPrevPage": false
  },
  "timestamp": "2025-06-14T18:00:00.000Z"
}
```

**Response for Sent Requests:**
```json
{
  "success": true,
  "message": "Sent friend requests retrieved successfully",
  "data": {
    "userId": "u123456789",
    "userName": "John Doe",
    "requestsCount": 2,
    "requestType": "sent",
    "requests": [
      {
        "id": "u888999000",
        "fullName": "Alice Brown",
        "email": "alice@example.com",
        "friendsCount": 7
      }
    ]
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalRequests": 2,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPrevPage": false
  },
  "timestamp": "2025-06-14T18:00:00.000Z"
}
```

**Error Responses:**
- `400`: Invalid user ID format, pagination parameters, or type parameter
- `404`: User not found
- `500`: Server error

---

### GET /api/users/:id/friendship-status
Check friendship status between two users.

**Parameters:**
- `id`: Target user ID (required)

**Query Parameters:**
- `userId`: Current user ID (required)

**Example Request:**
```
GET /api/users/u987654321/friendship-status?userId=u123456789
```

**Response:**
```json
{
  "success": true,
  "message": "Friendship status retrieved successfully",
  "data": {
    "targetUserId": "u987654321",
    "targetUserName": "Jane Smith",
    "currentUserId": "u123456789",
    "currentUserName": "John Doe",
    "status": "friends",
    "areFriends": true,
    "requestSent": false,
    "requestReceived": false
  },
  "timestamp": "2025-06-14T18:00:00.000Z"
}
```

**Possible Status Values:**
- `none`: No relationship
- `friends`: Users are friends
- `request_sent`: Current user sent a friend request to target user
- `request_received`: Current user received a friend request from target user

**Error Responses:**
- `400`: Missing userId query parameter or invalid ID formats
- `404`: Target user not found or current user not found
- `500`: Server error

---

## Data Structure Changes

### User Object
Each user now has the following friendship-related fields:

```json
{
  "id": "u123456789",
  "fullName": "John Doe",
  "email": "john@example.com",
  "friends": ["u987654321", "u555666777"],
  "friendRequests": ["u888999000"],
  "sentFriendRequests": ["u111222333"],
  "friendsCount": 2,
  "createdAt": "2025-06-14T18:00:00.000Z",
  "updatedAt": "2025-06-14T18:00:00.000Z"
}
```

**Field Descriptions:**
- `friends`: Array of user IDs who are friends with this user
- `friendRequests`: Array of user IDs who sent friend requests to this user
- `sentFriendRequests`: Array of user IDs to whom this user sent friend requests  
- `friendsCount`: Total number of friends (denormalized for performance)

---

## Rate Limiting

All friendship endpoints are subject to general rate limiting:
- 100 requests per 15 minutes per IP address
- Friend request sending is additionally limited to prevent spam

---

## Example Friendship Flow

1. **User A sends friend request to User B:**
   ```
   POST /api/users/userB_id/friend-request
   Body: { "userId": "userA_id" }
   ```

2. **User B sees pending requests:**
   ```
   GET /api/users/userB_id/friend-requests?type=received
   ```

3. **User B accepts the friend request:**
   ```
   POST /api/users/userA_id/accept-friend
   Body: { "userId": "userB_id" }
   ```

4. **Both users are now friends and can see each other in friends list:**
   ```
   GET /api/users/userA_id/friends
   GET /api/users/userB_id/friends
   ```

5. **Either user can check friendship status:**
   ```
   GET /api/users/userB_id/friendship-status?userId=userA_id
   ```

6. **Either user can end the friendship:**
   ```
   POST /api/users/userB_id/unfriend
   Body: { "userId": "userA_id" }
   ```

---

## Migration from Followers System

The friendship system replaces the previous followers system:

**Old Fields (Removed):**
- `followers` → Now `friends` (bidirectional)
- `following` → Now `friends` (bidirectional)
- `followersCount` → Now `friendsCount`
- `followingCount` → Removed

**Old Endpoints (Replaced):**
- `POST /api/users/:id/follow` → `POST /api/users/:id/friend-request`
- `GET /api/users/:id/followers` → `GET /api/users/:id/friends`
- `GET /api/users/:id/following` → `GET /api/users/:id/friends`
- `GET /api/users/:id/follow-status` → `GET /api/users/:id/friendship-status`

**New Concepts:**
- Friend requests must be explicitly accepted
- Relationships are always bidirectional (mutual)
- Users can see pending requests (sent and received)
- Users can cancel sent requests
- Clear friendship status tracking 