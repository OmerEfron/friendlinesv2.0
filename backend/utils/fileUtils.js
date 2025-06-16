// File utilities for JSON operations
// Contains readJson() and writeJson() helper functions

const fs = require("fs").promises;
const path = require("path");

/**
 * Read JSON data from a file
 * @param {string} filename - The name of the JSON file
 * @returns {Promise<Array|Object>} - Parsed JSON data or empty array if file doesn't exist
 */
const readJson = async (filename) => {
  try {
    const filePath = path.join(__dirname, "../data", filename);
    const data = await fs.readFile(filePath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    if (error.code === "ENOENT") {
      // File doesn't exist, return empty array for arrays or empty object for objects
      return filename.includes("users") || filename.includes("posts") ? [] : {};
    }
    console.error(`Error reading ${filename}:`, error);
    throw error;
  }
};

/**
 * Write JSON data to a file using atomic operations
 * @param {string} filename - The name of the JSON file
 * @param {Array|Object} data - Data to write
 * @returns {Promise<void>}
 */
const writeJson = async (filename, data) => {
  try {
    const dataDir = path.join(__dirname, "../data");
    const tempFile = path.join(dataDir, `${filename}.tmp`);
    const finalFile = path.join(dataDir, filename);

    // Ensure data directory exists
    await fs.mkdir(dataDir, { recursive: true });

    // Write to temp file first
    await fs.writeFile(tempFile, JSON.stringify(data, null, 2), "utf8");

    // Atomically move temp file to final location
    await fs.rename(tempFile, finalFile);

    console.log(`Successfully wrote ${filename}`);
  } catch (error) {
    console.error(`Error writing ${filename}:`, error);
    throw error;
  }
};

/**
 * Initialize data files with default empty arrays
 * @returns {Promise<void>}
 */
const initializeDataFiles = async () => {
  try {
    const dataDir = path.join(__dirname, "../data");
    await fs.mkdir(dataDir, { recursive: true });

    // Initialize users.json if it doesn't exist or is empty
    try {
      const users = await readJson("users.json");
      if (!Array.isArray(users) || users.length === 0) {
        await writeJson("users.json", []);
      } else {
        // Migrate existing users to include social fields
        const migratedUsers = users.map(user => ({
          ...user,
          followers: user.followers || [],
          following: user.following || [],
          followersCount: user.followersCount || 0,
          followingCount: user.followingCount || 0,
        }));
        await writeJson("users.json", migratedUsers);
      }
    } catch (error) {
      await writeJson("users.json", []);
    }

    // Initialize posts.json if it doesn't exist or is empty
    try {
      const posts = await readJson("posts.json");
      if (!Array.isArray(posts) || posts.length === 0) {
        await writeJson("posts.json", []);
      } else {
        // Migrate existing posts to include social fields
        const migratedPosts = posts.map(post => ({
          ...post,
          likes: post.likes || [],
          comments: post.comments || [],
          likesCount: post.likesCount || 0,
          commentsCount: post.commentsCount || 0,
          sharesCount: post.sharesCount || 0,
        }));
        await writeJson("posts.json", migratedPosts);
      }
    } catch (error) {
      await writeJson("posts.json", []);
    }

    console.log("Data files initialized successfully");
  } catch (error) {
    console.error("Error initializing data files:", error);
    throw error;
  }
};

module.exports = {
  readJson,
  writeJson,
  initializeDataFiles,
};
