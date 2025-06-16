# Friendlines Backend

A satirical social news API that transforms everyday life updates into dramatic newsflashes. Built with Node.js and Express for the Friendlines POC.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start the server
npm start

# Run in development mode with auto-restart
npm run dev

# Run tests
npm test
```

The server will start on `http://localhost:3000` by default.

## 📡 API Endpoints

### Health Check

- **GET** `/health` - Server health status

### Authentication

- **POST** `/api/login` - User login/registration (no password required)
- **GET** `/api/users` - Get all users (development only)
- **GET** `/api/users/:id` - Get user profile by ID
- **POST** `/api/users/check` - Check if user exists by email
- **GET** `/api/users/stats` - Get user statistics (development only)

### Posts (Newsflashes)

- **GET** `/api/posts` - Get all posts with pagination
- **GET** `/api/posts/:userId` - Get posts by specific user
- **POST** `/api/posts` - Create new post with newsflash generation
- **PUT** `/api/posts/:id` - Update post (regenerates newsflash)
- **DELETE** `/api/posts/:id` - Delete post
- **GET** `/api/posts/single/:id` - Get specific post by ID
- **GET** `/api/posts/stats` - Get post statistics (development only)

### Development Tools

- **POST** `/api/reset` - Clear all data (development only)
- **GET** `/api/reset/status` - Get reset status and data overview
- **POST** `/api/reset/users` - Clear only users data
- **POST** `/api/reset/posts` - Clear only posts data

## 🔥 Example Usage

### Create a User

```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"fullName": "John Doe", "email": "john@example.com"}'
```

Response:

```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "id": "u123456789",
    "fullName": "John Doe",
    "email": "john@example.com",
    "createdAt": "2025-06-14T18:00:00.000Z",
    "updatedAt": "2025-06-14T18:00:00.000Z"
  }
}
```

### Create a Post (Generate Newsflash)

```bash
curl -X POST http://localhost:3000/api/posts \
  -H "Content-Type: application/json" \
  -d '{"rawText": "I just got a new dog! 🐶", "userId": "u123456789"}'
```

Response:

```json
{
  "success": true,
  "message": "Post created successfully",
  "data": {
    "id": "p987654321",
    "userId": "u123456789",
    "userFullName": "John Doe",
    "rawText": "I just got a new dog! 🐶",
    "generatedText": "URGENT: John Doe just got a new dog! 🐶. - Sources confirm.",
    "timestamp": "2025-06-14T18:00:00.000Z",
    "createdAt": "2025-06-14T18:00:00.000Z",
    "updatedAt": "2025-06-14T18:00:00.000Z"
  }
}
```

### Get All Posts (Newsfeed)

```bash
curl http://localhost:3000/api/posts
```

Response includes pagination:

```json
{
  "success": true,
  "message": "Posts retrieved successfully",
  "data": [
    {
      "id": "p987654321",
      "userId": "u123456789",
      "userFullName": "John Doe",
      "rawText": "I just got a new dog! 🐶",
      "generatedText": "URGENT: John Doe just got a new dog! 🐶. - Sources confirm.",
      "timestamp": "2025-06-14T18:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalPosts": 1,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPrevPage": false
  }
}
```

## 🧠 Newsflash Generation

The newsflash generator transforms first-person updates into third-person news-style announcements:

- **Input**: "I just got a new job!"
- **Output**: "BREAKING: John Doe just got a new job!"

### Features:

- ✅ Converts first-person pronouns to third-person
- ✅ Transforms verb tenses appropriately
- ✅ Adds news-style prefixes (BREAKING, URGENT, EXCLUSIVE, etc.)
- ✅ Preserves emojis and special characters
- ✅ Intelligent prefix selection based on content
- ✅ Random urgency indicators

### Prefix Selection:

- **EXCLUSIVE**: Content with "secret" or "surprise"
- **URGENT**: Content with "just" or "finally"
- **DEVELOPING**: Content with "working" or "starting"
- **BREAKING**: Default prefix

## 📁 Data Storage

Uses JSON files for POC simplicity:

- `data/users.json` - User profiles
- `data/posts.json` - Posts and newsflashes

### User Data Model:

```json
{
  "id": "u123456789",
  "fullName": "John Doe",
  "email": "john@example.com",
  "createdAt": "2025-06-14T18:00:00.000Z",
  "updatedAt": "2025-06-14T18:00:00.000Z"
}
```

### Post Data Model:

```json
{
  "id": "p987654321",
  "userId": "u123456789",
  "rawText": "I just got a new dog! 🐶",
  "generatedText": "URGENT: John Doe just got a new dog! 🐶. - Sources confirm.",
  "timestamp": "2025-06-14T18:00:00.000Z",
  "createdAt": "2025-06-14T18:00:00.000Z",
  "updatedAt": "2025-06-14T18:00:00.000Z"
}
```

## 🛡️ Security & Validation

- Input validation and sanitization
- Rate limiting by IP address
- CORS configuration
- Content security headers
- XSS protection
- Request size limits

## 🔧 Configuration

### Environment Variables:

- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment mode (development/production)

### Rate Limits:

- General: 100 requests per 15 minutes
- Login: 5 attempts per 15 minutes
- Post creation: 10 posts per hour
- Post updates: 20 updates per hour
- Reset: 3 resets per hour (development only)

## 📊 Development Features

### Reset Endpoint

Clear all data for testing:

```bash
curl -X POST http://localhost:3000/api/reset
```

### Statistics Endpoints

Get insights (development only):

```bash
# User statistics
curl http://localhost:3000/api/users/stats

# Post statistics
curl http://localhost:3000/api/posts/stats
```

## 🧪 Testing

Run the test suite:

```bash
npm test
```

Tests cover:

- Newsflash generation logic
- Input validation
- Data sanitization
- Error handling

## 🚀 Production Considerations

For production deployment:

1. Set `NODE_ENV=production`
2. Configure proper CORS origins
3. Set up proper logging
4. Consider database migration from JSON files
5. Implement authentication/authorization
6. Add monitoring and health checks

## 🔌 Frontend Integration

This backend is designed to work with the Friendlines React Native frontend. Key integration points:

- User session management via AsyncStorage
- Real-time-like feed updates
- Optimistic UI updates
- Error handling and retry logic

## 📚 API Documentation

Visit `http://localhost:3000/` for complete API endpoint documentation when the server is running.

---

Built with ❤️ for the Friendlines POC - turning everyday moments into breaking news!
