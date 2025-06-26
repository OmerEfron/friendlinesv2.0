# Example App Structure

Here's a complete example of how to structure your Expo app with the Friendlines notification integration:

```
friendlines-app/
├── app/
│   ├── _layout.tsx                 # Root layout with NotificationProvider
│   ├── index.tsx                   # Login screen
│   ├── home.tsx                    # Home screen
│   ├── post/
│   │   └── [id].tsx               # Post detail screen
│   ├── group/
│   │   └── [id].tsx               # Group detail screen
│   └── friends/
│       ├── index.tsx              # Friends list
│       └── requests.tsx           # Friend requests
├── components/
│   ├── NotificationBanner.tsx     # In-app notification banner
│   ├── PostCard.tsx               # Post display component
│   └── UserAvatar.tsx             # User avatar component
├── context/
│   ├── NotificationContext.tsx    # Notification state management
│   └── AuthContext.tsx            # Authentication state
├── services/
│   ├── notificationService.ts     # Notification service
│   ├── api.ts                     # API service
│   └── authService.ts             # Authentication service
├── types/
│   └── index.ts                   # TypeScript type definitions
├── utils/
│   └── constants.ts               # App constants
├── assets/
│   ├── icon.png                   # App icon
│   ├── splash.png                 # Splash screen
│   └── notification-icon.png      # Notification icon
├── app.json                       # Expo configuration
├── app.config.js                  # App configuration
├── package.json                   # Dependencies
└── .env                          # Environment variables
```

## Key Files Implementation

### 1. App Layout (`app/_layout.tsx`)

```typescript
import React from 'react';
import { Stack } from 'expo-router';
import { NotificationProvider } from '../context/NotificationContext';
import { AuthProvider } from '../context/AuthContext';
import NotificationBanner from '../components/NotificationBanner';

export default function RootLayout() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="home" options={{ title: 'Friendlines' }} />
          <Stack.Screen name="post/[id]" options={{ title: 'Post' }} />
          <Stack.Screen name="group/[id]" options={{ title: 'Group' }} />
          <Stack.Screen name="friends/index" options={{ title: 'Friends' }} />
          <Stack.Screen name="friends/requests" options={{ title: 'Friend Requests' }} />
        </Stack>
        <NotificationBanner />
      </NotificationProvider>
    </AuthProvider>
  );
}
```

### 2. Login Screen (`app/index.tsx`)

```typescript
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();
  const { login } = useAuth();
  const { registerForNotifications } = useNotifications();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const result = await login(email, password);
      
      if (result.success) {
        // Register for push notifications
        const notificationSuccess = await registerForNotifications(result.user.id);
        
        if (notificationSuccess) {
          console.log('✅ Push notifications registered');
        } else {
          console.log('⚠️ Failed to register push notifications');
        }
        
        router.replace('/home');
      } else {
        Alert.alert('Login Failed', result.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Friendlines</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TouchableOpacity 
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleLogin}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Logging in...' : 'Login'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 40,
    color: '#007AFF',
  },
  input: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

### 3. Home Screen (`app/home.tsx`)

```typescript
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useNotifications } from '../context/NotificationContext';
import PostCard from '../components/PostCard';
import { fetchPosts } from '../services/api';

