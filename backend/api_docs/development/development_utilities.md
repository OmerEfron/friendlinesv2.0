## Development Utilities

### Testing the API

#### Health Check
```bash
curl http://localhost:3000/health
```

#### User Management
```bash
# Create user
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"fullName": "John Doe", "email": "john@example.com"}'

# Get user profile
curl http://localhost:3000/api/users/USER_ID_HERE

# Get all users (dev only)
curl http://localhost:3000/api/users
```

#### Post Management
```bash
# Create post
curl -X POST http://localhost:3000/api/posts \
  -H "Content-Type: application/json" \
  -d '{"rawText": "I just got a new dog! 🐶", "userId": "USER_ID_HERE"}'

# Get all posts
curl http://localhost:3000/api/posts

# Get posts by user
curl http://localhost:3000/api/posts/USER_ID_HERE

# Update post
curl -X PUT http://localhost:3000/api/posts/POST_ID_HERE \
  -H "Content-Type: application/json" \
  -d '{"rawText": "Updated post text"}'
```

#### Social Features
```bash
# Like a post
curl -X POST http://localhost:3000/api/posts/POST_ID_HERE/like \
  -H "Content-Type: application/json" \
  -d '{"userId": "USER_ID_HERE"}'

# Get likes for a post
curl http://localhost:3000/api/posts/POST_ID_HERE/likes

# Add comment
curl -X POST http://localhost:3000/api/posts/POST_ID_HERE/comments \
  -H "Content-Type: application/json" \
  -d '{"userId": "USER_ID_HERE", "text": "Great post!"}'

# Get comments
curl http://localhost:3000/api/posts/POST_ID_HERE/comments

# Follow user
curl -X POST http://localhost:3000/api/users/TARGET_USER_ID/follow \
  -H "Content-Type: application/json" \
  -d '{"userId": "CURRENT_USER_ID"}'

# Get followers
curl http://localhost:3000/api/users/USER_ID_HERE/followers

# Get following
curl http://localhost:3000/api/users/USER_ID_HERE/following
```

#### Development Tools
```bash
# Reset all data (development only)
curl -X POST http://localhost:3000/api/reset

# Get reset status
curl http://localhost:3000/api/reset/status

# Get statistics
curl http://localhost:3000/api/users/stats
curl http://localhost:3000/api/posts/stats
```

### Environment Setup
Make sure your frontend can handle:
- CORS requests to `http://localhost:3000`
- JSON request/response format
- Rate limiting responses (429 status codes)
- Proper error handling for all status codes
- Social features (likes, comments, follows)
- Pagination for lists

### CORS Configuration
The backend is configured to accept requests from:
- `http://localhost:3000`
- `http://localhost:19006` (Expo development server)
- `exp://localhost:19000` (Expo development server)
- All origins in development mode

---

**Need help?** Check the server logs or contact the backend team!

The API is fully functional with all social features implemented including likes, comments, follows, and comprehensive user/post management. All endpoints are rate-limited and validated for security. 