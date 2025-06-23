# Friendlines Backend

A satirical social news API that transforms everyday life updates into dramatic newsflashes. Built with Node.js and Express for the Friendlines POC.

## Features

- **User Authentication**: Secure login/registration system
- **Friendship System**: Bidirectional friend requests and management
- **Newsflash Posts**: Automatic satirical news generation with GPT/deterministic options
- **Audience Targeting**: Granular privacy controls (friends/groups/specific friend)
- **Group Management**: Create, join, and manage groups with member notifications
- **Social Features**: Likes, comments, and engagement tracking
- **Push Notifications**: Real-time notifications via Expo
- **Rate Limiting**: Comprehensive abuse prevention
- **SQLite Database**: Reliable data persistence with automatic migration
- **Comprehensive Testing**: 90%+ test coverage with Jest and Supertest

👉 For the full API reference, see **[api_docs/README.md](api_docs/README.md)**.

📋 For recent changes and version history, see **[docs/CHANGELOG.md](docs/CHANGELOG.md)**.

📖 For comprehensive documentation navigation, see **[docs/README.md](docs/README.md)**.

## 🚀 Quick Start

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables (create `.env` file):
```bash
# Required
PORT=3000
NODE_ENV=development

# Optional - for GPT newsflash generation
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_CHAT_MODEL=gpt-3.5-turbo
```

3. Start the server:
```bash
npm run dev
```

## GPT Newsflash Generation

The backend now supports enhanced newsflash generation using OpenAI's ChatGPT API alongside the original deterministic generator.

### Setup

1. Get an OpenAI API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Add it to your environment variables:
```bash
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_CHAT_MODEL=gpt-3.5-turbo  # optional, defaults to gpt-3.5-turbo
```

### Features

- **Environment-Based Selection**: Development mode uses deterministic generation for consistency
- **Production GPT**: Production mode uses OpenAI GPT when API key is available
- **Automatic Fallback**: If GPT generation fails or no API key is provided, falls back to deterministic generation
- **Configurable Tone**: Choose from satirical, serious, humorous, sarcastic, excited
- **Length Control**: Short (1 sentence) or long (2-3 sentences)
- **Temperature Control**: Adjust creativity level (0-2)
- **Preview Endpoint**: Test newsflash generation without creating a post

### Usage

#### Creating Posts with GPT Options

```bash
POST /api/posts
{
  "rawText": "Just got a new puppy!",
  "userId": "u123456789",
  "tone": "excited",
  "length": "short",
  "temperature": 0.8
}
```

#### Preview Newsflash Generation

```bash
POST /api/posts/generate-newsflash
{
  "rawText": "Just got a new puppy!",
  "userId": "u123456789",
  "tone": "humorous",
  "length": "long",
  "temperature": 1.0
}
```

Response:
```json
{
  "success": true,
  "data": {
    "rawText": "Just got a new puppy!",
    "generatedText": "BREAKING: Local resident welcomes adorable four-legged chaos into their previously peaceful home! Sources report the new puppy has already claimed the best spot on the couch.",
    "method": "gpt",
    "user": { "id": "u123456789", "fullName": "John Doe" },
    "options": { "tone": "humorous", "length": "long", "temperature": 1.0 }
  }
}
```

### Implementation Details

- Uses Node.js built-in `fetch` (Node 20+)
- Environment-aware generation: deterministic in development, GPT in production
- Graceful error handling with fallback
- Input validation and sanitization
- Comprehensive test coverage
- Rate limiting protection

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

### Environment-Based Generation:

**Development Mode** (`NODE_ENV=development`):
- Always uses deterministic rule-based generation
- Ensures consistent behavior during testing and development
- No API calls made, even if `OPENAI_API_KEY` is present

**Production Mode** (`NODE_ENV=production`):
- Uses OpenAI GPT if `OPENAI_API_KEY` is available
- Falls back to deterministic generation if GPT fails or no API key
- Supports configurable tone, length, and temperature

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
- `NODE_ENV` - Environment mode (development = deterministic newsflash, production = GPT if available)
- `OPENAI_API_KEY` - OpenAI API key for GPT newsflash generation (production only)
- `OPENAI_CHAT_MODEL` - OpenAI model to use (default: gpt-3.5-turbo)

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