export default function HomeScreen() {
  const [posts, setPosts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const { expoPushToken } = useNotifications();
  const router = useRouter();

  const loadPosts = async () => {
    try {
      const result = await fetchPosts();
      if (result.success) {
        setPosts(result.data);
      }
    } catch (error) {
      console.error('Failed to load posts:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPosts();
    setRefreshing(false);
  };

  useEffect(() => {
    loadPosts();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Newsfeed</Text>
        <TouchableOpacity onPress={() => router.push('/friends')}>
          <Text style={styles.link}>Friends</Text>
        </TouchableOpacity>
      </View>
      
      {expoPushToken && (
        <View style={styles.tokenInfo}>
          <Text style={styles.tokenText}>🔔 Notifications enabled</Text>
        </View>
      )}
      
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PostCard 
            post={item} 
            onPress={() => router.push(`/post/${item.id}`)}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  link: {
    color: '#007AFF',
    fontSize: 16,
  },
  tokenInfo: {
    backgroundColor: '#e8f5e8',
    padding: 10,
    margin: 10,
    borderRadius: 8,
  },
  tokenText: {
    color: '#2e7d32',
    textAlign: 'center',
    fontSize: 14,
  },
  list: {
    padding: 10,
  },
});
```

### 4. Post Detail Screen (`app/post/[id].tsx`)

```typescript
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { fetchPostById } from '../../services/api';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPost = async () => {
      try {
        const result = await fetchPostById(id as string);
        if (result.success) {
          setPost(result.data);
        }
      } catch (error) {
        console.error('Failed to load post:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPost();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Post not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.author}>{post.userFullName}</Text>
        <Text style={styles.timestamp}>
          {new Date(post.createdAt).toLocaleDateString()}
        </Text>
      </View>
      
      <View style={styles.content}>
        <Text style={styles.rawText}>{post.rawText}</Text>
        <Text style={styles.generatedText}>{post.generatedText}</Text>
      </View>
      
      <View style={styles.stats}>
        <Text style={styles.stat}>❤️ {post.likesCount} likes</Text>
        <Text style={styles.stat}>💬 {post.commentsCount} comments</Text>
        <Text style={styles.stat}>📤 {post.sharesCount} shares</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  author: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  timestamp: {
    fontSize: 14,
    color: '#666',
  },
  content: {
    padding: 20,
  },
  rawText: {
    fontSize: 16,
    marginBottom: 15,
    lineHeight: 24,
  },
  generatedText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  stat: {
    fontSize: 14,
    color: '#666',
  },
});
```

### 5. API Service (`services/api.ts`)

```typescript
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export interface Post {
  id: string;
  userId: string;
  userFullName: string;
  rawText: string;
  generatedText: string;
  createdAt: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

class ApiService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${API_URL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Request failed');
      }
      
      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async fetchPosts(): Promise<ApiResponse<Post[]>> {
    return this.request<Post[]>('/api/posts');
  }

  async fetchPostById(id: string): Promise<ApiResponse<Post>> {
    return this.request<Post>(`/api/posts/${id}`);
  }

  async createPost(postData: {
    rawText: string;
    userId: string;
    audienceType?: string;
    groupIds?: string[];
  }): Promise<ApiResponse<Post>> {
    return this.request<Post>('/api/posts', {
      method: 'POST',
      body: JSON.stringify(postData),
    });
  }

  async sendFriendRequest(targetUserId: string, requesterId: string): Promise<ApiResponse<any>> {
    return this.request(`/api/users/${targetUserId}/send-friend-request`, {
      method: 'POST',
      body: JSON.stringify({ userId: requesterId }),
    });
  }

  async acceptFriendRequest(requesterId: string, accepterId: string): Promise<ApiResponse<any>> {
    return this.request(`/api/users/${requesterId}/accept-friend`, {
      method: 'POST',
      body: JSON.stringify({ userId: accepterId }),
    });
  }
}

export const apiService = new ApiService();
export const fetchPosts = () => apiService.fetchPosts();
export const fetchPostById = (id: string) => apiService.fetchPostById(id);
export const createPost = (postData: any) => apiService.createPost(postData);
export const sendFriendRequest = (targetUserId: string, requesterId: string) => 
  apiService.sendFriendRequest(targetUserId, requesterId);
export const acceptFriendRequest = (requesterId: string, accepterId: string) => 
  apiService.acceptFriendRequest(requesterId, accepterId);
```

### 6. Package.json Dependencies

```json
{
  "name": "friendlines-app",
  "version": "1.0.0",
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web"
  },
  "dependencies": {
    "expo": "~49.0.0",
    "expo-router": "^2.0.0",
    "expo-notifications": "~0.20.1",
    "expo-device": "~5.4.0",
    "expo-constants": "~14.4.2",
    "react": "18.2.0",
    "react-native": "0.72.6",
    "react-native-safe-area-context": "4.6.3",
    "react-native-screens": "~3.22.0"
  },
  "devDependencies": {
    "@babel/core": "^7.20.0",
    "@types/react": "~18.2.14",
    "typescript": "^5.1.3"
  },
  "private": true
}
```

## Testing the Integration

1. **Start the backend**: `npm start` in the Friendlines backend directory
2. **Start the app**: `npx expo start` in the app directory
3. **Test on device**: Use Expo Go or build a development build
4. **Test notifications**: Use the backend API to trigger notifications

This example provides a complete, working implementation that demonstrates how to integrate the Friendlines notification system into a real Expo app with proper navigation, state management, and user experience. 