# Notification Endpoints

## Overview

The Notification system handles push notifications for Friendlines users. It supports device registration and automatic notification delivery for various events.

---

## Device Registration

### POST /api/users/:id/push-token
Register or update a device's push notification token.

**Parameters:**
- `id`: User ID (required)

**Request Body:**
```json
{
  "expoPushToken": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
}
```

**Validation Rules:**
- `expoPushToken`: Required, must match Expo push token format (`ExponentPushToken[...]`)
- User must exist in the system

**Response (200):**
```json
{
  "success": true,
  "message": "Push token registered successfully",
  "data": {
    "userId": "u123456789",
    "tokenRegistered": true,
    "updatedAt": "2025-06-16T22:47:01.786Z"
  },
  "timestamp": "2025-06-16T22:47:01.786Z"
}
```

**Error Responses:**
- `400`: Invalid token format
  ```json
  {
    "success": false,
    "message": "Failed to register push token",
    "error": "Invalid Expo push token format",
    "timestamp": "2025-06-16T22:47:37.665Z"
  }
  ```
- `404`: User not found
- `500`: Server error

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/users/u123456789/push-token \
  -H "Content-Type: application/json" \
  -d '{"expoPushToken": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"}'
```

---

## Automatic Notifications

The following events automatically trigger push notifications:

### Post Creation Notifications

When a user creates a post, notifications are automatically sent to:

#### Public Posts
- **Recipients**: All users who follow the post creator
- **Notification**: "New Newsflash!" with truncated post content
- **Payload**:
  ```json
  {
    "type": "new_post",
    "postId": "p987654321",
    "userId": "u123456789",
    "userFullName": "John Doe"
  }
  ```

#### Group Posts
- **Recipients**: All members of the specified groups (excluding the post creator)
- **Notification**: "New Group Newsflash!" with truncated post content
- **Payload**:
  ```json
  {
    "type": "group_post",
    "postId": "p987654321",
    "userId": "u123456789",
    "userFullName": "John Doe",
    "groupIds": ["g123456789", "g987654321"]
  }
  ```

### Notification Payload Structure

All notifications follow this standard structure:

```json
{
  "to": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "title": "New Newsflash!",
  "body": "John Doe: BREAKING: Just announced big news! Sources confirm...",
  "data": {
    "type": "new_post",
    "postId": "p987654321",
    "userId": "u123456789",
    "userFullName": "John Doe",
    "timestamp": "2025-06-16T22:47:20.452Z"
  },
  "sound": "default",
  "priority": "high"
}
```

---

## Implementation Details

### Token Management
- Each user can have one active push token
- New token registration overwrites the previous token
- Invalid tokens are automatically cleaned up
- Tokens are validated using Expo SDK

### Rate Limiting
- Push token registration is subject to general API rate limits
- Notification sending has built-in batching (max 100 per batch)
- Failed notifications are logged but don't affect API responses

### Error Handling
- Invalid tokens are detected and removed from user records
- Expo API errors are logged and handled gracefully
- Notification failures don't affect post creation success

### Security
- Only authenticated users can register tokens
- Push tokens are validated for proper Expo format
- Notification data includes only non-sensitive information

---

## Frontend Integration

### React Native Example

```javascript
import * as Notifications from 'expo-notifications';

