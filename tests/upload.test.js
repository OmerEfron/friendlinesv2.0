const request = require('supertest');
const path = require('path');
const fs = require('fs');

// Setup test environment
process.env.NODE_ENV = 'test';

const app = require('../server.js');

describe('Upload Tests', () => {
  let testUserId = null;

  beforeEach(async () => {
    // Reset data before each test
    await request(app).post('/api/reset');

    // Create a test user
    const userResponse = await request(app)
      .post('/api/login')
      .send({
        fullName: 'John Doe',
        email: 'john.doe@example.com'
      });

    testUserId = userResponse.body.data.id;
  });

  afterEach(async () => {
    // Clean up uploaded files
    const uploadsDir = path.join(__dirname, '..', 'uploads', 'avatars');
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      files.forEach(file => {
        if (file.startsWith(testUserId)) {
          fs.unlinkSync(path.join(uploadsDir, file));
        }
      });
    }
  });

  describe('POST /api/upload/avatar/:id - Avatar Upload', () => {
    test('should upload avatar successfully with valid image', async () => {
      // Create a simple test image buffer (1x1 pixel PNG)
      const testImageBuffer = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
        0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
        0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0x00, 0x00, 0x00,
        0x01, 0x00, 0x01, 0x5C, 0xC2, 0x8A, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45,
        0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
      ]);

      const response = await request(app)
        .post(`/api/upload/avatar/${testUserId}`)
        .attach('avatar', testImageBuffer, 'test.png');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Avatar uploaded successfully');
      expect(response.body.data.url).toBeDefined();
      expect(response.body.data.fileSize).toBeDefined();
      expect(response.body.data.dimensions).toBeDefined();
    });

    test('should return 400 when no file is uploaded', async () => {
      const response = await request(app)
        .post(`/api/upload/avatar/${testUserId}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('No file uploaded');
    });

    test('should return 404 for non-existent user', async () => {
      // Create a simple test image buffer
      const testImageBuffer = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
        0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
        0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0x00, 0x00, 0x00,
        0x01, 0x00, 0x01, 0x5C, 0xC2, 0x8A, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45,
        0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
      ]);

      const response = await request(app)
        .post('/api/upload/avatar/u999999999')
        .attach('avatar', testImageBuffer, 'test.png');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User not found');
    });

    test('should return 400 for invalid user ID format', async () => {
      const testImageBuffer = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
        0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
        0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0x00, 0x00, 0x00,
        0x01, 0x00, 0x01, 0x5C, 0xC2, 0x8A, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45,
        0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
      ]);

      const response = await request(app)
        .post('/api/upload/avatar/invalid-id')
        .attach('avatar', testImageBuffer, 'test.png');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid user ID format');
    });

    test('should reject non-image files', async () => {
      const textBuffer = Buffer.from('This is a text file, not an image');

      const response = await request(app)
        .post(`/api/upload/avatar/${testUserId}`)
        .attach('avatar', textBuffer, 'test.txt');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should update user record with avatar URL', async () => {
      // Create a simple test image buffer
      const testImageBuffer = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
        0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
        0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0x00, 0x00, 0x00,
        0x01, 0x00, 0x01, 0x5C, 0xC2, 0x8A, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45,
        0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
      ]);

      // Upload avatar
      const uploadResponse = await request(app)
        .post(`/api/upload/avatar/${testUserId}`)
        .attach('avatar', testImageBuffer, 'test.png');

      expect(uploadResponse.status).toBe(200);

      // Check if user profile is updated
      const profileResponse = await request(app)
        .get(`/api/users/${testUserId}`);

      expect(profileResponse.status).toBe(200);
      expect(profileResponse.body.data.avatar).toBeDefined();
      expect(profileResponse.body.data.avatar).toContain('/uploads/avatars/');
    });
  });

  describe('Rate Limiting - Upload', () => {
    test('should enforce rate limit for uploads', async () => {
      const testImageBuffer = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
        0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
        0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0x00, 0x00, 0x00,
        0x01, 0x00, 0x01, 0x5C, 0xC2, 0x8A, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45,
        0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
      ]);

      // Make 10 successful requests (should be allowed)
      for (let i = 0; i < 10; i++) {
        const response = await request(app)
          .post(`/api/upload/avatar/${testUserId}`)
          .attach('avatar', testImageBuffer, `test${i}.png`);
        expect(response.status).toBe(200);
      }

      // 11th request should be rate limited
      const response = await request(app)
        .post(`/api/upload/avatar/${testUserId}`)
        .attach('avatar', testImageBuffer, 'test11.png');

      expect(response.status).toBe(429);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Too many file uploads');
    });
  });
}); 