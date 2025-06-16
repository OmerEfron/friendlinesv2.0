// Group controller for Friendlines
// Contains business logic for managing groups

const { readJson, writeJson, generateId } = require("../utils/fileUtils");
const { validatePaginationParams } = require("../utils/validation");

/**
 * Create a new group
 * POST /api/groups
 */
const createGroup = async (req, res) => {
  try {
    // Get validated data from middleware
    const { name, description } = req.validatedData;
    const { userId } = req.params;

    // Read users and groups
    const users = await readJson("users.json");
    const groups = await readJson("groups.json");

    // Find the user (group owner)
    const user = users.find((u) => u.id === userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        error: "No user found with the provided user ID",
        timestamp: new Date().toISOString(),
      });
    }

    // Create new group
    const group = {
      id: generateId("g"),
      name,
      description: description || "",
      ownerId: userId,
      members: [userId], // Owner is automatically a member
      invites: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      settings: {
        postNotifications: true,
        membershipNotifications: true
      }
    };

    groups.push(group);
    await writeJson("groups.json", groups);

    console.log(`New group created: ${group.name} by ${user.fullName}`);

    res.status(201).json({
      success: true,
      message: "Group created successfully",
      data: group,
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
 * Invite users to a group
 * POST /api/groups/:id/invite
 */
const inviteToGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const { userIds, userId } = req.validatedData;

    // Read users and groups
    const users = await readJson("users.json");
    const groups = await readJson("groups.json");

    // Find the group
    const groupIndex = groups.findIndex((g) => g.id === id);
    if (groupIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
        error: "No group found with the provided ID",
        timestamp: new Date().toISOString(),
      });
    }

    const group = groups[groupIndex];

    // Check if the user is the owner or a member
    if (group.ownerId !== userId && !group.members.includes(userId)) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
        error: "Only group members can invite others",
        timestamp: new Date().toISOString(),
      });
    }

    // Validate that all userIds exist
    const invitedUsers = [];
    for (const inviteUserId of userIds) {
      const user = users.find((u) => u.id === inviteUserId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
          error: `No user found with ID: ${inviteUserId}`,
          timestamp: new Date().toISOString(),
        });
      }

      // Check if user is already a member or invited
      if (group.members.includes(inviteUserId)) {
        continue; // Skip users who are already members
      }
      if (!group.invites.includes(inviteUserId)) {
        group.invites.push(inviteUserId);
        invitedUsers.push(inviteUserId);
      }
    }

    // Update group
    group.updatedAt = new Date().toISOString();
    groups[groupIndex] = group;
    await writeJson("groups.json", groups);

    console.log(`Invitations sent to ${invitedUsers.length} users for group: ${group.name}`);

    res.status(200).json({
      success: true,
      message: "Invitations sent successfully",
      data: {
        groupId: group.id,
        invitedUsers,
        pendingInvites: group.invites.length
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Invite to group error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error sending invitations",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Something went wrong",
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Accept a group invitation
 * POST /api/groups/:id/accept
 */
const acceptInvitation = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.validatedData;

    // Read groups
    const groups = await readJson("groups.json");

    // Find the group
    const groupIndex = groups.findIndex((g) => g.id === id);
    if (groupIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
        error: "No group found with the provided ID",
        timestamp: new Date().toISOString(),
      });
    }

    const group = groups[groupIndex];

    // Check if user was invited
    if (!group.invites.includes(userId)) {
      return res.status(403).json({
        success: false,
        message: "No invitation found",
        error: "You have not been invited to this group",
        timestamp: new Date().toISOString(),
      });
    }

    // Accept invitation
    group.invites = group.invites.filter(id => id !== userId);
    group.members.push(userId);
    group.updatedAt = new Date().toISOString();

    groups[groupIndex] = group;
    await writeJson("groups.json", groups);

    console.log(`User ${userId} accepted invitation to group: ${group.name}`);

    res.status(200).json({
      success: true,
      message: "Invitation accepted successfully",
      data: {
        groupId: group.id,
        userId,
        memberCount: group.members.length
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
 * Leave a group
 * POST /api/groups/:id/leave
 */
const leaveGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.validatedData;

    // Read groups
    const groups = await readJson("groups.json");

    // Find the group
    const groupIndex = groups.findIndex((g) => g.id === id);
    if (groupIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
        error: "No group found with the provided ID",
        timestamp: new Date().toISOString(),
      });
    }

    const group = groups[groupIndex];

    // Check if user is a member
    if (!group.members.includes(userId)) {
      return res.status(403).json({
        success: false,
        message: "Not a member",
        error: "You are not a member of this group",
        timestamp: new Date().toISOString(),
      });
    }

    // Owner cannot leave without transferring ownership
    if (group.ownerId === userId && group.members.length > 1) {
      return res.status(403).json({
        success: false,
        message: "Cannot leave group",
        error: "Group owner must transfer ownership before leaving",
        timestamp: new Date().toISOString(),
      });
    }

    // Remove user from group
    group.members = group.members.filter(id => id !== userId);
    group.updatedAt = new Date().toISOString();

    // If owner is leaving and is the last member, delete the group
    if (group.ownerId === userId && group.members.length === 0) {
      groups.splice(groupIndex, 1);
    } else {
      groups[groupIndex] = group;
    }

    await writeJson("groups.json", groups);

    console.log(`User ${userId} left group: ${group.name}`);

    res.status(200).json({
      success: true,
      message: "Left group successfully",
      data: {
        groupId: group.id,
        userId,
        remainingMembers: group.members.length
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
 * GET /api/groups/:id
 */
const getGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;

    // Read groups and users
    const groups = await readJson("groups.json");
    const users = await readJson("users.json");

    // Find the group
    const group = groups.find((g) => g.id === id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
        error: "No group found with the provided ID",
        timestamp: new Date().toISOString(),
      });
    }

    // Check if user has access to this group
    if (userId && !group.members.includes(userId) && !group.invites.includes(userId)) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
        error: "You do not have access to this group",
        timestamp: new Date().toISOString(),
      });
    }

    // Create user lookup map
    const userMap = users.reduce((map, user) => {
      map[user.id] = user;
      return map;
    }, {});

    // Enrich group with member details
    const enrichedGroup = {
      id: group.id,
      name: group.name,
      description: group.description,
      ownerId: group.ownerId,
      members: group.members.map(memberId => {
        const user = userMap[memberId];
        return user ? {
          id: user.id,
          fullName: user.fullName,
          email: user.email
        } : null;
      }).filter(Boolean),
      memberCount: group.members.length,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt
    };

    res.status(200).json({
      success: true,
      message: "Group details retrieved successfully",
      data: enrichedGroup,
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
 * Get groups for a user
 * GET /api/groups/user/:userId
 */
const getUserGroups = async (req, res) => {
  try {
    const { userId } = req.params;

    // Read groups and users
    const groups = await readJson("groups.json");
    const users = await readJson("users.json");

    // Find the user
    const user = users.find((u) => u.id === userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        error: "No user found with the provided ID",
        timestamp: new Date().toISOString(),
      });
    }

    // Categorize groups
    const userGroups = {
      owned: groups.filter(g => g.ownerId === userId).map(g => ({
        id: g.id,
        name: g.name,
        description: g.description,
        memberCount: g.members.length,
        createdAt: g.createdAt
      })),
      member: groups.filter(g => g.members.includes(userId) && g.ownerId !== userId).map(g => ({
        id: g.id,
        name: g.name,
        description: g.description,
        memberCount: g.members.length,
        createdAt: g.createdAt
      })),
      invited: groups.filter(g => g.invites.includes(userId)).map(g => ({
        id: g.id,
        name: g.name,
        description: g.description,
        memberCount: g.members.length,
        createdAt: g.createdAt
      }))
    };

    res.status(200).json({
      success: true,
      message: "User groups retrieved successfully",
      data: userGroups,
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
 * Validate group access for a user
 * Helper function for post creation
 */
const validateGroupAccess = async (userId, groupIds) => {
  try {
    const groups = await readJson("groups.json");
    
    for (const groupId of groupIds) {
      const group = groups.find(g => g.id === groupId);
      if (!group || !group.members.includes(userId)) {
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error("Validate group access error:", error);
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
  validateGroupAccess,
}; 