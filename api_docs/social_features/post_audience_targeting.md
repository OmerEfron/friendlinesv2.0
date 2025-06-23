# Post Audience Targeting

## Overview
The post audience targeting feature allows users to control who can see their posts by specifying different audience types. This provides granular privacy control and targeted communication options.

## Audience Types

### 1. Friends Posts (`audienceType: "friends"`)
Posts visible to all of the user's friends.

**Usage:**
```json
{
  "rawText": "Had an amazing day at the beach!",
  "userId": "u123456789",
  "audienceType": "friends"
}
```

**Visibility Rules:**
- Visible to all users in the author's `friends` array
- Author can always see their own posts
- Not visible to non-friends or unauthenticated users

**Notifications:**
- Push notifications sent to all friends
- Uses `getFriendsTokens()` to get notification recipients

---

### 2. Single Friend Posts (`audienceType: "friend"`)
Posts visible to one specific friend only.

**Usage:**
```json
{
  "rawText": "Happy birthday! 🎂",
  "userId": "u123456789",
  "audienceType": "friend",
  "targetFriendId": "u987654321"
}
```

**Visibility Rules:**
- Only visible to the user specified in `targetFriendId`
- Author can always see their own posts
- `targetFriendId` must be in the author's `friends` array

**Validation:**
- `targetFriendId` is required and must be a valid user ID
- Target user must be an actual friend of the author
- `groupIds` must not be provided

**Notifications:**
- Push notification sent only to the target friend
- Uses `getFriendTokens(targetFriendId)` for notifications

---

### 3. Group Posts (`audienceType: "groups"`)
Posts visible to members of specified groups.

**Usage:**
```json
{
  "rawText": "Meeting at 3 PM in conference room A",
  "userId": "u123456789",
  "audienceType": "groups",
  "groupIds": ["g123456789", "g987654321"]
}
```

**Visibility Rules:**
- Visible to all members of the specified groups
- Author can always see their own posts
- Author must be a member of all specified groups

**Validation:**
- `groupIds` array is required with at least one group ID
- Maximum 5 groups per post
- No duplicate group IDs allowed
- Author must have membership in all specified groups

**Notifications:**
- Push notifications sent to all group members (excluding author)
- Uses `getGroupMembersTokens(groupIds, userId)` for notifications

---

## Data Structure

### Post Schema
```json
{
  "id": "p123456789",
  "userId": "u123456789",
  "rawText": "Original post text",
  "generatedText": "Generated newsflash text",
  "timestamp": "2025-06-14T18:00:00.000Z",
  "createdAt": "2025-06-14T18:00:00.000Z",
  "updatedAt": "2025-06-14T18:00:00.000Z",
  
  // Audience targeting fields
  "audienceType": "friends|friend|groups",
  "targetFriendId": "u987654321",  // Only for friend posts
  "groupIds": ["g123456789"],      // Only for group posts
  "visibility": "friends_only|friend_only|groups_only",
  
  // Social features
  "likes": [],
  "comments": [],
  "likesCount": 0,
  "commentsCount": 0,
  "sharesCount": 0
}
```

### Visibility Values
- `friends_only`: Post visible to all friends
- `friend_only`: Post visible to specific friend
- `groups_only`: Post visible to group members
- `public`: Legacy posts without audience targeting

---

## API Endpoints

### Create Post with Audience Targeting
`POST /api/posts`

Required fields:
- `rawText`: Post content
- `userId`: Author's user ID
- `audienceType`: One of "friends", "friend", "groups"

Conditional fields:
- `targetFriendId`: Required for "friend" posts
- `groupIds`: Required for "groups" posts

### Retrieve Posts with Filtering
`GET /api/posts?currentUserId=u123456789`
`GET /api/posts/u123456789?currentUserId=u123456789`

The `currentUserId` parameter enables audience filtering. Without it, only public posts are returned for backward compatibility.

---

## Filtering Logic

### Post Visibility Algorithm
1. **Author Check**: Post author can always see their own posts
2. **Authentication Check**: Unauthenticated users only see public posts
3. **Audience Type Check**:
   - `friends`: Current user must be in author's friends list
   - `friend`: Current user must be the target friend
   - `groups`: Current user must be a member of at least one specified group
   - `public/undefined`: Visible to all (backward compatibility)

### Implementation
```javascript
const canViewPost = (post, currentUser, groups) => {
  // Author can always see their own posts
  if (post.userId === currentUser.id) return true;

  switch (post.audienceType) {
    case "friends":
      return currentUser.friends && currentUser.friends.includes(post.userId);
    
    case "friend":
      return post.targetFriendId === currentUser.id;
    
    case "groups":
      return post.groupIds.some(groupId => {
        const group = groups.find(g => g.id === groupId);
        return group && group.members.includes(currentUser.id);
      });
    
    default:
      return post.visibility === "public" || !post.audienceType;
  }
};
```

---

## Notification System

### Friends Posts
- **Recipients**: All friends of the post author
- **Title**: "New Friends Newsflash!"
- **Type**: `friends_post`

### Friend Posts
- **Recipients**: The specific target friend
- **Title**: "Personal Newsflash!"
- **Type**: `friend_post`

### Group Posts
- **Recipients**: All group members except the author
- **Title**: "New Group Newsflash!"
- **Type**: `group_post`

---

## Error Handling

### Validation Errors (400)
- Missing or invalid `audienceType`
- `targetFriendId` missing for friend posts
- `groupIds` missing for group posts
- Invalid user ID formats

### Access Denied Errors (403)
- Target friend is not in author's friends list
- Author is not a member of specified groups

### Not Found Errors (404)
- Author user not found
- Target friend user not found
- Group not found

---

## Migration Notes

### Backward Compatibility
- Existing posts without `audienceType` are treated as public
- API endpoints support both old and new post formats
- Unauthenticated requests only see public posts

### Database Migration
No database migration is required as new fields are optional and have sensible defaults:
- `audienceType`: Defaults to `"public"` if not specified
- `targetFriendId`: Defaults to `null`
- `groupIds`: Defaults to empty array `[]`

---

## Usage Examples

### Create a Friends Post
```bash
curl -X POST /api/posts \
  -H "Content-Type: application/json" \
  -d '{
    "rawText": "Just finished my workout! 💪",
    "userId": "u123456789",
    "audienceType": "friends"
  }'
```

### Create a Friend Post
```bash
curl -X POST /api/posts \
  -H "Content-Type: application/json" \
  -d '{
    "rawText": "Thanks for the help with the project!",
    "userId": "u123456789",
    "audienceType": "friend",
    "targetFriendId": "u987654321"
  }'
```

### Create a Group Post
```bash
curl -X POST /api/posts \
  -H "Content-Type: application/json" \
  -d '{
    "rawText": "Team meeting moved to 4 PM",
    "userId": "u123456789",
    "audienceType": "groups",
    "groupIds": ["g123456789"]
  }'
```

### Get Filtered Posts
```bash
curl "http://localhost:3000/api/posts?currentUserId=u123456789&page=1&limit=10"
``` 