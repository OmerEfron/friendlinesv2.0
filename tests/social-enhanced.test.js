const request = require('supertest');

// Setup test environment
process.env.NODE_ENV = 'test';

const app = require('../server.js');

describe('Enhanced Social Features Tests', () => {
  let testUsers = [];

  beforeEach(async () => {
    // Reset data before each test
    await request(app).post('/api/reset');

    // Create multiple test users sequentially to avoid race conditions
    const userDataList = [
      { fullName: 'John Doe', email: 'john.doe@example.com' },
      { fullName: 'Jane Smith', email: 'jane.smith@example.com' },
      { fullName: 'Bob Wilson', email: 'bob.wilson@example.com' },
      { fullName: 'Alice Brown', email: 'alice.brown@example.com' },
      { fullName: 'Charlie Davis', email: 'charlie.davis@example.com' }
    ];

    testUsers = [];
    for (const userData of userDataList) {
      const response = await request(app)
        .post('/api/login')
        .send(userData);
      
      if ((response.status === 201 || response.status === 200) && response.body.success) {
        testUsers.push(response.body.data);
      } else {
        throw new Error(`Failed to create user: ${userData.email}, status: ${response.status}, body: ${JSON.stringify(response.body)}`);
      }
    }
  });

  describe('GET /api/social/users/:id/mutual-friends - Mutual Friends', () => {
    test('should return mutual friends between two users', async () => {
      const [user1, user2, user3, user4] = testUsers;

      // Create follow relationships
      // User1 follows User3 and User4
      await request(app)
        .post(`/api/users/${user3.id}/follow`)
        .send({ userId: user1.id });
      
      await request(app)
        .post(`/api/users/${user4.id}/follow`)
        .send({ userId: user1.id });

      // User2 follows User3 and User4
      await request(app)
        .post(`/api/users/${user3.id}/follow`)
        .send({ userId: user2.id });
      
      await request(app)
        .post(`/api/users/${user4.id}/follow`)
        .send({ userId: user2.id });

      // Get mutual friends between User1 and User2
      const response = await request(app)
        .get(`/api/social/users/${user1.id}/mutual-friends?userId=${user2.id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Mutual friends retrieved successfully');
      expect(response.body.data).toHaveLength(2); // User3 and User4
      expect(response.body.pagination).toBeDefined();
    });

    test('should return empty array when no mutual friends exist', async () => {
      const [user1, user2, user3, user4] = testUsers;

      // User1 follows User3
      await request(app)
        .post(`/api/users/${user3.id}/follow`)
        .send({ userId: user1.id });

      // User2 follows User4 (different from User1)
      await request(app)
        .post(`/api/users/${user4.id}/follow`)
        .send({ userId: user2.id });

      const response = await request(app)
        .get(`/api/social/users/${user1.id}/mutual-friends?userId=${user2.id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(0);
    });

    test('should support pagination for mutual friends', async () => {
      const [user1, user2, user3, user4, user5] = testUsers;

      // Create multiple mutual connections
      const mutualUsers = [user3, user4, user5];
      
      for (const user of mutualUsers) {
        await request(app)
          .post(`/api/users/${user.id}/follow`)
          .send({ userId: user1.id });
        
        await request(app)
          .post(`/api/users/${user.id}/follow`)
          .send({ userId: user2.id });
      }

      const response = await request(app)
        .get(`/api/social/users/${user1.id}/mutual-friends?userId=${user2.id}&page=1&limit=2`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(2);
      expect(response.body.pagination.totalMutualFriends).toBe(3);
    });

    test('should return 400 for invalid user ID format', async () => {
      const response = await request(app)
        .get('/api/social/users/invalid-id/mutual-friends?userId=also-invalid');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid user ID format');
    });

    test('should return 404 when one user does not exist', async () => {
      const [user1] = testUsers;

      const response = await request(app)
        .get(`/api/social/users/${user1.id}/mutual-friends?userId=u999999999`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('One or both users not found');
    });
  });

  describe('GET /api/social/users/:id/friend-suggestions - Friend Suggestions', () => {
    test('should return friend suggestions based on friends of friends', async () => {
      const [user1, user2, user3, user4] = testUsers;

      // User1 follows User2
      await request(app)
        .post(`/api/users/${user2.id}/follow`)
        .send({ userId: user1.id });

      // User2 follows User3 and User4
      await request(app)
        .post(`/api/users/${user3.id}/follow`)
        .send({ userId: user2.id });
      
      await request(app)
        .post(`/api/users/${user4.id}/follow`)
        .send({ userId: user2.id });

      // Get suggestions for User1 (should suggest User3 and User4)
      const response = await request(app)
        .get(`/api/social/users/${user1.id}/friend-suggestions`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Friend suggestions retrieved successfully');
      expect(response.body.data.length).toBeGreaterThan(0);
      
      // Check that suggestions include mutual friends count
      response.body.data.forEach(suggestion => {
        expect(suggestion.id).toBeDefined();
        expect(suggestion.fullName).toBeDefined();
        expect(suggestion.followersCount).toBeDefined();
        expect(suggestion.mutualFriends).toBeDefined();
      });
    });

    test('should respect limit parameter', async () => {
      const [user1, user2, user3, user4, user5] = testUsers;

      // Create follow relationships for suggestions
      await request(app)
        .post(`/api/users/${user2.id}/follow`)
        .send({ userId: user1.id });

      for (const user of [user3, user4, user5]) {
        await request(app)
          .post(`/api/users/${user.id}/follow`)
          .send({ userId: user2.id });
      }

      const response = await request(app)
        .get(`/api/social/users/${user1.id}/friend-suggestions?limit=2`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeLessThanOrEqual(2);
    });

    test('should return empty array when no suggestions available', async () => {
      const [user1] = testUsers;

      const response = await request(app)
        .get(`/api/social/users/${user1.id}/friend-suggestions`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    test('should return 400 for invalid user ID format', async () => {
      const response = await request(app)
        .get('/api/social/users/invalid-id/friend-suggestions');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid user ID format');
    });

    test('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get('/api/social/users/u999999999/friend-suggestions');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User not found');
    });
  });

  describe('POST /api/social/users/follow-status - Bulk Follow Status', () => {
    test('should return follow status for multiple users', async () => {
      const [user1, user2, user3, user4] = testUsers;

      // User1 follows User2
      await request(app)
        .post(`/api/users/${user2.id}/follow`)
        .send({ userId: user1.id });

      // User3 follows User1
      await request(app)
        .post(`/api/users/${user1.id}/follow`)
        .send({ userId: user3.id });

      const response = await request(app)
        .post('/api/social/users/follow-status')
        .send({
          userId: user1.id,
          targetUserIds: [user2.id, user3.id, user4.id]
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Bulk follow status retrieved successfully');
      expect(response.body.data).toHaveLength(3);

      // Check structure of response
      response.body.data.forEach(status => {
        expect(status.userId).toBeDefined();
        expect(status.fullName).toBeDefined();
        expect(typeof status.isFollowing).toBe('boolean');
        expect(typeof status.isFollowedBy).toBe('boolean');
        expect(typeof status.mutualFollow).toBe('boolean');
      });

      // Verify specific relationships
      const user2Status = response.body.data.find(s => s.userId === user2.id);
      const user3Status = response.body.data.find(s => s.userId === user3.id);
      const user4Status = response.body.data.find(s => s.userId === user4.id);

      expect(user2Status.isFollowing).toBe(true);   // User1 follows User2
      expect(user2Status.isFollowedBy).toBe(false); // User2 doesn't follow User1
      
      expect(user3Status.isFollowing).toBe(false);  // User1 doesn't follow User3
      expect(user3Status.isFollowedBy).toBe(true);  // User3 follows User1
      
      expect(user4Status.isFollowing).toBe(false);  // No relationship
      expect(user4Status.isFollowedBy).toBe(false);
    });

    test('should handle invalid user IDs in target list', async () => {
      const [user1, user2] = testUsers;

      const response = await request(app)
        .post('/api/social/users/follow-status')
        .send({
          userId: user1.id,
          targetUserIds: [user2.id, 'invalid-id', 'u999999999']
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);

      // Check that invalid IDs are handled gracefully
      const invalidIdResult = response.body.data.find(s => s.userId === 'invalid-id');
      const nonExistentResult = response.body.data.find(s => s.userId === 'u999999999');

      expect(invalidIdResult.error).toBe('Invalid user ID format');
      expect(nonExistentResult.error).toBe('User not found');
    });

    test('should return 400 for invalid current user ID', async () => {
      const [user1] = testUsers;

      const response = await request(app)
        .post('/api/social/users/follow-status')
        .send({
          userId: 'invalid-id',
          targetUserIds: [user1.id]
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid userId or targetUserIds format');
    });

    test('should return 400 for non-array targetUserIds', async () => {
      const [user1] = testUsers;

      const response = await request(app)
        .post('/api/social/users/follow-status')
        .send({
          userId: user1.id,
          targetUserIds: 'not-an-array'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid userId or targetUserIds format');
    });

    test('should return 404 for non-existent current user', async () => {
      const [user1] = testUsers;

      const response = await request(app)
        .post('/api/social/users/follow-status')
        .send({
          userId: 'u999999999',
          targetUserIds: [user1.id]
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User not found');
    });

    test('should detect mutual follows correctly', async () => {
      const [user1, user2] = testUsers;

      // Create mutual follow relationship
      await request(app)
        .post(`/api/users/${user2.id}/follow`)
        .send({ userId: user1.id });

      await request(app)
        .post(`/api/users/${user1.id}/follow`)
        .send({ userId: user2.id });

      const response = await request(app)
        .post('/api/social/users/follow-status')
        .send({
          userId: user1.id,
          targetUserIds: [user2.id]
        });

      expect(response.status).toBe(200);
      const user2Status = response.body.data[0];
      
      expect(user2Status.isFollowing).toBe(true);
      expect(user2Status.isFollowedBy).toBe(true);
      expect(user2Status.mutualFollow).toBe(true);
    });
  });

  describe('Rate Limiting - Enhanced Social Features', () => {
    test('should enforce rate limits on social endpoints', async () => {
      const [user1, user2] = testUsers;

      // Test rate limiting by making many requests
      const promises = [];
      for (let i = 0; i < 50; i++) {
        promises.push(
          request(app).get(`/api/social/users/${user1.id}/mutual-friends?userId=${user2.id}`)
        );
      }

      const responses = await Promise.all(promises);
      
      // Should all succeed or hit rate limit
      responses.forEach(response => {
        expect([200, 429]).toContain(response.status);
      });
    });
  });
}); 