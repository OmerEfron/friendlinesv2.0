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
