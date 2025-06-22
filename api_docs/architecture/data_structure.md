## Data Structure

### Social Features

All API responses now include social features:

**Posts include social metrics:**
- `likesCount: 0` - Number of likes on the post
- `commentsCount: 0` - Number of comments on the post  
- `sharesCount: 0` - Number of shares (reserved for future use)

**Users include social metrics:**
- `followersCount: 0` - Number of users following this user
- `followingCount: 0` - Number of users this user is following

### Backend Data Storage

**User Data Model:**
```json
{
  "id": "u123456789",
  "fullName": "John Doe",
  "email": "john@example.com",
  "expoPushToken": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "createdAt": "2025-06-14T18:00:00.000Z",
  "updatedAt": "2025-06-14T18:00:00.000Z",
  "followers": ["u987654321"],
  "following": ["u555666777"],
  "followersCount": 1,
  "followingCount": 1
}
```

**Post Data Model:**
```json
{
  "id": "p987654321",
  "userId": "u123456789",
  "rawText": "I just got a new dog! 🐶",
  "generatedText": "URGENT: John Doe just got a new dog! 🐶.",
  "timestamp": "2025-06-14T18:00:00.000Z",
  "createdAt": "2025-06-14T18:00:00.000Z",
  "updatedAt": "2025-06-14T18:00:00.000Z",
  "likes": ["u987654321", "u555666777"],
  "comments": [
    {
      "id": "c123456789",
      "userId": "u987654321",
      "text": "Great post!",
      "timestamp": "2025-06-14T18:05:00.000Z",
      "createdAt": "2025-06-14T18:05:00.000Z"
    }
  ],
  "likesCount": 2,
  "commentsCount": 1,
  "sharesCount": 0
}
```

### Data Storage Notes
- Posts contain `likes: []` array of user IDs who liked the post
- Posts contain `comments: []` array of comment objects
- Users contain `followers: []` array of user IDs who follow this user  
- Users contain `following: []` array of user IDs this user follows
- Users contain `expoPushToken` for push notifications (optional field)
- All counts are denormalized for optimal performance
- JSON files are used for POC simplicity (`data/users.json`, `data/posts.json`)

---
