## Groups Architecture

### Data Model

**Groups Data Structure (`data/groups.json`):**
```json
{
  "id": "g123456789",
  "name": "Ski Trip 2024",
  "description": "Planning our winter getaway!",
  "ownerId": "u123456789",
  "members": ["u123456789", "u987654321"],
  "invites": ["u555666777"],
  "createdAt": "2025-06-14T18:00:00.000Z",
  "updatedAt": "2025-06-14T18:00:00.000Z",
  "settings": {
    "postNotifications": true,
    "membershipNotifications": true
  }
}
```

**Post Data Model Extension:**
```json
{
  "id": "p987654321",
  "userId": "u123456789",
  "rawText": "Just booked our ski lodge!",
  "generatedText": "BREAKING: John Doe just booked their ski lodge!",
  "groupIds": ["g123456789", "g987654321"],
  "visibility": "groups_only",
  "timestamp": "2025-06-14T18:00:00.000Z",
  "likes": [],
  "comments": [],
  "likesCount": 0,
  "commentsCount": 0,
  "sharesCount": 0
}
```

### Core Features

**Group Management:**
- Create private groups with owner as automatic member
- Invite users to groups with pending invitation system
- Accept/decline group invitations
- Leave groups with automatic ownership transfer
- Retrieve group details with enriched member information

**Group Posts:**
- Post to specific groups using `groupIds` array
- Automatic visibility control (`groups_only` vs `public`)
- Access validation ensures only group members can post
- Group member notifications (excluding post creator)

**Data Validation:**
- Group names: 3-50 characters required
- Descriptions: Optional, max 200 characters  
- Maximum 5 groups per post
- Duplicate group ID detection
- Member access verification for all operations

### Security & Access Control

**Group Access:**
- Only group members can view group posts
- Only group owner can manage settings
- Members can leave at any time
- Owner transfer protocol for owner departure

**Post Access:**
- Group posts only visible to members
- Non-members blocked from posting to groups
- Clear visibility indicators (`groups_only` vs `public`)

### Implementation Notes

**Storage:**
- Groups stored in `data/groups.json`
- Group IDs generated with 'g' prefix
- Member arrays track group membership
- Invitation arrays track pending invites

**Integration:**
- Extends existing post controller with group support
- Integrates with push notification system
- Maintains backward compatibility with existing posts
- Follows existing validation and error handling patterns

---

## Implementation Steps

### 1. Data Layer Setup ✅ COMPLETED

1. ✅ **Initialize groups.json**:
   - Added groups.json initialization to `initializeDataFiles()` in `utils/fileUtils.js`
   - Added `generateId()` helper function for creating group IDs with 'g' prefix
   - Groups data will be stored in `data/groups.json` with empty array initialization

### 2. Group Controller ✅ COMPLETED

1. ✅ **Created `controllers/groupController.js`** with full implementation:
   - `createGroup()` - Creates new groups with owner as automatic member
   - `inviteToGroup()` - Sends invitations to users with access control
   - `acceptInvitation()` - Handles invitation acceptance
   - `leaveGroup()` - Manages group departure with ownership transfer logic
   - `getGroup()` - Retrieves group details with member information
   - `getUserGroups()` - Gets user's owned, member, and invited groups
   - `validateGroupAccess()` - Helper function for post access validation
   - Comprehensive error handling and validation
   - Follows existing controller patterns and response formats

### 3. Routes Setup ✅ COMPLETED

1. ✅ **Created `routes/groups.js`** with complete route definitions:
   - `POST /api/groups/:userId` - Create group (with validation middleware)
   - `POST /api/groups/:id/invite` - Invite users to group
   - `POST /api/groups/:id/accept` - Accept group invitation
   - `POST /api/groups/:id/leave` - Leave group
   - `GET /api/groups/:id` - Get group details
   - `GET /api/groups/user/:userId` - Get user's groups
   - Comprehensive middleware stack (validation, rate limiting, error handling)

