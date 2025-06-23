// Database utilities for SQLite operations
// Replaces fileUtils.js with SQLite database operations
// Maintains the same interface: readJson() and writeJson()

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../data/friendlines.db');

// Create database connection
let db = null;

/**
 * Initialize database connection and create tables
 * @returns {Promise<void>}
 */
const initializeDatabase = async () => {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err);
        reject(err);
        return;
      }
      console.log('Connected to SQLite database');
      
      // Create tables if they don't exist
      const createTables = `
        -- Users table
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          fullName TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL,
          friends TEXT DEFAULT '[]',
          friendRequests TEXT DEFAULT '[]',
          sentFriendRequests TEXT DEFAULT '[]',
          friendsCount INTEGER DEFAULT 0
        );
        
        -- Posts table
        CREATE TABLE IF NOT EXISTS posts (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL,
          rawText TEXT NOT NULL,
          generatedText TEXT,
          timestamp TEXT NOT NULL,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL,
          groupIds TEXT DEFAULT '[]',
          visibility TEXT DEFAULT 'public',
          likes TEXT DEFAULT '[]',
          comments TEXT DEFAULT '[]',
          likesCount INTEGER DEFAULT 0,
          commentsCount INTEGER DEFAULT 0,
          sharesCount INTEGER DEFAULT 0,
          FOREIGN KEY (userId) REFERENCES users(id)
        );
        
        -- Groups table
        CREATE TABLE IF NOT EXISTS groups (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          ownerId TEXT NOT NULL,
          members TEXT DEFAULT '[]',
          invites TEXT DEFAULT '[]',
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL,
          settings TEXT DEFAULT '{}',
          FOREIGN KEY (ownerId) REFERENCES users(id)
        );
        
        -- Notifications table
        CREATE TABLE IF NOT EXISTS notifications (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL,
          type TEXT NOT NULL,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          data TEXT DEFAULT '{}',
          read INTEGER DEFAULT 0,
          createdAt TEXT NOT NULL,
          FOREIGN KEY (userId) REFERENCES users(id)
        );
      `;
      
      db.exec(createTables, (err) => {
        if (err) {
          console.error('Error creating tables:', err);
          reject(err);
        } else {
          console.log('Database tables initialized');
          resolve();
        }
      });
    });
  });
};

/**
 * Close database connection
 */
const closeDatabase = () => {
  if (db) {
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err);
      } else {
        console.log('Database connection closed');
      }
    });
  }
};

/**
 * Get table name from filename
 * @param {string} filename - The filename (e.g., 'users.json')
 * @returns {string} - Table name
 */
const getTableName = (filename) => {
  // Remove .json extension and handle both with and without extension
  const basename = filename.replace('.json', '');
  return basename;
};

/**
 * Convert database row to JSON format
 * @param {Object} row - Database row
 * @param {string} tableName - Table name
 * @returns {Object} - JSON formatted object
 */
const rowToJson = (row, tableName) => {
  const result = { ...row };
  
  // Convert JSON string fields back to objects/arrays
  const jsonFields = {
    users: ['friends', 'friendRequests', 'sentFriendRequests'],
    posts: ['likes', 'comments', 'groupIds'],
    groups: ['members', 'invites', 'settings'],
    notifications: ['data']
  };
  
  if (jsonFields[tableName]) {
    jsonFields[tableName].forEach(field => {
      if (result[field]) {
        try {
          result[field] = JSON.parse(result[field]);
        } catch (e) {
          console.warn(`Failed to parse JSON field ${field}:`, result[field]);
          result[field] = field === 'settings' ? {} : [];
        }
      }
    });
  }
  
  // Convert boolean fields
  if (tableName === 'notifications' && typeof result.read === 'number') {
    result.read = result.read === 1;
  }
  
  return result;
};

/**
 * Convert JSON object to database format
 * @param {Object} obj - JSON object
 * @param {string} tableName - Table name
 * @returns {Object} - Database formatted object
 */
const jsonToRow = (obj, tableName) => {
  const result = { ...obj };
  
  // Convert arrays/objects to JSON strings
  const jsonFields = {
    users: ['friends', 'friendRequests', 'sentFriendRequests'],
    posts: ['likes', 'comments', 'groupIds'],
    groups: ['members', 'invites', 'settings'],
    notifications: ['data']
  };
  
  if (jsonFields[tableName]) {
    jsonFields[tableName].forEach(field => {
      if (result[field] !== undefined) {
        result[field] = JSON.stringify(result[field]);
      }
    });
  }
  
  // Convert boolean fields
  if (tableName === 'notifications' && typeof result.read === 'boolean') {
    result.read = result.read ? 1 : 0;
  }
  
  return result;
};

