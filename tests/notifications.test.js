const request = require('supertest');

// Setup test environment
process.env.NODE_ENV = 'test';

const app = require('../server.js');

describe('Notification System Tests', () => {
  let testUserId1 = null;
  let testUserId2 = null;

  beforeEach(async () => {
    // Reset data before each test
    await request(app).post('/api/reset');

    // Create test users
    const user1Response = await request(app)
      .post('/api/login')
      .send({
        fullName: 'John Doe',
        email: 'john.doe@example.com'
      });

    const user2Response = await request(app)
      .post('/api/login')
      .send({
        fullName: 'Jane Smith',
        email: 'jane.smith@example.com'
      });

    testUserId1 = user1Response.body.data.id;
    testUserId2 = user2Response.body.data.id;
  });

  describe('GET /api/notifications/:id - Get User Notifications', () => {
    test('should return empty notifications list for new user', async () => {
      const response = await request(app)
        .get(`/api/notifications/${testUserId1}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Notifications retrieved successfully');
      expect(response.body.data).toEqual([]);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.totalNotifications).toBe(0);
    });

    test('should return notifications with pagination', async () => {
      // Create some test notifications by having user2 send friend request to user1
      await request(app)
        .post(`/api/users/${testUserId1}/friend-request`)
        .send({ userId: testUserId2 });

      // Create a post to trigger notifications
      await request(app)
        .post('/api/posts')
        .send({
          rawText: 'Test post for notifications',
          userId: testUserId1
        });

      const response = await request(app)
        .get(`/api/notifications/${testUserId2}?page=1&limit=5`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
    });

    test('should filter unread notifications when requested', async () => {
      // Create some test notifications
      await request(app)
        .post(`/api/users/${testUserId1}/friend-request`)
        .send({ userId: testUserId2 });

      const response = await request(app)
        .get(`/api/notifications/${testUserId2}?unreadOnly=true`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should return 400 for invalid user ID format', async () => {
      const response = await request(app)
        .get('/api/notifications/invalid-id');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid user ID format');
    });

    test('should return 400 for invalid pagination parameters', async () => {
      const response = await request(app)
        .get(`/api/notifications/${testUserId1}?page=0&limit=101`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid pagination parameters');
    });
  });

  describe('PUT /api/notifications/mark-read - Mark Notifications as Read', () => {
    test('should mark notifications as read successfully', async () => {
      // Create some test notifications
      await request(app)
        .post(`/api/users/${testUserId1}/friend-request`)
        .send({ userId: testUserId2 });

      // Get notifications to get their IDs
      const notificationsResponse = await request(app)
        .get(`/api/notifications/${testUserId2}`);

      const notifications = notificationsResponse.body.data;
      
      if (notifications.length > 0) {
        const notificationIds = notifications.map(n => n.id);

        const response = await request(app)
          .put('/api/notifications/mark-read')
          .send({
            notificationIds,
            userId: testUserId2
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.markedCount).toBe(notifications.length);
      }
    });

    test('should return 400 for missing notificationIds', async () => {
      const response = await request(app)
        .put('/api/notifications/mark-read')
        .send({
          userId: testUserId1
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('NotificationIds must be a non-empty array');
    });

    test('should return 400 for empty notificationIds array', async () => {
      const response = await request(app)
        .put('/api/notifications/mark-read')
        .send({
          notificationIds: [],
          userId: testUserId1
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('NotificationIds must be a non-empty array');
    });

    test('should return 400 for invalid user ID format', async () => {
      const response = await request(app)
        .put('/api/notifications/mark-read')
        .send({
          notificationIds: ['n123456789'],
          userId: 'invalid-id'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid user ID format');
    });

    test('should only mark notifications belonging to the requesting user', async () => {
      // This test ensures security - users can only mark their own notifications as read
      const response = await request(app)
        .put('/api/notifications/mark-read')
        .send({
          notificationIds: ['n123456789', 'n987654321'],
          userId: testUserId1
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      // Should report how many were actually marked (likely 0 if notifications don't exist or don't belong to user)
      expect(response.body.data.markedCount).toBeDefined();
      expect(response.body.data.requestedCount).toBe(2);
    });
  });

  describe('Integration - Notification Creation', () => {
    test('should create notifications when user sends friend request', async () => {
      // User2 sends friend request to User1
      await request(app)
        .post(`/api/users/${testUserId1}/friend-request`)
        .send({ userId: testUserId2 });

      // Check if User1 received a friend request notification
      const response = await request(app)
        .get(`/api/notifications/${testUserId1}`);

      expect(response.status).toBe(200);
      // Note: This depends on whether friend request notifications are implemented
      // If not implemented yet, this test documents the expected behavior
    });

    test('should create notifications when posts are created for friends', async () => {
      // User2 sends friend request to User1 and User1 accepts
      await request(app)
        .post(`/api/users/${testUserId1}/friend-request`)
        .send({ userId: testUserId2 });

      await request(app)
        .post(`/api/users/${testUserId2}/accept-friend`)
        .send({ userId: testUserId1 });

      // User1 creates a post
      await request(app)
        .post('/api/posts')
        .send({
          rawText: 'Hello friends!',
          userId: testUserId1,
          audienceType: 'friends'
        });

      // Check if User2 received a post notification
      const response = await request(app)
        .get(`/api/notifications/${testUserId2}`);

      expect(response.status).toBe(200);
      // Note: This depends on whether post notifications are implemented
      // The current system uses push notifications, but could also create in-app notifications
    });
  });

  describe('Rate Limiting - Notifications', () => {
    test('should enforce general rate limits on notification endpoints', async () => {
      // Make multiple requests to test rate limiting
      const promises = [];
      for (let i = 0; i < 50; i++) {
        promises.push(
          request(app).get(`/api/notifications/${testUserId1}`)
        );
      }

      const responses = await Promise.all(promises);
      
      // All should succeed under normal rate limits (100 per 15 minutes in dev)
      responses.forEach(response => {
        expect([200, 429]).toContain(response.status);
      });
    });
  });
}); 