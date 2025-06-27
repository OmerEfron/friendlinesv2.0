# Expo Push Notifications Integration Guide

## Overview

This is a **complete step-by-step guide** for frontend developers to implement push notifications in React Native with Expo for the Friendlines v2.0 app. The backend is already configured and working - this guide will help you enable notifications in your mobile app.

**🎯 What You'll Achieve:**
- ✅ Push notifications working on both iOS and Android
- ✅ Proper token registration with the backend
- ✅ Notification handling when app is open, closed, or backgrounded
- ✅ Deep linking to specific screens from notifications
- ✅ Production-ready implementation

**⏱️ Estimated Time:** 2-3 hours for complete implementation

## 📋 Prerequisites & Requirements

### Development vs Production Builds

**Important:** Push notifications require different setup for development and production builds:

- **Expo Go (Development)**: Limited support, requires physical device, no custom configuration
- **Development Build**: Full support, requires EAS credentials setup or local configuration
- **Production Build**: Full support, requires production certificates and proper configuration

### Platform Requirements

#### iOS Requirements
- **Physical device required** (simulators don't support push notifications)
- **Apple Developer Account** (paid account required for production)
- **iOS 15.1 or higher** (SDK 52+ requirement)
- **Xcode 16+** for building

#### Android Requirements  
- **Physical device required** (emulators don't support push notifications)
- **Firebase project** with FCM enabled
- **Android API 24+** (SDK 52+ requirement)
- **Android Studio** for building

## 🚀 Step-by-Step Implementation

### ⚡ Quick Start (5 Minutes)

If you want to get notifications working immediately, follow these steps:

1. **Install dependencies:**
   ```bash
   npx expo install expo-notifications expo-device expo-constants
   ```

2. **Add to your main App component:**
   ```tsx
   import { useEffect } from 'react';
   import * as Notifications from 'expo-notifications';
   import * as Device from 'expo-device';
   import Constants from 'expo-constants';

   // Add this to your App.js/App.tsx
   useEffect(() => {
     setupNotifications();
   }, []);

   async function setupNotifications() {
     if (!Device.isDevice) {
       alert('Must use physical device for notifications');
       return;
     }

     const { status } = await Notifications.requestPermissionsAsync();
     if (status !== 'granted') {
       alert('Need notification permissions!');
       return;
     }

     const token = await Notifications.getExpoPushTokenAsync({
       projectId: Constants?.expoConfig?.extra?.eas?.projectId
     });

     console.log('Push token:', token.data);
     // TODO: Send token to backend
   }
   ```

3. **Test it:** Run on a physical device and check console for the push token

Now continue with the full implementation below for production-ready code.

---

## 📦 Complete Installation

### 1. Install Required Dependencies

```bash
# Core notification dependencies
npx expo install expo-notifications expo-device expo-constants

# Additional dependencies for full functionality
npx expo install expo-application expo-crypto

# For navigation handling (if not already installed)
npm install @react-navigation/native
```

**Why each dependency:**
- `expo-notifications`: Core notification handling
- `expo-device`: Check if running on physical device  
- `expo-constants`: Access project configuration
- `expo-application`: App state management
- `expo-crypto`: Token validation utilities

### 2. Project Configuration

#### App Config (app.json/app.config.js)

```json
{
  "expo": {
    "name": "Your App",
    "slug": "your-app",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.yourcompany.yourapp",
      "buildNumber": "1"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.yourcompany.yourapp",
      "versionCode": 1
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#ffffff",
          "defaultChannel": "default",
          "sounds": [
            "./assets/sounds/notification.wav"
          ]
        }
      ]
    ],
    "extra": {
      "eas": {
        "projectId": "your-project-id-here"
      }
    }
  }
}
```

#### Environment Variables (.env)

```bash
# Backend API configuration
API_URL=https://your-backend-url.com
API_VERSION=v1

# Expo configuration
EXPO_PROJECT_ID=your-project-id-here
```

### 3. Credentials Setup

#### For EAS Build (Recommended)

##### iOS Setup
```bash
# Install EAS CLI
npm install -g eas-cli

# Login to your Expo account
eas login

# Configure iOS credentials
eas credentials:configure -p ios

# When prompted, choose:
# - "Set up Push Notifications for your project" → Yes
# - "Generate a new Apple Push Notifications service key" → Yes
```

##### Android Setup
```bash
# Configure Android credentials  
eas credentials:configure -p android

# For FCM, you'll need:
# 1. Firebase project with your Android app configured
# 2. google-services.json file
# 3. FCM v1 service account key (JSON)
```

#### For Local Development

##### iOS (requires Apple Developer Account)
1. Create APNs key in Apple Developer Console
2. Download the .p8 file
3. Note the Key ID and Team ID
4. Configure in your build process

##### Android (requires Firebase project)
1. Create Firebase project
2. Add Android app with your package name
3. Download google-services.json
4. Generate FCM service account key

### 4. Build Configuration

#### EAS Build (eas.json)

```json
{
  "cli": {
    "version": ">= 8.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "resourceClass": "m-medium"
      },
      "android": {
        "buildType": "apk",
        "gradleCommand": ":app:assembleDebug"
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "resourceClass": "m-medium"
      },
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "ios": {
        "resourceClass": "m-medium"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

#### Local Build Setup

For local builds, ensure you have:

##### iOS
```bash
# Install CocoaPods
sudo gem install cocoapods

# Run pod install after any dependency changes
cd ios && pod install && cd ..
```

##### Android  
```bash
# Ensure Android SDK is installed
# Set ANDROID_HOME environment variable
# Install required build tools

# For gradle builds
cd android && ./gradlew assembleDebug && cd ..
```

### 5. Complete Implementation Guide

#### Step 1: Create NotificationService.js

Create a new file `services/NotificationService.js`:

```tsx
// services/NotificationService.js
import { useState, useEffect, useRef } from 'react';
import { Platform, Alert, Linking } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ⚠️ IMPORTANT: Configure this BEFORE any other notification code
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,   // Show notification in foreground
    shouldPlaySound: true,   // Play notification sound
    shouldSetBadge: true,    // Update app badge count
  }),
});

