// Test setup file for global configurations
process.env.NODE_ENV = 'test';

// Suppress console.log during tests (optional)
if (process.env.SUPPRESS_LOGS) {
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
}

// Global test helpers
global.createTestUser = async (app, userData = {}) => {
  const defaultUserData = {
    fullName: 'Test User',
    email: 'test@example.com',
    ...userData
  };

  const response = await request(app)
    .post('/api/auth/login')
    .send(defaultUserData);

  return response.body.data;
};

global.createTestPost = async (app, user, postData = {}) => {
  const defaultPostData = {
    userId: user.id,
    rawText: 'Test post content',
    ...postData
  };

  const response = await request(app)
    .post('/api/posts')
    .send(defaultPostData);

  return response.body.data;
}; 