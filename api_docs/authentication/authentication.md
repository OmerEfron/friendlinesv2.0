## Authentication

The API uses a simplified authentication system suitable for the POC:
- No passwords required
- Users are created/logged in with email + full name
- No JWT tokens or sessions (stateless)
- User ID must be passed with requests that require user context