// Configuration - UPDATE THESE VALUES
const CONFIG = {
  // Your backend URL - CHANGE THIS
  API_URL: 'https://your-backend-url.com',  // or 'http://localhost:3000' for development
  
  // Storage keys
  STORAGE_KEY_TOKEN: 'expo_push_token',
  STORAGE_KEY_USER_ID: 'current_user_id',
};

/**
 * Main notification hook - use this in your App component
 */
export function useNotifications(navigation) {
  const [expoPushToken, setExpoPushToken] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    initializeNotifications();

    // Set up listeners
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('📱 Notification received in foreground:', notification);
      handleForegroundNotification(notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('👆 Notification tapped:', response);
      handleNotificationTap(response, navigation);
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [navigation]);

  const initializeNotifications = async () => {
    try {
      setIsLoading(true);
      
      // Setup Android channels first
      if (Platform.OS === 'android') {
        await setupAndroidChannels();
      }

      const token = await registerForPushNotificationsAsync();
      if (token) {
        setExpoPushToken(token);
        await registerTokenWithBackend(token);
      }
    } catch (error) {
      console.error('❌ Failed to initialize notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    expoPushToken,
    isLoading,
    refreshToken: () => initializeNotifications(),
  };
}

/**
 * Core function to register for push notifications
 * This handles all the complex permission and token logic
 */
async function registerForPushNotificationsAsync() {
  console.log('🔔 Starting push notification registration...');

  // CRITICAL: Check if running on physical device
  if (!Device.isDevice) {
    Alert.alert(
      'Physical Device Required',
      'Push notifications only work on physical devices, not simulators.',
      [{ text: 'OK' }]
    );
    return null;
  }

  try {
    // Step 1: Check current permission status
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    console.log('📋 Current permission status:', existingStatus);
    
    let finalStatus = existingStatus;
    
    // Step 2: Request permissions if not granted
    if (existingStatus !== 'granted') {
      console.log('🙋 Requesting notification permissions...');
      
      // Show explanation first (iOS requirement)
      const shouldRequest = await showPermissionExplanation();
      if (!shouldRequest) {
        console.log('❌ User declined permission explanation');
        return null;
      }

      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowDisplayInCarPlay: true,
          allowCriticalAlerts: false,
          provideAppNotificationSettings: true,
          allowProvisional: false,
          allowAnnouncements: true,
        },
      });
      finalStatus = status;
    }
    
    // Step 3: Handle permission denial
    if (finalStatus !== 'granted') {
      console.error('❌ Notification permission not granted:', finalStatus);
      
      Alert.alert(
        'Notifications Disabled',
        'You won\'t receive notifications about friend requests, new posts, or group invitations. You can enable them later in Settings.',
        [
          { text: 'Later', style: 'cancel' },
          { text: 'Settings', onPress: () => Linking.openSettings() }
        ]
      );
      return null;
    }
    
    console.log('✅ Notification permissions granted');

    // Step 4: Get project ID - REQUIRED for Expo push tokens
    const projectId = getProjectId();
    if (!projectId) {
      throw new Error('Project ID not found. Please configure expo.extra.eas.projectId in app.json');
    }
    
    console.log('🆔 Using project ID:', projectId);

    // Step 5: Get Expo push token
    console.log('🎫 Getting Expo push token...');
    const tokenResult = await Notifications.getExpoPushTokenAsync({ projectId });
    const pushTokenString = tokenResult.data;
    
    if (!pushTokenString) {
      throw new Error('Failed to get push token - token is empty');
    }

    console.log('✅ Successfully obtained Expo push token');
    console.log('🎫 Token:', pushTokenString.substring(0, 30) + '...');
    
    // Store token locally for backup
    await AsyncStorage.setItem(CONFIG.STORAGE_KEY_TOKEN, pushTokenString);
    
    return pushTokenString;
    
  } catch (error) {
    console.error('❌ Failed to get push token:', error);
    
    // Handle specific error cases with user-friendly messages
    if (error.message.includes('Project ID')) {
      Alert.alert(
        'Configuration Error',
        'App configuration issue. Please contact support.',
        [{ text: 'OK' }]
      );
    } else if (error.message.includes('credentials')) {
      Alert.alert(
        'Setup Required',
        'Notification setup incomplete. Please update the app.',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        'Connection Error',
        'Failed to register for notifications. Please check your internet connection and try again.',
        [{ text: 'OK' }]
      );
    }
    
    return null;
  }
}

