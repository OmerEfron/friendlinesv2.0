// Development Data Initializer
// Creates dummy data for testing when NODE_ENV=development

const { readJson, writeJson, initializeDatabase, initializeDataFiles } = require("./dbUtils");
const { generateId } = require("./validation");
const { generateNewsflash } = require("./newsflashGenerator");

/**
 * Clear all existing data and reinitialize with test data
 */
const resetDevData = async () => {
  try {
    console.log("🗑️  Clearing existing data...");
    
    // Initialize database first
    await initializeDatabase();
    console.log("✅ Database initialized");
    
    // Initialize data files
    await initializeDataFiles();
    console.log("✅ Data files initialized");
    
    // Clear all data files
    await writeJson("users.json", []);
    await writeJson("posts.json", []);
    await writeJson("groups.json", []);
    await writeJson("notifications.json", []);
    
    console.log("✅ Data cleared successfully");
    
    // Reinitialize with test data
    await initializeDevData();
    
  } catch (error) {
    console.error("❌ Failed to reset development data:", error);
    throw error;
  }
};

/**
 * Initialize development data with comprehensive test data
 */
const initializeDevData = async () => {
  try {
    console.log("🛠️  Initializing development data...");

    // Check if test user already exists
    const users = await readJson("users.json");
    const testUser = users.find(user => user.email === "test@example.com");
    
    if (testUser) {
      console.log("✅ Test user already exists, updating with missing fields...");
      
      // Update existing test user with missing fields
      const updatedTestUser = {
        ...testUser,
        bio: testUser.bio || "I'm the main test user for Friendlines development! Love coding, coffee, and connecting with friends.",
        location: testUser.location || "San Francisco, CA",
        website: testUser.website || "https://testuser.dev",
        avatar: testUser.avatar || null,
        friends: testUser.friends || ["utestfriend1", "utestfriend2", "utestfriend3", "utestfriend4", "utestfriend5"],
        friendRequests: testUser.friendRequests || ["utestpending1", "utestpending2"],
        sentFriendRequests: testUser.sentFriendRequests || ["utestpending3"],
        friendsCount: testUser.friendsCount || 5,
        updatedAt: new Date().toISOString()
      };
      
      // Update the user in the array
      const userIndex = users.findIndex(u => u.id === testUser.id);
      if (userIndex !== -1) {
        users[userIndex] = updatedTestUser;
        await writeJson("users.json", users);
        console.log("✅ Test user updated successfully");
      }
      
      // Check if we need to create the friend users
      const existingFriendIds = users.map(u => u.id);
      const requiredFriendIds = ["utestfriend1", "utestfriend2", "utestfriend3", "utestfriend4", "utestfriend5", "utestpending1", "utestpending2", "utestpending3"];
      const missingFriendIds = requiredFriendIds.filter(id => !existingFriendIds.includes(id));
      
      if (missingFriendIds.length > 0) {
        console.log("📝 Creating missing friend users...");
        await createMissingFriendUsers(users, missingFriendIds);
      }
      
      return;
    }

    console.log("📝 Creating comprehensive test data...");

    // Create test users with more realistic data
    const testUsers = [
      {
        id: "utest123456789",
        fullName: "Test User",
        email: "test@example.com",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        friends: ["utestfriend1", "utestfriend2", "utestfriend3", "utestfriend4", "utestfriend5"],
        friendRequests: ["utestpending1", "utestpending2"],
        sentFriendRequests: ["utestpending3"],
        friendsCount: 5,
        bio: "I'm the main test user for Friendlines development! Love coding, coffee, and connecting with friends.",
        location: "San Francisco, CA",
        website: "https://testuser.dev",
        avatar: null
      },
      {
        id: "utestfriend1",
        fullName: "Alice Johnson",
        email: "alice@example.com",
        createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        updatedAt: new Date().toISOString(),
        friends: ["utest123456789", "utestfriend2", "utestfriend3", "utestfriend4"],
        friendRequests: [],
        sentFriendRequests: [],
        friendsCount: 4,
        bio: "Software engineer and coffee enthusiast. Building the future one commit at a time! ☕",
        location: "New York, NY",
        website: "https://alice.dev",
        avatar: null
      },
      {
        id: "utestfriend2",
        fullName: "Bob Smith",
        email: "bob@example.com",
        createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        updatedAt: new Date().toISOString(),
        friends: ["utest123456789", "utestfriend1", "utestfriend3", "utestfriend5"],
        friendRequests: [],
        sentFriendRequests: [],
        friendsCount: 4,
        bio: "Fitness trainer and adventure seeker. Helping people transform their lives through movement! 💪",
        location: "Los Angeles, CA",
        website: "https://bobfitness.com",
        avatar: null
      },
      {
        id: "utestfriend3",
        fullName: "Carol Davis",
        email: "carol@example.com",
        createdAt: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
        updatedAt: new Date().toISOString(),
        friends: ["utest123456789", "utestfriend1", "utestfriend2", "utestfriend4"],
        friendRequests: [],
        sentFriendRequests: [],
        friendsCount: 4,
        bio: "Book lover and travel blogger. Exploring the world one story at a time! 📚✈️",
        location: "Seattle, WA",
        website: "https://caroltravels.com",
        avatar: null
      },
      {
        id: "utestfriend4",
        fullName: "David Wilson",
        email: "david@example.com",
        createdAt: new Date(Date.now() - 345600000).toISOString(), // 4 days ago
        updatedAt: new Date().toISOString(),
        friends: ["utest123456789", "utestfriend1", "utestfriend3", "utestfriend5"],
        friendRequests: [],
        sentFriendRequests: [],
        friendsCount: 4,
        bio: "Music producer and DJ. Creating beats that make the world dance! 🎵",
        location: "Austin, TX",
        website: "https://davidbeats.com",
        avatar: null
      },
      {
        id: "utestfriend5",
        fullName: "Emma Brown",
        email: "emma@example.com",
        createdAt: new Date(Date.now() - 432000000).toISOString(), // 5 days ago
        updatedAt: new Date().toISOString(),
        friends: ["utest123456789", "utestfriend2", "utestfriend4"],
        friendRequests: [],
        sentFriendRequests: [],
        friendsCount: 3,
        bio: "Designer and artist. Turning ideas into beautiful visual experiences! 🎨",
        location: "Portland, OR",
        website: "https://emmadesigns.com",
        avatar: null
      },
      {
        id: "utestpending1",
        fullName: "Frank Miller",
        email: "frank@example.com",
        createdAt: new Date(Date.now() - 518400000).toISOString(), // 6 days ago
        updatedAt: new Date().toISOString(),
        friends: ["utestfriend1"],
        friendRequests: [],
        sentFriendRequests: ["utest123456789"],
        friendsCount: 1,
        bio: "Photographer capturing life's beautiful moments. Every picture tells a story! 📸",
        location: "Miami, FL",
        website: "https://frankphotos.com",
        avatar: null
      },
      {
        id: "utestpending2",
        fullName: "Grace Lee",
        email: "grace@example.com",
        createdAt: new Date(Date.now() - 604800000).toISOString(), // 7 days ago
        updatedAt: new Date().toISOString(),
        friends: ["utestfriend3"],
        friendRequests: [],
        sentFriendRequests: ["utest123456789"],
        friendsCount: 1,
        bio: "Chef and food blogger. Cooking up delicious recipes and sharing culinary adventures! 👨‍🍳",
        location: "Chicago, IL",
        website: "https://gracecooks.com",
        avatar: null
      },
      {
        id: "utestpending3",
        fullName: "Henry Chen",
        email: "henry@example.com",
        createdAt: new Date(Date.now() - 691200000).toISOString(), // 8 days ago
        updatedAt: new Date().toISOString(),
        friends: ["utestfriend2"],
        friendRequests: ["utest123456789"],
        sentFriendRequests: [],
        friendsCount: 1,
        bio: "Entrepreneur and startup founder. Building the next big thing! 🚀",
        location: "Boston, MA",
        website: "https://henrystartup.com",
        avatar: null
      }
    ];

    // Create test groups with more variety
    const testGroups = [
      {
        id: "gtestgroup1",
        name: "Tech Enthusiasts",
        description: "A vibrant community for discussing the latest in technology, programming, and innovation. Share your projects, ask questions, and stay updated with tech trends!",
        ownerId: "utest123456789",
        members: ["utest123456789", "utestfriend1", "utestfriend4", "utestpending1"],
        invites: ["utestfriend2", "utestfriend3"],
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
        settings: {
          postNotifications: true,
          membershipNotifications: true
        }
      },
      {
        id: "gtestgroup2",
        name: "Fitness Warriors",
        description: "Motivating each other to stay fit and healthy. Share workouts, progress, nutrition tips, and celebrate achievements together!",
        ownerId: "utestfriend2",
        members: ["utestfriend2", "utest123456789", "utestfriend1", "utestfriend5"],
        invites: ["utestfriend3", "utestpending2"],
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        updatedAt: new Date().toISOString(),
        settings: {
          postNotifications: true,
          membershipNotifications: false
        }
      },
      {
        id: "gtestgroup3",
        name: "Book Club Adventures",
        description: "Monthly book discussions and reading recommendations. Currently reading 'The Midnight Library'. Join us for thoughtful conversations!",
        ownerId: "utestfriend3",
        members: ["utestfriend3", "utest123456789", "utestfriend1", "utestpending2"],
        invites: ["utestfriend2", "utestfriend4"],
        createdAt: new Date(Date.now() - 259200000).toISOString(),
        updatedAt: new Date().toISOString(),
        settings: {
          postNotifications: false,
          membershipNotifications: true
        }
      },
      {
        id: "gtestgroup4",
        name: "Music Makers",
        description: "For musicians, producers, and music lovers. Share your tracks, collaborate on projects, and discuss the latest in music!",
        ownerId: "utestfriend4",
        members: ["utestfriend4", "utest123456789", "utestfriend5"],
        invites: ["utestfriend1", "utestpending1"],
        createdAt: new Date(Date.now() - 345600000).toISOString(),
        updatedAt: new Date().toISOString(),
        settings: {
          postNotifications: true,
          membershipNotifications: true
        }
      },
      {
        id: "gtestgroup5",
        name: "Creative Designers",
        description: "A space for designers, artists, and creatives to share work, get feedback, and discuss design trends and techniques!",
        ownerId: "utestfriend5",
        members: ["utestfriend5", "utestfriend4", "utestpending1"],
        invites: ["utest123456789", "utestfriend1", "utestfriend3"],
        createdAt: new Date(Date.now() - 432000000).toISOString(),
        updatedAt: new Date().toISOString(),
        settings: {
          postNotifications: true,
          membershipNotifications: true
        }
      },
      {
        id: "gtestgroup6",
        name: "Travel Explorers",
        description: "Planning adventures around the world! Share travel tips, photos, find travel companions, and inspire others to explore!",
        ownerId: "utestfriend3",
        members: ["utestfriend3", "utest123456789", "utestfriend1", "utestfriend2"],
        invites: ["utestfriend4", "utestfriend5", "utestpending2"],
        createdAt: new Date(Date.now() - 518400000).toISOString(),
        updatedAt: new Date().toISOString(),
        settings: {
          postNotifications: true,
          membershipNotifications: false
        }
      }
    ];

    // Create test posts with various audience types and more content
    const testPosts = [
      // Public post by test user
      {
        id: "ptestpublic1",
        userId: "utest123456789",
        rawText: "Just finished setting up the development environment! 🚀 The new features are looking amazing. Can't wait to see what we build together!",
        generatedText: "BREAKING: Test User just finished setting up the development environment! 🚀 - Sources confirm the setup was successful and new features are looking promising.",
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        audienceType: "public",
        targetFriendId: null,
        groupIds: [],
        visibility: "public",
        sharesCount: 1
      },
      // Friends post by test user
      {
        id: "ptestfriends1",
        userId: "utest123456789",
        rawText: "Having coffee with friends this weekend! ☕ Planning to catch up on all the latest news and maybe work on some side projects together.",
        generatedText: "URGENT: Test User announces coffee meetup with friends this weekend! ☕ - Social sources confirm plans for catching up and collaborative side projects.",
        timestamp: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        updatedAt: new Date(Date.now() - 7200000).toISOString(),
        audienceType: "friends",
        targetFriendId: null,
        groupIds: [],
        visibility: "friends_only",
        sharesCount: 0
      },
      // Friend-specific post by test user
      {
        id: "ptestfriend1",
        userId: "utest123456789",
        rawText: "Happy birthday Alice! 🎂 Hope you have an amazing day filled with joy, laughter, and lots of cake!",
        generatedText: "EXCLUSIVE: Test User sends birthday wishes to Alice! 🎂 - Personal sources confirm celebration plans and cake consumption.",
        timestamp: new Date(Date.now() - 14400000).toISOString(), // 4 hours ago
        createdAt: new Date(Date.now() - 14400000).toISOString(),
        updatedAt: new Date(Date.now() - 14400000).toISOString(),
        audienceType: "friend",
        targetFriendId: "utestfriend1",
        groupIds: [],
        visibility: "friend_only",
        sharesCount: 0
      },
      // Group post by test user
      {
        id: "ptestgroup1",
        userId: "utest123456789",
        rawText: "Meeting at 3 PM in the tech group! We'll be discussing the new API features and planning the next sprint. Everyone welcome!",
        generatedText: "ALERT: Test User announces 3 PM meeting in tech group! - Group sources confirm discussion of new API features and sprint planning.",
        timestamp: new Date(Date.now() - 21600000).toISOString(), // 6 hours ago
        createdAt: new Date(Date.now() - 21600000).toISOString(),
        updatedAt: new Date(Date.now() - 21600000).toISOString(),
        audienceType: "groups",
        targetFriendId: null,
        groupIds: ["gtestgroup1"],
        visibility: "groups_only",
        sharesCount: 0
      },
      // Post by friend 1
      {
        id: "ptestfriend1post1",
        userId: "utestfriend1",
        rawText: "Just deployed my first app to production! 🎉 After months of hard work, it's finally live. The feeling is incredible!",
        generatedText: "BREAKING: Alice Johnson just deployed her first app to production! 🎉 - Tech sources confirm months of development work culminated in successful deployment.",
        timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        updatedAt: new Date(Date.now() - 3600000).toISOString(),
        audienceType: "friends",
        targetFriendId: null,
        groupIds: [],
        visibility: "friends_only",
        sharesCount: 1
      },
      // Post by friend 2
      {
        id: "ptestfriend2post1",
        userId: "utestfriend2",
        rawText: "Completed a 10-mile run this morning! 💪 The sunrise was absolutely breathtaking. Nothing beats starting the day with a good workout!",
        generatedText: "URGENT: Bob Smith completed a 10-mile run this morning! 💪 - Fitness sources confirm sunrise workout and positive energy boost.",
        timestamp: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        updatedAt: new Date(Date.now() - 7200000).toISOString(),
        audienceType: "friends",
        targetFriendId: null,
        groupIds: [],
        visibility: "friends_only",
        sharesCount: 0
      },
      // Post by friend 3
      {
        id: "ptestfriend3post1",
        userId: "utestfriend3",
        rawText: "Just finished reading 'The Midnight Library' - highly recommend! 📚 The concept of infinite possibilities really makes you think about life choices.",
        generatedText: "EXCLUSIVE: Carol Davis just finished 'The Midnight Library' and highly recommends it! 📚 - Literary sources confirm philosophical impact and life reflection.",
        timestamp: new Date(Date.now() - 10800000).toISOString(), // 3 hours ago
        createdAt: new Date(Date.now() - 10800000).toISOString(),
        updatedAt: new Date(Date.now() - 10800000).toISOString(),
        audienceType: "friends",
        targetFriendId: null,
        groupIds: [],
        visibility: "friends_only",
        sharesCount: 0
      },
      // Post by friend 4
      {
        id: "ptestfriend4post1",
        userId: "utestfriend4",
        rawText: "New track dropping next week! 🎵 Been working on this one for months. Can't wait to share it with everyone!",
        generatedText: "BREAKING: David Wilson announces new track release next week! 🎵 - Music sources confirm months of production work and high anticipation.",
        timestamp: new Date(Date.now() - 14400000).toISOString(), // 4 hours ago
        createdAt: new Date(Date.now() - 14400000).toISOString(),
        updatedAt: new Date(Date.now() - 14400000).toISOString(),
        audienceType: "friends",
        targetFriendId: null,
        groupIds: [],
        visibility: "friends_only",
        sharesCount: 2
      },
      // Post by friend 5
      {
        id: "ptestfriend5post1",
        userId: "utestfriend5",
        rawText: "Just completed a new design project! 🎨 The client loved it and it's going live tomorrow. Design work is so rewarding!",
        generatedText: "EXCLUSIVE: Emma Brown just completed a new design project! 🎨 - Creative sources confirm client satisfaction and imminent launch.",
        timestamp: new Date(Date.now() - 18000000).toISOString(), // 5 hours ago
        createdAt: new Date(Date.now() - 18000000).toISOString(),
        updatedAt: new Date(Date.now() - 18000000).toISOString(),
        audienceType: "friends",
        targetFriendId: null,
        groupIds: [],
        visibility: "friends_only",
        sharesCount: 0
      },
      // Group post by friend 1
      {
        id: "ptestgroup2",
        userId: "utestfriend1",
        rawText: "Anyone up for a coding challenge this weekend? I'm thinking we could build something fun together! 💻",
        generatedText: "ALERT: Alice Johnson proposes weekend coding challenge! 💻 - Tech group sources confirm collaborative development plans.",
        timestamp: new Date(Date.now() - 25200000).toISOString(), // 7 hours ago
        createdAt: new Date(Date.now() - 25200000).toISOString(),
        updatedAt: new Date(Date.now() - 25200000).toISOString(),
        audienceType: "groups",
        targetFriendId: null,
        groupIds: ["gtestgroup1"],
        visibility: "groups_only",
        sharesCount: 0
      },
      // Group post by friend 2
      {
        id: "ptestgroup3",
        userId: "utestfriend2",
        rawText: "New workout routine is working wonders! 💪 Anyone want to join me for a group session this Saturday?",
        generatedText: "URGENT: Bob Smith announces successful workout routine and Saturday group session! 💪 - Fitness group sources confirm.",
        timestamp: new Date(Date.now() - 28800000).toISOString(), // 8 hours ago
        createdAt: new Date(Date.now() - 28800000).toISOString(),
        updatedAt: new Date(Date.now() - 28800000).toISOString(),
        audienceType: "groups",
        targetFriendId: null,
        groupIds: ["gtestgroup2"],
        visibility: "groups_only",
        sharesCount: 0
             }
    ];

    // Create test notifications
    const testNotifications = [
      {
        id: "ntest1",
        userId: "utest123456789",
        type: "friend_request",
        title: "New Friend Request",
        message: "Frank Miller sent you a friend request",
        data: {
          requesterId: "utestpending1",
          requesterName: "Frank Miller"
        },
        read: 0,
        createdAt: new Date(Date.now() - 86400000).toISOString() // 1 day ago
      },
      {
        id: "ntest2",
        userId: "utest123456789",
        type: "friend_request",
        title: "New Friend Request",
        message: "Grace Lee sent you a friend request",
        data: {
          requesterId: "utestpending2",
          requesterName: "Grace Lee"
        },
        read: 0,
        createdAt: new Date(Date.now() - 172800000).toISOString() // 2 days ago
      },

      {
        id: "ntest5",
        userId: "utest123456789",
        type: "group_invite",
        title: "Group Invitation",
        message: "You've been invited to join 'Book Club Adventures'",
        data: {
          groupId: "gtestgroup3",
          groupName: "Book Club Adventures",
          inviterId: "utestfriend3",
          inviterName: "Carol Davis"
        },
        read: 0,
        createdAt: new Date(Date.now() - 172800000).toISOString() // 2 days ago
      },
      {
        id: "ntest6",
        userId: "utest123456789",
        type: "group_invite",
        title: "Group Invitation",
        message: "You've been invited to join 'Creative Designers'",
        data: {
          groupId: "gtestgroup5",
          groupName: "Creative Designers",
          inviterId: "utestfriend5",
          inviterName: "Emma Brown"
        },
        read: 0,
        createdAt: new Date(Date.now() - 259200000).toISOString() // 3 days ago
      }
    ];

    // Save all test data
    await writeJson("users.json", testUsers);
    await writeJson("groups.json", testGroups);
    await writeJson("posts.json", testPosts);
    await writeJson("notifications.json", testNotifications);

    console.log("✅ Development data initialized successfully!");
    console.log("📊 Created:");
    console.log(`   - ${testUsers.length} test users`);
    console.log(`   - ${testGroups.length} test groups`);
    console.log(`   - ${testPosts.length} test posts`);
    console.log(`   - ${testNotifications.length} test notifications`);
    console.log("");
    console.log("🧪 Test User Credentials:");
    console.log("   Email: test@example.com");
    console.log("   Name: Test User");
    console.log("   ID: utest123456789");
    console.log("");
    console.log("👥 Test User Friends:");
    console.log("   - Alice Johnson (utestfriend1) - Software Engineer");
    console.log("   - Bob Smith (utestfriend2) - Fitness Trainer");
    console.log("   - Carol Davis (utestfriend3) - Travel Blogger");
    console.log("   - David Wilson (utestfriend4) - Music Producer");
    console.log("   - Emma Brown (utestfriend5) - Designer");
    console.log("");
    console.log("📋 Test Groups:");
    console.log("   - Tech Enthusiasts (gtestgroup1)");
    console.log("   - Fitness Warriors (gtestgroup2)");
    console.log("   - Book Club Adventures (gtestgroup3)");
    console.log("   - Music Makers (gtestgroup4)");
    console.log("   - Creative Designers (gtestgroup5)");
    console.log("   - Travel Explorers (gtestgroup6)");
    console.log("");
    console.log("🔗 Test Endpoints:");
    console.log("   - GET /api/posts/utest123456789 (user's posts only)");
    console.log("   - GET /api/posts/utest123456789?includeFriends=true (user + friends' posts)");
    console.log("   - GET /api/users/utest123456789/friends (user's friends)");
    console.log("   - GET /api/groups/user/utest123456789 (user's groups)");
    console.log("   - GET /api/notifications/utest123456789 (user's notifications)");
    console.log("   - GET /api/social/users/utest123456789/mutual-friends (mutual friends)");
    console.log("");

  } catch (error) {
    console.error("❌ Failed to initialize development data:", error);
    throw error;
  }
};