// Request permission and register token
async function registerForPushNotifications(userId) {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    console.log('Push notification permission denied');
    return;
  }

  const tokenData = await Notifications.getExpoPushTokenAsync();
  
  try {
    const response = await fetch(`/api/users/${userId}/push-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        expoPushToken: tokenData.data
      })
    });
    
    if (response.ok) {
      console.log('Push token registered successfully');
    }
  } catch (error) {
    console.error('Failed to register push token:', error);
  }
}

// Handle notification responses
Notifications.addNotificationResponseReceivedListener((response) => {
  const data = response.notification.request.content.data;
  
  switch (data.type) {
    case 'new_post':
      // Navigate to post
      navigation.navigate('Post', { id: data.postId });
      break;
    case 'group_post':
      // Navigate to group or post
      navigation.navigate('Group', { id: data.groupIds[0] });
      break;
  }
});
```

---

## Testing

### Manual Testing

1. **Register Token:**
   ```bash
   curl -X POST http://localhost:3000/api/users/YOUR_USER_ID/push-token \
     -H "Content-Type: application/json" \
     -d '{"expoPushToken": "ExponentPushToken[YOUR_TOKEN]"}'
   ```

2. **Create Post to Trigger Notification:**
   ```bash
   curl -X POST http://localhost:3000/api/posts \
     -H "Content-Type: application/json" \
     -d '{
       "rawText": "Testing notifications!",
       "userId": "YOUR_USER_ID"
     }'
   ```

3. **Check Server Logs:**
   Look for notification sending confirmation in server output.

### Expected Log Output
```
Push token registered for user u123456789
Push notifications sent to X followers for post p987654321
```

---

## Troubleshooting

### Common Issues

1. **Invalid Token Format Error**
   - Ensure token starts with `ExponentPushToken[`
   - Verify token is obtained from Expo SDK

2. **No Notifications Received**
   - Check if push token is registered
   - Verify user has followers (for public posts) or group members (for group posts)
   - Check server logs for delivery errors

3. **DeviceNotRegistered Error**
   - Token may be expired or invalid
   - Re-register the push token
   - This error is automatically handled and logged

### Debug Tips
- Use development mode for detailed error messages
- Check server logs for notification sending attempts
- Verify token format matches Expo standards
- Test with real devices (iOS Simulator doesn't support push notifications)

---

## GET /api/notifications/:id
Get all notifications for a specific user with pagination support.

**Parameters:**
- `id`: User ID (required)

**Query Parameters:**
- `page`: Page number (optional, default: 1)
- `limit`: Number of notifications per page (optional, default: 20, max: 50)
- `unreadOnly`: Filter to unread notifications only (optional, default: false)

**Response:**
```json
{
  "success": true,
  "message": "Notifications retrieved successfully",
  "data": [
    {
      "id": "n123456789",
      "userId": "u987654321",
      "type": "new_post",
      "title": "New Newsflash!",
      "message": "John Doe: BREAKING: Just announced big news!",
      "data": {
        "postId": "p987654321",
        "authorId": "u123456789",
        "authorName": "John Doe"
      },
      "read": false,
      "createdAt": "2025-06-14T18:00:00.000Z"
    },
    {
      "id": "n987654321",
      "userId": "u987654321",
      "type": "group_post",
      "title": "New Group Newsflash!",
      "message": "Jane Smith posted in Tech Discussion",
      "data": {
        "postId": "p555666777",
        "authorId": "u444555666",
        "authorName": "Jane Smith",
        "groupId": "g123456789",
        "groupName": "Tech Discussion"
      },
      "read": true,
      "createdAt": "2025-06-14T17:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalNotifications": 2,
    "unreadCount": 1,
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

**Example:**
```bash
curl -X GET "http://localhost:3000/api/notifications/u987654321?page=1&limit=10&unreadOnly=true"
```

---

## PUT /api/notifications/mark-read
Mark multiple notifications as read.

**Request Body:**
```json
{
  "userId": "u987654321",
  "notificationIds": ["n123456789", "n987654321", "n555666777"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Notifications marked as read successfully",
  "data": {
    "userId": "u987654321",
    "markedAsRead": 3,
    "totalNotifications": 3,
    "updatedNotifications": [
      {
        "id": "n123456789",
        "read": true,
        "readAt": "2025-06-14T18:15:00.000Z"
      },
      {
        "id": "n987654321",
        "read": true,
        "readAt": "2025-06-14T18:15:00.000Z"
      },
      {
        "id": "n555666777",
        "read": true,
        "readAt": "2025-06-14T18:15:00.000Z"
      }
    ],
    "remainingUnreadCount": 0
  },
  "timestamp": "2025-06-14T18:15:00.000Z"
}
```

**Validation Rules:**
- `userId`: Required, valid user ID format
- `notificationIds`: Required, array of valid notification IDs, max 100 IDs per request
- Only notifications belonging to the specified user can be marked as read
- Already read notifications are ignored (no error)

**Error Responses:**
- `400`: Invalid user ID format, missing fields, or validation failed
- `404`: User not found or one or more notifications not found
- `500`: Server error

**Example:**
```bash
curl -X PUT http://localhost:3000/api/notifications/mark-read \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "u987654321",
    "notificationIds": ["n123456789", "n987654321"]
  }'
```

---

## Notification Types

### Supported Notification Types
- `new_post`: User you follow created a new post
- `group_post`: New post in a group you're a member of
- `follow`: Someone started following you
- `like`: Someone liked your post
- `comment`: Someone commented on your post

### Notification Data Schema
Each notification includes:
- **id**: Unique notification identifier
- **userId**: Recipient user ID
- **type**: Notification type (see supported types above)
- **title**: Display title for the notification
- **message**: Notification message content
- **data**: Type-specific payload data
- **read**: Boolean indicating if notification has been read
- **createdAt**: Timestamp when notification was created
- **readAt**: Timestamp when notification was marked as read (if applicable)

--- 