/**
 * Show permission explanation (iOS requirement)
 */
async function showPermissionExplanation() {
  return new Promise((resolve) => {
    Alert.alert(
      'Enable Notifications',
      'Get notified when friends post updates, send you friend requests, or invite you to groups. You can always change this in Settings.',
      [
        { 
          text: 'Not Now', 
          style: 'cancel',
          onPress: () => resolve(false)
        },
        { 
          text: 'Enable', 
          onPress: () => resolve(true)
        }
      ]
    );
  });
}

/**
 * Get project ID from various sources
 */
function getProjectId() {
  return (
    Constants?.expoConfig?.extra?.eas?.projectId ?? 
    Constants?.easConfig?.projectId ??
    process.env.EXPO_PROJECT_ID ??
    __DEV__ ? 'your-dev-project-id' : null  // Fallback for development
  );
}
```

## 📱 Android Notification Channels

Set up proper notification channels for Android:

```tsx
async function setupAndroidChannels() {
  if (Platform.OS !== 'android') return;

  // Default channel
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Default notifications',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF231F7C',
  });

  // Friend requests
  await Notifications.setNotificationChannelAsync('friend_requests', {
    name: 'Friend Requests',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#4F46E5',
    sound: 'default',
  });

  // Group invitations
  await Notifications.setNotificationChannelAsync('group_invitations', {
    name: 'Group Invitations',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#059669',
    sound: 'default',
  });

  // Group posts
  await Notifications.setNotificationChannelAsync('group_posts', {
    name: 'Group Posts',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#DC2626',
    sound: 'default',
  });

  // Friends posts
  await Notifications.setNotificationChannelAsync('friends_posts', {
    name: 'Friends Posts',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#7C3AED',
    sound: 'default',
  });

  // Personal posts
  await Notifications.setNotificationChannelAsync('personal_posts', {
    name: 'Personal Messages',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 300, 200, 300],
    lightColor: '#F59E0B',
    sound: 'default',
  });
}
```

/**
 * Register push token with Friendlines backend
 */
async function registerTokenWithBackend(token) {
  try {
    console.log('📤 Registering token with backend...');
    
    // Get current user ID - UPDATE THIS based on your auth system
    const userId = await getCurrentUserId();
    if (!userId) {
      console.error('❌ No user ID found - user not logged in');
      return false;
    }

    const response = await fetch(`${CONFIG.API_URL}/api/users/${userId}/push-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add authorization header if needed
        // 'Authorization': `Bearer ${await getAuthToken()}`,
      },
      body: JSON.stringify({
        expoPushToken: token
      }),
      timeout: 10000, // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Push token registered successfully with backend');
      await AsyncStorage.setItem(`${CONFIG.STORAGE_KEY_TOKEN}_registered`, 'true');
      return true;
    } else {
      console.error('❌ Backend rejected token registration:', result.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Error registering push token:', error);
    
    // Show user-friendly error for network issues
    if (error.message.includes('network') || error.message.includes('timeout')) {
      Alert.alert(
        'Connection Error',
        'Failed to connect to server. Notifications may not work until you have a stable internet connection.',
        [{ text: 'OK' }]
      );
    }
    
    return false;
  }
}

/**
 * Get current user ID - UPDATE THIS based on your auth system
 */
async function getCurrentUserId() {
  try {
    // Option 1: Get from AsyncStorage
    const userId = await AsyncStorage.getItem(CONFIG.STORAGE_KEY_USER_ID);
    if (userId) return userId;
    
    // Option 2: Get from your auth context/redux store
    // const { user } = useAuth();
    // return user?.id;
    
    // Option 3: Get from secure storage
    // const userId = await SecureStore.getItemAsync('user_id');
    // return userId;
    
    // For development/testing - REMOVE THIS in production
    if (__DEV__) {
      return 'utest123456789'; // Test user ID from backend
    }
    
    console.warn('⚠️ getCurrentUserId() not implemented - update this function');
    return null;
  } catch (error) {
    console.error('Error getting user ID:', error);
    return null;
  }
}
```

#### Step 2: Add Notification Handlers

Add these functions to your `NotificationService.js`:

```tsx
/**
 * Handle notifications when app is in foreground
 */
