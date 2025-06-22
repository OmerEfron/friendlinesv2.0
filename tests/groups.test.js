const request = require('supertest');
const express = require('express');
const { readJson, writeJson } = require('../utils/fileUtils');

// Mock the file utilities
jest.mock('../utils/fileUtils');

// Mock push notification service
jest.mock('../utils/notificationService', () => ({
  sendPush: jest.fn().mockResolvedValue({ success: true }),
  getGroupMembersTokens: jest.fn().mockResolvedValue(['token1', 'token2'])
}));

describe('Groups Endpoints', () => {
  let app;
  let mockUsers;
  let mockGroups;
  let mockPosts;

  beforeAll(() => {
    // Create Express app with routes
    app = express();
    app.use(express.json());
    
    // Import routes after mocking
    const groupsRoutes = require('../routes/groups');
    app.use('/api/groups', groupsRoutes);
    
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
        expoPushToken: 'ExponentPushToken[alice_token_12345]'
      },
      {
        id: 'u1737582951002def',
        fullName: 'Bob Smith',
        email: 'bob@friendlines.com',
        expoPushToken: 'ExponentPushToken[bob_token_67890]'
      },
      {
        id: 'u1737582951003ghi',
        fullName: 'Charlie Davis',
        email: 'charlie@friendlines.com'
      }
    ];

    mockGroups = [
      {
        id: 'g1737582951001xyz',
        name: 'Tech Enthusiasts',
        description: 'Discussing technology and programming',
        ownerId: 'u1737582951001abc',
        members: ['u1737582951001abc', 'u1737582951002def'],
        invites: ['u1737582951003ghi'],
        createdAt: '2025-06-10T10:00:00.000Z',
        updatedAt: '2025-06-17T14:30:00.000Z',
        settings: {
          postNotifications: true,
          membershipNotifications: true
        }
      }
    ];

    mockPosts = [
      {
        id: 'p1737582951001aaa',
        userId: 'u1737582951001abc',
        rawText: 'Group post content',
        generatedText: 'BREAKING: Alice Johnson group post content',
        groupIds: ['g1737582951001xyz'],
        visibility: 'groups_only',
        timestamp: '2025-06-17T08:00:00.000Z',
        likes: [],
        comments: [],
        likesCount: 0,
        commentsCount: 0,
        sharesCount: 0
      }
    ];

    // Setup mocks
    readJson.mockImplementation((filename) => {
      if (filename === 'users.json') return Promise.resolve(mockUsers);
      if (filename === 'groups.json') return Promise.resolve(mockGroups);
      if (filename === 'posts.json') return Promise.resolve(mockPosts);
      return Promise.resolve([]);
    });
    
    writeJson.mockImplementation((filename, data) => {
      if (filename === 'users.json') mockUsers = data;
      if (filename === 'groups.json') mockGroups = data;
      if (filename === 'posts.json') mockPosts = data;
      return Promise.resolve();
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/groups', () => {
    test('should get all groups with member information', async () => {
      const response = await request(app)
        .get('/api/groups')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Groups retrieved successfully');
      expect(response.body.data).toHaveLength(1);
      
      const group = response.body.data[0];
      expect(group.id).toBe('g1737582951001xyz');
      expect(group.name).toBe('Tech Enthusiasts');
      expect(group.memberCount).toBe(2);
      expect(group.members).toHaveLength(2);
      expect(group.members[0].fullName).toBe('Alice Johnson');
    });

    test('should handle empty groups array', async () => {
      mockGroups = [];
      readJson.mockImplementation((filename) => {
        if (filename === 'groups.json') return Promise.resolve(mockGroups);
        return Promise.resolve([]);
      });

      const response = await request(app)
        .get('/api/groups')
        .expect(200);

      expect(response.body.data).toHaveLength(0);
    });
  });

  describe('GET /api/groups/:id', () => {
    test('should get specific group with member details', async () => {
      const response = await request(app)
        .get('/api/groups/g1737582951001xyz')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('g1737582951001xyz');
      expect(response.body.data.name).toBe('Tech Enthusiasts');
      expect(response.body.data.members).toHaveLength(2);
      expect(response.body.data.invites).toHaveLength(1);
      expect(response.body.data.invites[0].fullName).toBe('Charlie Davis');
    });

    test('should return 404 for non-existent group', async () => {
      const response = await request(app)
        .get('/api/groups/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Group not found');
    });

    test('should reject invalid group ID format', async () => {
      const response = await request(app)
        .get('/api/groups/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid group ID format');
    });
  });

  describe('POST /api/groups', () => {
    test('should create new group successfully', async () => {
      const groupData = {
        name: 'Book Club',
        description: 'Monthly book discussions',
        ownerId: 'u1737582951002def'
      };

      const response = await request(app)
        .post('/api/groups')
        .send(groupData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Group created successfully');
      expect(response.body.data.name).toBe('Book Club');
      expect(response.body.data.description).toBe('Monthly book discussions');
      expect(response.body.data.ownerId).toBe('u1737582951002def');
      expect(response.body.data.members).toContain('u1737582951002def');
      expect(response.body.data.id).toMatch(/^g/);
    });

    test('should reject invalid group name', async () => {
      const groupData = {
        name: 'AB',
        description: 'Test group',
        ownerId: 'u1737582951001abc'
      };

      const response = await request(app)
        .post('/api/groups')
        .send(groupData)
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
      expect(response.body.errors).toContain('Group name must be between 3 and 50 characters');
    });

    test('should reject too long description', async () => {
      const groupData = {
        name: 'Test Group',
        description: 'A'.repeat(201),
        ownerId: 'u1737582951001abc'
      };

      const response = await request(app)
        .post('/api/groups')
        .send(groupData)
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toContain('Group description cannot exceed 200 characters');
    });

    test('should return 404 for non-existent owner', async () => {
      const groupData = {
        name: 'Test Group',
        description: 'Test description',
        ownerId: 'nonexistent'
      };

      const response = await request(app)
        .post('/api/groups')
        .send(groupData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Owner user not found');
    });
  });

  describe('POST /api/groups/:id/invite', () => {
    test('should invite user to group successfully', async () => {
      const inviteData = {
        userId: 'u1737582951002def',
        inviteUserId: 'u1737582951003ghi'
      };

      const response = await request(app)
        .post('/api/groups/g1737582951001xyz/invite')
        .send(inviteData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User invited to group successfully');
      expect(response.body.data.invitedUser.fullName).toBe('Charlie Davis');
    });

    test('should reject invitation from non-member', async () => {
      const inviteData = {
        userId: 'u1737582951003ghi',
        inviteUserId: 'u1737582951002def'
      };

      const response = await request(app)
        .post('/api/groups/g1737582951001xyz/invite')
        .send(inviteData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access denied: You are not a member of this group');
    });

    test('should reject inviting already invited user', async () => {
      const inviteData = {
        userId: 'u1737582951001abc',
        inviteUserId: 'u1737582951003ghi'
      };

      const response = await request(app)
        .post('/api/groups/g1737582951001xyz/invite')
        .send(inviteData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User is already invited to this group');
    });

    test('should reject inviting existing member', async () => {
      const inviteData = {
        userId: 'u1737582951001abc',
        inviteUserId: 'u1737582951002def'
      };

      const response = await request(app)
        .post('/api/groups/g1737582951001xyz/invite')
        .send(inviteData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User is already a member of this group');
    });
  });

  describe('POST /api/groups/:id/join', () => {
    test('should accept group invitation successfully', async () => {
      const joinData = {
        userId: 'u1737582951003ghi'
      };

      const response = await request(app)
        .post('/api/groups/g1737582951001xyz/join')
        .send(joinData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Successfully joined the group');
      expect(response.body.data.newMember.fullName).toBe('Charlie Davis');
    });

    test('should reject joining without invitation', async () => {
      const joinData = {
        userId: 'u1737582951002def'
      };

      const response = await request(app)
        .post('/api/groups/g1737582951001xyz/join')
        .send(joinData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('You have not been invited to this group');
    });

    test('should reject joining as existing member', async () => {
      const joinData = {
        userId: 'u1737582951001abc'
      };

      const response = await request(app)
        .post('/api/groups/g1737582951001xyz/join')
        .send(joinData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('You are already a member of this group');
    });
  });

  describe('POST /api/groups/:id/leave', () => {
    test('should leave group successfully', async () => {
      const leaveData = {
        userId: 'u1737582951002def'
      };

      const response = await request(app)
        .post('/api/groups/g1737582951001xyz/leave')
        .send(leaveData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Successfully left the group');
      expect(response.body.data.leftUser.fullName).toBe('Bob Smith');
    });

    test('should reject leaving as non-member', async () => {
      const leaveData = {
        userId: 'u1737582951003ghi'
      };

      const response = await request(app)
        .post('/api/groups/g1737582951001xyz/leave')
        .send(leaveData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('You are not a member of this group');
    });

    test('should handle owner leaving group (transfer ownership)', async () => {
      const leaveData = {
        userId: 'u1737582951001abc'
      };

      const response = await request(app)
        .post('/api/groups/g1737582951001xyz/leave')
        .send(leaveData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Successfully left the group');
      // Ownership should transfer to remaining member
    });
  });

  describe('GET /api/groups/:id/posts', () => {
    test('should get group posts for member', async () => {
      const response = await request(app)
        .get('/api/groups/g1737582951001xyz/posts?userId=u1737582951001abc')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Group posts retrieved successfully');
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe('p1737582951001aaa');
      expect(response.body.data[0].groupIds).toContain('g1737582951001xyz');
    });

    test('should reject access for non-members', async () => {
      const response = await request(app)
        .get('/api/groups/g1737582951001xyz/posts?userId=u1737582951003ghi')
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access denied: You are not a member of this group');
    });

    test('should require userId parameter', async () => {
      const response = await request(app)
        .get('/api/groups/g1737582951001xyz/posts')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('userId query parameter is required');
    });
  });

  describe('DELETE /api/groups/:id', () => {
    test('should delete group successfully by owner', async () => {
      const deleteData = {
        userId: 'u1737582951001abc'
      };

      const response = await request(app)
        .delete('/api/groups/g1737582951001xyz')
        .send(deleteData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Group deleted successfully');
      expect(response.body.data.id).toBe('g1737582951001xyz');
    });

    test('should reject deletion by non-owner', async () => {
      const deleteData = {
        userId: 'u1737582951002def'
      };

      const response = await request(app)
        .delete('/api/groups/g1737582951001xyz')
        .send(deleteData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access denied: Only group owners can delete groups');
    });

    test('should return 404 for non-existent group', async () => {
      const deleteData = {
        userId: 'u1737582951001abc'
      };

      const response = await request(app)
        .delete('/api/groups/nonexistent')
        .send(deleteData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Group not found');
    });
  });

  describe('PUT /api/groups/:id', () => {
    test('should update group successfully by owner', async () => {
      const updateData = {
        userId: 'u1737582951001abc',
        name: 'Updated Tech Group',
        description: 'Updated description for tech enthusiasts'
      };

      const response = await request(app)
        .put('/api/groups/g1737582951001xyz')
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Group updated successfully');
      expect(response.body.data.name).toBe('Updated Tech Group');
      expect(response.body.data.description).toBe('Updated description for tech enthusiasts');
    });

    test('should reject update by non-owner', async () => {
      const updateData = {
        userId: 'u1737582951002def',
        name: 'Unauthorized Update'
      };

      const response = await request(app)
        .put('/api/groups/g1737582951001xyz')
        .send(updateData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access denied: Only group owners can update groups');
    });
  });

  describe('Rate Limiting', () => {
    test('should apply rate limiting to group creation', async () => {
      const groupData = {
        name: 'Rate Limit Test',
        description: 'Testing rate limits',
        ownerId: 'u1737582951001abc'
      };

      // Make multiple requests rapidly
      const requests = Array(6).fill().map(() => 
        request(app).post('/api/groups').send(groupData)
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
        .get('/api/groups')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Internal server error retrieving groups');
    });
  });
}); 