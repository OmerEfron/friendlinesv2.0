## Rate Limiting

The API implements rate limiting to prevent abuse:

- **General**: 100 requests per 15 minutes per IP (1000 in development)
- **Login**: 5 attempts per 15 minutes per IP  
- **Post Creation**: 10 posts per hour per IP
- **Post Updates**: 20 updates per hour per IP
- **Reset**: 3 resets per hour per IP (development only)

Rate limit headers are included in responses:
- `RateLimit-Limit`: Request limit per window
- `RateLimit-Remaining`: Remaining requests in current window
- `RateLimit-Reset`: Time when the rate limit resets
