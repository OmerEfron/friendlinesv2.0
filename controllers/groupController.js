// Group controller for Friendlines
// Contains business logic for managing groups

const { db } = require("../utils/database");
const { sendPush, getUserTokens } = require("../utils/notificationService");
const { isValidId } = require("../utils/validation");

/**
 * Create a new group
 * POST /groups
 */
const createGroup = async (req, res) => {
  try {
    const userId = req.user.id; // Get from authenticated user
    const { name, description } = req.body;

    // Validate required fields
    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        error: "Group name is required",
        timestamp: new Date().toISOString(),
      });
    }

    // Check if user exists
    const user = await db.getUserById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        error: "No user found with the provided ID",
        timestamp: new Date().toISOString(),
      });
    }

    // Create new group using modern database system
    const groupData = {
      name: name.trim(),
      description: description ? description.trim() : "",
      ownerId: userId,
      isPrivate: false, // Default to public groups
    };

    const newGroup = await db.createGroup(groupData);

    res.status(201).json({
      success: true,
      message: "Group created successfully",
      data: {
        id: newGroup.id,
        name: newGroup.name,
        description: newGroup.description,
        ownerId: newGroup.ownerId,
        ownerName: user.fullName,
        isPrivate: newGroup.isPrivate,
        memberCount: 1, // Owner is automatically a member
        createdAt: newGroup.createdAt,
        updatedAt: newGroup.updatedAt,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Create group error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error creating group",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Something went wrong",
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Invite user to group
 * POST /groups/:id/invite
 */
const inviteToGroup = async (req, res) => {
  try {
    const { id } = req.params; // Group ID
    const { userIds } = req.body; // Array of user IDs to invite
    const inviterId = req.user.id; // Get from authenticated user

    // Validate required fields
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "User IDs array is required",
        timestamp: new Date().toISOString(),
      });
    }

    // Check if group exists
    const group = await db.getGroupById(id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
        timestamp: new Date().toISOString(),
      });
    }

    // Get inviter user
    const inviter = await db.getUserById(inviterId);
    if (!inviter) {
      return res.status(404).json({
        success: false,
        message: "Inviter not found",
        timestamp: new Date().toISOString(),
      });
    }

    // Check if inviter is a group member
    const isInviterMember = await db.isUserInGroup(id, inviterId);
    if (!isInviterMember) {
      return res.status(403).json({
        success: false,
        message: "Only group members can invite others",
        timestamp: new Date().toISOString(),
      });
    }

    const results = [];
    const invitedUsers = [];

    // Process each user invitation
    for (const userId of userIds) {
      try {
        // Check if user exists
        const user = await db.getUserById(userId);
        if (!user) {
          results.push({
            userId,
            success: false,
            error: "User not found"
          });
          continue;
        }

        // Check if user is already a member
        const isAlreadyMember = await db.isUserInGroup(id, userId);
        if (isAlreadyMember) {
          results.push({
            userId,
            success: false,
            error: "User is already a group member"
          });
          continue;
        }

        // Add user to group
        await db.addUserToGroup(id, userId);
        invitedUsers.push({
          userId,
          userName: user.fullName
        });

        results.push({
          userId,
          success: true,
          userName: user.fullName
        });

        // Send push notification (non-blocking)
        try {
          if (user.expoPushToken) {
            await sendPush(
              [user.expoPushToken],
              "Group Invitation",
              `${inviter.fullName} added you to ${group.name}`,
              {
                type: "group_invitation",
                groupId: id,
                groupName: group.name,
                inviterId: inviterId,
                inviterName: inviter.fullName
              },
              {
                channelId: "group_invites",
                priority: "normal"
              }
            );
          }
        } catch (notificationError) {
          console.error("Notification error (non-blocking):", notificationError);
        }
      } catch (error) {
        results.push({
          userId,
          success: false,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;

    res.status(200).json({
      success: true,
      message: `${successCount} users invited to group successfully`,
      data: {
        groupId: id,
        groupName: group.name,
        inviterId: inviterId,
        inviterName: inviter.fullName,
        invitedUsers,
        pendingInvites: successCount,
        results
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Invite to group error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error inviting to group",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Something went wrong",
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Accept group invitation  
 * POST /groups/:id/accept
 */
const acceptInvitation = async (req, res) => {
  try {
    const { id } = req.params; // Group ID
    const userId = req.user.id; // Get from authenticated user



    // Check if group exists
    const group = await db.getGroupById(id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
        timestamp: new Date().toISOString(),
      });
    }

    // Check if user exists
    const user = await db.getUserById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        timestamp: new Date().toISOString(),
      });
    }

    // Check if user is already a member
    const isAlreadyMember = await db.isUserInGroup(id, userId);
    if (isAlreadyMember) {
      return res.status(400).json({
        success: false,
        message: "User is already a group member",
        timestamp: new Date().toISOString(),
      });
    }

    // Add user to group
    await db.addUserToGroup(id, userId);

    res.status(200).json({
      success: true,
      message: "Group invitation accepted successfully",
      data: {
        groupId: id,
        groupName: group.name,
        userId: userId,
        userName: user.fullName,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Accept invitation error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error accepting invitation",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Something went wrong",
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Leave group
 * POST /groups/:id/leave
 */
const leaveGroup = async (req, res) => {
  try {
    const { id } = req.params; // Group ID
    const userId = req.user.id; // Get from authenticated user

    // Check if group exists
    const group = await db.getGroupById(id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
        timestamp: new Date().toISOString(),
      });
    }

    // Check if user exists
    const user = await db.getUserById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        timestamp: new Date().toISOString(),
      });
    }

    // Check if user is a member
    const isMember = await db.isUserInGroup(id, userId);
    if (!isMember) {
      return res.status(400).json({
        success: false,
        message: "User is not a member of this group",
        timestamp: new Date().toISOString(),
      });
    }

    // Remove user from group
    await db.removeUserFromGroup(id, userId);

    res.status(200).json({
      success: true,
      message: "Left group successfully",
      data: {
        groupId: id,
        groupName: group.name,
        userId: userId,
        userName: user.fullName,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Leave group error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error leaving group",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Something went wrong",
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get group details
 * GET /groups/:id
 */
const getGroup = async (req, res) => {
  try {
    const { id } = req.params;

    // Get group details
    const group = await db.getGroupById(id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
        timestamp: new Date().toISOString(),
      });
    }

    // Get group members
    const members = await db.getGroupMembers(id);

    const groupDetails = {
      id: group.id,
      name: group.name,
      description: group.description,
      ownerId: group.ownerId,
      isPrivate: group.isPrivate,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
      memberCount: members.length,
      members: members.map(member => ({
        id: member.id,
        fullName: member.fullName,
        avatar: member.avatar,
        role: member.role,
        joinedAt: member.joinedAt
      }))
    };

    res.status(200).json({
      success: true,
      message: "Group details retrieved successfully",
      data: groupDetails,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Get group error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error retrieving group",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Something went wrong",
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get user's groups
 * GET /groups/user/:userId
 */
const getUserGroups = async (req, res) => {
  try {
    const { userId } = req.params;
    const authenticatedUserId = req.user.id;

    // Check if the authenticated user is requesting their own groups or has permission
    if (userId !== authenticatedUserId) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
        error: "You can only access your own groups",
        timestamp: new Date().toISOString(),
      });
    }

    // Check if user exists
    const user = await db.getUserById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        timestamp: new Date().toISOString(),
      });
    }

    // Get user's groups
    const groups = await db.getUserGroups(userId);

    const groupList = groups.map(group => ({
      id: group.id,
      name: group.name,
      description: group.description,
      ownerId: group.ownerId,
      isPrivate: group.isPrivate,
      role: group.role,
      joinedAt: group.joinedAt,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
      memberCount: group.memberCount,
    }));

    res.status(200).json({
      success: true,
      message: "User groups retrieved successfully",
      data: groupList,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Get user groups error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error retrieving user groups",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Something went wrong",
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get posts for a specific group
 * GET /groups/:id/posts
 */
const getGroupPosts = async (req, res) => {
  try {
    const { id } = req.params; // Group ID
    const { page = 1, limit = 10 } = req.query;
    const userId = req.user.id; // Get from authenticated user

    // Check if group exists
    const group = await db.getGroupById(id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
        timestamp: new Date().toISOString(),
      });
    }

    // Check if user is a member of the group
    const isMember = await db.isUserInGroup(id, userId);
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: "Access denied. User must be a group member to view posts.",
        timestamp: new Date().toISOString(),
      });
    }

    // Get group posts with pagination
    const posts = await db.getGroupPosts(id, {
      page: parseInt(page),
      limit: parseInt(limit)
    });

    res.status(200).json({
      success: true,
      message: "Group posts retrieved successfully",
      data: {
        groupId: id,
        groupName: group.name,
        posts: posts.data,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: posts.total,
          pages: Math.ceil(posts.total / parseInt(limit))
        }
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Get group posts error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error retrieving group posts",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Something went wrong",
      timestamp: new Date().toISOString(),
    });
  }
};

// Helper function for other controllers
const validateGroupAccess = async (userId, groupIds) => {
  try {
    for (const groupId of groupIds) {
      const isMember = await db.isUserInGroup(groupId, userId);
      if (!isMember) {
        return false;
      }
    }
    return true;
  } catch (error) {
    console.error("Error validating group access:", error);
    return false;
  }
};

module.exports = {
  createGroup,
  inviteToGroup,
  acceptInvitation,
  leaveGroup,
  getGroup,
  getUserGroups,
  getGroupPosts,
  validateGroupAccess,
}; 