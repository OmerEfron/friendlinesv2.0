# Expo Push Notifications Integration Guide

## Overview

This guide provides complete instructions for frontend apps (React Native with Expo) to integrate with the Friendlines v2.0 backend notification system. The backend now follows Expo's best practices including receipt checking, rate limiting, and proper error handling.

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

## 🚀 Quick Start

### 1. Install Required Dependencies

```bash
# Core notification dependencies
npx expo install expo-notifications expo-device expo-constants

# Additional dependencies for full functionality
npx expo install expo-application expo-crypto
```

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

### 5. Implementation

```tsx
import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function NotificationManager() {
  const [expoPushToken, setExpoPushToken] = useState('');
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    registerForPushNotificationsAsync().then(token => {
      if (token) {
        setExpoPushToken(token);
        // Register token with your backend
        registerTokenWithBackend(token);
      }
    });

    // Listen for notifications
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
      // Handle foreground notifications
      handleForegroundNotification(notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
      // Handle notification tap/interaction
      handleNotificationResponse(response);
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  return null; // This component doesn't render anything
}

async function registerForPushNotificationsAsync() {
  let token;

  // CRITICAL: Check if running on physical device
  if (!Device.isDevice) {
    console.warn('Push notifications require a physical device');
    return null;
  }

  // Set up Android notification channels BEFORE requesting permissions
  if (Platform.OS === 'android') {
    await setupAndroidChannels();
  }

  // Check current permission status
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  // Request permissions if not granted
  if (existingStatus !== 'granted') {
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
  
  // Handle permission denial
  if (finalStatus !== 'granted') {
    console.error('Notification permission not granted');
    return null;
  }
  
  try {
    // Get project ID - REQUIRED for Expo push tokens
    const projectId = 
      Constants?.expoConfig?.extra?.eas?.projectId ?? 
      Constants?.easConfig?.projectId ??
      process.env.EXPO_PROJECT_ID;
      
    if (!projectId) {
      throw new Error('Project ID not found. Please configure expo.extra.eas.projectId in app.json');
    }
    
    // Get Expo push token
    const pushTokenString = (
      await Notifications.getExpoPushTokenAsync({ projectId })
    ).data;
    
    console.log('Successfully obtained Expo push token:', pushTokenString);
    return pushTokenString;
    
  } catch (error) {
    console.error('Failed to get push token:', error);
    
    // Handle specific error cases
    if (error.message.includes('Project ID')) {
      console.error('Please ensure your project ID is configured in app.json');
    } else if (error.message.includes('development')) {
      console.error('Development builds require proper credential configuration');
    }
    
    return null;
  }
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

## 🔧 Backend Integration

### Register Push Token

After getting the Expo push token, register it with the backend:

```tsx
async function registerTokenWithBackend(token: string) {
  try {
    const userId = await getCurrentUserId(); // Your user management logic
    
    const response = await fetch(`${API_URL}/api/users/${userId}/push-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        expoPushToken: token
      }),
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('Push token registered successfully');
    } else {
      console.error('Failed to register push token:', result.error);
    }
  } catch (error) {
    console.error('Error registering push token:', error);
  }
}
```

### Handle Token Updates

Tokens can change, so update them when necessary:

```tsx
useEffect(() => {
  const subscription = Notifications.addPushTokenListener(token => {
    console.log('Push token updated:', token);
    registerTokenWithBackend(token.data);
  });

  return () => subscription.remove();
}, []);
```

## 🎯 Notification Handling

### Foreground Notifications

Handle notifications when the app is in the foreground:

```tsx
function handleForegroundNotification(notification) {
  const { title, body, data } = notification.request.content;
  
  // Show custom in-app notification or use the system one
  // You can customize this based on notification type
  
  switch (data.type) {
    case 'friend_request':
      showFriendRequestAlert(data);
      break;
    case 'group_invitation':
      showGroupInvitationAlert(data);
      break;
    case 'group_post':
    case 'friends_post':
    case 'friend_post':
      showPostNotification(data);
      break;
    default:
      // Show default notification
      Alert.alert(title, body);
  }
}
```

### Background/Tap Handling

Handle notification taps and navigation:

```tsx
function handleNotificationResponse(response) {
  const { data } = response.notification.request.content;
  
  // Navigate based on notification type
  switch (data.type) {
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
      navigation.navigate('GroupDetails', { groupId: data.groupId });
      break;
      
    case 'group_post':
    case 'friends_post':
    case 'friend_post':
      navigation.navigate('PostDetails', { 
        postId: data.postId,
        userId: data.userId 
      });
      break;
      
    default:
      navigation.navigate('Home');
  }
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