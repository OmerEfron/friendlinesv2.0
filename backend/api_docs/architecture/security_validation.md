## Security & Validation

### Input Validation
- All endpoints validate input data using middleware
- Email format validation using regex
- Full name validation (letters, spaces, hyphens, apostrophes only)
- Post text validation (1-280 characters, no script tags)
- Comment text validation (1-500 characters)
- ID format validation (alphanumeric, underscores, hyphens)

### Security Headers
- Helmet.js for security headers
- Content Security Policy configured
- CORS configured with allowed origins
- Request size limits (10MB max)

### Rate Limiting
- Express-rate-limit for API protection
- Different limits for different endpoint types
- IP-based tracking
- Graceful error responses with retry information

### Content Security
- XSS protection through input sanitization
- HTML/script tag filtering
- Event handler removal from user input

---
