## Push Notifications Architecture

### Data Model Extension

**User Data Model Addition:**
```json
{
  "id": "u123456789",
  "fullName": "John Doe",
  "email": "john@example.com",
  "expoPushToken": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "createdAt": "2025-06-14T18:00:00.000Z",
  "updatedAt": "2025-06-14T18:00:00.000Z",
  "followers": ["u987654321"],
  "following": ["u555666777"],
  "followersCount": 1,
  "followingCount": 1
}
```

### Notification System Components

**Token Management:**
- Device registration with Expo push token validation
- One token per user (latest token overwrites previous)
- Automatic cleanup of invalid/expired tokens
- Token format validation using Expo SDK

**Notification Triggers:**
- **Public Posts**: Notify all followers of the post creator
- **Group Posts**: Notify all group members (excluding creator)
- **Group Invitations**: Notify invited users when they receive an invitation
- **Group Invitation Acceptance**: Notify group owner when someone accepts an invitation
- **Friend Requests**: Notify target user when they receive a friend request
- **Friend Request Acceptance**: Notify requester when their friend request is accepted
- **Batch Processing**: Handle up to 100 notifications per batch
- **Error Handling**: Non-blocking delivery with graceful degradation

**Notification Payload Structure:**
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
    "timestamp": "2025-06-14T18:00:00.000Z"
  },
  "sound": "default",
  "priority": "high"
}
```

### Notification Types

**Post Notifications:**
- **Type**: `new_post` (public posts) or `group_post` (group posts)
- **Recipients**: Followers or group members
- **Content**: Truncated post content (100 chars max)
- **Deep Linking**: Post ID and user information included

**Group Notifications:**
- **Type**: `group_invitation` (when user is invited to group)
- **Recipients**: Invited users
- **Content**: Inviter name and group name
- **Deep Linking**: Group ID and inviter information included

- **Type**: `group_invitation_accepted` (when invitation is accepted)
- **Recipients**: Group owner
- **Content**: New member name and group name
- **Deep Linking**: Group ID and new member information included

**Friend Notifications:**
- **Type**: `friend_request` (when friend request is sent)
- **Recipients**: Target user
- **Content**: Requester name
- **Deep Linking**: Requester ID and name included

- **Type**: `friend_request_accepted` (when friend request is accepted)
- **Recipients**: Original requester
- **Content**: Accepter name
- **Deep Linking**: Accepter ID and name included

**Delivery Logic:**
- Smart recipient targeting based on action type
- Creator/requester exclusion (users don't get notified of their own actions)
- Token deduplication for users in multiple groups
- Rate limiting and cooldown periods

### Implementation Details

**Integration Points:**
- Post creation triggers automatic notifications
- Token registration via `/api/users/:id/push-token` endpoint
- Notification service integrated into post controller
- Background processing for non-blocking delivery

**Error Management:**
- Invalid tokens automatically removed from user records
- DeviceNotRegistered errors logged and handled
- Retry logic with exponential backoff
- Comprehensive logging for debugging

**Security & Validation:**
- Expo token format validation
- Authentication required for token registration
- Non-sensitive data only in notification payloads
- Rate limiting on token registration endpoint

### Performance Considerations

**Optimization:**
- Denormalized follower/group member data for fast lookups
- Batch notification sending (Expo limit: 100 per batch)
- Asynchronous processing doesn't block API responses
- Token validation cached using Expo SDK

**Monitoring:**
- Delivery success/failure tracking
- Invalid token cleanup logging
- Notification engagement metrics
- Performance monitoring for batch processing

---

## Overview

The Push Notifications architecture enables real-time notifications for Friendlines users when:
- ✅ Someone they follow creates a new post (IMPLEMENTED)
- ✅ Someone invites them to join a group (IMPLEMENTED)
- ✅ Someone accepts their group invitation (IMPLEMENTED)
- ✅ Someone sends them a friend request (IMPLEMENTED)
- ✅ Someone accepts their friend request (IMPLEMENTED)
- A post is shared to a group they belong to (future extension)
- Someone likes or comments on their post (future extension)

**Current Status**: Core push notification functionality is fully implemented and integrated, including social interactions.

## Architecture

### Components

1. **Device Registration Service**
   - Handles storing and updating Expo push tokens
   - Validates token format
   - Updates user records

2. **Notification Dispatcher**
   - Batches notifications for bulk sending
   - Handles Expo push API communication
   - Implements retry logic and error handling

3. **Notification Templates**
   - Standardized formats for different notification types
   - Localization support (future)
   - Deep linking payload structure

## Implementation Steps

### 1. Token Management ✅ COMPLETED

1. ✅ **Create notification utility** (`utils/notificationService.js`):
   - `registerDevice()` - Validates token format and updates user record
   - `sendPush()` - Batches tokens and calls Expo push API
   - `getFollowersTokens()` - Gets push tokens for a user's followers
   - `removeInvalidTokens()` - Cleans up invalid tokens
   - `isValidExpoPushToken()` - Validates Expo token format

2. ✅ **Add token registration endpoint**:
   - Route: `POST /api/users/:id/push-token` in `routes/auth.js`
   - Controller: `registerPushToken()` in `controllers/authController.js`
   - Validation: Token format validation using Expo SDK
   - Documentation: Added to API docs with examples

3. ✅ **Dependencies installed**:
   - Added `expo-server-sdk` package
   - All tests passing, no breaking changes

### 2. Integration Points ✅ COMPLETED

1. ✅ **Post Creation Integration** (`controllers/postController.js`):
   - Added `sendPush()` and `getFollowersTokens()` imports
   - Integrated push notification sending after successful post creation
   - Non-blocking notification flow (doesn't fail post creation if notifications fail)
   - Proper notification payload with post metadata
   - Truncated notification body for better UX (100 chars max)

2. ✅ **Group Invitation Integration** (`controllers/groupController.js`):
   - Added `sendPush()` and `getFriendTokens()` imports
   - Integrated push notification sending when inviting users to groups
   - Integrated push notification sending when users accept group invitations
   - Non-blocking notification flow for both invitation and acceptance
   - Proper notification payload with group and user metadata

3. ✅ **Friend Request Integration** (`controllers/authController.js`):
   - Added `sendPush()` and `getFriendTokens()` imports
   - Integrated push notification sending when sending friend requests
   - Integrated push notification sending when accepting friend requests
   - Non-blocking notification flow for both request and acceptance
   - Proper notification payload with user metadata

4. ✅ **Error Handling Integration**:
   - Try-catch wrapper around notification logic
   - Graceful degradation if notifications fail
   - Comprehensive logging for debugging
   - Invalid token cleanup built into notification service

## API Documentation

### Register Push Token

#### POST /api/users/:id/push-token
Register or update a device's push notification token.

**Request Body:**
```json
{
  "expoPushToken": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
}
```

**Validation Rules:**
- `expoPushToken`: Required, must match Expo token format
- User must exist and be authenticated

**Response (200):**
```json
{
  "success": true,
  "message": "Push token registered successfully",
  "data": {
    "userId": "u123456789",
    "tokenRegistered": true,
    "updatedAt": "2025-06-14T18:00:00.000Z"
  },
  "timestamp": "2025-06-14T18:00:00.000Z"
}
```

**Error Responses:**
- `400`: Invalid token format
- `401`: Unauthorized
- `404`: User not found
- `500`: Server error

### Notification Payload Structure

When a notification is sent, it follows this structure:

```json
{
  "to": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "title": "New Newsflash!",
  "body": "BREAKING: John Doe just announced big news!",
  "data": {
    "type": "new_post",
    "postId": "p987654321",
    "userId": "u123456789",
    "timestamp": "2025-06-14T18:00:00.000Z"
  },
  "sound": "default",
  "priority": "high"
}
```

## Security Considerations

1. **Token Validation**
   - Validate Expo token format
   - One token per user (latest wins)
   - Clear invalid tokens automatically

2. **Rate Limiting**
   - Max 100 notifications per batch
   - Cooldown period between notifications to same user
   - Daily notification caps

3. **Permission Checks**
   - Verify notification sender has permission
   - Respect user notification preferences
   - Handle user blocks/mutes (future)

## Error Handling

1. **Invalid Tokens**
   - Remove from user records
   - Log for analytics
   - Retry queue for transient failures

2. **API Failures**
   - Exponential backoff
   - Dead letter queue
   - Admin alerts for systemic issues

## Frontend Integration

1. Request Permission:
```javascript
async function registerForPushNotifications() {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    return;
  }

  const tokenData = await Notifications.getExpoPushTokenAsync();
  await api.post(`/users/${userId}/push-token`, {
    expoPushToken: tokenData.data
  });
}
```

2. Handle Notifications:
```javascript
Notifications.addNotificationResponseReceivedListener((response) => {
  const data = response.notification.request.content.data;
  if (data.type === 'new_post') {
    // Navigate to post
    navigation.navigate('Post', { id: data.postId });
  }
});
```

## Testing

1. **Unit Tests**
```javascript
describe('Push Notification Service', () => {
  test('registerDevice validates token format', async () => {
    // Test implementation
  });
  
  test('sendPush batches notifications correctly', async () => {
    // Test implementation
  });
});
```

2. **Integration Tests**
```javascript
describe('Notification Flow', () => {
  test('followers receive notification on new post', async () => {
    // Test implementation
  });
});
```

## Monitoring & Analytics

1. **Metrics to Track**
   - Token registration success rate
   - Notification delivery rate
   - Token invalidation rate
   - User engagement with notifications

2. **Logging**
   - Failed deliveries
   - Token updates
   - Rate limit hits
   - API errors

## Future Extensions

1. **Rich Notifications**
   - Image previews
   - Action buttons
   - Custom sounds

2. **Advanced Targeting**
   - User preferences
   - Time zone awareness
   - Engagement optimization

3. **Additional Triggers**
   - Comment notifications
   - Like notifications
   - Mention notifications
   - Group invites 