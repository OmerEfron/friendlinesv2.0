# Upload Endpoints

## POST /api/upload/avatar/:id
Upload a user avatar image.

**Parameters:**
- `id`: User ID (required)

**Request:**
- **Content-Type:** `multipart/form-data`
- **File Field:** `avatar`
- **Supported Formats:** JPEG, PNG, GIF, WebP
- **Max File Size:** 5MB

**Response:**
```json
{
  "success": true,
  "message": "Avatar uploaded successfully",
  "data": {
    "url": "/uploads/avatars/u123456789.jpg",
    "fileSize": 1024000,
    "dimensions": {
      "width": 400,
      "height": 400
    }
  },
  "timestamp": "2025-06-14T19:30:00.000Z"
}
```

**Rate Limiting:**
- 10 uploads per hour per IP

**Error Responses:**
- `400`: Invalid user ID format, no file uploaded, or invalid file type
- `404`: User not found
- `413`: File too large (exceeds 5MB)
- `429`: Too many uploads (rate limited)
- `500`: Server error

**Example:**
```bash
curl -X POST http://localhost:3000/api/upload/avatar/u123456789 \
  -F "avatar=@profile-photo.jpg"
```

## File Storage

- **Development:** Files stored in `/backend/uploads/avatars/`
- **Production:** Files would typically be stored in a CDN or cloud storage
- **Naming:** Files are named using the user ID with original extension
- **Access:** Static files served via `/uploads/avatars/:filename`

## Validation Rules

1. **File Type Validation:**
   - Only image files allowed (JPEG, PNG, GIF, WebP)
   - MIME type validation performed server-side

2. **Size Limits:**
   - Maximum file size: 5MB
   - Enforced at middleware level

3. **User Validation:**
   - User ID must exist in system
   - User record updated with avatar URL upon successful upload

## Security Considerations

- File type validation prevents malicious file uploads
- Files stored outside web root in production
- Rate limiting prevents abuse
- User authentication required (user must exist)

## Integration Notes

After successful avatar upload:
1. User record updated with `avatar` field containing the file URL
2. Previous avatar file (if any) should be cleaned up
3. Frontend can immediately display the new avatar using the returned URL

--- 