function handleForegroundNotification(notification) {
  const { title, body, data } = notification.request.content;
  
  console.log('📱 Foreground notification:', { title, body, data });
  
  // You can choose to show a custom in-app notification
  // or let the system handle it (current behavior)
  
  // Optional: Show custom alert for important notifications
  if (data?.type === 'friend_request') {
    Alert.alert(
      title,
      body,
      [
        { text: 'Later', style: 'cancel' },
        { text: 'View', onPress: () => handleNotificationNavigation(data) }
      ]
    );
  }
}

/**
 * Handle notification taps (when user taps notification)
 */
function handleNotificationTap(response, navigation) {
  const { data } = response.notification.request.content;
  
  console.log('👆 User tapped notification:', data);
  
  // Clear badge when user interacts
  Notifications.setBadgeCountAsync(0);
  
  // Navigate based on notification type
  handleNotificationNavigation(data, navigation);
}

/**
 * Navigate to appropriate screen based on notification data
 */
function handleNotificationNavigation(data, navigation) {
  if (!navigation) {
    console.warn('⚠️ Navigation not available');
    return;
  }

  try {
    switch (data?.type) {
      case 'friend_request':
        navigation.navigate('FriendRequests');
        break;
        
      case 'friend_request_accepted':
        navigation.navigate('Friends');
        break;
        
      case 'group_invitation':
        navigation.navigate('Groups');
        break;
        
      case 'group_invitation_accepted':
        if (data.groupId) {
          navigation.navigate('GroupDetails', { groupId: data.groupId });
        } else {
          navigation.navigate('Groups');
        }
        break;
        
      case 'group_post':
      case 'friends_post':
      case 'friend_post':
        if (data.postId) {
          navigation.navigate('PostDetails', { 
            postId: data.postId,
            userId: data.userId 
          });
        } else {
          navigation.navigate('Home');
        }
        break;
        
      default:
        console.log('🏠 Unknown notification type, navigating to home');
        navigation.navigate('Home');
    }
  } catch (error) {
    console.error('❌ Navigation error:', error);
    // Fallback to home screen
    navigation.navigate('Home');
  }
}

/**
 * Handle token updates (tokens can change)
 */
function setupTokenUpdateListener() {
  const subscription = Notifications.addPushTokenListener(token => {
    console.log('🔄 Push token updated:', token.data);
    registerTokenWithBackend(token.data);
  });

  return subscription;
}

#### Step 3: Use in Your App Component

Now update your main App component to use the notification service:

```tsx
// App.js or App.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNotifications } from './services/NotificationService';

// Your screen components
import HomeScreen from './screens/HomeScreen';
import FriendRequestsScreen from './screens/FriendRequestsScreen';
import GroupsScreen from './screens/GroupsScreen';
import PostDetailsScreen from './screens/PostDetailsScreen';
// ... other screens

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <AppNavigator />
    </NavigationContainer>
  );
}

function AppNavigator() {
  // 🔔 Initialize notifications - IMPORTANT: Pass navigation reference
  const { expoPushToken, isLoading } = useNotifications(useNavigation());

  return (
    <Stack.Navigator initialRouteName="Home">
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="FriendRequests" component={FriendRequestsScreen} />
      <Stack.Screen name="Groups" component={GroupsScreen} />
      <Stack.Screen name="PostDetails" component={PostDetailsScreen} />
      {/* Add more screens as needed */}
    </Stack.Navigator>
  );
}
```

#### Step 4: Update Configuration

**IMPORTANT:** Update these values in your `NotificationService.js`:

```tsx
// At the top of NotificationService.js - UPDATE THESE
const CONFIG = {
  // 🔧 CHANGE THIS to your actual backend URL
  API_URL: __DEV__ 
    ? 'http://localhost:3000'           // Development
    : 'https://your-backend-url.com',   // Production
  
  // Storage keys (you can keep these as-is)
  STORAGE_KEY_TOKEN: 'expo_push_token',
  STORAGE_KEY_USER_ID: 'current_user_id',
};
```

#### Step 5: Test Your Implementation

1. **Run on physical device:**
   ```bash
   npx expo run:ios --device
   # or
   npx expo run:android --device
   ```

2. **Check console for logs:**
   - Look for "🔔 Starting push notification registration..."
   - Should see "✅ Push token registered successfully with backend"

3. **Test notification flow:**
   - Create a post from another user (Alice) using the backend
   - You should receive a push notification!

## 🔧 Backend Integration Details

### API Endpoint

Your app will automatically call this endpoint to register tokens:

```
POST /api/users/{userId}/push-token
Content-Type: application/json

{
  "expoPushToken": "ExponentPushToken[abc123...]"
}
```

