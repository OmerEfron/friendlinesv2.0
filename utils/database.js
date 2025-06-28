// Modern database service for Friendlines Backend
// Replaces legacy JSON interface with proper SQL operations
// Includes connection pooling, transactions, and efficient queries

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../data/friendlines.db');

// Connection pool configuration
const MAX_CONNECTIONS = 10;
const CONNECTION_TIMEOUT = 30000; // 30 seconds

class DatabaseService {
  constructor() {
    this.db = null;
    this.isInitialized = false;
  }

  /**
   * Initialize database connection and create/update schema
   */
  async initialize() {
    if (this.isInitialized) return;

    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, async (err) => {
        if (err) {
          console.error('Error opening database:', err);
          reject(err);
          return;
        }

        console.log('Connected to SQLite database');
        
        try {
          // Configure database settings
          await this.runQuery('PRAGMA foreign_keys = ON');
          await this.runQuery('PRAGMA journal_mode = WAL');
          await this.runQuery('PRAGMA synchronous = NORMAL');
          await this.runQuery('PRAGMA cache_size = -64000'); // 64MB cache
          await this.runQuery('PRAGMA temp_store = MEMORY');
          
          // Create/update schema
          await this.createSchema();
          await this.createIndexes();
          
          this.isInitialized = true;
          console.log('Database initialized successfully');
          resolve();
        } catch (error) {
          console.error('Error initializing database:', error);
          reject(error);
        }
      });
    });
  }

  /**
   * Create normalized database schema
   */
  async createSchema() {
    const tables = [
      // Users table (normalized)
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        fullName TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        bio TEXT,
        location TEXT,
        website TEXT,
        avatar TEXT,
        expoPushToken TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )`,

      // Posts table (normalized)
      `CREATE TABLE IF NOT EXISTS posts (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        rawText TEXT NOT NULL,
        generatedText TEXT,
        timestamp TEXT NOT NULL,
        visibility TEXT DEFAULT 'public',
        audienceType TEXT DEFAULT 'public',
        targetFriendId TEXT,
        likesCount INTEGER DEFAULT 0,
        commentsCount INTEGER DEFAULT 0,
        sharesCount INTEGER DEFAULT 0,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (targetFriendId) REFERENCES users(id) ON DELETE SET NULL
      )`,

      // Groups table (normalized)
      `CREATE TABLE IF NOT EXISTS groups (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        ownerId TEXT NOT NULL,
        isPrivate BOOLEAN DEFAULT 0,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (ownerId) REFERENCES users(id) ON DELETE CASCADE
      )`,

      // Normalized relationship tables
      `CREATE TABLE IF NOT EXISTS friendships (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId1 TEXT NOT NULL,
        userId2 TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        requesterId TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (userId1) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (userId2) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (requesterId) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(userId1, userId2)
      )`,

      `CREATE TABLE IF NOT EXISTS group_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        groupId TEXT NOT NULL,
        userId TEXT NOT NULL,
        role TEXT DEFAULT 'member',
        joinedAt TEXT NOT NULL,
        FOREIGN KEY (groupId) REFERENCES groups(id) ON DELETE CASCADE,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(groupId, userId)
      )`,

      `CREATE TABLE IF NOT EXISTS group_invites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        groupId TEXT NOT NULL,
        userId TEXT NOT NULL,
        inviterId TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (groupId) REFERENCES groups(id) ON DELETE CASCADE,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (inviterId) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(groupId, userId)
      )`,

      `CREATE TABLE IF NOT EXISTS post_groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        postId TEXT NOT NULL,
        groupId TEXT NOT NULL,
        FOREIGN KEY (postId) REFERENCES posts(id) ON DELETE CASCADE,
        FOREIGN KEY (groupId) REFERENCES groups(id) ON DELETE CASCADE,
        UNIQUE(postId, groupId)
      )`,

      `CREATE TABLE IF NOT EXISTS post_likes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        postId TEXT NOT NULL,
        userId TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (postId) REFERENCES posts(id) ON DELETE CASCADE,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(postId, userId)
      )`,

      `CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        data TEXT DEFAULT '{}',
        isRead BOOLEAN DEFAULT 0,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )`,

      `CREATE TABLE IF NOT EXISTS push_receipts (
        id TEXT PRIMARY KEY,
        ticketId TEXT NOT NULL UNIQUE,
        notificationType TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        errorMessage TEXT,
        errorDetails TEXT,
        deliveredAt TEXT,
        createdAt TEXT NOT NULL,
        checkAfter TEXT NOT NULL,
        retryCount INTEGER DEFAULT 0
      )`
    ];

    // Execute each table creation separately to ensure proper error handling
    for (const tableSQL of tables) {
      try {
        await this.runQuery(tableSQL);
        const tableName = tableSQL.match(/CREATE TABLE IF NOT EXISTS (\w+)/)[1];
        console.log(`✅ Created table: ${tableName}`);
      } catch (error) {
        console.error(`❌ Failed to create table: ${tableSQL.substring(0, 50)}...`);
        throw error;
      }
    }
  }

  /**
   * Create database indexes for performance
   */
  async createIndexes() {
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
      'CREATE INDEX IF NOT EXISTS idx_posts_userId ON posts(userId)',
      'CREATE INDEX IF NOT EXISTS idx_posts_timestamp ON posts(timestamp DESC)',
      'CREATE INDEX IF NOT EXISTS idx_posts_audienceType ON posts(audienceType)',
      'CREATE INDEX IF NOT EXISTS idx_friendships_users ON friendships(userId1, userId2)',
      'CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status)',
      'CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(groupId)',
      'CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(userId)',
      'CREATE INDEX IF NOT EXISTS idx_group_invites_user ON group_invites(userId)',
      'CREATE INDEX IF NOT EXISTS idx_group_invites_status ON group_invites(status)',
      'CREATE INDEX IF NOT EXISTS idx_post_groups_post ON post_groups(postId)',
      'CREATE INDEX IF NOT EXISTS idx_post_groups_group ON post_groups(groupId)',
      'CREATE INDEX IF NOT EXISTS idx_post_likes_post ON post_likes(postId)',
      'CREATE INDEX IF NOT EXISTS idx_post_likes_user ON post_likes(userId)',
      'CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(userId)',
      'CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(isRead)',
      'CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(createdAt DESC)'
    ];

    for (const index of indexes) {
      try {
        await this.runQuery(index);
        console.log(`✅ Created index: ${index.match(/idx_\w+/)[0]}`);
      } catch (error) {
        console.error(`❌ Failed to create index: ${index.substring(0, 50)}...`);
        throw error;
      }
    }
  }

  /**
   * Run a SQL query with parameters
   */
  runQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ lastID: this.lastID, changes: this.changes });
        }
      });
    });
  }

  /**
   * Get single row from database
   */
  getOne(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  /**
   * Get multiple rows from database
   */
  getMany(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  /**
   * Execute multiple queries in a transaction
   */
  async transaction(queries) {
    await this.runQuery('BEGIN TRANSACTION');
    
    try {
      const results = [];
      for (const { sql, params } of queries) {
        const result = await this.runQuery(sql, params);
        results.push(result);
      }
      
      await this.runQuery('COMMIT');
      return results;
    } catch (error) {
      await this.runQuery('ROLLBACK');
      throw error;
    }
  }

  /**
   * Generate unique ID with prefix
   */
  generateId(prefix = '') {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substr(2, 5);
    return `${prefix}${timestamp}${random}`;
  }

  /**
   * Close database connection
   */
  close() {
    return new Promise((resolve) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            console.error('Error closing database:', err);
          } else {
            console.log('Database connection closed');
          }
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  // USER OPERATIONS
  async createUser(userData) {
    const id = this.generateId('u');
    const now = new Date().toISOString();
    
    const result = await this.runQuery(
      `INSERT INTO users (id, fullName, email, bio, location, website, avatar, expoPushToken, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, userData.fullName, userData.email, userData.bio || null, userData.location || null, 
       userData.website || null, userData.avatar || null, userData.expoPushToken || null, now, now]
    );
    
    return { id, ...userData, createdAt: now, updatedAt: now };
  }

  async createUserWithId(id, userData) {
    const now = new Date().toISOString();
    
    const result = await this.runQuery(
      `INSERT INTO users (id, fullName, email, bio, location, website, avatar, expoPushToken, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, userData.fullName, userData.email, userData.bio || null, userData.location || null, 
       userData.website || null, userData.avatar || null, userData.expoPushToken || null, now, now]
    );
    
    return { id, ...userData, createdAt: now, updatedAt: now };
  }

  async getUserById(userId) {
    return await this.getOne('SELECT * FROM users WHERE id = ?', [userId]);
  }

  async getUserByEmail(email) {
    return await this.getOne('SELECT * FROM users WHERE email = ?', [email]);
  }

  async updateUser(userId, updates) {
    const now = new Date().toISOString();
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(updates), now, userId];
    
    await this.runQuery(
      `UPDATE users SET ${fields}, updatedAt = ? WHERE id = ?`,
      values
    );
    
    return await this.getUserById(userId);
  }

  async getAllUsers(limit = 50, offset = 0) {
    return await this.getMany(
      'SELECT * FROM users ORDER BY createdAt DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );
  }

  // FRIENDSHIP OPERATIONS
  async sendFriendRequest(requesterId, targetId) {
    const now = new Date().toISOString();
    
    // Ensure consistent ordering (smaller ID first)
    const [userId1, userId2] = [requesterId, targetId].sort();
    
    await this.runQuery(
      `INSERT OR REPLACE INTO friendships (userId1, userId2, status, requesterId, createdAt, updatedAt)
       VALUES (?, ?, 'pending', ?, ?, ?)`,
      [userId1, userId2, requesterId, now, now]
    );
  }

  async acceptFriendRequest(requesterId, accepterId) {
    const now = new Date().toISOString();
    const [userId1, userId2] = [requesterId, accepterId].sort();
    
    await this.runQuery(
      `UPDATE friendships SET status = 'accepted', updatedAt = ? 
       WHERE userId1 = ? AND userId2 = ? AND requesterId = ?`,
      [now, userId1, userId2, requesterId]
    );
  }

  async getFriendshipStatus(userId1, userId2) {
    const [sortedId1, sortedId2] = [userId1, userId2].sort();
    
    return await this.getOne(
      'SELECT * FROM friendships WHERE userId1 = ? AND userId2 = ?',
      [sortedId1, sortedId2]
    );
  }

  async getUserFriends(userId, limit = 50, offset = 0) {
    const friends = await this.getMany(`
      SELECT u.* FROM users u
      INNER JOIN friendships f ON (
        (f.userId1 = ? AND f.userId2 = u.id) OR 
        (f.userId2 = ? AND f.userId1 = u.id)
      )
      WHERE f.status = 'accepted' AND u.id != ?
      ORDER BY u.fullName
      LIMIT ? OFFSET ?
    `, [userId, userId, userId, limit, offset]);
    
    return friends;
  }

  async getFriendRequests(userId) {
    return await this.getMany(`
      SELECT u.*, f.createdAt as requestDate FROM users u
      INNER JOIN friendships f ON f.requesterId = u.id
      WHERE ((f.userId1 = ? AND f.userId2 = u.id) OR (f.userId2 = ? AND f.userId1 = u.id))
        AND f.status = 'pending' AND f.requesterId != ?
    `, [userId, userId, userId]);
  }

  // POST OPERATIONS
  async createPost(postData) {
    const id = this.generateId('p');
    const now = new Date().toISOString();
    
    const queries = [
      {
        sql: `INSERT INTO posts (id, userId, rawText, generatedText, timestamp, visibility, 
                                audienceType, targetFriendId, createdAt, updatedAt)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        params: [id, postData.userId, postData.rawText, postData.generatedText || null,
                postData.timestamp || now, postData.visibility || 'public',
                postData.audienceType || 'public', postData.targetFriendId || null, now, now]
      }
    ];
    
    // Add group associations if provided
    if (postData.groupIds && postData.groupIds.length > 0) {
      for (const groupId of postData.groupIds) {
        queries.push({
          sql: 'INSERT INTO post_groups (postId, groupId) VALUES (?, ?)',
          params: [id, groupId]
        });
      }
    }
    
    await this.transaction(queries);
    return { id, ...postData, createdAt: now, updatedAt: now };
  }

  async getPostById(postId) {
    const post = await this.getOne('SELECT * FROM posts WHERE id = ?', [postId]);
    if (post) {
      // Get associated groups
      post.groupIds = await this.getMany(
        'SELECT groupId FROM post_groups WHERE postId = ?',
        [postId]
      ).then(rows => rows.map(row => row.groupId));
    }
    return post;
  }

  async getPostsWithPagination(currentUserId = null, limit = 20, offset = 0) {
    let sql = `
      SELECT p.*, u.fullName as userFullName,
             COUNT(pl.id) as actualLikesCount
      FROM posts p
      INNER JOIN users u ON p.userId = u.id
      LEFT JOIN post_likes pl ON p.id = pl.postId
    `;
    
    let params = [];
    
    // Add filtering based on audience and user relationships
    if (currentUserId) {
      sql += `
      LEFT JOIN friendships f ON (
        (f.userId1 = ? AND f.userId2 = p.userId) OR 
        (f.userId2 = ? AND f.userId1 = p.userId)
      ) AND f.status = 'accepted'
      LEFT JOIN group_members gm ON gm.userId = ? 
      LEFT JOIN post_groups pg ON pg.postId = p.id AND pg.groupId = gm.groupId
      WHERE (
        p.audienceType = 'public' OR
        (p.audienceType = 'friends' AND f.id IS NOT NULL) OR
        (p.audienceType = 'friend' AND p.targetFriendId = ?) OR
        (p.audienceType = 'groups' AND pg.id IS NOT NULL) OR
        p.userId = ?
      )
      `;
      params = [currentUserId, currentUserId, currentUserId, currentUserId, currentUserId];
    } else {
      sql += ` WHERE p.audienceType = 'public' `;
    }
    
    sql += `
      GROUP BY p.id
      ORDER BY p.timestamp DESC
      LIMIT ? OFFSET ?
    `;
    
    params.push(limit, offset);
    
    const posts = await this.getMany(sql, params);
    
    // Get group associations for each post
    for (const post of posts) {
      post.groupIds = await this.getMany(
        'SELECT groupId FROM post_groups WHERE postId = ?',
        [post.id]
      ).then(rows => rows.map(row => row.groupId));
    }
    
    return posts;
  }

  async getUserPosts(userId, currentUserId = null, limit = 20, offset = 0) {
    // Similar logic but filtered by userId
    let sql = `
      SELECT p.*, u.fullName as userFullName,
             COUNT(pl.id) as actualLikesCount
      FROM posts p
      INNER JOIN users u ON p.userId = u.id
      LEFT JOIN post_likes pl ON p.id = pl.postId
      WHERE p.userId = ?
    `;
    
    let params = [userId];
    
    // Add audience filtering if not the post owner
    if (currentUserId && currentUserId !== userId) {
      sql += ` AND (
        p.audienceType = 'public' OR
        (p.audienceType = 'friends' AND EXISTS (
          SELECT 1 FROM friendships f WHERE 
          ((f.userId1 = ? AND f.userId2 = ?) OR (f.userId2 = ? AND f.userId1 = ?))
          AND f.status = 'accepted'
        )) OR
        (p.audienceType = 'friend' AND p.targetFriendId = ?) OR
        (p.audienceType = 'groups' AND EXISTS (
          SELECT 1 FROM post_groups pg
          INNER JOIN group_members gm ON pg.groupId = gm.groupId
          WHERE pg.postId = p.id AND gm.userId = ?
        ))
      )`;
      params.push(currentUserId, userId, currentUserId, userId, currentUserId, currentUserId);
    }
    
    sql += `
      GROUP BY p.id
      ORDER BY p.timestamp DESC
      LIMIT ? OFFSET ?
    `;
    
    params.push(limit, offset);
    return await this.getMany(sql, params);
  }

  // GROUP OPERATIONS
  async createGroup(groupData) {
    const id = this.generateId('g');
    const now = new Date().toISOString();
    
    const queries = [
      {
        sql: `INSERT INTO groups (id, name, description, ownerId, isPrivate, createdAt, updatedAt)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        params: [id, groupData.name, groupData.description || null, 
                groupData.ownerId, groupData.isPrivate || 0, now, now]
      },
      {
        sql: `INSERT INTO group_members (groupId, userId, role, joinedAt)
              VALUES (?, ?, 'owner', ?)`,
        params: [id, groupData.ownerId, now]
      }
    ];
    
    await this.transaction(queries);
    return { id, ...groupData, createdAt: now, updatedAt: now };
  }

  async getGroupById(groupId) {
    return await this.getOne('SELECT * FROM groups WHERE id = ?', [groupId]);
  }

  async getUserGroups(userId) {
    return await this.getMany(`
      SELECT g.*, gm.role, gm.joinedAt FROM groups g
      INNER JOIN group_members gm ON g.id = gm.groupId
      WHERE gm.userId = ?
      ORDER BY g.name
    `, [userId]);
  }

  async getGroupMembers(groupId) {
    return await this.getMany(`
      SELECT u.*, gm.role, gm.joinedAt FROM users u
      INNER JOIN group_members gm ON u.id = gm.userId
      WHERE gm.groupId = ?
      ORDER BY gm.role DESC, u.fullName
    `, [groupId]);
  }

  // NOTIFICATION OPERATIONS
  async createNotification(notificationData) {
    const id = this.generateId('n');
    const now = new Date().toISOString();
    
    await this.runQuery(
      `INSERT INTO notifications (id, userId, type, title, message, data, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, notificationData.userId, notificationData.type, notificationData.title,
       notificationData.message, JSON.stringify(notificationData.data || {}), now]
    );
    
    return { id, ...notificationData, createdAt: now };
  }

  async getUserNotifications(userId, limit = 50, offset = 0) {
    return await this.getMany(`
      SELECT * FROM notifications 
      WHERE userId = ? 
      ORDER BY createdAt DESC 
      LIMIT ? OFFSET ?
    `, [userId, limit, offset]);
  }

  async markNotificationAsRead(notificationId) {
    await this.runQuery(
      'UPDATE notifications SET isRead = 1 WHERE id = ?',
      [notificationId]
    );
  }

  // Add this method to get total post count for pagination
  async getTotalPostsCount(currentUserId = null) {
    let sql = 'SELECT COUNT(*) as count FROM posts p';
    let params = [];
    
    if (currentUserId) {
      sql += `
      LEFT JOIN friendships f ON (
        (f.userId1 = ? AND f.userId2 = p.userId) OR 
        (f.userId2 = ? AND f.userId1 = p.userId)
      ) AND f.status = 'accepted'
      LEFT JOIN group_members gm ON gm.userId = ? 
      LEFT JOIN post_groups pg ON pg.postId = p.id AND pg.groupId = gm.groupId
      WHERE (
        p.audienceType = 'public' OR
        (p.audienceType = 'friends' AND f.id IS NOT NULL) OR
        (p.audienceType = 'friend' AND p.targetFriendId = ?) OR
        (p.audienceType = 'groups' AND pg.id IS NOT NULL) OR
        p.userId = ?
      )
      `;
      params = [currentUserId, currentUserId, currentUserId, currentUserId, currentUserId];
    } else {
      sql += ` WHERE p.audienceType = 'public' `;
    }
    
    const result = await this.getOne(sql, params);
    return result ? result.count : 0;
  }

  // Add method to update post
  async updatePost(postId, updates) {
    const now = new Date().toISOString();
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(updates), now, postId];
    
    await this.runQuery(
      `UPDATE posts SET ${fields}, updatedAt = ? WHERE id = ?`,
      values
    );
    
    return await this.getPostById(postId);
  }

  // Add method to delete post
  async deletePost(postId) {
    // Delete from post_groups first (foreign key constraint)
    await this.runQuery('DELETE FROM post_groups WHERE postId = ?', [postId]);
    // Delete from post_likes
    await this.runQuery('DELETE FROM post_likes WHERE postId = ?', [postId]);
    // Delete the post
    await this.runQuery('DELETE FROM posts WHERE id = ?', [postId]);
  }

  // Get posts for a specific group with pagination
  async getGroupPosts(groupId, options = {}) {
    const { page = 1, limit = 10 } = options;
    const offset = (page - 1) * limit;
    
    const sql = `
      SELECT p.*, u.fullName as userFullName,
             COUNT(pl.id) as actualLikesCount
      FROM posts p
      INNER JOIN post_groups pg ON p.id = pg.postId
      INNER JOIN users u ON p.userId = u.id
      LEFT JOIN post_likes pl ON p.id = pl.postId
      WHERE pg.groupId = ?
      GROUP BY p.id
      ORDER BY p.timestamp DESC
      LIMIT ? OFFSET ?
    `;
    
    const posts = await this.getMany(sql, [groupId, limit, offset]);
    
    // Get total count for pagination
    const countResult = await this.getOne(`
      SELECT COUNT(DISTINCT p.id) as count
      FROM posts p
      INNER JOIN post_groups pg ON p.id = pg.postId
      WHERE pg.groupId = ?
    `, [groupId]);
    
    return {
      data: posts,
      total: countResult ? countResult.count : 0
    };
  }

  // Check if user is a member of a group
  async isUserInGroup(groupId, userId) {
    const result = await this.getOne(
      'SELECT 1 FROM group_members WHERE groupId = ? AND userId = ?',
      [groupId, userId]
    );
    return !!result;
  }

  // Add user to group
  async addUserToGroup(groupId, userId, role = 'member') {
    const now = new Date().toISOString();
    await this.runQuery(
      'INSERT INTO group_members (groupId, userId, role, joinedAt) VALUES (?, ?, ?, ?)',
      [groupId, userId, role, now]
    );
  }

  // Remove user from group
  async removeUserFromGroup(groupId, userId) {
    await this.runQuery(
      'DELETE FROM group_members WHERE groupId = ? AND userId = ?',
      [groupId, userId]
    );
  }
}

// Singleton instance
const db = new DatabaseService();

module.exports = {
  db,
  DatabaseService
}; 