2. ✅ **Added validation middleware** to `middleware/validation.js`:
   - `validateGroupMiddleware` - Validates group creation data
   - `validateInviteMiddleware` - Validates invitation data
   - `validateUserActionMiddleware` - Validates user action data

3. ✅ **Added validation functions** to `utils/validation.js`:
   - `validateGroupData()` - Group name/description validation
   - `validateInviteData()` - Invitation data validation
   - `validateUserActionData()` - User action validation

4. ✅ **Registered routes** in `server.js`:
   - Added `/api/groups` route registration
   - Updated root endpoint documentation
   - Updated 404 handler with group endpoints

### 4. Validation Middleware

Add to `middleware/validation.js`:
```javascript
const validateGroupMiddleware = (req, res, next) => {
  const { name, description } = req.body;
  
  if (!name || name.length < 3 || name.length > 50) {
    return res.status(400).json({
      success: false,
      message: 'Invalid group name',
      error: 'Group name must be between 3 and 50 characters'
    });
  }
  
  // More validation
  next();
};
```

### 5. Post Controller Extension ✅ COMPLETED

1. ✅ **Updated `utils/validation.js`** to support group posts:
   - Extended `validatePostData()` to accept and validate `groupIds` array
   - Added validation for max 5 groups per post
   - Added duplicate group ID detection

2. ✅ **Updated `controllers/postController.js`** with comprehensive group support:
   - Added group access validation using `validateGroupAccess()`
   - Extended post data model with `groupIds` and `visibility` fields
   - Implemented smart notification logic:
     - Group posts notify group members (excluding creator)
     - Public posts notify followers (existing behavior)
   - Updated response data to include group information

3. ✅ **Extended `utils/notificationService.js`**:
   - Added `getGroupMembersTokens()` function for group notifications
   - Handles multiple groups and deduplicates member tokens
   - Excludes post creator from notifications

4. ✅ **Updated all post retrieval functions**:
   - `getAllPosts()` now includes group information in responses
   - `getPostsByUser()` includes group data
   - Maintains backward compatibility with existing posts

## API Documentation

### Groups Endpoints

#### POST /api/groups
Create a new group.

**Request Body:**
```json
{
  "name": "Ski Trip 2024",
  "description": "Planning our winter getaway!"
}
```

**Validation Rules:**
- `name`: Required, 3-50 characters
- `description`: Optional, max 200 characters

**Response (201):**
```json
{
  "success": true,
  "message": "Group created successfully",
  "data": {
    "id": "g123456789",
    "name": "Ski Trip 2024",
    "description": "Planning our winter getaway!",
    "ownerId": "u123456789",
    "members": ["u123456789"],
    "invites": [],
    "createdAt": "2025-06-14T18:00:00.000Z",
    "updatedAt": "2025-06-14T18:00:00.000Z",
    "settings": {
      "postNotifications": true,
      "membershipNotifications": true
    }
  },
  "timestamp": "2025-06-14T18:00:00.000Z"
}
```

#### POST /api/groups/:id/invite
Invite users to a group.

**Request Body:**
```json
{
  "userIds": ["u987654321", "u555666777"]
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Invitations sent successfully",
  "data": {
    "groupId": "g123456789",
    "invitedUsers": ["u987654321", "u555666777"],
    "pendingInvites": 2
  },
  "timestamp": "2025-06-14T18:00:00.000Z"
}
```

#### POST /api/groups/:id/leave
Leave a group.

**Response (200):**
```json
{
  "success": true,
  "message": "Left group successfully",
  "data": {
    "groupId": "g123456789",
    "userId": "u987654321",
    "remainingMembers": 1
  },
  "timestamp": "2025-06-14T18:00:00.000Z"
}
```

#### GET /api/groups/:id
Get group details.

