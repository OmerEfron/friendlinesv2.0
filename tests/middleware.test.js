const express = require('express');
const request = require('supertest');
const rateLimit = require('express-rate-limit');

// Import middleware
const {
  validatePostMiddleware,
  validatePostUpdateMiddleware,
  validateIdMiddleware,
  validateUserIdMiddleware,
  ensureBodyExists,
  validateContentType,
  validateLoginMiddleware,
  validateGroupMiddleware
} = require('../middleware/validation');

const {
  authLimiter,
  postCreationLimiter,
  postUpdateLimiter,
  getGeneralLimiter
} = require('../middleware/rateLimiter');

describe('Middleware Tests', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  describe('Validation Middleware', () => {
    describe('validatePostMiddleware', () => {
      beforeEach(() => {
        app.post('/test', validatePostMiddleware, (req, res) => {
          res.status(200).json({ success: true });
        });
      });

      test('should pass valid post data', async () => {
        const validData = {
          rawText: 'This is a valid post',
          userId: 'u123456789'
        };

        const response = await request(app)
          .post('/test')
          .send(validData)
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      test('should reject empty rawText', async () => {
        const invalidData = {
          rawText: '',
          userId: 'u123456789'
        };

        const response = await request(app)
          .post('/test')
          .send(invalidData)
          .expect(422);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Validation failed');
        expect(response.body.errors).toContain('Post text is required and must be a string');
      });

      test('should reject too long rawText', async () => {
        const invalidData = {
          rawText: 'a'.repeat(300),
          userId: 'u123456789'
        };

        const response = await request(app)
          .post('/test')
          .send(invalidData)
          .expect(422);

        expect(response.body.errors).toContain('Post text cannot exceed 280 characters');
      });

      test('should reject missing userId', async () => {
        const invalidData = {
          rawText: 'Valid post text'
        };

        const response = await request(app)
          .post('/test')
          .send(invalidData)
          .expect(422);

        expect(response.body.errors).toContain('User ID is required and must be a string');
      });

      test('should validate groupIds if provided', async () => {
        const invalidData = {
          rawText: 'Valid post text',
          userId: 'u123456789',
          groupIds: ['g1', 'g2', 'g3', 'g4', 'g5', 'g6']
        };

        const response = await request(app)
          .post('/test')
          .send(invalidData)
          .expect(422);

        expect(response.body.errors).toContain('Cannot post to more than 5 groups at once');
      });
    });

    describe('validatePostUpdateMiddleware', () => {
      beforeEach(() => {
        app.put('/test', validatePostUpdateMiddleware, (req, res) => {
          res.status(200).json({ success: true });
        });
      });

      test('should pass valid update data', async () => {
        const validData = {
          rawText: 'Updated post content'
        };

        const response = await request(app)
          .put('/test')
          .send(validData)
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      test('should reject empty rawText', async () => {
        const invalidData = {
          rawText: ''
        };

        const response = await request(app)
          .put('/test')
          .send(invalidData)
          .expect(422);

        expect(response.body.success).toBe(false);
        expect(response.body.errors).toContain('Post text is required and must be a string');
      });
    });

    describe('validateIdMiddleware', () => {
      beforeEach(() => {
        app.get('/test/:id', validateIdMiddleware, (req, res) => {
          res.status(200).json({ success: true });
        });
      });

      test('should pass valid ID', async () => {
        const response = await request(app)
          .get('/test/p123456789')
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      test('should reject invalid ID format', async () => {
        const response = await request(app)
          .get('/test/invalid-id')
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Invalid ID format');
      });

      test('should reject empty ID', async () => {
        const response = await request(app)
          .get('/test/')
          .expect(404); // Express will return 404 for missing route parameter
      });
    });

    describe('validateUserIdMiddleware', () => {
      beforeEach(() => {
        app.get('/test/:userId', validateUserIdMiddleware, (req, res) => {
          res.status(200).json({ success: true });
        });
      });

      test('should pass valid user ID', async () => {
        const response = await request(app)
          .get('/test/u123456789')
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      test('should reject invalid user ID format', async () => {
        const response = await request(app)
          .get('/test/p123456789')
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Invalid user ID format');
      });
    });

    describe('ensureBodyExists', () => {
      beforeEach(() => {
        app.post('/test', ensureBodyExists, (req, res) => {
          res.status(200).json({ success: true });
        });
      });

      test('should pass when body exists', async () => {
        const response = await request(app)
          .post('/test')
          .send({ data: 'test' })
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      test('should reject when body is empty', async () => {
        const response = await request(app)
          .post('/test')
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Request body is required');
      });
    });

    describe('validateContentType', () => {
      beforeEach(() => {
        app.post('/test', validateContentType, (req, res) => {
          res.status(200).json({ success: true });
        });
      });

      test('should pass with correct content type', async () => {
        const response = await request(app)
          .post('/test')
          .set('Content-Type', 'application/json')
          .send({ data: 'test' })
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      test('should reject with incorrect content type', async () => {
        const response = await request(app)
          .post('/test')
          .set('Content-Type', 'text/plain')
          .send('plain text')
          .expect(415);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Content-Type must be application/json');
      });
    });

    describe('validateLoginMiddleware', () => {
      beforeEach(() => {
        app.post('/test', validateLoginMiddleware, (req, res) => {
          res.status(200).json({ success: true });
        });
      });

      test('should pass valid login data', async () => {
        const validData = {
          fullName: 'John Doe',
          email: 'john@example.com'
        };

        const response = await request(app)
          .post('/test')
          .send(validData)
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      test('should reject invalid email', async () => {
        const invalidData = {
          fullName: 'John Doe',
          email: 'invalid-email'
        };

        const response = await request(app)
          .post('/test')
          .send(invalidData)
          .expect(422);

        expect(response.body.success).toBe(false);
        expect(response.body.errors).toContain('Valid email address is required');
      });
    });

    describe('validateGroupMiddleware', () => {
      beforeEach(() => {
        app.post('/test', validateGroupMiddleware, (req, res) => {
          res.status(200).json({ success: true });
        });
      });

      test('should pass valid group data', async () => {
        const validData = {
          name: 'Test Group',
          description: 'A test group',
          ownerId: 'u123456789'
        };

        const response = await request(app)
          .post('/test')
          .send(validData)
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      test('should reject invalid group name', async () => {
        const invalidData = {
          name: 'AB',
          description: 'Test',
          ownerId: 'u123456789'
        };

        const response = await request(app)
          .post('/test')
          .send(invalidData)
          .expect(422);

        expect(response.body.errors).toContain('Group name must be between 3 and 50 characters');
      });
    });
  });

  describe('Rate Limiting Middleware', () => {
    describe('authLimiter', () => {
      beforeEach(() => {
        app.use('/auth', authLimiter);
        app.post('/auth/login', (req, res) => {
          res.status(200).json({ success: true });
        });
      });

      test('should allow requests within limit', async () => {
        const response = await request(app)
          .post('/auth/login')
          .send({ test: 'data' })
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      test('should apply rate limiting after multiple requests', async () => {
        // Make multiple requests rapidly
        const requests = Array(6).fill().map(() => 
          request(app).post('/auth/login').send({ test: 'data' })
        );

        const responses = await Promise.all(requests);
        
        // At least one should be rate limited (429)
        const rateLimitedResponses = responses.filter(res => res.status === 429);
        expect(rateLimitedResponses.length).toBeGreaterThan(0);
      });

      test('should include rate limit headers', async () => {
        const response = await request(app)
          .post('/auth/login')
          .send({ test: 'data' });

        expect(response.headers['x-ratelimit-limit']).toBeDefined();
        expect(response.headers['x-ratelimit-remaining']).toBeDefined();
      });
    });

    describe('postCreationLimiter', () => {
      beforeEach(() => {
        app.use('/posts', postCreationLimiter);
        app.post('/posts', (req, res) => {
          res.status(201).json({ success: true });
        });
      });

      test('should allow post creation within limit', async () => {
        const response = await request(app)
          .post('/posts')
          .send({ rawText: 'Test post', userId: 'u123456789' })
          .expect(201);

        expect(response.body.success).toBe(true);
      });

      test('should apply rate limiting to rapid post creation', async () => {
        const requests = Array(15).fill().map(() => 
          request(app)
            .post('/posts')
            .send({ rawText: 'Test post', userId: 'u123456789' })
        );

        const responses = await Promise.all(requests);
        
        const rateLimitedResponses = responses.filter(res => res.status === 429);
        expect(rateLimitedResponses.length).toBeGreaterThan(0);
      });
    });

    describe('postUpdateLimiter', () => {
      beforeEach(() => {
        app.use('/posts/:id', postUpdateLimiter);
        app.put('/posts/:id', (req, res) => {
          res.status(200).json({ success: true });
        });
      });

      test('should allow post updates within limit', async () => {
        const response = await request(app)
          .put('/posts/p123456789')
          .send({ rawText: 'Updated content' })
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });

    describe('getGeneralLimiter', () => {
      beforeEach(() => {
        app.use(getGeneralLimiter());
        app.get('/test', (req, res) => {
          res.status(200).json({ success: true });
        });
      });

      test('should allow normal request rates', async () => {
        const response = await request(app)
          .get('/test')
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      test('should apply rate limiting to excessive requests', async () => {
        // Make many requests rapidly
        const requests = Array(100).fill().map(() => 
          request(app).get('/test')
        );

        const responses = await Promise.all(requests);
        
        const rateLimitedResponses = responses.filter(res => res.status === 429);
        expect(rateLimitedResponses.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Middleware Error Handling', () => {
    test('should handle validation errors consistently', async () => {
      app.post('/test', validatePostMiddleware, (req, res) => {
        res.status(200).json({ success: true });
      });

      const response = await request(app)
        .post('/test')
        .send({ rawText: '', userId: '' })
        .expect(422);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Validation failed',
        errors: expect.any(Array),
        timestamp: expect.any(String)
      });

      expect(response.body.errors.length).toBeGreaterThan(0);
    });

    test('should handle rate limit errors consistently', async () => {
      // Create a very restrictive rate limiter for testing
      const testLimiter = rateLimit({
        windowMs: 1000,
        max: 1,
        message: {
          success: false,
          message: 'Too many requests, please try again later',
          timestamp: new Date().toISOString()
        },
        standardHeaders: true,
        legacyHeaders: false
      });

      app.use('/limited', testLimiter);
      app.get('/limited/test', (req, res) => {
        res.status(200).json({ success: true });
      });

      // First request should succeed
      await request(app)
        .get('/limited/test')
        .expect(200);

      // Second request should be rate limited
      const response = await request(app)
        .get('/limited/test')
        .expect(429);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Too many requests, please try again later',
        timestamp: expect.any(String)
      });
    });
  });

  describe('Middleware Integration', () => {
    test('should chain multiple middleware correctly', async () => {
      app.post('/test', 
        ensureBodyExists,
        validateContentType,
        validatePostMiddleware,
        (req, res) => {
          res.status(200).json({ success: true });
        }
      );

      const validData = {
        rawText: 'Test post content',
        userId: 'u123456789'
      };

      const response = await request(app)
        .post('/test')
        .set('Content-Type', 'application/json')
        .send(validData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should fail early in middleware chain', async () => {
      app.post('/test', 
        ensureBodyExists,
        validateContentType,
        validatePostMiddleware,
        (req, res) => {
          res.status(200).json({ success: true });
        }
      );

      // Should fail at ensureBodyExists
      const response = await request(app)
        .post('/test')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Request body is required');
    });

    test('should sanitize input in validation middleware', async () => {
      app.post('/test', validatePostMiddleware, (req, res) => {
        res.status(200).json({ 
          success: true, 
          sanitizedText: req.body.rawText 
        });
      });

      const dirtyData = {
        rawText: '  <script>alert("xss")</script>Hello world  ',
        userId: 'u123456789'
      };

      const response = await request(app)
        .post('/test')
        .send(dirtyData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.sanitizedText).toBe('Hello world');
    });
  });
}); 