### Expected Response

```json
{
  "success": true,
  "message": "Push token registered successfully",
  "timestamp": "2025-01-27T10:30:00.000Z"
}
```

## 📋 Notification Types

The backend sends these notification types:

### Friend Requests
```json
{
  "type": "friend_request",
  "requesterId": "u123456789",
  "requesterName": "John Doe",
  "targetUserId": "u987654321",
  "targetUserName": "Jane Smith"
}
```

### Friend Request Accepted
```json
{
  "type": "friend_request_accepted",
  "accepterId": "u987654321",
  "accepterName": "Jane Smith",
  "requesterId": "u123456789",
  "requesterName": "John Doe"
}
```

### Group Invitations
```json
{
  "type": "group_invitation",
  "groupId": "g123456789",
  "groupName": "My Group",
  "inviterId": "u123456789",
  "inviterName": "John Doe",
  "invitedUserId": "u987654321"
}
```

### Group Invitation Accepted
```json
{
  "type": "group_invitation_accepted",
  "groupId": "g123456789",
  "groupName": "My Group",
  "newMemberId": "u987654321",
  "newMemberName": "Jane Smith",
  "ownerId": "u123456789"
}
```

### Post Notifications
```json
{
  "type": "group_post" | "friends_post" | "friend_post",
  "postId": "p123456789",
  "userId": "u123456789",
  "userFullName": "John Doe",
  "groupIds": ["g123456789"], // Only for group_post
  "targetFriendId": "u987654321" // Only for friend_post
}
```

## 🔔 Notification Permissions

### Request Permissions Gracefully

```tsx
async function requestNotificationPermissions() {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  
  if (existingStatus === 'granted') {
    return true;
  }
  
  // Show explanation before requesting
  Alert.alert(
    'Enable Notifications',
    'Get notified about friend requests, group invitations, and new posts from your friends.',
    [
      { text: 'Not Now', style: 'cancel' },
      {
        text: 'Enable',
        onPress: async () => {
          const { status } = await Notifications.requestPermissionsAsync();
          return status === 'granted';
        }
      }
    ]
  );
}
```

## 🛠️ Advanced Features

### Badge Management

```tsx
useEffect(() => {
  // Clear badge when app opens
  Notifications.setBadgeCountAsync(0);
}, []);

// Update badge count based on unread notifications
async function updateBadgeCount() {
  try {
    const response = await fetch(`${API_URL}/api/notifications/${userId}?unreadOnly=true`);
    const result = await response.json();
    
    if (result.success) {
      await Notifications.setBadgeCountAsync(result.data.length);
    }
  } catch (error) {
    console.error('Error updating badge count:', error);
  }
}
```

## 🔍 Testing

### Local Testing

1. Use Expo's push notification tool: https://expo.dev/notifications
2. Test with your development build on a physical device
3. Test different notification types and data payloads

## 🚀 Deployment Requirements

### Development Build Requirements

#### iOS Development Build
```bash
# 1. Ensure you have proper credentials
eas credentials:configure -p ios

# 2. Build development version
eas build --profile development --platform ios

# 3. Install on physical device
# Download .ipa from build page and install via Xcode or TestFlight
```

#### Android Development Build  
```bash
# 1. Configure FCM credentials
eas credentials:configure -p android

# 2. Build development APK
eas build --profile development --platform android

# 3. Install APK on physical device
adb install your-app.apk
```

### Production Build Requirements

#### iOS Production
1. **Apple Developer Account** (paid)
2. **Production APNs certificate** or **APNs key**
3. **App Store Connect** app configuration
4. **Bundle ID** matching your certificates

```bash
# Build for App Store
eas build --profile production --platform ios

# Submit to App Store (optional)
eas submit --platform ios
```

#### Android Production
1. **Firebase project** with **FCMv1** enabled
2. **Google Service Account** key (JSON)
3. **Play Console** app configuration  
4. **Package name** matching Firebase config

```bash
# Build production AAB
eas build --profile production --platform android

# Submit to Play Store (optional) 
eas submit --platform android
```

### Testing Strategy

#### Local Testing (Development)
1. Use development build on physical device
2. Test with Expo's push notification tool: https://expo.dev/notifications
3. Verify token registration with backend
4. Test all notification types and handling

#### Staging Testing
1. Create preview build with production-like credentials
2. Test full notification flow end-to-end
3. Verify deep linking and navigation
4. Test on multiple devices and OS versions

#### Production Testing
1. Use TestFlight (iOS) or Internal Testing (Android)
2. Test with real users before full release
3. Monitor notification delivery rates
4. Verify badge counts and cleanup

## 🛠️ Platform-Specific Configuration

### iOS Specific Setup

#### Notification Icon Requirements
- **96x96 pixels**
- **All white with transparency**
- **PNG format**
- **No gradients or colors**

