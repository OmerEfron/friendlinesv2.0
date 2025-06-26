const request = require('supertest');
const app = require('../server');

// Mock the notification service
jest.mock('../utils/notificationService', () => ({
  sendPush: jest.fn().mockResolvedValue({ success: true }),
  getFriendTokens: jest.fn().mockResolvedValue(['token1']),
  registerDevice: jest.fn().mockResolvedValue({ success: true }),
  isValidExpoPushToken: jest.fn().mockReturnValue(true)
}));

describe('Notification Integration Tests', () => {
  let testUser1, testUser2, testGroup;

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();

    // Create test users
    testUser1 = {
      id: 'u123456789',
      fullName: 'Test User 1',
      email: 'test1@example.com',
      expoPushToken: 'ExponentPushToken[test1]'
    };

    testUser2 = {
      id: 'u987654321',
      fullName: 'Test User 2',
      email: 'test2@example.com',
      expoPushToken: 'ExponentPushToken[test2]'
    };

    testGroup = {
      id: 'g123456789',
      name: 'Test Group',
      description: 'A test group',
      ownerId: testUser1.id,
      members: [testUser1.id],
      invites: []
    };

    // Mock the database to return our test data
    jest.doMock('../utils/dbUtils', () => ({
      readJson: jest.fn().mockImplementation((file) => {
        if (file === 'users.json') {
          return Promise.resolve([testUser1, testUser2]);
        }
        if (file === 'groups.json') {
          return Promise.resolve([testGroup]);
        }
        return Promise.resolve([]);
      }),
      writeJson: jest.fn().mockResolvedValue(undefined),
      generateId: jest.fn().mockReturnValue('test-id')
    }));
  });

  describe('Group Invitation Notifications', () => {
    test('should send notification when inviting user to group', async () => {
      const { sendPush } = require('../utils/notificationService');

      const inviteData = {
        userIds: [testUser2.id],
        userId: testUser1.id
      };

      const response = await request(app)
        .post(`/api/groups/${testGroup.id}/invite`)
        .send(inviteData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(sendPush).toHaveBeenCalledWith(
        [testUser2.expoPushToken],
        'Group Invitation!',
        `${testUser1.fullName} invited you to join "${testGroup.name}"`,
        {
          type: 'group_invitation',
          groupId: testGroup.id,
          groupName: testGroup.name,
          inviterId: testUser1.id,
          inviterName: testUser1.fullName,
          invitedUserId: testUser2.id
        }
      );
    });

    test('should send notification when user accepts group invitation', async () => {
      const { sendPush } = require('../utils/notificationService');

      // First invite the user
      testGroup.invites = [testUser2.id];

      const acceptData = {
        userId: testUser2.id
      };

      const response = await request(app)
        .post(`/api/groups/${testGroup.id}/accept`)
        .send(acceptData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(sendPush).toHaveBeenCalledWith(
        [testUser1.expoPushToken],
        'Group Invitation Accepted!',
        `${testUser2.fullName} joined "${testGroup.name}"`,
        {
          type: 'group_invitation_accepted',
          groupId: testGroup.id,
          groupName: testGroup.name,
          newMemberId: testUser2.id,
          newMemberName: testUser2.fullName,
          ownerId: testUser1.id
        }
      );
    });
  });

  describe('Friend Request Notifications', () => {
    test('should send notification when sending friend request', async () => {
      const { sendPush } = require('../utils/notificationService');

      const friendRequestData = {
        userId: testUser1.id
      };

      const response = await request(app)
        .post(`/api/users/${testUser2.id}/send-friend-request`)
        .send(friendRequestData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(sendPush).toHaveBeenCalledWith(
        [testUser2.expoPushToken],
        'New Friend Request!',
        `${testUser1.fullName} sent you a friend request`,
        {
          type: 'friend_request',
          requesterId: testUser1.id,
          requesterName: testUser1.fullName,
          targetUserId: testUser2.id,
          targetUserName: testUser2.fullName
        }
      );
    });

    test('should send notification when accepting friend request', async () => {
      const { sendPush } = require('../utils/notificationService');

      // First send a friend request
      testUser2.friendRequests = [testUser1.id];
      testUser1.sentFriendRequests = [testUser2.id];

      const acceptData = {
        userId: testUser2.id
      };

      const response = await request(app)
        .post(`/api/users/${testUser1.id}/accept-friend`)
        .send(acceptData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(sendPush).toHaveBeenCalledWith(
        [testUser1.expoPushToken],
        'Friend Request Accepted!',
        `${testUser2.fullName} accepted your friend request`,
        {
          type: 'friend_request_accepted',
          accepterId: testUser2.id,
          accepterName: testUser2.fullName,
          requesterId: testUser1.id,
          requesterName: testUser1.fullName
        }
      );
    });
  });

  describe('Notification Error Handling', () => {
    test('should not fail operation when notification fails', async () => {
      const { sendPush } = require('../utils/notificationService');
      
      // Mock notification failure
      sendPush.mockRejectedValue(new Error('Notification service down'));

      const inviteData = {
        userIds: [testUser2.id],
        userId: testUser1.id
      };

      const response = await request(app)
        .post(`/api/groups/${testGroup.id}/invite`)
        .send(inviteData)
        .expect(200);

      // Operation should still succeed even if notification fails
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Invitations sent successfully');
    });
  });
}); 