## Groups Endpoints

### POST /api/groups/:userId
Create a new group.

**Parameters:**
- `userId`: User ID of the group creator (required)

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

**Error Responses:**
- `400`: Validation failed (invalid name or description)
- `404`: User not found
- `429`: Too many requests (rate limited)
- `500`: Server error

---

### POST /api/groups/:id/invite
Invite users to a group.

**Parameters:**
- `id`: Group ID (required)

**Request Body:**
```json
{
  "userIds": ["u987654321", "u555666777"],
  "userId": "u123456789"
}
```

**Validation Rules:**
- `userIds`: Required array, 1-10 user IDs, no duplicates
- `userId`: Required, valid user ID (current user)

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

**Error Responses:**
- `400`: Validation failed (invalid user IDs or too many invites)
- `403`: Access denied (not a group member)
- `404`: Group not found or invited user not found
- `500`: Server error

---

### POST /api/groups/:id/accept
Accept a group invitation.

**Parameters:**
- `id`: Group ID (required)

**Request Body:**
```json
{
  "userId": "u987654321"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Invitation accepted successfully",
  "data": {
    "groupId": "g123456789",
    "userId": "u987654321",
    "memberCount": 2
  },
  "timestamp": "2025-06-14T18:00:00.000Z"
}
```

**Error Responses:**
- `400`: Validation failed (missing userId)
- `403`: No invitation found
- `404`: Group not found
- `500`: Server error

---

### POST /api/groups/:id/leave
Leave a group.

**Parameters:**
- `id`: Group ID (required)

**Request Body:**
```json
{
  "userId": "u987654321"
}
```

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

**Special Cases:**
- Group owner cannot leave without transferring ownership if other members exist
- If owner leaves and is the last member, the group is deleted

**Error Responses:**
- `400`: Validation failed (missing userId)
- `403`: Not a member or owner cannot leave without transferring ownership
- `404`: Group not found
- `500`: Server error

---

### GET /api/groups/:id
Get group details.

**Parameters:**
- `id`: Group ID (required)

**Query Parameters:**
- `userId`: User ID for access control (optional)

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
      },
      {
        "id": "u987654321",
        "fullName": "Jane Smith",
        "email": "jane@example.com"
      }
    ],
    "memberCount": 2,
    "createdAt": "2025-06-14T18:00:00.000Z",
    "updatedAt": "2025-06-14T18:00:00.000Z"
  },
  "timestamp": "2025-06-14T18:00:00.000Z"
}
```

**Access Control:**
- Only group members and invited users can view group details
- If `userId` is provided, access is validated

**Error Responses:**
- `400`: Invalid group ID format
- `403`: Access denied (not a member or invited)
- `404`: Group not found
- `500`: Server error

---

### GET /api/groups/user/:userId
Get groups for a user.

**Parameters:**
- `userId`: User ID (required)

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
        "description": "Planning our winter getaway!",
        "memberCount": 2,
        "createdAt": "2025-06-14T18:00:00.000Z"
      }
    ],
    "member": [
      {
        "id": "g987654321",
        "name": "Book Club",
        "description": "Monthly book discussions",
        "memberCount": 5,
        "createdAt": "2025-06-12T18:00:00.000Z"
      }
    ],
    "invited": [
      {
        "id": "g555666777",
        "name": "Gaming Night",
        "description": "Weekly gaming sessions",
        "memberCount": 3,
        "createdAt": "2025-06-13T18:00:00.000Z"
      }
    ]
  },
  "timestamp": "2025-06-14T18:00:00.000Z"
}
```

**Response Categories:**
- `owned`: Groups where the user is the owner
- `member`: Groups where the user is a member (but not owner)
- `invited`: Groups where the user has pending invitations

**Error Responses:**
- `400`: Invalid user ID format
- `404`: User not found
- `500`: Server error

--- 