// Post controller for Friendlines
// Contains business logic for managing newsflash posts

const { db } = require("../utils/database");
const { generateNewsflash, generateNewsflashGPT } = require("../utils/newsflashGenerator");
const { sendPush, getFriendsTokens, getGroupMembersTokens, getFriendTokens } = require("../utils/notificationService");
const { validateGroupAccess } = require("./groupController");
const { isValidId, validatePaginationParams } = require("../utils/validation");

/**
 * Get all posts (newsflashes) with pagination
 * GET /posts
 */
const getAllPosts = async (req, res) => {
  try {
    // Validate pagination parameters
    const { page, limit } = validatePaginationParams(req.query);
    const currentUserId = req.body.currentUserId || req.query.currentUserId; // For authenticated requests

    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    // Get posts using modern database system
    const posts = await db.getPostsWithPagination(currentUserId, limit, offset);

    // Calculate total for pagination (we'll need to add this method to database.js)
    const totalPosts = posts.length; // This is a simplified version
    const totalPages = Math.ceil(totalPosts / limit);

    // Format posts for response
    const enrichedPosts = posts.map((post) => ({
      id: post.id,
      userId: post.userId,
      userFullName: post.userFullName || "Unknown User",
      rawText: post.rawText,
      generatedText: post.generatedText,
      timestamp: post.timestamp,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      audienceType: post.audienceType || "public",
      targetFriendId: post.targetFriendId || null,
      groupIds: post.groupIds || [],
      visibility: post.visibility || "public",
      sharesCount: post.sharesCount || 0,
    }));

    res.status(200).json({
      success: true,
      message: "Posts retrieved successfully",
      data: enrichedPosts,
      pagination: {
        page,
        limit,
        totalPosts,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Get all posts error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error retrieving posts",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Something went wrong",
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get posts by specific user
 * GET /posts/:userId
 */
const getPostsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page, limit } = validatePaginationParams(req.query);
    const currentUserId = req.body.currentUserId || req.query.currentUserId;

    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    // Get user posts using modern database system
    const posts = await db.getUserPosts(userId, currentUserId, limit, offset);

    // Find the target user
    const user = await db.getUserById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        error: "No user found with the provided ID",
        timestamp: new Date().toISOString(),
      });
    }

    // Format posts for response
    const enrichedPosts = posts.map((post) => ({
      id: post.id,
      userId: post.userId,
      userFullName: post.userFullName || user.fullName,
      rawText: post.rawText,
      generatedText: post.generatedText,
      timestamp: post.timestamp,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      audienceType: post.audienceType || "public",
      targetFriendId: post.targetFriendId || null,
      groupIds: post.groupIds || [],
      visibility: post.visibility || "public",
      sharesCount: post.sharesCount || 0,
    }));

    const totalPosts = enrichedPosts.length;
    const totalPages = Math.ceil(totalPosts / limit);

    res.status(200).json({
      success: true,
      message: `Posts for user ${user.fullName} retrieved successfully`,
      data: enrichedPosts,
      pagination: {
        page,
        limit,
        totalPosts,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Get posts by user error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error retrieving user posts",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Something went wrong",
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Create a new post (newsflash)
 * POST /posts
 */
const createPost = async (req, res) => {
  try {
    // Get validated data from middleware
    const {
      rawText,
      userId,
      audienceType,
      targetFriendId,
      groupIds,
      generate = true,
      tone,
      length,
      temperature,
    } = req.validatedData;

    // Find the user using modern database system
    const user = await db.getUserById(userId);
    if (!user) {
      console.error("User not found:", userId);
      return res.status(404).json({
        success: false,
        message: "User not found",
        error: "No user found with the provided user ID",
        timestamp: new Date().toISOString(),
      });
    }

    // Determine audience type - default to "groups" if groupIds provided, otherwise "public"
    let finalAudienceType = audienceType;
    if (!finalAudienceType) {
      if (groupIds && groupIds.length > 0) {
        finalAudienceType = "groups";
      } else {
        finalAudienceType = "public";
      }
    }

    // Validate audience-specific requirements
    if (finalAudienceType === "friend") {
      // Check if targetFriendId is actually a friend
      const friendshipStatus = await db.getFriendshipStatus(userId, targetFriendId);
      if (!friendshipStatus || friendshipStatus.status !== 'accepted') {
        return res.status(403).json({
          success: false,
          message: "Access denied",
          error: "You can only post to users who are your friends",
          timestamp: new Date().toISOString(),
        });
      }

      // Check if target friend exists
      const targetFriend = await db.getUserById(targetFriendId);
      if (!targetFriend) {
        return res.status(404).json({
          success: false,
          message: "Target friend not found",
          error: "The specified friend does not exist",
          timestamp: new Date().toISOString(),
        });
      }
    } else if (finalAudienceType === "groups") {
      // Validate group access if groupIds are provided
      if (groupIds && groupIds.length > 0) {
        const hasAccess = await validateGroupAccess(userId, groupIds);
        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            message: "Access denied to one or more groups",
            error: "You must be a member of all specified groups",
            timestamp: new Date().toISOString(),
          });
        }
      }
    }

    // Generate newsflash or use raw text based on generate flag
    let generatedText;
    if (generate === false) {
      // Skip newsflash generation, use raw text as is
      generatedText = rawText;
    } else {
      // Generate newsflash - use deterministic in dev mode, GPT in production
      try {
        // In development mode, always use deterministic generator for consistency
        if (process.env.NODE_ENV === "development") {
          generatedText = generateNewsflash(rawText, user.fullName);
        } else if (process.env.OPENAI_API_KEY) {
          // Production mode with API key - use GPT
          try {
            generatedText = await generateNewsflashGPT({
              rawText,
              userName: user.fullName,
              tone: tone || "satirical",
              length: length || "short",
              temperature: temperature || 0.7,
            });
          } catch (gptError) {
            console.warn("GPT newsflash generation failed, falling back to deterministic:", gptError.message);
            generatedText = generateNewsflash(rawText, user.fullName);
          }
        } else {
          // Production mode without API key - use deterministic
          generatedText = generateNewsflash(rawText, user.fullName);
        }
      } catch (newsflashError) {
        console.error("Newsflash generation error:", newsflashError);
        return res.status(400).json({
          success: false,
          message: "Failed to generate newsflash",
          error: newsflashError.message,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Determine visibility based on audience type
    let visibility;
    switch (finalAudienceType) {
      case "friends":
        visibility = "friends_only";
        break;
      case "friend":
        visibility = "friend_only";
        break;
      case "groups":
        visibility = "groups_only";
        break;
      default:
        visibility = "public";
    }

    // Create new post using modern database system
    const postData = {
      userId,
      rawText,
      generatedText,
      timestamp: new Date().toISOString(),
      audienceType: finalAudienceType,
      targetFriendId: targetFriendId || null,
      groupIds: groupIds || [],
      visibility,
      sharesCount: 0,
    };

    const newPost = await db.createPost(postData);

    // Send push notifications (non-blocking)
    try {
      let recipientTokens = [];
      
      if (finalAudienceType === "groups" && groupIds && groupIds.length > 0) {
        // Group post - notify group members (excluding the post creator)
        recipientTokens = await getGroupMembersTokens(groupIds, userId);
        if (recipientTokens.length > 0) {
          const notificationResult = await sendPush(
            recipientTokens,
            "New Group Newsflash!",
            `${user.fullName}: ${generatedText.substring(0, 100)}${generatedText.length > 100 ? '...' : ''}`,
            {
              type: "group_post",
              postId: newPost.id,
              userId: userId,
              userFullName: user.fullName,
              groupIds: groupIds
            },
            {
              channelId: "group_posts",
              priority: "high"
            }
          );
          
          if (notificationResult.success) {
            console.log(`Push notifications sent to ${recipientTokens.length} group members for post ${newPost.id}`);
          } else {
            console.error("Failed to send group push notifications:", notificationResult.error);
          }
        }
      } else if (finalAudienceType === "friends") {
        // Friends post - notify all friends
        recipientTokens = await getFriendsTokens(userId);
        if (recipientTokens.length > 0) {
          const notificationResult = await sendPush(
            recipientTokens,
            "New Friends Newsflash!",
            `${user.fullName}: ${generatedText.substring(0, 100)}${generatedText.length > 100 ? '...' : ''}`,
            {
              type: "friends_post",
              postId: newPost.id,
              userId: userId,
              userFullName: user.fullName
            },
            {
              channelId: "friends_posts",
              priority: "high"
            }
          );
          
          if (notificationResult.success) {
            console.log(`Push notifications sent to ${recipientTokens.length} friends for post ${newPost.id}`);
          } else {
            console.error("Failed to send friends push notifications:", notificationResult.error);
          }
        }
      } else if (finalAudienceType === "friend") {
        // Specific friend post - notify the target friend
        recipientTokens = await getFriendTokens(targetFriendId);
        if (recipientTokens.length > 0) {
          const notificationResult = await sendPush(
            recipientTokens,
            "New Personal Newsflash!",
            `${user.fullName} shared: ${generatedText.substring(0, 100)}${generatedText.length > 100 ? '...' : ''}`,
            {
              type: "friend_post",
              postId: newPost.id,
              userId: userId,
              userFullName: user.fullName,
              targetFriendId: targetFriendId
            },
            {
              channelId: "friend_posts",
              priority: "high"
            }
          );
          
          if (notificationResult.success) {
            console.log(`Push notification sent to friend ${targetFriendId} for post ${newPost.id}`);
          } else {
            console.error("Failed to send friend push notification:", notificationResult.error);
          }
        }
      }
    } catch (notificationError) {
      console.error("Notification error (non-blocking):", notificationError);
      // Don't fail the post creation if notifications fail
    }

    res.status(201).json({
      success: true,
      message: "Newsflash created successfully",
      data: {
        id: newPost.id,
        userId: newPost.userId,
        userFullName: user.fullName,
        rawText: newPost.rawText,
        generatedText: newPost.generatedText,
        timestamp: newPost.timestamp,
        createdAt: newPost.createdAt,
        updatedAt: newPost.updatedAt,
        audienceType: newPost.audienceType,
        targetFriendId: newPost.targetFriendId,
        groupIds: newPost.groupIds,
        visibility: newPost.visibility,
        sharesCount: newPost.sharesCount,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Create post error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error creating post",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Something went wrong",
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Update an existing post
 * PUT /posts/:id
 */
const updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { rawText } = req.validatedData;

    // Get the existing post using modern database
    const post = await db.getPostById(id);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
        error: "No post found with the provided ID",
        timestamp: new Date().toISOString(),
      });
    }

    // Find the user who owns the post
    const user = await db.getUserById(post.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Post owner not found",
        error: "User who created this post no longer exists",
        timestamp: new Date().toISOString(),
      });
    }

    // If rawText is provided, update it and regenerate newsflash
    let updateData = {};
    if (rawText !== undefined) {
      let generatedText;
      try {
        // In development mode, always use deterministic generator for consistency
        if (process.env.NODE_ENV === "development") {
          generatedText = generateNewsflash(rawText, user.fullName);
        } else if (process.env.OPENAI_API_KEY) {
          // Production mode with API key - use GPT
          try {
            generatedText = await generateNewsflashGPT({
              rawText,
              userName: user.fullName,
              tone: req.body.tone || "satirical",
              length: req.body.length || "short",
              temperature: req.body.temperature || 0.7,
            });
          } catch (gptError) {
            console.warn("GPT newsflash generation failed, falling back to deterministic:", gptError.message);
            generatedText = generateNewsflash(rawText, user.fullName);
          }
        } else {
          // Production mode without API key - use deterministic
          generatedText = generateNewsflash(rawText, user.fullName);
        }
      } catch (newsflashError) {
        console.error("Newsflash generation error:", newsflashError);
        return res.status(400).json({
          success: false,
          message: "Failed to generate newsflash",
          error: newsflashError.message,
          timestamp: new Date().toISOString(),
        });
      }

      updateData = {
        rawText,
        generatedText,
        updatedAt: new Date().toISOString(),
      };
    }

    // Update post using modern database
    const updateResult = await db.updatePost(id, updateData);
    if (!updateResult.success) {
      return res.status(500).json({
        success: false,
        message: "Failed to update post",
        error: updateResult.error,
        timestamp: new Date().toISOString(),
      });
    }

    // Get the updated post
    const updatedPost = await db.getPostById(id);

    // Return updated post with user info
    const responsePost = {
      id: updatedPost.id,
      userId: updatedPost.userId,
      userFullName: user.fullName,
      rawText: updatedPost.rawText,
      generatedText: updatedPost.generatedText,
      timestamp: updatedPost.timestamp,
      createdAt: updatedPost.createdAt,
      updatedAt: updatedPost.updatedAt,
      // Social features
      sharesCount: updatedPost.sharesCount || 0,
    };

    console.log(`Post updated by ${user.fullName}: ${id}`);

    res.status(200).json({
      success: true,
      message: "Post updated successfully",
      data: responsePost,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Update post error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error updating post",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Something went wrong",
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Delete a post
 * DELETE /posts/:id
 */
const deletePost = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if post exists using modern database
    const post = await db.getPostById(id);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
        error: "No post found with the provided ID",
        timestamp: new Date().toISOString(),
      });
    }

    // Delete post using modern database
    const deleteResult = await db.deletePost(id);
    if (!deleteResult.success) {
      return res.status(500).json({
        success: false,
        message: "Failed to delete post",
        error: deleteResult.error,
        timestamp: new Date().toISOString(),
      });
    }

    console.log(`Post deleted: ${id}`);

    res.status(200).json({
      success: true,
      message: "Post deleted successfully",
      data: {
        id: post.id,
        deletedAt: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Delete post error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error deleting post",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Something went wrong",
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get a specific post by ID
 * GET /posts/single/:id
 */
const getPostById = async (req, res) => {
  try {
    const { id } = req.params;

    // Get post using modern database
    const post = await db.getPostById(id);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
        error: "No post found with the provided ID",
        timestamp: new Date().toISOString(),
      });
    }

    // Find the user who owns the post
    const user = await db.getUserById(post.userId);

    // Enrich post with user information
    const enrichedPost = {
      id: post.id,
      userId: post.userId,
      userFullName: user ? user.fullName : "Unknown User",
      rawText: post.rawText,
      generatedText: post.generatedText,
      timestamp: post.timestamp,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      // Social features
      sharesCount: post.sharesCount || 0,
    };

    res.status(200).json({
      success: true,
      message: "Post retrieved successfully",
      data: enrichedPost,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Get post by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error retrieving post",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Something went wrong",
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get post statistics (development only)
 * GET /posts/stats
 */
const getPostStats = async (req, res) => {
  try {
    // Only allow in development mode
    if (process.env.NODE_ENV !== "development") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
        error: "This endpoint is only available in development mode",
        timestamp: new Date().toISOString(),
      });
    }

    // Get posts and users using modern database
    const posts = await db.getPostsWithPagination(null, 10000, 0); // Get all posts
    const users = await db.getAllUsers(1000, 0); // Get all users

    // Calculate statistics
    const now = new Date();
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

    const stats = {
      totalPosts: posts.length,
      totalUsers: users.length,
      postsLast24Hours: posts.filter((p) => new Date(p.createdAt) > oneDayAgo)
        .length,
      postsLastWeek: posts.filter((p) => new Date(p.createdAt) > oneWeekAgo)
        .length,
      averagePostLength:
        posts.length > 0
          ? Math.round(
              posts.reduce((sum, p) => sum + p.rawText.length, 0) / posts.length
            )
          : 0,
      mostActiveUser: users.length > 0 ? getMostActiveUser(posts, users) : null,
      recentPosts: posts
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5)
        .map((post) => ({
          id: post.id,
          userId: post.userId,
          rawText:
            post.rawText.substring(0, 50) +
            (post.rawText.length > 50 ? "..." : ""),
          createdAt: post.createdAt,
        })),
    };

    res.status(200).json({
      success: true,
      message: "Post statistics retrieved successfully",
      data: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Get post stats error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error retrieving post statistics",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Something went wrong",
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Helper function to find the most active user
 */
const getMostActiveUser = (posts, users) => {
  const userPostCounts = {};

  // Count posts per user
  posts.forEach((post) => {
    userPostCounts[post.userId] = (userPostCounts[post.userId] || 0) + 1;
  });

  // Find user with most posts
  let mostActiveUserId = null;
  let maxPosts = 0;

  Object.entries(userPostCounts).forEach(([userId, count]) => {
    if (count > maxPosts) {
      maxPosts = count;
      mostActiveUserId = userId;
    }
  });

  if (mostActiveUserId) {
    const user = users.find((u) => u.id === mostActiveUserId);
    return {
      userId: mostActiveUserId,
      fullName: user ? user.fullName : "Unknown User",
      postCount: maxPosts,
    };
  }

  return null;
};

/**
 * Generate a newsflash preview using GPT (without creating a post)
 * POST /posts/generate-newsflash
 */
const generateNewsflashPreview = async (req, res) => {
  try {
    const { rawText, userId, tone, length, temperature } = req.body;

    // Basic validation
    if (!rawText || typeof rawText !== 'string' || rawText.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Raw text is required",
        error: "Please provide valid text content",
        timestamp: new Date().toISOString(),
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
        error: "Please provide a valid user ID",
        timestamp: new Date().toISOString(),
      });
    }

    // Get user using modern database
    const user = await db.getUserById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        error: "No user found with the provided user ID",
        timestamp: new Date().toISOString(),
      });
    }

    let generatedText;
    let method = "deterministic";

    try {
      // In development mode, always use deterministic generator for consistency
      if (process.env.NODE_ENV === "development") {
        generatedText = generateNewsflash(rawText, user.fullName);
      } else if (process.env.OPENAI_API_KEY) {
        // Production mode with API key - use GPT
        try {
          generatedText = await generateNewsflashGPT({
            rawText,
            userName: user.fullName,
            tone: tone || "satirical",
            length: length || "short",
            temperature: temperature || 0.7,
          });
          method = "gpt";
        } catch (gptError) {
          console.warn("GPT newsflash generation failed, falling back to deterministic:", gptError.message);
          generatedText = generateNewsflash(rawText, user.fullName);
        }
      } else {
        // Production mode without API key - use deterministic
        generatedText = generateNewsflash(rawText, user.fullName);
      }
    } catch (newsflashError) {
      console.error("Newsflash generation error:", newsflashError);
      return res.status(400).json({
        success: false,
        message: "Failed to generate newsflash",
        error: newsflashError.message,
        timestamp: new Date().toISOString(),
      });
    }

    res.status(200).json({
      success: true,
      message: "Newsflash generated successfully",
      data: {
        rawText,
        generatedText,
        method,
        user: {
          id: user.id,
          fullName: user.fullName,
        },
        options: {
          tone: tone || "satirical",
          length: length || "short",
          temperature: temperature || 0.7,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Generate newsflash preview error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error generating newsflash",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Something went wrong",
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get all posts for development testing (no filtering)
 * GET /posts/dev/all
 */
const getAllPostsDev = async (req, res) => {
  try {
    // Only allow in development mode
    if (process.env.NODE_ENV !== "development") {
      return res.status(404).json({
        success: false,
        message: "Endpoint not found",
        timestamp: new Date().toISOString(),
      });
    }

    const { page, limit } = validatePaginationParams(req.query);

    // Get posts using modern database
    const offset = (page - 1) * limit;
    const enrichedPosts = await db.getPostsWithPagination(null, limit, offset);

    const totalPosts = enrichedPosts.length; // This is simplified - should implement total count in database.js
    const totalPages = Math.ceil(totalPosts / limit);

    res.status(200).json({
      success: true,
      message: "All posts retrieved (development mode)",
      data: enrichedPosts,
      pagination: {
        page,
        limit,
        totalPosts,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Get all posts dev error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error retrieving posts",
      error: process.env.NODE_ENV === "development" ? error.message : "Something went wrong",
      timestamp: new Date().toISOString(),
    });
  }
};

module.exports = {
  getAllPosts,
  getPostsByUser,
  createPost,
  updatePost,
  deletePost,
  getPostById,
  getPostStats,
  generateNewsflashPreview,
  getAllPostsDev,
};
