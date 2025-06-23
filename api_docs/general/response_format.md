## Response Format

All API responses follow a consistent structure to ensure predictable parsing and error handling.

### Success Response Format

```json
{
  "success": true,
  "message": "Human readable description of the operation",
  "data": {}, // Response data (varies by endpoint)
  "timestamp": "2025-06-14T18:00:00.000Z",
  "pagination": {} // Only present for paginated endpoints
}
```

### Error Response Format

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message",
  "errors": ["Array of validation errors"], // For validation failures (422)
  "timestamp": "2025-06-14T18:00:00.000Z"
}
```

### Response Examples

#### Successful Data Retrieval
```json
{
  "success": true,
  "message": "User profile retrieved successfully",
  "data": {
    "id": "u123456789",
    "fullName": "John Doe",
    "email": "john@example.com"
  },
  "timestamp": "2025-06-14T18:00:00.000Z"
}
```

#### Paginated Response
```json
{
  "success": true,
  "message": "Posts retrieved successfully",
  "data": [
    {
      "id": "p987654321",
      "rawText": "Hello world!",
      "generatedText": "BREAKING: Hello world!"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalPosts": 50,
    "totalPages": 3,
    "hasNextPage": true,
    "hasPrevPage": false
  },
  "timestamp": "2025-06-14T18:00:00.000Z"
}
```

#### Validation Error (422)
```json
{
  "success": false,
  "message": "Validation failed",
  "error": "Request contains invalid data",
  "errors": [
    "Full name must contain first and last name",
    "Email format is invalid"
  ],
  "timestamp": "2025-06-14T18:00:00.000Z"
}
```

#### Not Found Error (404)
```json
{
  "success": false,
  "message": "User not found",
  "error": "No user found with ID: u123456789",
  "timestamp": "2025-06-14T18:00:00.000Z"
}
```

#### Rate Limit Error (429)
```json
{
  "success": false,
  "message": "Rate limit exceeded",
  "error": "Too many requests, please try again later",
  "retryAfter": 900,
  "timestamp": "2025-06-14T18:00:00.000Z"
}
```

### Field Descriptions

- **success**: Boolean indicating if the request was successful
- **message**: Human-readable description of the result
- **data**: The main response payload (varies by endpoint)
- **timestamp**: ISO 8601 timestamp of when the response was generated
- **pagination**: Pagination metadata (only for paginated endpoints)
- **error**: Detailed error message (error responses only)
- **errors**: Array of specific validation errors (422 responses only)
- **retryAfter**: Seconds to wait before retrying (429 responses only)
