const request = require('supertest');

// Setup test environment
process.env.NODE_ENV = 'test';

const app = require('../server.js');

describe('Profile Management Tests (Simple)', () => {
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

  describe('PUT /api/users/:id - Update Profile', () => {
    test('should update user profile with valid data', async () => {
      const updateData = {
        fullName: 'John Smith',
        bio: 'Software developer and coffee enthusiast',
        location: 'San Francisco, CA',
        website: 'https://johnsmith.dev'
      };

      const response = await request(app)
        .put(`/api/users/${testUserId}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Profile updated successfully');
      expect(response.body.data.fullName).toBe(updateData.fullName);
      expect(response.body.data.bio).toBe(updateData.bio);
      expect(response.body.data.location).toBe(updateData.location);
      expect(response.body.data.website).toBe(updateData.website);
      expect(response.body.data.updatedAt).toBeDefined();
    });

    test('should validate bio length limit', async () => {
      const longBio = 'a'.repeat(161); // 161 characters, exceeding 160 limit

      const response = await request(app)
        .put(`/api/users/${testUserId}`)
        .send({
          bio: longBio
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toContain('Bio must be 160 characters or less');
    });

    test('should validate website URL format', async () => {
      const response = await request(app)
        .put(`/api/users/${testUserId}`)
        .send({
          website: 'not-a-valid-url'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toContain('Website must be a valid URL');
    });

    test('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .put('/api/users/u999999999')
        .send({
          bio: 'Test bio'
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User not found');
    });

    test('should handle empty update data', async () => {
      const response = await request(app)
        .put(`/api/users/${testUserId}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Profile updated successfully');
    });
  });
}); 