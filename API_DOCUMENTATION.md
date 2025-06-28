# Friendlines API Documentation

## 🚀 Quick Start

### Base URL
- **Development**: `http://localhost:3000`
- **Production**: `https://your-production-url.com`

### Interactive Documentation
Visit **`/api-docs`** for interactive Swagger UI documentation where you can:
- Browse all endpoints
- Test API calls directly in the browser
- View request/response schemas
- Copy curl commands

**Example**: `http://localhost:3000/api-docs`

## 📋 API Overview

The Friendlines API is a RESTful service that transforms everyday updates into satirical newsflashes. It supports user authentication, social features, group management, and push notifications.

### Key Features
- **User Authentication**: Login/registration without passwords
- **Social Features**: Friend requests, friendship management
- **Posts**: Create, manage, and transform posts into newsflashes
- **Groups**: Create and manage user groups
- **Notifications**: Push notification support
- **File Upload**: Avatar and media upload capabilities

## 🔧 Getting Started

### 1. Install Dependencies
```bash
cd friendlinesv2.0
npm install
```

### 2. Environment Setup
Create a `.env` file with:
```env
NODE_ENV=development
PORT=3000
# Add other environment variables as needed
```

### 3. Start the Server
```bash
npm run dev
```

### 4. Access Documentation
Open your browser to `http://localhost:3000/api-docs`

## 📱 For Frontend Developers

### Standard Response Format
All API responses follow this structure:
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data varies by endpoint
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Error Response Format
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error information",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Authentication
Most endpoints don't require authentication, but user-specific operations need the user ID in the request.

### Rate Limiting
- **Login endpoints**: 5 requests per minute
- **General endpoints**: 100 requests per 15 minutes
- **Profile updates**: 5 requests per hour

## 🔗 Main Endpoint Categories

### 1. Authentication & Users (`/api`)
- User login/registration
- Profile management
- Friend system (send/accept/reject requests)
- User statistics

### 2. Posts (`/api/posts`)
- Create and manage posts
- Transform posts into newsflashes
- Social interactions (likes, comments)
- Audience targeting

### 3. Groups (`/api/groups`)
- Create and manage groups
- Group membership
- Invitations and permissions

### 4. Social Features (`/api/social`)
- Mutual friends discovery
- Friend suggestions
- Bulk friendship status checks

### 5. Notifications (`/api/notifications`)
- Push notification registration
- Notification management
- Mark notifications as read

### 6. File Upload (`/api/upload`)
- Avatar uploads
- Media file handling

## 🛠️ Development Tools

### Available Scripts
```bash
# Start development server
npm run dev

# Generate API documentation
npm run docs:generate

# Run tests
npm test

# Reset development data
npm run dev:reset
```

### Health Check
```bash
GET /health
```
Returns server status and uptime information.

## 📊 Example API Calls

### User Login
```javascript
const response = await fetch('http://localhost:3000/api/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    username: 'john_doe',
    email: 'john@example.com',
    avatar: 'https://example.com/avatar.jpg'
  })
});

const data = await response.json();
```

### Create a Post
```javascript
const response = await fetch('http://localhost:3000/api/posts', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    userId: 'user_123',
    content: 'Just had the best coffee ever!',
    audience: 'friends'
  })
});

const data = await response.json();
```

### Get User Profile
```javascript
const response = await fetch('http://localhost:3000/api/users/user_123');
const data = await response.json();
```

## 🔍 TypeScript Support

For React Native/TypeScript projects, you can generate TypeScript types from the OpenAPI specification:

```bash
# Install openapi-typescript
npm install -D openapi-typescript

# Generate types from your running server
npx openapi-typescript http://localhost:3000/api-docs/swagger.json --output types/api.ts
```

## 🚦 Status Codes

- **200**: Success
- **201**: Created
- **400**: Bad Request
- **404**: Not Found
- **422**: Validation Error
- **429**: Rate Limited
- **500**: Server Error

## 📝 Adding New Endpoints

When adding new endpoints, follow this pattern:

1. **Add route with Swagger documentation**:
```javascript
/**
 * @swagger
 * /api/your-endpoint:
 *   post:
 *     tags: [YourTag]
 *     summary: Brief description
 *     description: Detailed description
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               field:
 *                 type: string
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.post('/your-endpoint', yourController);
```

2. **Update Swagger schemas** in `swaggerDef.js` if needed
3. **Test the endpoint** in `/api-docs`
4. **Update this documentation** if it's a major feature

## 🐛 Debugging

### Common Issues
1. **CORS errors**: Check `corsOptions` in `server.js`
2. **Rate limiting**: Check rate limiter configuration
3. **Validation errors**: Check middleware validation rules

### Useful Endpoints for Debugging
- `GET /health` - Server health check
- `GET /api/users/stats` - User statistics (development only)
- `POST /api/reset` - Reset all data (development only)

## 📞 Support

For questions or issues:
1. Check the interactive documentation at `/api-docs`
2. Review this README
3. Check the server logs for detailed error information
4. Contact the backend team

## 🔄 Keeping Documentation Updated

The API documentation is automatically generated from code comments. When you:
1. Add new endpoints → Add Swagger comments
2. Change response schemas → Update `swaggerDef.js`
3. Add new features → Update this README

The documentation will automatically reflect your changes when you restart the server. 