/**
 * Create missing friend users without overwriting existing data
 */
const createMissingFriendUsers = async (existingUsers, missingFriendIds) => {
  const friendUserData = {
    utestfriend1: {
      id: "utestfriend1",
      fullName: "Alice Johnson",
      email: "alice@example.com",
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
      friends: ["utest123456789", "utestfriend2", "utestfriend3", "utestfriend4"],
      friendRequests: [],
      sentFriendRequests: [],
      friendsCount: 4,
      bio: "Software engineer and coffee enthusiast. Building the future one commit at a time! ☕",
      location: "New York, NY",
      website: "https://alice.dev",
      avatar: null
    },
    utestfriend2: {
      id: "utestfriend2",
      fullName: "Bob Smith",
      email: "bob@example.com",
      createdAt: new Date(Date.now() - 172800000).toISOString(),
      updatedAt: new Date().toISOString(),
      friends: ["utest123456789", "utestfriend1", "utestfriend3", "utestfriend5"],
      friendRequests: [],
      sentFriendRequests: [],
      friendsCount: 4,
      bio: "Fitness trainer and adventure seeker. Helping people transform their lives through movement! 💪",
      location: "Los Angeles, CA",
      website: "https://bobfitness.com",
      avatar: null
    },
    utestfriend3: {
      id: "utestfriend3",
      fullName: "Carol Davis",
      email: "carol@example.com",
      createdAt: new Date(Date.now() - 259200000).toISOString(),
      updatedAt: new Date().toISOString(),
      friends: ["utest123456789", "utestfriend1", "utestfriend2", "utestfriend4"],
      friendRequests: [],
      sentFriendRequests: [],
      friendsCount: 4,
      bio: "Book lover and travel blogger. Exploring the world one story at a time! 📚✈️",
      location: "Seattle, WA",
      website: "https://caroltravels.com",
      avatar: null
    },
    utestfriend4: {
      id: "utestfriend4",
      fullName: "David Wilson",
      email: "david@example.com",
      createdAt: new Date(Date.now() - 345600000).toISOString(),
      updatedAt: new Date().toISOString(),
      friends: ["utest123456789", "utestfriend1", "utestfriend3", "utestfriend5"],
      friendRequests: [],
      sentFriendRequests: [],
      friendsCount: 4,
      bio: "Music producer and DJ. Creating beats that make the world dance! 🎵",
      location: "Austin, TX",
      website: "https://davidbeats.com",
      avatar: null
    },
    utestfriend5: {
      id: "utestfriend5",
      fullName: "Emma Brown",
      email: "emma@example.com",
      createdAt: new Date(Date.now() - 432000000).toISOString(),
      updatedAt: new Date().toISOString(),
      friends: ["utest123456789", "utestfriend2", "utestfriend4"],
      friendRequests: [],
      sentFriendRequests: [],
      friendsCount: 3,
      bio: "Designer and artist. Turning ideas into beautiful visual experiences! 🎨",
      location: "Portland, OR",
      website: "https://emmadesigns.com",
      avatar: null
    },
    utestpending1: {
      id: "utestpending1",
      fullName: "Frank Miller",
      email: "frank@example.com",
      createdAt: new Date(Date.now() - 518400000).toISOString(),
      updatedAt: new Date().toISOString(),
      friends: ["utestfriend1"],
      friendRequests: [],
      sentFriendRequests: ["utest123456789"],
      friendsCount: 1,
      bio: "Photographer capturing life's beautiful moments. Every picture tells a story! 📸",
      location: "Miami, FL",
      website: "https://frankphotos.com",
      avatar: null
    },
    utestpending2: {
      id: "utestpending2",
      fullName: "Grace Lee",
      email: "grace@example.com",
      createdAt: new Date(Date.now() - 604800000).toISOString(),
      updatedAt: new Date().toISOString(),
      friends: ["utestfriend3"],
      friendRequests: [],
      sentFriendRequests: ["utest123456789"],
      friendsCount: 1,
      bio: "Chef and food blogger. Cooking up delicious recipes and sharing culinary adventures! 👨‍🍳",
      location: "Chicago, IL",
      website: "https://gracecooks.com",
      avatar: null
    },
    utestpending3: {
      id: "utestpending3",
      fullName: "Henry Chen",
      email: "henry@example.com",
      createdAt: new Date(Date.now() - 691200000).toISOString(),
      updatedAt: new Date().toISOString(),
      friends: ["utestfriend2"],
      friendRequests: ["utest123456789"],
      sentFriendRequests: [],
      friendsCount: 1,
      bio: "Entrepreneur and startup founder. Building the next big thing! 🚀",
      location: "Boston, MA",
      website: "https://henrystartup.com",
      avatar: null
    }
  };

  // Add only the missing friend users
  const newUsers = [...existingUsers];
  missingFriendIds.forEach(friendId => {
    if (friendUserData[friendId]) {
      newUsers.push(friendUserData[friendId]);
      console.log(`   - Created ${friendUserData[friendId].fullName} (${friendId})`);
    }
  });

  await writeJson("users.json", newUsers);
  console.log(`✅ Created ${missingFriendIds.length} missing friend users`);
};

module.exports = {
  initializeDevData,
  resetDevData
}; 