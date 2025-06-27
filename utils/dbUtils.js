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
          bio TEXT,
          location TEXT,
          website TEXT,
          avatar TEXT,
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
          audienceType TEXT DEFAULT 'public',
          targetFriendId TEXT,

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
        
        -- Push notification receipts table for tracking delivery
        CREATE TABLE IF NOT EXISTS push_receipts (
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
    posts: ['groupIds'],
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
    posts: ['groupIds'],
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
 * Initialize data files/tables with default empty data (maintains fileUtils interface)
 * @returns {Promise<void>}
 */
const initializeDataFiles = async () => {
  // Only run database migrations
  await runDatabaseMigrations();
};

/**
 * Run database migrations for schema updates
 * @returns {Promise<void>}
 */
const runDatabaseMigrations = async () => {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }
    
    // Check if new columns exist in users table
    db.all("PRAGMA table_info(users)", (err, userColumns) => {
      if (err) {
        console.error('Error getting users table columns:', err);
        reject(err);
        return;
      }
      
      // Check if new columns exist in posts table
      db.all("PRAGMA table_info(posts)", (err, postColumns) => {
        if (err) {
          console.error('Error getting posts table columns:', err);
          reject(err);
          return;
        }
        
        const hasAudienceType = postColumns.some(col => col.name === 'audienceType');
        const hasTargetFriendId = postColumns.some(col => col.name === 'targetFriendId');
        
        // Check for new user fields
        const hasBio = userColumns.some(col => col.name === 'bio');
        const hasLocation = userColumns.some(col => col.name === 'location');
        const hasWebsite = userColumns.some(col => col.name === 'website');
        const hasAvatar = userColumns.some(col => col.name === 'avatar');
        const hasExpoPushToken = userColumns.some(col => col.name === 'expoPushToken');
        
        let migrationsNeeded = 0;
        let migrationsCompleted = 0;
        
        const runNextMigration = () => {
          if (migrationsCompleted === migrationsNeeded) {
            console.log('All database migrations completed');
            resolve();
            return;
          }
        };
        
        // User table migrations
        if (!hasBio) {
          migrationsNeeded++;
          console.log('Adding bio column to users table...');
          db.run("ALTER TABLE users ADD COLUMN bio TEXT", (err) => {
            if (err) {
              console.error('Error adding bio column:', err);
              reject(err);
            } else {
              console.log('Successfully added bio column to users table');
              migrationsCompleted++;
              runNextMigration();
            }
          });
        } else {
          console.log('bio column already exists in users table');
        }
        
        if (!hasLocation) {
          migrationsNeeded++;
          console.log('Adding location column to users table...');
          db.run("ALTER TABLE users ADD COLUMN location TEXT", (err) => {
            if (err) {
              console.error('Error adding location column:', err);
              reject(err);
            } else {
              console.log('Successfully added location column to users table');
              migrationsCompleted++;
              runNextMigration();
            }
          });
        } else {
          console.log('location column already exists in users table');
        }
        
        if (!hasWebsite) {
          migrationsNeeded++;
          console.log('Adding website column to users table...');
          db.run("ALTER TABLE users ADD COLUMN website TEXT", (err) => {
            if (err) {
              console.error('Error adding website column:', err);
              reject(err);
            } else {
              console.log('Successfully added website column to users table');
              migrationsCompleted++;
              runNextMigration();
            }
          });
        } else {
          console.log('website column already exists in users table');
        }
        
        if (!hasAvatar) {
          migrationsNeeded++;
          console.log('Adding avatar column to users table...');
          db.run("ALTER TABLE users ADD COLUMN avatar TEXT", (err) => {
            if (err) {
              console.error('Error adding avatar column:', err);
              reject(err);
            } else {
              console.log('Successfully added avatar column to users table');
              migrationsCompleted++;
              runNextMigration();
            }
          });
        } else {
          console.log('avatar column already exists in users table');
        }
        
        if (!hasExpoPushToken) {
          migrationsNeeded++;
          console.log('Adding expoPushToken column to users table...');
          db.run("ALTER TABLE users ADD COLUMN expoPushToken TEXT", (err) => {
            if (err) {
              console.error('Error adding expoPushToken column:', err);
              reject(err);
            } else {
              console.log('Successfully added expoPushToken column to users table');
              migrationsCompleted++;
              runNextMigration();
            }
          });
        } else {
          console.log('expoPushToken column already exists in users table');
        }
        
        // Posts table migrations
        if (!hasAudienceType) {
          migrationsNeeded++;
          console.log('Adding audienceType column to posts table...');
          db.run("ALTER TABLE posts ADD COLUMN audienceType TEXT DEFAULT 'public'", (err) => {
            if (err) {
              console.error('Error adding audienceType column:', err);
              reject(err);
            } else {
              console.log('Successfully added audienceType column to posts table');
              migrationsCompleted++;
              runNextMigration();
            }
          });
        } else {
          console.log('audienceType column already exists in posts table');
        }
        
        if (!hasTargetFriendId) {
          migrationsNeeded++;
          console.log('Adding targetFriendId column to posts table...');
          db.run("ALTER TABLE posts ADD COLUMN targetFriendId TEXT", (err) => {
            if (err) {
              console.error('Error adding targetFriendId column:', err);
              reject(err);
            } else {
              console.log('Successfully added targetFriendId column to posts table');
              migrationsCompleted++;
              runNextMigration();
            }
          });
        } else {
          console.log('targetFriendId column already exists in posts table');
        }
        
        // If no migrations needed, resolve immediately
        if (migrationsNeeded === 0) {
          resolve();
        }
      });
    });
  });
};

module.exports = {
  initializeDatabase,
  closeDatabase,
  readJson,
  writeJson,
  generateId,
  initializeDataFiles,
  runDatabaseMigrations
}; 