#### iOS Capabilities
Ensure these are enabled in your app:
```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "UIBackgroundModes": ["remote-notification"]
      }
    }
  }
}
```

#### iOS 18+ Features
```json
{
  "expo": {
    "ios": {
      "icon": {
        "image": "./assets/icon.png",
        "tintedIcon": "./assets/tinted-icon.png"
      }
    }
  }
}
```

### Android Specific Setup

#### Android 13+ Permissions
```json
{
  "expo": {
    "android": {
      "permissions": [
        "android.permission.POST_NOTIFICATIONS"
      ]
    }
  }
}
```

#### FCM Configuration
Ensure `google-services.json` is in project root:
```json
{
  "expo": {
    "android": {
      "googleServicesFile": "./google-services.json"
    }
  }
}
```

#### Edge-to-Edge Support (Android 15+)
```bash
npm install react-native-edge-to-edge
```

```json
{
  "expo": {
    "plugins": [
      "react-native-edge-to-edge"
    ]
  }
}
```

## ⚠️ Important Limitations & Considerations

### Expo Go Limitations
- **No custom notification configuration**
- **Limited to Expo's default channels**
- **Cannot test production notification flow**
- **Use development builds for full testing**

### Development vs Production Differences
- **Different APNs endpoints** (sandbox vs production)
- **Different FCM configurations**
- **Token format may differ**
- **Always test production builds before release**

### Performance Considerations
- **Token registration** should happen early but not block UI
- **Handle token updates** gracefully
- **Implement proper error handling** for network failures
- **Cache tokens locally** but sync with backend regularly

### Privacy & Security
- **Never log tokens** in production
- **Implement proper token rotation**
- **Validate tokens server-side**
- **Follow platform privacy guidelines**

## 🚨 Error Handling

### Common Issues and Solutions

### Troubleshooting Guide

#### 1. **Invalid Token Format**
```
Error: Invalid Expo push token format
```
**Solution:**
- Ensure using Expo push tokens (start with `ExponentPushToken[`)
- Don't use device-specific tokens (FCM/APNs) directly  
- Verify project ID configuration

#### 2. **Project ID Not Found**
```
Error: Project ID not found
```
**Solution:**
```json
{
  "expo": {
    "extra": {
      "eas": {
        "projectId": "your-uuid-here"
      }
    }
  }
}
```

#### 3. **Physical Device Required**
```
Error: Must use physical device for Push Notifications
```
**Solution:**
- Use real iOS/Android device
- Simulators/emulators don't support push notifications
- Use development build for testing

#### 4. **Permission Denied**
```
Error: Notification permission not granted
```
**Solution:**
```tsx
// Check permission status
const { status } = await Notifications.getPermissionsAsync();
if (status !== 'granted') {
  // Request with specific permissions
  await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });
}
```

#### 5. **Credentials Not Configured**
```
Error: No matching credential found
```
**Solution:**
```bash
# For EAS builds
eas credentials:configure -p ios
eas credentials:configure -p android

# For local builds - ensure certificates are properly configured
```

#### 6. **FCM Service Unavailable**
```
Error: FCM service not available
```
**Solution:**
- Verify Firebase project setup
- Check `google-services.json` file
- Ensure FCM v1 API is enabled
- Verify service account permissions

#### 7. **New Architecture Compatibility**
```
Error: TurboModule not found
```
**Solution:**
```json
{
  "expo": {
    "plugins": [
      [
        "expo-build-properties",
        {
          "ios": {
            "newArchEnabled": true
          },
          "android": {
            "newArchEnabled": true
          }
        }
      ]
    ]
  }
}
```

#### 8. **Android Channel Not Set**
```
Warning: No notification channel specified
```
**Solution:**
```tsx
// Set channel before requesting permissions
if (Platform.OS === 'android') {
  await Notifications.setNotificationChannelAsync('default', {
    name: 'default',
    importance: Notifications.AndroidImportance.MAX,
  });
}
```

## 🚨 Frontend Developer Troubleshooting

### Quick Diagnostic Checklist

Run through this checklist if notifications aren't working:

#### ✅ **Basic Setup**
- [ ] Running on **physical device** (not simulator/emulator)
- [ ] All dependencies installed: `expo-notifications`, `expo-device`, `expo-constants`
- [ ] Project ID configured in `app.json` under `expo.extra.eas.projectId`
- [ ] Backend URL configured correctly in `CONFIG.API_URL`

#### ✅ **Permissions**
- [ ] App shows permission request dialog
- [ ] Permission granted (check device Settings > Notifications > Your App)
- [ ] No error in console about permission denied

#### ✅ **Token Generation**
- [ ] Console shows "🔔 Starting push notification registration..."
- [ ] Console shows "✅ Successfully obtained Expo push token"
- [ ] Token starts with "ExponentPushToken["

