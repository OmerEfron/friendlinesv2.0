const request = require('supertest');
const express = require('express');
const { readJson, writeJson } = require('../utils/fileUtils');

// Mock the file utilities
jest.mock('../utils/fileUtils');

// Mock push notification service
jest.mock('../utils/notificationService', () => ({
  sendPush: jest.fn().mockResolvedValue({ success: true }),
  getFollowersTokens: jest.fn().mockResolvedValue(['token1', 'token2']),
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
        followers: ['u1737582951002def'],
        following: ['u1737582951002def'],
        followersCount: 1,
        followingCount: 1,
        expoPushToken: 'ExponentPushToken[alice_token_12345]'
      },
      {
        id: 'u1737582951002def',
        fullName: 'Bob Smith',
        email: 'bob@friendlines.com',
        followers: ['u1737582951001abc'],
        following: ['u1737582951001abc'],
        followersCount: 1,
        followingCount: 1,
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
        likes: ['u1737582951002def'],
        comments: [
          {
            id: 'c1737582951001a1',
            userId: 'u1737582951002def',
            text: 'Great post!',
            timestamp: '2025-06-17T08:15:00.000Z',
            createdAt: '2025-06-17T08:15:00.000Z'
          }
        ],
        likesCount: 1,
        commentsCount: 1,
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

  describe('GET /api/posts/user/:userId', () => {
    test('should get posts by specific user', async () => {
      const response = await request(app)
        .get('/api/posts/user/u1737582951001abc')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].userId).toBe('u1737582951001abc');
    });

    test('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get('/api/posts/user/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User not found');
    });
  });

  describe('POST /api/posts', () => {
    test('should create new post successfully', async () => {
      const postData = {
        userId: 'u1737582951001abc',
        rawText: 'This is a new test post!'
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
      expect(response.body.data.visibility).toBe('public');
    });

    test('should create group post successfully', async () => {
      const postData = {
        userId: 'u1737582951001abc',
        rawText: 'Group post test',
        groupIds: ['g1737582951001xyz']
      };

      const response = await request(app)
        .post('/api/posts')
        .send(postData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.groupIds).toContain('g1737582951001xyz');
      expect(response.body.data.visibility).toBe('groups_only');
    });

    test('should reject post with invalid user', async () => {
      const postData = {
        userId: 'nonexistent',
        rawText: 'Test post'
      };

      const response = await request(app)
        .post('/api/posts')
        .send(postData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User not found');
    });

    test('should reject empty post text', async () => {
      const postData = {
        userId: 'u1737582951001abc',
        rawText: ''
      };

      const response = await request(app)
        .post('/api/posts')
        .send(postData)
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });

    test('should reject too long post text', async () => {
      const postData = {
        userId: 'u1737582951001abc',
        rawText: 'a'.repeat(300)
      };

      const response = await request(app)
        .post('/api/posts')
        .send(postData)
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });

    test('should reject invalid group access', async () => {
      const postData = {
        userId: 'u1737582951002def',
        rawText: 'Test post',
        groupIds: ['nonexistent_group']
      };

      const response = await request(app)
        .post('/api/posts')
        .send(postData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access denied to one or more groups');
    });
  });

  describe('PUT /api/posts/:id', () => {
    test('should update post successfully', async () => {
      const updateData = {
        rawText: 'Updated post content'
      };

      const response = await request(app)
        .put('/api/posts/p1737582951001aaa')
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Post updated successfully');
      expect(response.body.data.rawText).toBe('Updated post content');
      expect(response.body.data.generatedText).toContain('Updated post content');
    });

    test('should return 404 for non-existent post', async () => {
      const updateData = {
        rawText: 'Updated content'
      };

      const response = await request(app)
        .put('/api/posts/nonexistent')
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Post not found');
    });
  });

  describe('DELETE /api/posts/:id', () => {
    test('should delete post successfully', async () => {
      const response = await request(app)
        .delete('/api/posts/p1737582951001aaa')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Post deleted successfully');
      expect(response.body.data.id).toBe('p1737582951001aaa');
    });

    test('should return 404 for non-existent post', async () => {
      const response = await request(app)
        .delete('/api/posts/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Post not found');
    });
  });

  describe('POST /api/posts/:id/like', () => {
    test('should like post successfully', async () => {
      const likeData = {
        userId: 'u1737582951001abc'
      };

      const response = await request(app)
        .post('/api/posts/p1737582951001aaa/like')
        .send(likeData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isLiked).toBe(true);
      expect(response.body.data.action).toBe('liked');
      expect(response.body.data.likesCount).toBe(2);
    });

    test('should unlike post when already liked', async () => {
      const likeData = {
        userId: 'u1737582951002def'
      };

      const response = await request(app)
        .post('/api/posts/p1737582951001aaa/like')
        .send(likeData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isLiked).toBe(false);
      expect(response.body.data.action).toBe('unliked');
      expect(response.body.data.likesCount).toBe(0);
    });

    test('should return 404 for non-existent post', async () => {
      const likeData = {
        userId: 'u1737582951001abc'
      };

      const response = await request(app)
        .post('/api/posts/nonexistent/like')
        .send(likeData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Post not found');
    });

    test('should reject missing userId', async () => {
      const response = await request(app)
        .post('/api/posts/p1737582951001aaa/like')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Missing userId in request body');
    });
  });

  describe('GET /api/posts/:id/likes', () => {
    test('should get post likes successfully', async () => {
      const response = await request(app)
        .get('/api/posts/p1737582951001aaa/likes')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.likesCount).toBe(1);
      expect(response.body.data.likes).toHaveLength(1);
      expect(response.body.data.likes[0].userId).toBe('u1737582951002def');
      expect(response.body.data.likes[0].fullName).toBe('Bob Smith');
    });

    test('should return 404 for non-existent post', async () => {
      const response = await request(app)
        .get('/api/posts/nonexistent/likes')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Post not found');
    });
  });

  describe('POST /api/posts/:id/comments', () => {
    test('should add comment successfully', async () => {
      const commentData = {
        userId: 'u1737582951001abc',
        text: 'This is a test comment'
      };

      const response = await request(app)
        .post('/api/posts/p1737582951001aaa/comments')
        .send(commentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Comment added successfully');
      expect(response.body.data.comment.text).toBe('This is a test comment');
      expect(response.body.data.comment.userFullName).toBe('Alice Johnson');
      expect(response.body.data.commentsCount).toBe(2);
    });

    test('should reject empty comment text', async () => {
      const commentData = {
        userId: 'u1737582951001abc',
        text: ''
      };

      const response = await request(app)
        .post('/api/posts/p1737582951001aaa/comments')
        .send(commentData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Missing required fields (userId, text) or text too long (>500 chars)');
    });

    test('should reject too long comment text', async () => {
      const commentData = {
        userId: 'u1737582951001abc',
        text: 'a'.repeat(501)
      };

      const response = await request(app)
        .post('/api/posts/p1737582951001aaa/comments')
        .send(commentData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Missing required fields (userId, text) or text too long (>500 chars)');
    });
  });

  describe('GET /api/posts/:id/comments', () => {
    test('should get post comments successfully', async () => {
      const response = await request(app)
        .get('/api/posts/p1737582951001aaa/comments')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.commentsCount).toBe(1);
      expect(response.body.data.comments).toHaveLength(1);
      expect(response.body.data.comments[0].text).toBe('Great post!');
      expect(response.body.data.comments[0].userFullName).toBe('Bob Smith');
    });

    test('should support pagination for comments', async () => {
      const response = await request(app)
        .get('/api/posts/p1737582951001aaa/comments?page=1&limit=10')
        .expect(200);

      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(10);
    });
  });

  describe('DELETE /api/posts/:postId/comments/:commentId', () => {
    test('should delete comment successfully', async () => {
      const deleteData = {
        userId: 'u1737582951002def'
      };

      const response = await request(app)
        .delete('/api/posts/p1737582951001aaa/comments/c1737582951001a1')
        .send(deleteData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Comment deleted successfully');
      expect(response.body.data.commentsCount).toBe(0);
    });

    test('should reject unauthorized comment deletion', async () => {
      const deleteData = {
        userId: 'u1737582951001abc'
      };

      const response = await request(app)
        .delete('/api/posts/p1737582951001aaa/comments/c1737582951001a1')
        .send(deleteData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Unauthorized (can only delete own comments)');
    });

    test('should return 404 for non-existent comment', async () => {
      const deleteData = {
        userId: 'u1737582951002def'
      };

      const response = await request(app)
        .delete('/api/posts/p1737582951001aaa/comments/nonexistent')
        .send(deleteData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Comment not found');
    });
  });

  describe('Rate Limiting', () => {
    test('should apply rate limiting to post creation', async () => {
      const postData = {
        userId: 'u1737582951001abc',
        rawText: 'Rate limit test post'
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
      expect(response.body.message).toBe('Internal server error in posts');
    });
  });
}); 