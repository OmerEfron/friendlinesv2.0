## Frontend Integration Tips

### User Session Management
```javascript
// Store user data after login
const loginUser = async (fullName, email) => {
  const response = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullName, email })
  });
  
  const result = await response.json();
  if (result.success) {
    // Store user data (localStorage, AsyncStorage, etc.)
    localStorage.setItem('user', JSON.stringify(result.data));
    return result.data;
  }
  throw new Error(result.message);
};

// Register push notification token
const registerPushToken = async (userId, expoPushToken) => {
  const response = await fetch(`/api/users/${userId}/push-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ expoPushToken })
  });
  
  const result = await response.json();
  if (result.success) {
    return result.data;
  }
  throw new Error(result.message);
};
```

### Creating Posts
```javascript
const createPost = async (rawText, userId) => {
  const response = await fetch('/api/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rawText, userId })
  });
  
  const result = await response.json();
  if (result.success) {
    return result.data; // Includes generated newsflash
  }
  throw new Error(result.message);
};
```

### Social Features Integration
```javascript
// Like/Unlike a post
const toggleLike = async (postId, userId) => {
  const response = await fetch(`/api/posts/${postId}/like`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId })
  });
  
  const result = await response.json();
  if (result.success) {
    return result.data; // Contains isLiked, likesCount, action
  }
  throw new Error(result.message);
};

// Add a comment
const addComment = async (postId, userId, text) => {
  const response = await fetch(`/api/posts/${postId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, text })
  });
  
  const result = await response.json();
  if (result.success) {
    return result.data; // Contains comment data and updated count
  }
  throw new Error(result.message);
};

// Follow/Unfollow a user
const toggleFollow = async (targetUserId, currentUserId) => {
  const response = await fetch(`/api/users/${targetUserId}/follow`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: currentUserId })
  });
  
  const result = await response.json();
  if (result.success) {
    return result.data; // Contains follow status and counts
  }
  throw new Error(result.message);
};
```

### Pagination Handling
```javascript
const loadPosts = async (page = 1, limit = 20) => {
  const response = await fetch(`/api/posts?page=${page}&limit=${limit}`);
  const result = await response.json();
  
  if (result.success) {
    return {
      posts: result.data,
      pagination: result.pagination
    };
  }
  throw new Error(result.message);
};
```

### Error Handling
```javascript
const handleApiError = (error) => {
  if (error.status === 429) {
    // Rate limited
    return 'Too many requests. Please wait and try again.';
  } else if (error.status === 400) {
    // Validation error
    return error.errors ? error.errors.join(', ') : error.message;
  } else if (error.status >= 500) {
    // Server error
    return 'Server error. Please try again later.';
  }
  return error.message || 'An unexpected error occurred.';
};
```

---