/**
 * Read JSON data from database (maintains fileUtils interface)
 * @param {string} filename - The name of the data file (e.g., 'users.json')
 * @returns {Promise<Array|Object>} - Data array or empty array if no data
 */
const readJson = async (filename) => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }
    
    const tableName = getTableName(filename);
    
    db.all(`SELECT * FROM ${tableName}`, (err, rows) => {
      if (err) {
        console.error(`Error reading from ${tableName}:`, err);
        reject(err);
        return;
      }
      
      // Convert rows to JSON format
      const data = rows.map(row => rowToJson(row, tableName));
      resolve(data);
    });
  });
};

/**
 * Write JSON data to database (maintains fileUtils interface)
 * @param {string} filename - The name of the data file (e.g., 'users.json')
 * @param {Array|Object} data - Data to write (should be an array)
 * @returns {Promise<void>}
 */
const writeJson = async (filename, data) => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }
    
    const tableName = getTableName(filename);
    
    // Start transaction
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      // Clear existing data
      db.run(`DELETE FROM ${tableName}`, (err) => {
        if (err) {
          db.run('ROLLBACK');
          reject(err);
          return;
        }
        
        // Insert new data
        if (Array.isArray(data) && data.length > 0) {
          const firstItem = data[0];
          const keys = Object.keys(firstItem);
          const placeholders = keys.map(() => '?').join(',');
          const insertSql = `INSERT INTO ${tableName} (${keys.join(',')}) VALUES (${placeholders})`;
          
          const stmt = db.prepare(insertSql);
          
          let insertedCount = 0;
          let hasError = false;
          
          data.forEach(item => {
            const dbItem = jsonToRow(item, tableName);
            const values = keys.map(key => dbItem[key]);
            
            stmt.run(values, (err) => {
              if (err && !hasError) {
                hasError = true;
                stmt.finalize();
                db.run('ROLLBACK');
                reject(err);
                return;
              }
              
              insertedCount++;
              if (insertedCount === data.length && !hasError) {
                stmt.finalize();
                db.run('COMMIT', (err) => {
                  if (err) {
                    reject(err);
                  } else {
                    console.log(`Successfully wrote ${data.length} records to ${tableName}`);
                    resolve();
                  }
                });
              }
            });
          });
        } else {
          // No data to insert, just commit the deletion
          db.run('COMMIT', (err) => {
            if (err) {
              reject(err);
            } else {
              console.log(`Successfully cleared ${tableName} table`);
              resolve();
            }
          });
        }
      });
    });
  });
};

/**
 * Generate a unique ID with a prefix (maintains fileUtils interface)
 * @param {string} prefix - The prefix for the ID (e.g., 'u' for users, 'p' for posts, 'g' for groups)
 * @returns {string} - Generated ID
 */
const generateId = (prefix = '') => {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substr(2, 5);
  return `${prefix}${timestamp}${random}`;
};

/**
 * Migrate existing JSON data to SQLite database
 * @returns {Promise<void>}
 */
const migrateFromJsonFiles = async () => {
  const fs = require('fs').promises;
  const dataDir = path.join(__dirname, '../data');
  
  const files = ['users.json', 'posts.json', 'groups.json', 'notifications.json'];
  
  for (const file of files) {
    const filePath = path.join(dataDir, file);
    
    try {
      const data = await fs.readFile(filePath, 'utf8');
      const jsonData = JSON.parse(data);
      
      if (Array.isArray(jsonData) && jsonData.length > 0) {
        console.log(`Migrating ${jsonData.length} records from ${file}`);
        await writeJson(file, jsonData);
      } else {
        console.log(`No data to migrate from ${file}`);
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log(`File ${file} does not exist, skipping migration`);
      } else {
        console.error(`Error migrating ${file}:`, error);
      }
    }
  }
  
  console.log('Migration completed');
};

/**
 * Initialize data files/tables with default empty data (maintains fileUtils interface)
 * @returns {Promise<void>}
 */
const initializeDataFiles = async () => {
  // For database, we just ensure tables exist (already done in initializeDatabase)
  // But we can run migration if JSON files exist
  await migrateFromJsonFiles();
};

module.exports = {
  initializeDatabase,
  closeDatabase,
  readJson,
  writeJson,
  generateId,
  initializeDataFiles,
  migrateFromJsonFiles
}; 