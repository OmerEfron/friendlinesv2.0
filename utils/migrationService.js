// Migration service to convert legacy JSON-in-SQLite format to normalized database
// Handles migration from old denormalized structure to new efficient schema

const { db } = require('./database');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class MigrationService {
  constructor() {
    this.legacyDb = null;
  }

  /**
   * Initialize connection to legacy database structure
   */
  async initializeLegacyConnection() {
    const dbPath = path.join(__dirname, '../data/friendlines.db');
    
    return new Promise((resolve, reject) => {
      this.legacyDb = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log('Connected to legacy database for migration');
          resolve();
        }
      });
    });
  }

  /**
   * Check if migration is needed
   */
  async needsMigration() {
    try {
      // Check if legacy structure exists (JSON arrays in TEXT columns)
      const legacyUser = await this.getLegacyData('SELECT friends FROM users LIMIT 1');
      
      if (legacyUser && legacyUser.friends && typeof legacyUser.friends === 'string') {
        // Check if new structure is empty
        const friendshipCount = await db.getOne('SELECT COUNT(*) as count FROM friendships');
        return friendshipCount.count === 0;
      }
      
      return false;
    } catch (error) {
      console.log('Migration check failed, assuming no migration needed:', error.message);
      return false;
    }
  }

  /**
   * Get data from legacy database structure
   */
  getLegacyData(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.legacyDb.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  /**
   * Get multiple rows from legacy database
   */
  getAllLegacyData(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.legacyDb.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  /**
   * Parse JSON string safely
   */
  parseJsonField(jsonString, defaultValue = []) {
    if (!jsonString) return defaultValue;
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      console.warn('Failed to parse JSON field:', jsonString);
      return defaultValue;
    }
  }

  /**
   * Migrate users from legacy format
   */
  async migrateUsers() {
    console.log('Migrating users...');
    
    const legacyUsers = await this.getAllLegacyData(`
      SELECT id, fullName, email, bio, location, website, avatar, expoPushToken, 
             createdAt, updatedAt, friends, friendRequests, sentFriendRequests
      FROM users
    `);

    for (const user of legacyUsers) {
      // Insert user without friendship data (that goes to separate table)
      await db.runQuery(`
        INSERT OR REPLACE INTO users 
        (id, fullName, email, bio, location, website, avatar, expoPushToken, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        user.id, user.fullName, user.email, user.bio, user.location, 
        user.website, user.avatar, user.expoPushToken, user.createdAt, user.updatedAt
      ]);
    }

    console.log(`✅ Migrated ${legacyUsers.length} users`);
    return legacyUsers;
  }

  /**
   * Migrate friendships from JSON arrays to normalized table
   */
  async migrateFriendships(legacyUsers) {
    console.log('Migrating friendships...');
    
    const friendshipSet = new Set(); // To avoid duplicates
    
    for (const user of legacyUsers) {
      const friends = this.parseJsonField(user.friends, []);
      const friendRequests = this.parseJsonField(user.friendRequests, []);
      
      // Migrate accepted friendships
      for (const friendId of friends) {
        const [userId1, userId2] = [user.id, friendId].sort();
        const friendshipKey = `${userId1}-${userId2}`;
        
        if (!friendshipSet.has(friendshipKey)) {
          friendshipSet.add(friendshipKey);
          
          await db.runQuery(`
            INSERT OR IGNORE INTO friendships 
            (userId1, userId2, status, requesterId, createdAt, updatedAt)
            VALUES (?, ?, 'accepted', ?, ?, ?)
          `, [userId1, userId2, user.id, user.createdAt, user.updatedAt]);
        }
      }
      
      // Migrate pending friend requests
      for (const requesterId of friendRequests) {
        const [userId1, userId2] = [requesterId, user.id].sort();
        const friendshipKey = `${userId1}-${userId2}-pending`;
        
        if (!friendshipSet.has(friendshipKey)) {
          friendshipSet.add(friendshipKey);
          
          await db.runQuery(`
            INSERT OR IGNORE INTO friendships 
            (userId1, userId2, status, requesterId, createdAt, updatedAt)
            VALUES (?, ?, 'pending', ?, ?, ?)
          `, [userId1, userId2, requesterId, user.updatedAt, user.updatedAt]);
        }
      }
    }

    console.log(`✅ Migrated friendships`);
  }

  /**
   * Migrate posts from legacy format
   */
  async migratePosts() {
    console.log('Migrating posts...');
    
    const legacyPosts = await this.getAllLegacyData(`
      SELECT id, userId, rawText, generatedText, timestamp, createdAt, updatedAt,
             groupIds, visibility, audienceType, targetFriendId, likes, comments,
             likesCount, commentsCount, sharesCount
      FROM posts
    `);

    for (const post of legacyPosts) {
      // Insert post without relationship data
      await db.runQuery(`
        INSERT OR REPLACE INTO posts 
        (id, userId, rawText, generatedText, timestamp, visibility, audienceType, 
         targetFriendId, likesCount, commentsCount, sharesCount, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        post.id, post.userId, post.rawText, post.generatedText, post.timestamp,
        post.visibility || 'public', post.audienceType || 'public', post.targetFriendId,
        post.likesCount || 0, post.commentsCount || 0, post.sharesCount || 0,
        post.createdAt, post.updatedAt
      ]);

      // Migrate group associations
      const groupIds = this.parseJsonField(post.groupIds, []);
      for (const groupId of groupIds) {
        await db.runQuery(`
          INSERT OR IGNORE INTO post_groups (postId, groupId) VALUES (?, ?)
        `, [post.id, groupId]);
      }

      // Migrate likes
      const likes = this.parseJsonField(post.likes, []);
      for (const userId of likes) {
        await db.runQuery(`
          INSERT OR IGNORE INTO post_likes (postId, userId, createdAt) VALUES (?, ?, ?)
        `, [post.id, userId, post.createdAt]);
      }
    }

    console.log(`✅ Migrated ${legacyPosts.length} posts`);
  }

  /**
   * Migrate groups from legacy format
   */
  async migrateGroups() {
    console.log('Migrating groups...');
    
    const legacyGroups = await this.getAllLegacyData(`
      SELECT id, name, description, ownerId, createdAt, updatedAt, members, invites, settings
      FROM groups
    `);

    for (const group of legacyGroups) {
      // Extract privacy setting from settings JSON
      const settings = this.parseJsonField(group.settings, {});
      const isPrivate = settings.privacy === 'private' ? 1 : 0;

      // Insert group
      await db.runQuery(`
        INSERT OR REPLACE INTO groups 
        (id, name, description, ownerId, isPrivate, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        group.id, group.name, group.description, group.ownerId, 
        isPrivate, group.createdAt, group.updatedAt
      ]);

      // Migrate members
      const members = this.parseJsonField(group.members, []);
      for (const userId of members) {
        const role = userId === group.ownerId ? 'owner' : 'member';
        await db.runQuery(`
          INSERT OR IGNORE INTO group_members (groupId, userId, role, joinedAt) 
          VALUES (?, ?, ?, ?)
        `, [group.id, userId, role, group.createdAt]);
      }

      // Migrate invites
      const invites = this.parseJsonField(group.invites, []);
      for (const userId of invites) {
        await db.runQuery(`
          INSERT OR IGNORE INTO group_invites 
          (groupId, userId, inviterId, status, createdAt, updatedAt) 
          VALUES (?, ?, ?, 'pending', ?, ?)
        `, [group.id, userId, group.ownerId, group.createdAt, group.updatedAt]);
      }
    }

    console.log(`✅ Migrated ${legacyGroups.length} groups`);
  }

  /**
   * Migrate notifications from legacy format
   */
  async migrateNotifications() {
    console.log('Migrating notifications...');
    
    const legacyNotifications = await this.getAllLegacyData(`
      SELECT id, userId, type, title, message, data, read, createdAt
      FROM notifications
    `);

    for (const notification of legacyNotifications) {
      await db.runQuery(`
        INSERT OR REPLACE INTO notifications 
        (id, userId, type, title, message, data, isRead, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        notification.id, notification.userId, notification.type, notification.title,
        notification.message, notification.data || '{}', notification.read ? 1 : 0,
        notification.createdAt
      ]);
    }

    console.log(`✅ Migrated ${legacyNotifications.length} notifications`);
  }

  /**
   * Clean up legacy schema (remove JSON columns that are now normalized)
   */
  async cleanupLegacySchema() {
    console.log('Cleaning up legacy schema...');
    
    try {
      // Remove JSON columns from users table
      await db.runQuery(`
        CREATE TABLE users_new AS 
        SELECT id, fullName, email, bio, location, website, avatar, expoPushToken, createdAt, updatedAt
        FROM users
      `);
      
      await db.runQuery('DROP TABLE users');
      await db.runQuery('ALTER TABLE users_new RENAME TO users');
      
      // Remove JSON columns from posts table  
      await db.runQuery(`
        CREATE TABLE posts_new AS 
        SELECT id, userId, rawText, generatedText, timestamp, visibility, audienceType, 
               targetFriendId, likesCount, commentsCount, sharesCount, createdAt, updatedAt
        FROM posts
      `);
      
      await db.runQuery('DROP TABLE posts');
      await db.runQuery('ALTER TABLE posts_new RENAME TO posts');
      
      // Remove JSON columns from groups table
      await db.runQuery(`
        CREATE TABLE groups_new AS 
        SELECT id, name, description, ownerId, 
               CASE WHEN settings LIKE '%"privacy":"private"%' THEN 1 ELSE 0 END as isPrivate,
               createdAt, updatedAt
        FROM groups
      `);
      
      await db.runQuery('DROP TABLE groups');
      await db.runQuery('ALTER TABLE groups_new RENAME TO groups');
      
      console.log('✅ Legacy schema cleaned up');
    } catch (error) {
      console.warn('Schema cleanup failed (may already be clean):', error.message);
    }
  }

  /**
   * Run complete migration
   */
  async runMigration() {
    try {
      console.log('🔄 Starting database migration from legacy format...');
      
      await this.initializeLegacyConnection();
      
      if (!(await this.needsMigration())) {
        console.log('✅ No migration needed - database already in modern format');
        return;
      }

      // Step 1: Migrate users (must be first due to foreign keys)
      const legacyUsers = await this.migrateUsers();
      
      // Step 2: Migrate friendships
      await this.migrateFriendships(legacyUsers);
      
      // Step 3: Migrate posts
      await this.migratePosts();
      
      // Step 4: Migrate groups
      await this.migrateGroups();
      
      // Step 5: Migrate notifications
      await this.migrateNotifications();
      
      // Step 6: Clean up legacy schema
      await this.cleanupLegacySchema();
      
      console.log('🎉 Migration completed successfully!');
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    } finally {
      if (this.legacyDb) {
        this.legacyDb.close();
      }
    }
  }
}

module.exports = { MigrationService }; 