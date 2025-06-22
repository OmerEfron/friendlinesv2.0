## Authentication Endpoints

### POST /api/login
Create a new user or log in an existing user.

**Request Body:**
```json
{
  "fullName": "John Doe",
  "email": "john@example.com"
}
```

**Validation Rules:**
- `fullName`: Required, must contain first and last name, letters/spaces/hyphens/apostrophes only
- `email`: Required, valid email format

**Response (201 for new user, 200 for existing):**
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "id": "u123456789",
    "fullName": "John Doe",
    "email": "john@example.com",
    "createdAt": "2025-06-14T18:00:00.000Z",
    "updatedAt": "2025-06-14T18:00:00.000Z",
    "followersCount": 0,
    "followingCount": 0
  },
  "timestamp": "2025-06-14T18:00:00.000Z"
}
```

**Error Responses:**
- `400`: Validation failed
- `429`: Too many login attempts (rate limited)
- `500`: Server error

---

### GET /api/users/:id
Get user profile by ID.

**Parameters:**
- `id`: User ID (required)

**Response:**
```json
{
  "success": true,
  "message": "User profile retrieved successfully",
  "data": {
    "id": "u123456789",
    "fullName": "John Doe",
    "email": "john@example.com",
    "createdAt": "2025-06-14T18:00:00.000Z",
    "updatedAt": "2025-06-14T18:00:00.000Z",
    "followersCount": 0,
    "followingCount": 0
  },
  "timestamp": "2025-06-14T18:00:00.000Z"
}
```

**Error Responses:**
- `400`: Invalid user ID format
- `404`: User not found
- `500`: Server error

---

### POST /api/users/check
Check if a user exists by email.

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User existence check completed",
  "data": {
    "exists": true,
    "email": "john@example.com"
  },
  "timestamp": "2025-06-14T18:00:00.000Z"
}
```

---

### PUT /api/users/:id
Update user profile information.

**Parameters:**
- `id`: User ID (required)

**Request Body:**
```json
{
  "fullName": "John Smith",
  "bio": "Software developer and coffee enthusiast",
  "location": "San Francisco, CA",
  "website": "https://johnsmith.dev",
  "avatar": "/uploads/avatars/u123456789.jpg"
}
```

**Validation Rules:**
- `fullName`: Optional, must contain first and last name with valid characters
- `bio`: Optional, max 160 characters
- `location`: Optional, max 100 characters  
- `website`: Optional, must be valid URL format
- `avatar`: Optional, string (URL or base64), max 1MB

**Response:**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "id": "u123456789",
    "fullName": "John Smith",
    "email": "john@example.com",
    "bio": "Software developer and coffee enthusiast",
    "location": "San Francisco, CA",
    "website": "https://johnsmith.dev",
    "avatar": "/uploads/avatars/u123456789.jpg",
    "createdAt": "2025-06-14T18:00:00.000Z",
    "updatedAt": "2025-06-14T19:30:00.000Z",
    "followersCount": 0,
    "followingCount": 0
  },
  "timestamp": "2025-06-14T19:30:00.000Z"
}
```

**Rate Limiting:**
- 5 requests per hour per IP

**Error Responses:**
- `400`: Invalid user ID format or validation failed
- `404`: User not found
- `429`: Too many profile updates (rate limited)
- `500`: Server error

**Example:**
```bash
curl -X PUT http://localhost:3000/api/users/u123456789 \
  -H "Content-Type: application/json" \
  -d '{
    "bio": "Full-stack developer",
    "location": "New York, NY"
  }'
```

---

### Social Features

For social features (follow/unfollow, followers, following), see the detailed social features documentation.

### Push Notifications

For push notification token registration, see the [Notification Endpoints](./notification_endpoints.md) documentation.

---