**Response (200):**
```json
{
  "success": true,
  "message": "Group details retrieved successfully",
  "data": {
    "id": "g123456789",
    "name": "Ski Trip 2024",
    "description": "Planning our winter getaway!",
    "ownerId": "u123456789",
    "members": [
      {
        "id": "u123456789",
        "fullName": "John Doe",
        "email": "john@example.com"
      }
    ],
    "memberCount": 1,
    "createdAt": "2025-06-14T18:00:00.000Z"
  },
  "timestamp": "2025-06-14T18:00:00.000Z"
}
```

#### GET /api/groups/user/:userId
Get groups for a user.

**Response (200):**
```json
{
  "success": true,
  "message": "User groups retrieved successfully",
  "data": {
    "owned": [
      {
        "id": "g123456789",
        "name": "Ski Trip 2024",
        "memberCount": 1
      }
    ],
    "member": [
      {
        "id": "g987654321",
        "name": "Book Club",
        "memberCount": 5
      }
    ],
    "invited": [
      {
        "id": "g555666777",
        "name": "Gaming Night",
        "memberCount": 3
      }
    ]
  },
  "timestamp": "2025-06-14T18:00:00.000Z"
}
```

### Posts Endpoint Extension

#### POST /api/posts
Create a post with group visibility.

**Request Body:**
```json
{
  "rawText": "I just got a new dog! 🐶",
  "groupIds": ["g123456789", "g987654321"]
}
```

**Additional Validation Rules:**
- `groupIds`: Optional array of valid group IDs
- User must be a member of all specified groups

**Response (201):**
```json
{
  "success": true,
  "message": "Post created successfully",
  "data": {
    // ... existing post fields ...
    "groupIds": ["g123456789", "g987654321"],
    "visibility": "groups_only"
  },
  "timestamp": "2025-06-14T18:00:00.000Z"
}
```

## Security Considerations

1. **Access Control**
   - Only group members can view group posts
   - Only group owner can manage settings
   - Members can leave at any time
   - Owner transfer protocol for owner departure

2. **Invitation System**
   - Rate limits on invites
   - Spam prevention
   - Automatic cleanup of stale invites

3. **Content Visibility**
   - Group posts only visible to members
   - Clear indication of post visibility
   - No leakage in search/feeds

## Error Handling

1. **Group Operations**
   - Duplicate group names
   - Invalid member operations
   - Concurrent modifications

2. **Post Operations**
   - Invalid group references
   - Mixed visibility conflicts
   - Member permission changes

## Frontend Integration

1. Group Management UI:
```javascript
const createGroup = async (name, description) => {
  const response = await api.post('/groups', {
    name,
    description
  });
  return response.data;
};

const inviteToGroup = async (groupId, userIds) => {
  const response = await api.post(`/groups/${groupId}/invite`, {
    userIds
  });
  return response.data;
};
```

2. Post Creation with Groups:
```javascript
const CreatePostScreen = () => {
  const [selectedGroups, setSelectedGroups] = useState([]);
  
  const handlePost = async () => {
    await api.post('/posts', {
      rawText,
      groupIds: selectedGroups
    });
  };
  
  // Render UI
};
```

## Testing

1. **Unit Tests**
```javascript
describe('Group Controller', () => {
  test('createGroup validates owner membership', async () => {
    // Test implementation
  });
  
  test('inviteToGroup handles duplicate invites', async () => {
    // Test implementation
  });
});
```

2. **Integration Tests**
```javascript
describe('Group Post Flow', () => {
  test('group post only visible to members', async () => {
    // Test implementation
  });
});
```

## Future Extensions

1. **Advanced Group Features**
   - Roles and permissions
   - Group categories/tags
   - Group discovery
   - Private/public groups

2. **Content Management**
   - Group media galleries
   - Pinned posts
   - Group events
   - Polls and surveys

3. **Analytics**
   - Group engagement metrics
   - Member activity tracking
   - Content performance
   - Growth analytics 