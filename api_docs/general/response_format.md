## Response Format

All API responses follow this standard format:

```json
{
  "success": true|false,
  "message": "Human readable message",
  "data": {}, // Response data (varies by endpoint)
  "timestamp": "2025-06-14T18:00:00.000Z",
  "pagination": {} // Only for paginated endpoints
}
```

### Error Response Format

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message",
  "errors": ["Array of validation errors"], // For validation failures
  "timestamp": "2025-06-14T18:00:00.000Z"
}
```
