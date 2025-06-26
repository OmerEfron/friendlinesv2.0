# Friendlines v2.0 - Frontend Notification Integration Guide

## Overview

This guide provides step-by-step instructions for integrating push notifications into your Expo + React Native frontend app to work with the Friendlines v2.0 backend notification system.

## Prerequisites

- Expo SDK 49+ (for push notification support)
- React Native 0.72+
- Physical device for testing (push notifications don't work on simulators/emulators)
- Friendlines v2.0 backend running and accessible

## Installation

### 1. Install Required Dependencies

```bash
npx expo install expo-notifications expo-device expo-constants
```

### 2. Configure App.json

Add the following configuration to your `app.json`:

```json
{
  "expo": {
    "name": "Friendlines",
    "slug": "friendlines-app",
    "version": "1.0.0",
    "platforms": ["ios", "android"],
    "notification": {
      "icon": "./assets/notification-icon.png",
      "color": "#000000",
      "iosDisplayInForeground": true,
      "androidMode": "default",
      "androidCollapsedTitle": "New Notification"
    },
    "ios": {
      "bundleIdentifier": "com.yourcompany.friendlines",
      "infoPlist": {
        "UIBackgroundModes": ["remote-notification"]
      }
    },
    "android": {
      "package": "com.yourcompany.friendlines",
      "googleServicesFile": "./google-services.json"
    }
  }
}
```

## Implementation

### 1. Create Notification Service

Create `services/notificationService.ts`:

```typescript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface NotificationData {
  type: string;
  postId?: string;
  userId?: string;
  userFullName?: string;
  groupId?: string;
  groupName?: string;
  inviterId?: string;
  inviterName?: string;
  requesterId?: string;
  requesterName?: string;
  accepterId?: string;
  accepterName?: string;
  timestamp: string;
}

export class NotificationService {
  private static instance: NotificationService;
  private expoPushToken: string | null = null;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async registerForPushNotifications(): Promise<string | null> {
    let token: string | null = null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return null;
      }
      
      token = (await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      })).data;
    } else {
      console.log('Must use physical device for Push Notifications');
    }

    this.expoPushToken = token;
    return token;
  }

  async registerTokenWithBackend(userId: string, token: string): Promise<boolean> {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/users/${userId}/push-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          expoPushToken: token,
        }),
      });

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('Failed to register push token with backend:', error);
      return false;
    }
  }

  async setupNotificationListeners(
    onNotificationReceived: (notification: Notifications.Notification) => void,
    onNotificationResponse: (response: Notifications.NotificationResponse) => void
  ): Promise<() => void> {
    const notificationListener = Notifications.addNotificationReceivedListener(onNotificationReceived);
    const responseListener = Notifications.addNotificationResponseReceivedListener(onNotificationResponse);

    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
    };
  }

  getExpoPushToken(): string | null {
    return this.expoPushToken;
  }
}

export default NotificationService.getInstance();
```

### 2. Create Notification Context

Create `context/NotificationContext.tsx`:

```typescript
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import notificationService, { NotificationData } from '../services/notificationService';

interface NotificationContextType {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
  registerForNotifications: (userId: string) => Promise<boolean>;
  clearNotification: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();
  const router = useRouter();

  const handleNotificationReceived = (notification: Notifications.Notification) => {
    setNotification(notification);
    console.log('Notification received:', notification);
  };

  const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
    const data = response.notification.request.content.data as NotificationData;
    console.log('Notification response:', response);

    // Handle different notification types
    switch (data.type) {
      case 'new_post':
      case 'group_post':
      case 'friends_post':
      case 'friend_post':
        if (data.postId) {
          router.push(`/post/${data.postId}`);
        }
        break;
      
      case 'group_invitation':
        if (data.groupId) {
          router.push(`/group/${data.groupId}`);
        }
        break;
      
      case 'group_invitation_accepted':
        if (data.groupId) {
          router.push(`/group/${data.groupId}`);
        }
        break;
      
      case 'friend_request':
        router.push('/friends/requests');
        break;
      
      case 'friend_request_accepted':
        router.push('/friends');
        break;
      
      default:
        console.log('Unknown notification type:', data.type);
    }
  };

  const registerForNotifications = async (userId: string): Promise<boolean> => {
    try {
      const token = await notificationService.registerForPushNotifications();
      if (token) {
        setExpoPushToken(token);
        const success = await notificationService.registerTokenWithBackend(userId, token);
        return success;
      }
      return false;
    } catch (error) {
      console.error('Failed to register for notifications:', error);
      return false;
    }
  };

  const clearNotification = () => {
    setNotification(null);
  };

  useEffect(() => {
    const setupListeners = async () => {
      const cleanup = await notificationService.setupNotificationListeners(
        handleNotificationReceived,
        handleNotificationResponse
      );

      return cleanup;
    };

    setupListeners().then(cleanup => {
      return () => {
        if (cleanup) cleanup();
      };
    });
  }, []);

  const value: NotificationContextType = {
    expoPushToken,
    notification,
    registerForNotifications,
    clearNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
```

### 3. Create Notification Components

Create `components/NotificationBanner.tsx`:

```typescript
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useNotifications } from '../context/NotificationContext';
import { NotificationData } from '../services/notificationService';

const NotificationBanner: React.FC = () => {
  const { notification, clearNotification } = useNotifications();
  const translateY = React.useRef(new Animated.Value(-100)).current;

  React.useEffect(() => {
    if (notification) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
      }).start();

      // Auto-hide after 5 seconds
      const timer = setTimeout(() => {
        hideNotification();
      }, 5000);

      return () => clearTimeout(timer);
    } else {
      hideNotification();
    }
  }, [notification]);

  const hideNotification = () => {
    Animated.spring(translateY, {
      toValue: -100,
      useNativeDriver: true,
    }).start(() => {
      clearNotification();
    });
  };

  if (!notification) return null;

  const data = notification.request.content.data as NotificationData;
  const title = notification.request.content.title || 'New Notification';
  const body = notification.request.content.body || '';

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY }] }]}>
      <TouchableOpacity style={styles.banner} onPress={hideNotification}>
        <View style={styles.content}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body} numberOfLines={2}>
            {body}
          </Text>
        </View>
        <TouchableOpacity style={styles.closeButton} onPress={hideNotification}>
          <Text style={styles.closeText}>×</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  banner: {
    backgroundColor: '#007AFF',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  content: {
    flex: 1,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  body: {
    color: '#FFFFFF',
    fontSize: 14,
    opacity: 0.9,
  },
  closeButton: {
    marginLeft: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default NotificationBanner;
```

### 4. Update App Root

Update your `app/_layout.tsx` or main App component:

```typescript
import React from 'react';
import { NotificationProvider } from '../context/NotificationContext';
import NotificationBanner from '../components/NotificationBanner';

export default function RootLayout() {
  return (
    <NotificationProvider>
      {/* Your existing app structure */}
      <NotificationBanner />
    </NotificationProvider>
  );
}
```

### 5. Integrate with Authentication

Update your login/authentication flow to register for notifications:

```typescript
import { useNotifications } from '../context/NotificationContext';

const LoginScreen: React.FC = () => {
  const { registerForNotifications } = useNotifications();

  const handleLogin = async (userData: any) => {
    try {
      // Your existing login logic
      const loginResult = await loginUser(userData);
      
      if (loginResult.success) {
        // Register for push notifications after successful login
        const notificationSuccess = await registerForNotifications(loginResult.user.id);
        
        if (notificationSuccess) {
          console.log('Successfully registered for push notifications');
        } else {
          console.log('Failed to register for push notifications');
        }
        
        // Navigate to main app
        router.replace('/home');
      }
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  // ... rest of your component
};
```

## Environment Configuration

### 1. Create Environment File

Create `.env`:

```env
EXPO_PUBLIC_API_URL=http://localhost:3000
```

### 2. Update App Config

Update `app.config.js`:

```javascript
export default {
  expo: {
    name: 'Friendlines',
    slug: 'friendlines-app',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff'
    },
    assetBundlePatterns: [
      '**/*'
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.yourcompany.friendlines'
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#FFFFFF'
      },
      package: 'com.yourcompany.friendlines'
    },
    extra: {
      eas: {
        projectId: 'your-project-id'
      }
    },
    plugins: [
      [
        'expo-notifications',
        {
          icon: './assets/notification-icon.png',
          color: '#ffffff'
        }
      ]
    ]
  }
};
```

## Testing

### 1. Test Notification Registration

```typescript
// In your app, check if token is registered
const { expoPushToken } = useNotifications();
console.log('Push Token:', expoPushToken);
```

### 2. Test with Backend

Use the Friendlines backend to send a test notification:

```bash
curl -X POST http://localhost:3000/api/users/{userId}/send-friend-request \
  -H "Content-Type: application/json" \
  -d '{"userId": "requester-id"}'
```

### 3. Test Different Notification Types

The app will handle these notification types automatically:

- **Post notifications**: Navigate to post detail
- **Group invitations**: Navigate to group detail
- **Friend requests**: Navigate to friends/requests screen
- **Friend request acceptance**: Navigate to friends screen

## Troubleshooting

### Common Issues

1. **Notifications not working on simulator/emulator**
   - Use a physical device for testing
   - Push notifications require real device tokens

2. **Token registration fails**
   - Check backend URL in environment variables
   - Verify user authentication
   - Check network connectivity

3. **Notifications not showing**
   - Verify notification permissions are granted
   - Check notification channel configuration (Android)
   - Ensure app is not in foreground with custom handler

4. **Deep linking not working**
   - Verify router configuration
   - Check notification data structure
   - Ensure proper navigation setup

### Debug Commands

```typescript
// Check notification permissions
const { status } = await Notifications.getPermissionsAsync();
console.log('Permission status:', status);

// Check notification settings
const settings = await Notifications.getPermissionsAsync();
console.log('Notification settings:', settings);

// Test local notification
await Notifications.scheduleNotificationAsync({
  content: {
    title: 'Test Notification',
    body: 'This is a test notification',
    data: { type: 'test' },
  },
  trigger: { seconds: 2 },
});
```

## Best Practices

1. **Always test on physical devices**
2. **Handle notification permissions gracefully**
3. **Provide fallback navigation for unknown notification types**
4. **Log notification events for debugging**
5. **Use proper error handling for token registration**
6. **Consider notification sound and vibration preferences**
7. **Implement notification history/storage if needed**

## Next Steps

1. **Customize notification appearance** for your app's branding
2. **Add notification preferences** (sound, vibration, etc.)
3. **Implement notification history** screen
4. **Add notification badges** for unread counts
5. **Consider background notification handling** for data updates

This integration provides a complete push notification system that works seamlessly with the Friendlines v2.0 backend, handling all notification types and providing proper navigation based on notification content. 