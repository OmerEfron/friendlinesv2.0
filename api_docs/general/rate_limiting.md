## Rate Limiting

The API implements rate limiting to prevent abuse and ensure fair usage across all users.

### Rate Limit Rules

- **General API**: 100 requests per 15 minutes per IP (1000 in development)
- **Authentication**: 5 login attempts per 15 minutes per IP  
- **Post Creation**: 10 posts per hour per IP
- **Post Updates**: 20 updates per hour per IP
- **Profile Updates**: 5 updates per hour per IP
- **Development Reset**: 3 resets per hour per IP (development only)

### Rate Limit Headers

All responses include rate limiting information in headers:

- `RateLimit-Limit`: Maximum requests allowed in the current window
- `RateLimit-Remaining`: Number of requests remaining in current window
- `RateLimit-Reset`: Unix timestamp when the rate limit window resets

### Example Response Headers

```
RateLimit-Limit: 100
RateLimit-Remaining: 87
RateLimit-Reset: 1640995200
```

### Rate Limit Exceeded Response

When rate limits are exceeded, the API returns a `429 Too Many Requests` status:

```json
{
  "success": false,
  "message": "Rate limit exceeded",
  "error": "Too many requests, please try again later",
  "retryAfter": 900,
  "timestamp": "2025-06-14T18:00:00.000Z"
}
```

### Best Practices

- Monitor rate limit headers in your application
- Implement exponential backoff for retry logic
- Cache responses when possible to reduce API calls
- Use pagination to limit large data requests