#### ✅ **Backend Registration**
- [ ] Console shows "📤 Registering token with backend..."
- [ ] Console shows "✅ Push token registered successfully with backend"
- [ ] No HTTP errors (404, 500, etc.)

#### ✅ **User Authentication**
- [ ] `getCurrentUserId()` returns valid user ID
- [ ] User is logged in when token registration happens

### Common Frontend Issues

#### 🔧 **Issue 1: "Must use physical device"**
**Problem:** Running on simulator/emulator
**Solution:** 
```bash
# iOS
npx expo run:ios --device

# Android  
npx expo run:android --device
```

#### 🔧 **Issue 2: Token registration fails with network error**
**Problem:** Backend URL wrong or backend not running
**Debug steps:**
```tsx
// Test your backend URL manually
const testBackend = async () => {
  try {
    const response = await fetch(`${CONFIG.API_URL}/health`);
    console.log('Backend status:', response.status);
  } catch (error) {
    console.log('Backend unreachable:', error.message);
  }
};
```

#### 🔧 **Issue 3: getCurrentUserId() returns null**
**Problem:** User authentication not set up
**Quick fix for testing:**
```tsx
// Temporary fix for testing - replace with real auth
async function getCurrentUserId() {
  if (__DEV__) {
    return 'utest123456789'; // Test user from backend
  }
  // Add your real auth logic here
  return null;
}
```

#### 🔧 **Issue 4: Project ID not found**
**Problem:** Missing configuration in app.json
**Solution:**
```json
{
  "expo": {
    "extra": {
      "eas": {
        "projectId": "your-project-id-here"
      }
    }
  }
}
```

#### 🔧 **Issue 5: Notifications not appearing**
**Debug steps:**
1. Check device notification settings
2. Test with Expo's push tool: https://expo.dev/notifications
3. Verify backend is sending notifications:
   ```bash
   # Create test post via curl
   curl -X POST http://localhost:3000/api/posts \
     -H "Content-Type: application/json" \
     -d '{"rawText": "Test notification", "userId": "utestfriend1", "audienceType": "friends", "generate": true}'
   ```

### Development vs Production Differences

#### 🔧 **Development Setup**
```tsx
// Use local backend
const CONFIG = {
  API_URL: 'http://localhost:3000',  // Your local server
};

// Use test user for development
async function getCurrentUserId() {
  if (__DEV__) {
    return 'utest123456789';
  }
  // Production logic here
}
```

#### 🔧 **Production Setup**
```tsx
// Use production backend
const CONFIG = {
  API_URL: 'https://your-production-url.com',
};

// Use real authentication
async function getCurrentUserId() {
  const user = await getCurrentUser(); // Your auth system
  return user?.id;
}
```

### Testing Your Implementation

#### 📱 **Step-by-Step Test**

1. **Install and run app:**
   ```bash
   npx expo install
   npx expo run:ios --device  # or android
   ```

2. **Check console output - should see:**
   ```
   🔔 Starting push notification registration...
   📋 Current permission status: undetermined
   🙋 Requesting notification permissions...
   ✅ Notification permissions granted
   🆔 Using project ID: your-project-id
   🎫 Getting Expo push token...
   ✅ Successfully obtained Expo push token
   📤 Registering token with backend...
   ✅ Push token registered successfully with backend
   ```

3. **Test notification reception:**
   ```bash
   # In another terminal, create test post
   curl -X POST http://localhost:3000/api/posts \
     -H "Content-Type: application/json" \
     -d '{
       "rawText": "Testing notifications from backend!",
       "userId": "utestfriend1", 
       "audienceType": "friends",
       "generate": true
     }'
   ```

4. **Expected result:**
   - Push notification appears on device
   - Tapping notification opens app and navigates correctly
   - Console shows navigation logs

### 📞 Getting Help

If you're still having issues:

1. **Check console logs** - most issues show up here
2. **Verify backend is working** - test with curl/Postman
3. **Test with Expo's push tool** - https://expo.dev/notifications
4. **Check device settings** - ensure notifications enabled
5. **Try on different device** - rule out device-specific issues

### 🎯 Final Integration Checklist

Before considering notifications "done":

- [ ] **Physical device testing** - iOS and Android
- [ ] **Permission handling** - graceful request and denial
- [ ] **Token registration** - automatic on app launch
- [ ] **Foreground notifications** - app handles them properly  
- [ ] **Background notifications** - navigation works when tapped
- [ ] **Error handling** - network issues, permission denial
- [ ] **Production config** - real backend URL, auth system
- [ ] **User experience** - clear messaging, no crashes

## 📊 SDK Compatibility Matrix

### Expo SDK 52+ (Latest - Recommended)
- **React Native**: 0.76+
- **New Architecture**: Enabled by default
- **iOS Minimum**: 15.1
- **Android Minimum**: API 24
- **Node.js**: 20+

