// Group controller for Friendlines
// Contains business logic for managing groups

const { db } = require("../utils/database");
const { sendPush, getUserTokens } = require("../utils/notificationService");
const { isValidId } = require("../utils/validation");

/**
 * Create a new group
 * POST /groups/:userId
 */
const createGroup = async (req, res) => {
  try {
    const { userId } = req.params;
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
    const { userId, inviterId } = req.body;

    // Validate required fields
    if (!userId || !inviterId) {
      return res.status(400).json({
        success: false,
        message: "User ID and inviter ID are required",
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

    // Check if users exist
    const [user, inviter] = await Promise.all([
      db.getUserById(userId),
      db.getUserById(inviterId)
    ]);

    if (!user || !inviter) {
      return res.status(404).json({
        success: false,
        message: "User or inviter not found",
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

    res.status(200).json({
      success: true,
      message: "User added to group successfully",
      data: {
        groupId: id,
        groupName: group.name,
        userId: userId,
        userName: user.fullName,
        inviterId: inviterId,
        inviterName: inviter.fullName,
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
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
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
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
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
    const { userId, page = 1, limit = 10 } = req.query;

    // Validate required userId for access control
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required for access control",
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