import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { notificationService } from './api';

// Configure how notifications are handled when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationData {
  type: 'new_post' | 'group_post';
  postId: string;
  userId: string;
  userFullName: string;
  timestamp: string;
  groupIds?: string[];
}

export class NotificationManager {
  private static instance: NotificationManager;
  private notificationListener?: Notifications.Subscription;
  private responseListener?: Notifications.Subscription;

  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  async requestPermissions(): Promise<boolean> {
    if (!Device.isDevice) {
      console.log('Must use physical device for Push Notifications');
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return false;
    }

    return true;
  }

  async registerForPushNotifications(userId: string): Promise<string | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return null;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: 'e6050802-af07-44f2-b6ab-2e1bf3f789d2', // This should match the projectId in app.json
      });

      const expoPushToken = tokenData.data;
      
      // Register with backend
      await notificationService.registerPushToken(userId, expoPushToken);
      
      console.log('Push token registered successfully');
      return expoPushToken;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }

  setupNotificationListeners(
    onNotificationReceived?: (notification: Notifications.Notification) => void,
    onNotificationResponse?: (response: Notifications.NotificationResponse) => void
  ) {
    // Listen for notifications that are received while the app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received:', notification);
        onNotificationReceived?.(notification);
      }
    );

    // Listen for user responses to notifications
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('Notification response:', response);
        onNotificationResponse?.(response);
      }
    );
  }

  removeNotificationListeners() {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
  }

  // Handle navigation based on notification data
  handleNotificationNavigation(data: NotificationData, navigation: any) {
    switch (data.type) {
      case 'new_post':
      case 'group_post':
        // Navigate to the specific post or home feed
        navigation.navigate('index'); // Adjust based on your navigation structure
        break;
      default:
        console.log('Unknown notification type:', data.type);
    }
  }
}

export default NotificationManager; 