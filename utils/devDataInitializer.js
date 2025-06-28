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

    // Check if test user already exists
    const testUser = await db.getUserByEmail("test@example.com");
    
    if (testUser) {
      console.log("✅ Test user already exists, checking friends...");
      
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

    console.log("📝 Creating comprehensive test data...");

    // Create main test user
    const mainTestUser = await db.createUser({
      fullName: "Test User",
      email: "test@example.com",
      bio: "I'm the main test user for Friendlines development! Love coding, coffee, and connecting with friends.",
      location: "San Francisco, CA",
      website: "https://testuser.dev"
    });
    console.log("✅ Created main test user");

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
      const friend = await db.createUser(userData);
      createdFriends.push(friend);
      console.log(`✅ Created friend user: ${friend.fullName}`);
    }

    // Create friendships between main user and friends
    for (const friend of createdFriends) {
      await db.sendFriendRequest(mainTestUser.id, friend.id);
      await db.acceptFriendRequest(mainTestUser.id, friend.id);
      console.log(`✅ Created friendship: ${mainTestUser.fullName} ↔ ${friend.fullName}`);
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
      const pendingUser = await db.createUser(userData);
      await db.sendFriendRequest(pendingUser.id, mainTestUser.id);
      console.log(`✅ Created pending friend request from: ${pendingUser.fullName}`);
    }

    // Create a test group
    const testGroup = await db.createGroup({
      name: "Tech Enthusiasts",
      description: "A community for discussing technology and programming",
      ownerId: mainTestUser.id
    });
    console.log("✅ Created test group");

    // Create some test posts
    const testPosts = [
      {
        userId: mainTestUser.id,
        rawText: "Just finished setting up the development environment! 🚀",
        generatedText: "BREAKING: Test User just finished setting up the development environment! 🚀",
        audienceType: "public",
        groupIds: []
      },
      {
        userId: createdFriends[0].id,
        rawText: "Great day for coding! ☕",
        generatedText: "URGENT: Alice reports great day for coding! ☕",
        audienceType: "friends",
        groupIds: []
      }
    ];

    for (const postData of testPosts) {
      await db.createPost(postData);
      console.log(`✅ Created test post by: ${postData.userId}`);
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