#### Features:
- ✅ Full notification support
- ✅ Background tasks improvements  
- ✅ New Architecture compatibility
- ✅ Latest security updates

### Expo SDK 51 (Supported)
- **React Native**: 0.74
- **New Architecture**: Available (opt-in)
- **iOS Minimum**: 13.4  
- **Android Minimum**: API 23

#### Migration Notes:
- Update to SDK 52 recommended
- New Architecture opt-in available
- Some newer features not available

### Expo SDK 50 and Below (Deprecated)
- ⚠️ **Not recommended for new projects**
- Limited notification features
- Security vulnerabilities
- No New Architecture support

## 🔄 Backend Integration Checklist

### Server Requirements
✅ **Expo Server SDK**: Latest version  
✅ **Rate Limiting**: 600 req/sec max (Expo limit)  
✅ **Receipt Checking**: Implemented for delivery confirmation  
✅ **Error Handling**: Proper error responses and retries  
✅ **Token Validation**: Server-side token format verification  

### API Endpoints Required
```bash
# Token registration
POST /api/users/{userId}/push-token
Content-Type: application/json
{
  "expoPushToken": "ExponentPushToken[...]"
}

# Token removal (logout)
DELETE /api/users/{userId}/push-token

# Send notification (server-side only)  
POST /internal/notifications/send
```

### Database Schema
Ensure your backend has:
```sql
-- User tokens table
CREATE TABLE user_push_tokens (
  user_id VARCHAR(255) PRIMARY KEY,
  expo_push_token VARCHAR(255) NOT NULL,
  device_type VARCHAR(10),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notification receipts (for tracking)
CREATE TABLE notification_receipts (
  id VARCHAR(255) PRIMARY KEY,
  expo_ticket_id VARCHAR(255),
  user_id VARCHAR(255),
  status VARCHAR(50),
  checked_at TIMESTAMP
);
```

## 🏁 Final Deployment Checklist

### Pre-Release Testing
- [ ] Test on physical iOS device (development build)
- [ ] Test on physical Android device (development build)  
- [ ] Verify all notification types work correctly
- [ ] Test notification tapping and deep linking
- [ ] Verify badge count updates
- [ ] Test token registration and updates
- [ ] Verify notifications work when app is closed/backgrounded

### Production Deployment
- [ ] Configure production APNs certificates (iOS)
- [ ] Configure production FCM credentials (Android)
- [ ] Test with TestFlight build (iOS)
- [ ] Test with Play Console internal testing (Android)
- [ ] Monitor notification delivery rates
- [ ] Set up error monitoring and alerts
- [ ] Verify GDPR/privacy compliance

### Post-Release Monitoring  
- [ ] Monitor notification delivery success rates
- [ ] Track token registration rates
- [ ] Monitor for notification-related crashes
- [ ] Collect user feedback on notification experience
- [ ] Monitor background task execution rates

---

## 💡 Pro Tips

1. **Always test on physical devices** - simulators don't support push notifications
2. **Use development builds** for testing - more accurate than Expo Go
3. **Monitor delivery rates** - Expo provides receipt checking for this
4. **Handle token updates** - tokens can change and must be re-registered
5. **Implement graceful degradation** - app should work without notifications
6. **Test edge cases** - app closed, background, low memory situations
7. **Follow platform guidelines** - iOS and Android have specific requirements

## 🆘 Getting Help

- **Expo Documentation**: https://docs.expo.dev/push-notifications/
- **Expo Discord**: https://chat.expo.dev/
- **React Native Notifications**: https://github.com/wix/react-native-notifications
- **Firebase FCM**: https://firebase.google.com/docs/cloud-messaging
- **Apple Push Notifications**: https://developer.apple.com/documentation/usernotifications

Remember: Push notifications are complex and platform-specific. Always test thoroughly on real devices with production-like configurations before releasing to users.

---

**Last Updated**: January 2025 (Expo SDK 52+)
   ```tsx
   // Always validate token before using
   if (Expo.isExpoPushToken(token)) {
     await registerTokenWithBackend(token);
   } else {
     console.error('Invalid push token format');
   }
   ```

2. **Permission Denied**
   ```tsx
   if (status !== 'granted') {
     // Show settings prompt
     Alert.alert(
       'Notifications Disabled',
       'Please enable notifications in Settings to receive updates.',
       [
         { text: 'Cancel' },
         { text: 'Settings', onPress: () => Linking.openSettings() }
       ]
     );
   }
   ```

## 🚀 Production Checklist

- [ ] Notification permissions requested with explanation
- [ ] Android notification channels configured
- [ ] Deep link handling implemented
- [ ] Badge count management
- [ ] Error handling for network failures
- [ ] Testing completed on physical devices
- [ ] User notification preferences implemented

This guide provides everything needed to integrate with the improved Friendlines notification system. The backend now handles receipt checking, rate limiting, and proper error management following Expo's best practices. 