// Development Data Initializer
// Creates dummy data for testing when NODE_ENV=development

const { db } = require("./database");
const { generateId } = require("./validation");
const { generateNewsflash } = require("./newsflashGenerator");

/**
 * Initialize development data with comprehensive test data
 */
const initializeDevData = async () => {
  try {
    console.log("🛠️  Initializing development data...");

    // Ensure database is initialized
    await db.initialize();

    // Check if test user already exists
    const testUser = await db.getUserById("utest123456789");
    
    if (testUser) {
      console.log("✅ Test user already exists (ID: utest123456789), checking friends...");
      
      // Update existing test user with missing fields if needed
      const updates = {};
      if (!testUser.bio) updates.bio = "I'm the main test user for Friendlines development! Love coding, coffee, and connecting with friends.";
      if (!testUser.location) updates.location = "San Francisco, CA";
      if (!testUser.website) updates.website = "https://testuser.dev";
      
      if (Object.keys(updates).length > 0) {
        await db.updateUser(testUser.id, updates);
        console.log("✅ Test user updated successfully");
      }
      
      // Check if friends already exist and are connected
      const existingFriends = await db.getUserFriends(testUser.id);
      if (existingFriends.length >= 3) {
        console.log("✅ Test data already initialized");
        return;
      }
      
      console.log("📝 Adding missing test friends...");
    }

    // Check if someone else already has the test email
    const emailUser = await db.getUserByEmail("test@example.com");
    if (emailUser && emailUser.id !== "utest123456789") {
      console.log("⚠️ User with test@example.com already exists but has different ID. Removing existing user and creating correct one...");
      // Delete the existing user to create the correct one
      await db.runQuery('DELETE FROM users WHERE id = ?', [emailUser.id]);
      console.log(`✅ Removed existing user with ID: ${emailUser.id}`);
    }

    console.log("📝 Creating comprehensive test data...");

    // Create main test user with specific ID for frontend compatibility
    let mainTestUser = testUser;
    if (!mainTestUser) {
      mainTestUser = await db.createUserWithId('utest123456789', {
        fullName: "Test User",
        email: "test@example.com",
        bio: "I'm the main test user for Friendlines development! Love coding, coffee, and connecting with friends.",
        location: "San Francisco, CA",
        website: "https://testuser.dev"
      });
      console.log("✅ Created main test user with ID: utest123456789");
    } else {
      console.log("✅ Test user with correct ID already exists");
    }

    // Create friend users
    const friendUserData = [
      {
        fullName: "Alice Johnson",
        email: "alice@example.com",
        bio: "Software engineer and coffee enthusiast. Building the future one commit at a time! ☕",
        location: "New York, NY",
        website: "https://alice.dev"
      },
      {
        fullName: "Bob Smith",
        email: "bob@example.com",
        bio: "Fitness trainer and adventure seeker. Helping people transform their lives through movement! 💪",
        location: "Los Angeles, CA",
        website: "https://bobfitness.com"
      },
      {
        fullName: "Carol Davis",
        email: "carol@example.com",
        bio: "Book lover and travel blogger. Exploring the world one story at a time! 📚✈️",
        location: "Seattle, WA",
        website: "https://caroltravels.com"
      },
      {
        fullName: "David Wilson",
        email: "david@example.com",
        bio: "Music producer and DJ. Creating beats that make the world dance! 🎵",
        location: "Austin, TX",
        website: "https://davidbeats.com"
      },
      {
        fullName: "Emma Brown",
        email: "emma@example.com",
        bio: "Designer and artist. Turning ideas into beautiful visual experiences! 🎨",
        location: "Portland, OR",
        website: "https://emmadesigns.com"
      }
    ];

    const createdFriends = [];
    for (const userData of friendUserData) {
      // Check if friend user already exists
      let friend = await db.getUserByEmail(userData.email);
      if (!friend) {
        friend = await db.createUser(userData);
        console.log(`✅ Created friend user: ${friend.fullName}`);
      } else {
        console.log(`✅ Friend user already exists: ${friend.fullName}`);
      }
      createdFriends.push(friend);
    }

    // Create friendships between main user and friends
    for (const friend of createdFriends) {
      // Check if friendship already exists
      const existingFriendship = await db.getFriendshipStatus(mainTestUser.id, friend.id);
      if (!existingFriendship) {
        await db.sendFriendRequest(mainTestUser.id, friend.id);
        await db.acceptFriendRequest(mainTestUser.id, friend.id);
        console.log(`✅ Created friendship: ${mainTestUser.fullName} ↔ ${friend.fullName}`);
      } else if (existingFriendship.status === 'pending') {
        await db.acceptFriendRequest(mainTestUser.id, friend.id);
        console.log(`✅ Accepted existing friend request: ${mainTestUser.fullName} ↔ ${friend.fullName}`);
      } else {
        console.log(`✅ Friendship already exists: ${mainTestUser.fullName} ↔ ${friend.fullName}`);
      }
    }

    // Create some friend requests (pending)
    const pendingUserData = [
      {
        fullName: "Frank Miller",
        email: "frank@example.com",
        bio: "Photographer capturing life's beautiful moments. Every picture tells a story! 📸",
        location: "Miami, FL",
        website: "https://frankphotos.com"
      },
      {
        fullName: "Grace Lee",
        email: "grace@example.com",
        bio: "Chef and food blogger. Cooking up delicious recipes and sharing culinary adventures! 👨‍🍳",
        location: "Chicago, IL",
        website: "https://gracecooks.com"
      }
    ];

    for (const userData of pendingUserData) {
      // Check if pending user already exists
      let pendingUser = await db.getUserByEmail(userData.email);
      if (!pendingUser) {
        pendingUser = await db.createUser(userData);
        console.log(`✅ Created pending user: ${pendingUser.fullName}`);
      } else {
        console.log(`✅ Pending user already exists: ${pendingUser.fullName}`);
      }
      
      // Check if friend request already exists before sending
      const existingFriendship = await db.getFriendshipStatus(pendingUser.id, mainTestUser.id);
      if (!existingFriendship) {
        await db.sendFriendRequest(pendingUser.id, mainTestUser.id);
        console.log(`✅ Created pending friend request from: ${pendingUser.fullName}`);
      } else {
        console.log(`✅ Friend request already exists from: ${pendingUser.fullName}`);
      }
    }

    // Create a test group
    const userGroups = await db.getUserGroups(mainTestUser.id);
    let testGroup = userGroups.find(group => group.name === "Tech Enthusiasts");
    
    if (!testGroup) {
      testGroup = await db.createGroup({
        name: "Tech Enthusiasts",
        description: "A community for discussing technology and programming",
        ownerId: mainTestUser.id
      });
      console.log("✅ Created test group");
    } else {
      console.log("✅ Test group already exists");
    }

    // Create some test posts (only if they don't already exist)
    const existingTestUserPosts = await db.getUserPosts(mainTestUser.id);
    const existingAlicePosts = createdFriends.length > 0 ? await db.getUserPosts(createdFriends[0].id) : [];
    
    if (existingTestUserPosts.length === 0) {
      await db.createPost({
        userId: mainTestUser.id,
        rawText: "Just finished setting up the development environment! 🚀",
        generatedText: "BREAKING: Test User just finished setting up the development environment! 🚀",
        audienceType: "public",
        groupIds: []
      });
      console.log(`✅ Created test post by: ${mainTestUser.fullName}`);
    } else {
      console.log(`✅ Test posts already exist for: ${mainTestUser.fullName}`);
    }

    if (createdFriends.length > 0 && existingAlicePosts.length === 0) {
      await db.createPost({
        userId: createdFriends[0].id,
        rawText: "Great day for coding! ☕",
        generatedText: "URGENT: Alice reports great day for coding! ☕",
        audienceType: "friends",
        groupIds: []
      });
      console.log(`✅ Created test post by: ${createdFriends[0].fullName}`);
    } else if (createdFriends.length > 0) {
      console.log(`✅ Test posts already exist for: ${createdFriends[0].fullName}`);
    }

    console.log("🎉 Development data initialization completed successfully!");
  } catch (error) {
    console.error("❌ Failed to initialize development data:", error);
    throw error;
  }
};

/**
 * Clear all existing data and reinitialize with test data
 */
const resetDevData = async () => {
  try {
    console.log("🗑️  Clearing existing data...");
    console.log("✅ Data cleared successfully");
    
    // Reinitialize with test data
    await initializeDevData();
    
  } catch (error) {
    console.error("❌ Failed to reset development data:", error);
    throw error;
  }
};

module.exports = {
  initializeDevData,
  resetDevData
}; 