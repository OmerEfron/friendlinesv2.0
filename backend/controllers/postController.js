// Post controller for Friendlines
// Contains business logic for managing newsflash posts

const { readJson, writeJson } = require("../utils/fileUtils");
const { generateId, validatePaginationParams } = require("../utils/validation");
const { generateNewsflash } = require("../utils/newsflashGenerator");
const { sendPush, getFollowersTokens, getGroupMembersTokens } = require("../utils/notificationService");
const { validateGroupAccess } = require("./groupController");

/**
 * Get all posts (newsflashes) with pagination
 * GET /posts
 */
const getAllPosts = async (req, res) => {
  try {
    // Validate pagination parameters
    const { page, limit } = validatePaginationParams(req.query);

    // Read posts and users
    const posts = await readJson("posts.json");
    const users = await readJson("users.json");

    // Create a user lookup map for better performance
    const userMap = users.reduce((map, user) => {
      map[user.id] = user;
      return map;
    }, {});

    // Sort posts by timestamp (newest first)
    const sortedPosts = posts.sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );

    // Calculate pagination
    const totalPosts = sortedPosts.length;
    const totalPages = Math.ceil(totalPosts / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    // Get paginated posts
    const paginatedPosts = sortedPosts.slice(startIndex, endIndex);

    // Enrich posts with user information
    const enrichedPosts = paginatedPosts.map((post) => {
      const user = userMap[post.userId];
      return {
        id: post.id,
        userId: post.userId,
        userFullName: user ? user.fullName : "Unknown User",
        rawText: post.rawText,
        generatedText: post.generatedText,
        timestamp: post.timestamp,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        // Group features
        groupIds: post.groupIds || [],
        visibility: post.visibility || "public",
        // Social features
        likesCount: post.likesCount || 0,
        commentsCount: post.commentsCount || 0,
        sharesCount: post.sharesCount || 0,
      };
    });

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

    // Read posts and users
    const posts = await readJson("posts.json");
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

    // Filter posts by user and sort by timestamp (newest first)
    const userPosts = posts
      .filter((post) => post.userId === userId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Calculate pagination
    const totalPosts = userPosts.length;
    const totalPages = Math.ceil(totalPosts / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    // Get paginated posts
    const paginatedPosts = userPosts.slice(startIndex, endIndex);

    // Enrich posts with user information
    const enrichedPosts = paginatedPosts.map((post) => ({
      id: post.id,
      userId: post.userId,
      userFullName: user.fullName,
      rawText: post.rawText,
      generatedText: post.generatedText,
      timestamp: post.timestamp,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      // Group features
      groupIds: post.groupIds || [],
      visibility: post.visibility || "public",
      // Social features
      likesCount: post.likesCount || 0,
      commentsCount: post.commentsCount || 0,
      sharesCount: post.sharesCount || 0,
    }));

    res.status(200).json({
      success: true,
      message: `Posts by ${user.fullName} retrieved successfully`,
      data: enrichedPosts,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
      },
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
 * Create a new post with generated newsflash
 * POST /posts
 */
const createPost = async (req, res) => {
  try {
    // Get validated data from middleware
    const { rawText, userId, groupIds } = req.validatedData;

    // Read users and posts
    const users = await readJson("users.json");
    const posts = await readJson("posts.json");

    // Find the user
    const user = users.find((u) => u.id === userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        error: "No user found with the provided user ID",
        timestamp: new Date().toISOString(),
      });
    }

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

    // Generate newsflash
    let generatedText;
    try {
      generatedText = generateNewsflash(rawText, user.fullName);
    } catch (newsflashError) {
      console.error("Newsflash generation error:", newsflashError);
      return res.status(400).json({
        success: false,
        message: "Failed to generate newsflash",
        error: newsflashError.message,
        timestamp: new Date().toISOString(),
      });
    }

    // Create new post
    const newPost = {
      id: generateId("p"),
      userId,
      rawText,
      generatedText,
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Group features
      groupIds: groupIds || [],
      visibility: groupIds && groupIds.length > 0 ? "groups_only" : "public",
      // Social features
      likes: [], // Array of user IDs who liked this post
      comments: [], // Array of comment objects
      likesCount: 0, // Denormalized count for performance
      commentsCount: 0, // Denormalized count for performance
      sharesCount: 0, // Share count
    };

    // Add post to posts array
    posts.push(newPost);

    // Save posts
    await writeJson("posts.json", posts);

    // Send push notifications (non-blocking)
    try {
      let recipientTokens = [];
      
      if (groupIds && groupIds.length > 0) {
        // Group post - notify group members
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
            }
          );
          
          if (notificationResult.success) {
            console.log(`Push notifications sent to ${recipientTokens.length} group members for post ${newPost.id}`);
          } else {
            console.error("Failed to send group push notifications:", notificationResult.error);
          }
        }
      } else {
        // Public post - notify followers
        recipientTokens = await getFollowersTokens(userId);
        if (recipientTokens.length > 0) {
          const notificationResult = await sendPush(
            recipientTokens,
            "New Newsflash!",
            `${user.fullName}: ${generatedText.substring(0, 100)}${generatedText.length > 100 ? '...' : ''}`,
            {
              type: "new_post",
              postId: newPost.id,
              userId: userId,
              userFullName: user.fullName
            }
          );
          
          if (notificationResult.success) {
            console.log(`Push notifications sent to ${recipientTokens.length} followers for post ${newPost.id}`);
          } else {
            console.error("Failed to send push notifications:", notificationResult.error);
          }
        }
      }
    } catch (notificationError) {
      // Don't fail the post creation if notifications fail
      console.error("Push notification error:", notificationError);
    }

    // Return created post with user info
    const responsePost = {
      id: newPost.id,
      userId: newPost.userId,
      userFullName: user.fullName,
      rawText: newPost.rawText,
      generatedText: newPost.generatedText,
      timestamp: newPost.timestamp,
      createdAt: newPost.createdAt,
      updatedAt: newPost.updatedAt,
      // Group features
      groupIds: newPost.groupIds,
      visibility: newPost.visibility,
      // Social features
      likesCount: newPost.likesCount,
      commentsCount: newPost.commentsCount,
      sharesCount: newPost.sharesCount,
    };

    console.log(`New post created by ${user.fullName}: ${newPost.id}`);

    res.status(201).json({
      success: true,
      message: "Post created successfully",
      data: responsePost,
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

    // Read posts and users
    const posts = await readJson("posts.json");
    const users = await readJson("users.json");

    // Find the post
    const postIndex = posts.findIndex((p) => p.id === id);
    if (postIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
        error: "No post found with the provided ID",
        timestamp: new Date().toISOString(),
      });
    }

    const post = posts[postIndex];

    // Find the user who owns the post
    const user = users.find((u) => u.id === post.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Post owner not found",
        error: "User who created this post no longer exists",
        timestamp: new Date().toISOString(),
      });
    }

    // If rawText is provided, update it and regenerate newsflash
    if (rawText !== undefined) {
      let generatedText;
      try {
        generatedText = generateNewsflash(rawText, user.fullName);
      } catch (newsflashError) {
        console.error("Newsflash generation error:", newsflashError);
        return res.status(400).json({
          success: false,
          message: "Failed to generate newsflash",
          error: newsflashError.message,
          timestamp: new Date().toISOString(),
        });
      }

      // Update post
      posts[postIndex] = {
        ...post,
        rawText,
        generatedText,
        updatedAt: new Date().toISOString(),
      };
    }

    // Save updated posts
    await writeJson("posts.json", posts);

    // Return updated post with user info
    const responsePost = {
      id: posts[postIndex].id,
      userId: posts[postIndex].userId,
      userFullName: user.fullName,
      rawText: posts[postIndex].rawText,
      generatedText: posts[postIndex].generatedText,
      timestamp: posts[postIndex].timestamp,
      createdAt: posts[postIndex].createdAt,
      updatedAt: posts[postIndex].updatedAt,
      // Social features
      likesCount: posts[postIndex].likesCount || 0,
      commentsCount: posts[postIndex].commentsCount || 0,
      sharesCount: posts[postIndex].sharesCount || 0,
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

    // Read posts
    const posts = await readJson("posts.json");

    // Find the post
    const postIndex = posts.findIndex((p) => p.id === id);
    if (postIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
        error: "No post found with the provided ID",
        timestamp: new Date().toISOString(),
      });
    }

    const deletedPost = posts[postIndex];

    // Remove post from array
    posts.splice(postIndex, 1);

    // Save updated posts
    await writeJson("posts.json", posts);

    console.log(`Post deleted: ${id}`);

    res.status(200).json({
      success: true,
      message: "Post deleted successfully",
      data: {
        id: deletedPost.id,
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

    // Read posts and users
    const posts = await readJson("posts.json");
    const users = await readJson("users.json");

    // Find the post
    const post = posts.find((p) => p.id === id);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
        error: "No post found with the provided ID",
        timestamp: new Date().toISOString(),
      });
    }

    // Find the user who owns the post
    const user = users.find((u) => u.id === post.userId);

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
      likesCount: post.likesCount || 0,
      commentsCount: post.commentsCount || 0,
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

    // Read posts and users
    const posts = await readJson("posts.json");
    const users = await readJson("users.json");

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
 * Toggle like on a post
 * POST /posts/:id/like
 */
const likePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    // Validate userId
    if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
        error: "Valid user ID must be provided to like a post",
        timestamp: new Date().toISOString(),
      });
    }

    // Read posts and users
    const posts = await readJson("posts.json");
    const users = await readJson("users.json");

    // Find the post
    const postIndex = posts.findIndex((p) => p.id === id);
    if (postIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
        error: "No post found with the provided ID",
        timestamp: new Date().toISOString(),
      });
    }

    // Find the user
    const user = users.find((u) => u.id === userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        error: "No user found with the provided user ID",
        timestamp: new Date().toISOString(),
      });
    }

    const post = posts[postIndex];

    // Ensure likes array exists (for backward compatibility)
    if (!post.likes) {
      post.likes = [];
    }

    // Check if user has already liked this post
    const likeIndex = post.likes.indexOf(userId);
    let isLiked = false;
    let action = "";

    if (likeIndex === -1) {
      // User hasn't liked the post, add like
      post.likes.push(userId);
      isLiked = true;
      action = "liked";
    } else {
      // User has already liked the post, remove like
      post.likes.splice(likeIndex, 1);
      isLiked = false;
      action = "unliked";
    }

    // Update denormalized count
    post.likesCount = post.likes.length;
    post.updatedAt = new Date().toISOString();

    // Update the post in the array
    posts[postIndex] = post;

    // Save updated posts
    await writeJson("posts.json", posts);

    console.log(`Post ${action} by ${user.fullName}: ${id}`);

    res.status(200).json({
      success: true,
      message: `Post ${action} successfully`,
      data: {
        postId: id,
        userId: userId,
        isLiked: isLiked,
        likesCount: post.likesCount,
        action: action,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Like post error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error liking post",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Something went wrong",
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get likes for a post
 * GET /posts/:id/likes
 */
const getLikes = async (req, res) => {
  try {
    const { id } = req.params;

    // Read posts and users
    const posts = await readJson("posts.json");
    const users = await readJson("users.json");

    // Find the post
    const post = posts.find((p) => p.id === id);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
        error: "No post found with the provided ID",
        timestamp: new Date().toISOString(),
      });
    }

    // Ensure likes array exists (for backward compatibility)
    const likes = post.likes || [];

    // Create a user lookup map for better performance
    const userMap = users.reduce((map, user) => {
      map[user.id] = user;
      return map;
    }, {});

    // Enrich likes with user information
    const enrichedLikes = likes.map((userId) => {
      const user = userMap[userId];
      return {
        userId: userId,
        fullName: user ? user.fullName : "Unknown User",
        email: user ? user.email : null,
      };
    });

    res.status(200).json({
      success: true,
      message: "Post likes retrieved successfully",
      data: {
        postId: id,
        likesCount: likes.length,
        likes: enrichedLikes,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Get likes error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error retrieving likes",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Something went wrong",
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Add a comment to a post
 * POST /posts/:id/comments
 */
const addComment = async (req, res) => {
  try {
    const { id } = req.params; // post ID
    const { userId, text } = req.body;

    // Validate required fields
    if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
        error: "Valid user ID must be provided to comment on a post",
        timestamp: new Date().toISOString(),
      });
    }

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Comment text is required",
        error: "Comment text cannot be empty",
        timestamp: new Date().toISOString(),
      });
    }

    // Validate comment length (max 500 characters)
    if (text.trim().length > 500) {
      return res.status(400).json({
        success: false,
        message: "Comment text is too long",
        error: "Comment must be 500 characters or less",
        timestamp: new Date().toISOString(),
      });
    }

    // Read posts and users
    const posts = await readJson("posts.json");
    const users = await readJson("users.json");

    // Find the post
    const postIndex = posts.findIndex((p) => p.id === id);
    if (postIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
        error: "No post found with the provided ID",
        timestamp: new Date().toISOString(),
      });
    }

    // Find the user
    const user = users.find((u) => u.id === userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        error: "No user found with the provided user ID",
        timestamp: new Date().toISOString(),
      });
    }

    const post = posts[postIndex];

    // Ensure comments array exists (for backward compatibility)
    if (!post.comments) {
      post.comments = [];
    }

    // Create new comment
    const newComment = {
      id: generateId(),
      userId: userId,
      text: text.trim(),
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    // Add comment to post
    post.comments.push(newComment);

    // Update denormalized count
    post.commentsCount = post.comments.length;
    post.updatedAt = new Date().toISOString();

    // Update the post in the array
    posts[postIndex] = post;

    // Save updated posts
    await writeJson("posts.json", posts);

    console.log(`Comment added by ${user.fullName} on post: ${id}`);

    // Return comment with user info
    const enrichedComment = {
      ...newComment,
      userFullName: user.fullName,
    };

    res.status(201).json({
      success: true,
      message: "Comment added successfully",
      data: {
        postId: id,
        comment: enrichedComment,
        commentsCount: post.commentsCount,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Add comment error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error adding comment",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Something went wrong",
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get comments for a post
 * GET /posts/:id/comments
 */
const getComments = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    // Validate pagination parameters
    const validatedParams = validatePaginationParams({ page, limit });

    // Read posts and users
    const posts = await readJson("posts.json");
    const users = await readJson("users.json");

    // Find the post
    const post = posts.find((p) => p.id === id);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
        error: "No post found with the provided ID",
        timestamp: new Date().toISOString(),
      });
    }

    // Ensure comments array exists (for backward compatibility)
    const comments = post.comments || [];

    // Sort comments by timestamp (newest first)
    const sortedComments = comments.sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );

    // Calculate pagination
    const totalComments = sortedComments.length;
    const totalPages = Math.ceil(totalComments / validatedParams.limit);
    const startIndex = (validatedParams.page - 1) * validatedParams.limit;
    const endIndex = startIndex + validatedParams.limit;

    // Get paginated comments
    const paginatedComments = sortedComments.slice(startIndex, endIndex);

    // Create a user lookup map for better performance
    const userMap = users.reduce((map, user) => {
      map[user.id] = user;
      return map;
    }, {});

    // Enrich comments with user information
    const enrichedComments = paginatedComments.map((comment) => {
      const user = userMap[comment.userId];
      return {
        id: comment.id,
        userId: comment.userId,
        userFullName: user ? user.fullName : "Unknown User",
        text: comment.text,
        timestamp: comment.timestamp,
        createdAt: comment.createdAt,
      };
    });

    res.status(200).json({
      success: true,
      message: "Post comments retrieved successfully",
      data: {
        postId: id,
        commentsCount: totalComments,
        comments: enrichedComments,
      },
      pagination: {
        page: validatedParams.page,
        limit: validatedParams.limit,
        totalComments,
        totalPages,
        hasNextPage: validatedParams.page < totalPages,
        hasPrevPage: validatedParams.page > 1,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Get comments error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error retrieving comments",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Something went wrong",
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Delete a comment from a post
 * DELETE /posts/:postId/comments/:commentId
 */
const deleteComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const { userId } = req.body;

    // Validate userId
    if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
        error: "Valid user ID must be provided to delete a comment",
        timestamp: new Date().toISOString(),
      });
    }

    // Read posts and users
    const posts = await readJson("posts.json");
    const users = await readJson("users.json");

    // Find the post
    const postIndex = posts.findIndex((p) => p.id === postId);
    if (postIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
        error: "No post found with the provided ID",
        timestamp: new Date().toISOString(),
      });
    }

    // Find the user
    const user = users.find((u) => u.id === userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        error: "No user found with the provided user ID",
        timestamp: new Date().toISOString(),
      });
    }

    const post = posts[postIndex];

    // Ensure comments array exists
    if (!post.comments) {
      post.comments = [];
    }

    // Find the comment
    const commentIndex = post.comments.findIndex((c) => c.id === commentId);
    if (commentIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
        error: "No comment found with the provided ID",
        timestamp: new Date().toISOString(),
      });
    }

    const comment = post.comments[commentIndex];

    // Check if user is authorized to delete this comment (only comment author can delete)
    if (comment.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
        error: "You can only delete your own comments",
        timestamp: new Date().toISOString(),
      });
    }

    // Remove the comment
    post.comments.splice(commentIndex, 1);

    // Update denormalized count
    post.commentsCount = post.comments.length;
    post.updatedAt = new Date().toISOString();

    // Update the post in the array
    posts[postIndex] = post;

    // Save updated posts
    await writeJson("posts.json", posts);

    console.log(`Comment deleted by ${user.fullName} on post: ${postId}`);

    res.status(200).json({
      success: true,
      message: "Comment deleted successfully",
      data: {
        postId: postId,
        commentId: commentId,
        commentsCount: post.commentsCount,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Delete comment error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error deleting comment",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Something went wrong",
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
  likePost,
  getLikes,
  addComment,
  getComments,
  deleteComment,
};
