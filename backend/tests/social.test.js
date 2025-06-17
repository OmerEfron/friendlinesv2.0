const request = require('supertest');
const express = require('express');
const { readJson, writeJson } = require('../utils/fileUtils');

// Mock the file utilities
jest.mock('../utils/fileUtils');

describe('Social Features Endpoints', () => {
  let app;
  let mockUsers;

  beforeAll(() => {
    // Create Express app with routes
    app = express();
    app.use(express.json());
    
    // Import routes after mocking - social features are in auth routes
    const authRoutes = require('../routes/auth');
    app.use('/api', authRoutes);
    
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
        following: ['u1737582951003ghi'],
        followersCount: 1,
        followingCount: 1,
        expoPushToken: 'ExponentPushToken[alice_token_12345]'
      },
      {
        id: 'u1737582951002def',
        fullName: 'Bob Smith',
        email: 'bob@friendlines.com',
        followers: ['u1737582951003ghi'],
        following: ['u1737582951001abc'],
        followersCount: 1,
        followingCount: 1,
        expoPushToken: 'ExponentPushToken[bob_token_67890]'
      },
      {
        id: 'u1737582951003ghi',
        fullName: 'Charlie Davis',
        email: 'charlie@friendlines.com',
        followers: ['u1737582951001abc'],
        following: ['u1737582951002def'],
        followersCount: 1,
        followingCount: 1,
        expoPushToken: 'ExponentPushToken[charlie_token_abcde]'
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

  describe('POST /api/users/:id/follow', () => {
    test('should follow user successfully', async () => {
      const followData = {
        userId: 'u1737582951001abc'
      };

      const response = await request(app)
        .post('/api/users/u1737582951002def/follow')
        .send(followData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User followed successfully');
      expect(response.body.data.targetUserId).toBe('u1737582951002def');
      expect(response.body.data.currentUserId).toBe('u1737582951001abc');
      expect(response.body.data.isFollowing).toBe(true);
      expect(response.body.data.action).toBe('followed');
      expect(response.body.data.followersCount).toBe(2);
      expect(response.body.data.followingCount).toBe(2);
    });

    test('should unfollow user when already following', async () => {
      const unfollowData = {
        userId: 'u1737582951002def'
      };

      const response = await request(app)
        .post('/api/users/u1737582951001abc/follow')
        .send(unfollowData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User unfollowed successfully');
      expect(response.body.data.isFollowing).toBe(false);
      expect(response.body.data.action).toBe('unfollowed');
      expect(response.body.data.followersCount).toBe(0);
      expect(response.body.data.followingCount).toBe(0);
    });

    test('should return 404 for non-existent target user', async () => {
      const followData = {
        userId: 'u1737582951001abc'
      };

      const response = await request(app)
        .post('/api/users/nonexistent/follow')
        .send(followData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Target user not found');
    });

    test('should return 404 for non-existent current user', async () => {
      const followData = {
        userId: 'nonexistent'
      };

      const response = await request(app)
        .post('/api/users/u1737582951001abc/follow')
        .send(followData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Current user not found');
    });

    test('should reject following yourself', async () => {
      const followData = {
        userId: 'u1737582951001abc'
      };

      const response = await request(app)
        .post('/api/users/u1737582951001abc/follow')
        .send(followData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Cannot follow yourself');
    });

    test('should reject missing userId', async () => {
      const response = await request(app)
        .post('/api/users/u1737582951001abc/follow')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Missing userId in request body');
    });

    test('should reject invalid user ID format', async () => {
      const followData = {
        userId: 'u1737582951001abc'
      };

      const response = await request(app)
        .post('/api/users/invalid-id/follow')
        .send(followData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid user ID format');
    });
  });

  describe('GET /api/users/:id/followers', () => {
    test('should get user followers successfully', async () => {
      const response = await request(app)
        .get('/api/users/u1737582951001abc/followers')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User followers retrieved successfully');
      expect(response.body.data.userId).toBe('u1737582951001abc');
      expect(response.body.data.followersCount).toBe(1);
      expect(response.body.data.followers).toHaveLength(1);
      expect(response.body.data.followers[0].userId).toBe('u1737582951002def');
      expect(response.body.data.followers[0].fullName).toBe('Bob Smith');
      expect(response.body.data.followers[0].email).toBe('bob@friendlines.com');
    });

    test('should support pagination for followers', async () => {
      const response = await request(app)
        .get('/api/users/u1737582951001abc/followers?page=1&limit=10')
        .expect(200);

      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(10);
      expect(response.body.pagination.totalFollowers).toBe(1);
      expect(response.body.pagination.totalPages).toBe(1);
      expect(response.body.pagination.hasNextPage).toBe(false);
      expect(response.body.pagination.hasPrevPage).toBe(false);
    });

    test('should reject invalid pagination parameters', async () => {
      const response = await request(app)
        .get('/api/users/u1737582951001abc/followers?page=0&limit=100')
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });

    test('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get('/api/users/nonexistent/followers')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User not found');
    });

    test('should handle user with no followers', async () => {
      // Create user with no followers
      mockUsers.push({
        id: 'u1737582951004jkl',
        fullName: 'Diana Rodriguez',
        email: 'diana@friendlines.com',
        followers: [],
        following: [],
        followersCount: 0,
        followingCount: 0
      });

      const response = await request(app)
        .get('/api/users/u1737582951004jkl/followers')
        .expect(200);

      expect(response.body.data.followersCount).toBe(0);
      expect(response.body.data.followers).toHaveLength(0);
    });
  });

  describe('GET /api/users/:id/following', () => {
    test('should get user following successfully', async () => {
      const response = await request(app)
        .get('/api/users/u1737582951001abc/following')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User following retrieved successfully');
      expect(response.body.data.userId).toBe('u1737582951001abc');
      expect(response.body.data.followingCount).toBe(1);
      expect(response.body.data.following).toHaveLength(1);
      expect(response.body.data.following[0].userId).toBe('u1737582951003ghi');
      expect(response.body.data.following[0].fullName).toBe('Charlie Davis');
      expect(response.body.data.following[0].email).toBe('charlie@friendlines.com');
    });

    test('should support pagination for following', async () => {
      const response = await request(app)
        .get('/api/users/u1737582951001abc/following?page=1&limit=10')
        .expect(200);

      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(10);
      expect(response.body.pagination.totalFollowing).toBe(1);
      expect(response.body.pagination.totalPages).toBe(1);
    });

    test('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get('/api/users/nonexistent/following')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User not found');
    });

    test('should handle user with no following', async () => {
      // Create user with no following
      mockUsers.push({
        id: 'u1737582951005mno',
        fullName: 'Ethan Wilson',
        email: 'ethan@friendlines.com',
        followers: [],
        following: [],
        followersCount: 0,
        followingCount: 0
      });

      const response = await request(app)
        .get('/api/users/u1737582951005mno/following')
        .expect(200);

      expect(response.body.data.followingCount).toBe(0);
      expect(response.body.data.following).toHaveLength(0);
    });
  });

  describe('Complex Follow Scenarios', () => {
    test('should handle bidirectional follow relationship', async () => {
      // Alice follows Bob
      const followData1 = {
        userId: 'u1737582951001abc'
      };

      const response1 = await request(app)
        .post('/api/users/u1737582951002def/follow')
        .send(followData1)
        .expect(200);

      expect(response1.body.data.isFollowing).toBe(true);

      // Bob follows Alice (they already follow each other now)
      const followData2 = {
        userId: 'u1737582951002def'
      };

      const response2 = await request(app)
        .post('/api/users/u1737582951001abc/follow')
        .send(followData2)
        .expect(200);

      expect(response2.body.data.isFollowing).toBe(false); // Bob was already following Alice
      expect(response2.body.data.action).toBe('unfollowed');
    });

    test('should update follower counts correctly', async () => {
      // Initial state: Alice has 1 follower (Bob), Bob has 1 follower (Charlie)
      
      // Charlie follows Alice
      const followData = {
        userId: 'u1737582951003ghi'
      };

      await request(app)
        .post('/api/users/u1737582951001abc/follow')
        .send(followData)
        .expect(200);

      // Check Alice's followers count increased
      const aliceFollowersResponse = await request(app)
        .get('/api/users/u1737582951001abc/followers')
        .expect(200);

      expect(aliceFollowersResponse.body.data.followersCount).toBe(2);
      expect(aliceFollowersResponse.body.data.followers).toHaveLength(2);

      // Check Charlie's following count increased
      const charlieFollowingResponse = await request(app)
        .get('/api/users/u1737582951003ghi/following')
        .expect(200);

      expect(charlieFollowingResponse.body.data.followingCount).toBe(2);
    });

    test('should handle multiple follow/unfollow operations', async () => {
      const followData = {
        userId: 'u1737582951001abc'
      };

      // Follow
      const response1 = await request(app)
        .post('/api/users/u1737582951003ghi/follow')
        .send(followData)
        .expect(200);

      expect(response1.body.data.isFollowing).toBe(true);
      expect(response1.body.data.action).toBe('followed');

      // Unfollow
      const response2 = await request(app)
        .post('/api/users/u1737582951003ghi/follow')
        .send(followData)
        .expect(200);

      expect(response2.body.data.isFollowing).toBe(false);
      expect(response2.body.data.action).toBe('unfollowed');

      // Follow again
      const response3 = await request(app)
        .post('/api/users/u1737582951003ghi/follow')
        .send(followData)
        .expect(200);

      expect(response3.body.data.isFollowing).toBe(true);
      expect(response3.body.data.action).toBe('followed');
    });
  });

  describe('Data Consistency', () => {
    test('should maintain data consistency when following', async () => {
      const followData = {
        userId: 'u1737582951001abc'
      };

      await request(app)
        .post('/api/users/u1737582951003ghi/follow')
        .send(followData)
        .expect(200);

      // Verify Alice is now in Charlie's followers
      const charlieFollowersResponse = await request(app)
        .get('/api/users/u1737582951003ghi/followers')
        .expect(200);

      const aliceInFollowers = charlieFollowersResponse.body.data.followers
        .find(f => f.userId === 'u1737582951001abc');
      expect(aliceInFollowers).toBeDefined();

      // Verify Charlie is now in Alice's following
      const aliceFollowingResponse = await request(app)
        .get('/api/users/u1737582951001abc/following')
        .expect(200);

      const charlieInFollowing = aliceFollowingResponse.body.data.following
        .find(f => f.userId === 'u1737582951003ghi');
      expect(charlieInFollowing).toBeDefined();
    });

    test('should maintain data consistency when unfollowing', async () => {
      const unfollowData = {
        userId: 'u1737582951002def'
      };

      await request(app)
        .post('/api/users/u1737582951001abc/follow')
        .send(unfollowData)
        .expect(200);

      // Verify Bob is no longer in Alice's followers
      const aliceFollowersResponse = await request(app)
        .get('/api/users/u1737582951001abc/followers')
        .expect(200);

      const bobInFollowers = aliceFollowersResponse.body.data.followers
        .find(f => f.userId === 'u1737582951002def');
      expect(bobInFollowers).toBeUndefined();

      // Verify Alice is no longer in Bob's following
      const bobFollowingResponse = await request(app)
        .get('/api/users/u1737582951002def/following')
        .expect(200);

      const aliceInFollowing = bobFollowingResponse.body.data.following
        .find(f => f.userId === 'u1737582951001abc');
      expect(aliceInFollowing).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle file system errors gracefully in follow', async () => {
      readJson.mockRejectedValue(new Error('File system error'));

      const followData = {
        userId: 'u1737582951001abc'
      };

      const response = await request(app)
        .post('/api/users/u1737582951002def/follow')
        .send(followData)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Internal server error');
    });

    test('should handle file system errors gracefully in followers', async () => {
      readJson.mockRejectedValue(new Error('File system error'));

      const response = await request(app)
        .get('/api/users/u1737582951001abc/followers')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Internal server error');
    });

    test('should handle file system errors gracefully in following', async () => {
      readJson.mockRejectedValue(new Error('File system error'));

      const response = await request(app)
        .get('/api/users/u1737582951001abc/following')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Internal server error');
    });
  });
}); 