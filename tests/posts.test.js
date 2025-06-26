const request = require('supertest');
const express = require('express');
const { readJson, writeJson } = require('../utils/dbUtils');

// Mock the database utilities
jest.mock('../utils/dbUtils');

// Mock push notification service
jest.mock('../utils/notificationService', () => ({
  sendPush: jest.fn().mockResolvedValue({ success: true }),
  getFriendsTokens: jest.fn().mockResolvedValue(['token1', 'token2']),
  getGroupMembersTokens: jest.fn().mockResolvedValue(['token3', 'token4'])
}));

describe('Posts Endpoints', () => {
  let app;
  let mockUsers;
  let mockPosts;
  let mockGroups;

  beforeAll(() => {
    // Create Express app with routes
    app = express();
    app.use(express.json());
    
    // Import routes after mocking
    const postsRoutes = require('../routes/posts');
    app.use('/api/posts', postsRoutes);
    
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
        friends: ['u1737582951002def'],
        friendsCount: 1,
        expoPushToken: 'ExponentPushToken[alice_token_12345]'
      },
      {
        id: 'u1737582951002def',
        fullName: 'Bob Smith',
        email: 'bob@friendlines.com',
        friends: ['u1737582951001abc'],
        friendsCount: 1,
        expoPushToken: 'ExponentPushToken[bob_token_67890]'
      }
    ];

    mockPosts = [
      {
        id: 'p1737582951001aaa',
        userId: 'u1737582951001abc',
        rawText: 'Test post content',
        generatedText: 'BREAKING: Alice Johnson test post content - Sources confirm.',
        timestamp: '2025-06-17T08:00:00.000Z',
        createdAt: '2025-06-17T08:00:00.000Z',
        updatedAt: '2025-06-17T08:00:00.000Z',
        groupIds: [],
        visibility: 'public',
        sharesCount: 0
      }
    ];

    mockGroups = [
      {
        id: 'g1737582951001xyz',
        name: 'Tech Enthusiasts',
        ownerId: 'u1737582951001abc',
        members: ['u1737582951001abc', 'u1737582951002def'],
        invites: []
      }
    ];

    // Setup mocks
    readJson.mockImplementation((filename) => {
      if (filename === 'users.json') return Promise.resolve(mockUsers);
      if (filename === 'posts.json') return Promise.resolve(mockPosts);
      if (filename === 'groups.json') return Promise.resolve(mockGroups);
      return Promise.resolve([]);
    });
    
    writeJson.mockImplementation((filename, data) => {
      if (filename === 'users.json') mockUsers = data;
      if (filename === 'posts.json') mockPosts = data;
      if (filename === 'groups.json') mockGroups = data;
      return Promise.resolve();
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/posts', () => {
    test('should get all posts with pagination', async () => {
      const response = await request(app)
        .get('/api/posts')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Posts retrieved successfully');
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe('p1737582951001aaa');
      expect(response.body.data[0].userFullName).toBe('Alice Johnson');
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.totalPosts).toBe(1);
    });

    test('should respect pagination parameters', async () => {
      const response = await request(app)
        .get('/api/posts?page=1&limit=5')
        .expect(200);

      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
    });

    test('should reject invalid pagination parameters', async () => {
      const response = await request(app)
        .get('/api/posts?page=0&limit=100')
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });
  });

  describe('GET /api/posts/:userId', () => {
    test('should get posts by specific user', async () => {
      const response = await request(app)
        .get('/api/posts/u1737582951001abc')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].userId).toBe('u1737582951001abc');
    });

    test('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get('/api/posts/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User not found');
    });
  });

  describe('POST /api/posts', () => {
    test('should create new post successfully', async () => {
      const postData = {
        userId: 'u1737582951001abc',
        rawText: 'This is a new test post!',
        audienceType: 'friends'
      };

      const response = await request(app)
        .post('/api/posts')
        .send(postData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Post created successfully');
      expect(response.body.data.rawText).toBe('This is a new test post!');
      expect(response.body.data.generatedText).toContain('Alice Johnson');
      expect(response.body.data.id).toMatch(/^p/);
      expect(response.body.data.audienceType).toBe('friends');
    });

    test('should create group post successfully', async () => {
      const postData = {
        userId: 'u1737582951001abc',
        rawText: 'Group post content',
        audienceType: 'groups',
        groupIds: ['g1737582951001xyz']
      };

      const response = await request(app)
        .post('/api/posts')
        .send(postData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.audienceType).toBe('groups');
      expect(response.body.data.groupIds).toContain('g1737582951001xyz');
    });

    test('should reject post without userId', async () => {
      const postData = {
        rawText: 'Post without user'
      };

      const response = await request(app)
        .post('/api/posts')
        .send(postData)
        .expect(422);

      expect(response.body.success).toBe(false);
    });

    test('should reject post with invalid user', async () => {
      const postData = {
        userId: 'nonexistent',
        rawText: 'Post by non-existent user'
      };

      const response = await request(app)
        .post('/api/posts')
        .send(postData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User not found');
    });
  });

  describe('PUT /api/posts/:id', () => {
    test('should update post successfully', async () => {
      const updateData = {
        userId: 'u1737582951001abc',
        rawText: 'Updated post content'
      };

      const response = await request(app)
        .put('/api/posts/p1737582951001aaa')
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Post updated successfully');
      expect(response.body.data.rawText).toBe('Updated post content');
    });

    test('should return 404 for non-existent post', async () => {
      const updateData = {
        userId: 'u1737582951001abc',
        rawText: 'Updated content'
      };

      const response = await request(app)
        .put('/api/posts/nonexistent')
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Post not found');
    });

    test('should reject unauthorized update', async () => {
      const updateData = {
        userId: 'u1737582951002def', // Different user
        rawText: 'Unauthorized update'
      };

      const response = await request(app)
        .put('/api/posts/p1737582951001aaa')
        .send(updateData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Unauthorized');
    });
  });

  describe('DELETE /api/posts/:id', () => {
    test('should delete post successfully', async () => {
      const deleteData = {
        userId: 'u1737582951001abc'
      };

      const response = await request(app)
        .delete('/api/posts/p1737582951001aaa')
        .send(deleteData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Post deleted successfully');
    });

    test('should return 404 for non-existent post', async () => {
      const deleteData = {
        userId: 'u1737582951001abc'
      };

      const response = await request(app)
        .delete('/api/posts/nonexistent')
        .send(deleteData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Post not found');
    });

    test('should reject unauthorized deletion', async () => {
      const deleteData = {
        userId: 'u1737582951002def' // Different user
      };

      const response = await request(app)
        .delete('/api/posts/p1737582951001aaa')
        .send(deleteData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Unauthorized');
    });
  });

  describe('GET /api/posts/:id/details', () => {
    test('should get post details successfully', async () => {
      const response = await request(app)
        .get('/api/posts/p1737582951001aaa/details')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('p1737582951001aaa');
      expect(response.body.data.userFullName).toBe('Alice Johnson');
    });

    test('should return 404 for non-existent post', async () => {
      const response = await request(app)
        .get('/api/posts/nonexistent/details')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Post not found');
    });
  });

  describe('Rate Limiting', () => {
    test('should apply rate limiting to post creation', async () => {
      const postData = {
        userId: 'u1737582951001abc',
        rawText: 'Rate limit test post',
        audienceType: 'friends'
      };

      // Make multiple requests rapidly
      const requests = Array(6).fill().map(() => 
        request(app).post('/api/posts').send(postData)
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

      const response = await request(app)
        .get('/api/posts')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Internal server error retrieving posts');
    });
  });
}); 