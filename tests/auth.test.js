const request = require('supertest');
const express = require('express');
const { readJson, writeJson } = require('../utils/fileUtils');

// Mock the file utilities
jest.mock('../utils/fileUtils');

describe('Authentication Endpoints', () => {
  let app;
  let mockUsers;

  beforeAll(() => {
    // Create Express app with routes
    app = express();
    app.use(express.json());
    
    // Import routes after mocking
    const authRoutes = require('../routes/auth');
    app.use('/api/auth', authRoutes);
    
    // Add push token route
    app.use('/api/users', authRoutes);
    
    // Global error handler
    app.use((err, req, res, next) => {
      res.status(500).json({
        success: false,
        message: err.message || 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
        timestamp: new Date().toISOString()
      });
    });
  });

  beforeEach(() => {
    // Reset mock data before each test
    mockUsers = [
      {
        id: 'u1737582951001abc',
        fullName: 'Alice Johnson',
        email: 'alice@friendlines.com',
        createdAt: '2025-06-10T08:00:00.000Z',
        updatedAt: '2025-06-17T10:30:00.000Z',
        followers: ['u1737582951002def'],
        following: ['u1737582951002def'],
        followersCount: 1,
        followingCount: 1,
        expoPushToken: 'ExponentPushToken[alice_token_12345]'
      }
    ];

    // Setup mocks
    readJson.mockImplementation((filename) => {
      if (filename === 'users.json') return Promise.resolve(mockUsers);
      return Promise.resolve([]);
    });
    
    writeJson.mockImplementation((filename, data) => {
      if (filename === 'users.json') mockUsers = data;
      return Promise.resolve();
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/login', () => {
    test('should login existing user successfully', async () => {
      const loginData = {
        fullName: 'Alice Johnson',
        email: 'alice@friendlines.com'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.data.id).toBe('u1737582951001abc');
      expect(response.body.data.fullName).toBe('Alice Johnson');
      expect(response.body.data.email).toBe('alice@friendlines.com');
      expect(response.body.data.followersCount).toBe(1);
      expect(response.body.data.followingCount).toBe(1);
    });

    test('should create new user when not exists', async () => {
      const newUserData = {
        fullName: 'Bob Smith',
        email: 'bob@friendlines.com'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(newUserData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User created and logged in successfully');
      expect(response.body.data.fullName).toBe('Bob Smith');
      expect(response.body.data.email).toBe('bob@friendlines.com');
      expect(response.body.data.followersCount).toBe(0);
      expect(response.body.data.followingCount).toBe(0);
      expect(response.body.data.id).toMatch(/^u/);
    });

    test('should reject invalid email format', async () => {
      const invalidData = {
        fullName: 'Test User',
        email: 'invalid-email'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(invalidData)
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
      expect(response.body.errors).toContain('Valid email address is required');
    });

    test('should reject missing fullName', async () => {
      const invalidData = {
        email: 'test@example.com'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(invalidData)
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toContain('Full name is required and must be a string');
    });

    test('should reject too short fullName', async () => {
      const invalidData = {
        fullName: 'A',
        email: 'test@example.com'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(invalidData)
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toContain('Full name must be at least 2 characters long');
    });

    test('should reject too long fullName', async () => {
      const invalidData = {
        fullName: 'A'.repeat(101),
        email: 'test@example.com'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(invalidData)
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toContain('Full name cannot exceed 100 characters');
    });

    test('should handle missing request body', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Request body is required');
    });
  });

  describe('POST /api/users/:id/push-token', () => {
    test('should update push token successfully', async () => {
      const pushTokenData = {
        expoPushToken: 'ExponentPushToken[new_token_12345]'
      };

      const response = await request(app)
        .post('/api/users/u1737582951001abc/push-token')
        .send(pushTokenData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Push token updated successfully');
      expect(response.body.data.expoPushToken).toBe('ExponentPushToken[new_token_12345]');
    });

    test('should return 404 for non-existent user', async () => {
      const pushTokenData = {
        expoPushToken: 'ExponentPushToken[new_token_12345]'
      };

      const response = await request(app)
        .post('/api/users/nonexistent/push-token')
        .send(pushTokenData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User not found');
    });

    test('should reject invalid push token format', async () => {
      const pushTokenData = {
        expoPushToken: 'invalid_token_format'
      };

      const response = await request(app)
        .post('/api/users/u1737582951001abc/push-token')
        .send(pushTokenData)
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });
  });

  describe('Rate Limiting', () => {
    test('should apply rate limiting to login endpoint', async () => {
      const loginData = {
        fullName: 'Test User',
        email: 'test@example.com'
      };

      // Make multiple requests rapidly
      const requests = Array(6).fill().map(() => 
        request(app).post('/api/auth/login').send(loginData)
      );

      const responses = await Promise.all(requests);
      
      // At least one should be rate limited (429)
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle file system errors gracefully', async () => {
      readJson.mockRejectedValue(new Error('File system error'));

      const loginData = {
        fullName: 'Test User',
        email: 'test@example.com'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Internal server error during login');
    });
  });
}); 