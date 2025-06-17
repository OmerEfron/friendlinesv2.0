import {
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import "react-native-reanimated";
import "../global.css";
import { Platform } from "react-native";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { GroupsProvider } from "../context/GroupsContext";
import NotificationManager from "../services/notificationService";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function InitialLayout() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return; // Wait until loading is complete

    const inAuthGroup = segments[0] === "auth";

    if (!user && !inAuthGroup) {
      router.replace("/auth");
    } else if (user && inAuthGroup) {
      router.replace("/");
    }
  }, [user, segments, isLoading]);

  // Set up notifications when user is logged in
  useEffect(() => {
    if (user) {
      const notificationManager = NotificationManager.getInstance();
      
      // Register for push notifications
      notificationManager.registerForPushNotifications(user.id);
      
      // Set up notification listeners
      notificationManager.setupNotificationListeners(
        (notification) => {
          // Handle foreground notifications
          console.log('Received notification while app is open:', notification);
        },
        (response) => {
          // Handle notification tap
          const data = response.notification.request.content.data as any;
          if (data && data.type) {
            notificationManager.handleNotificationNavigation(data, router);
          }
        }
      );

      return () => {
        notificationManager.removeNotificationListeners();
      };
    }
  }, [user, router]);

  if (isLoading) {
    return null; // Or a loading spinner
  }

  return (
    <Stack
      screenOptions={({ route }) => ({
        headerShown: false,
      })}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="create-post" />
      <Stack.Screen name="profile/[id]" />
      <Stack.Screen name="auth" />
      <Stack.Screen name="groups" />
      <Stack.Screen name="create-group" />
      <Stack.Screen name="group/[id]" />
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    if (process.env.EXPO_PUBLIC_TEMPO && Platform.OS === "web") {
      const { TempoDevtools } = require("tempo-devtools");
      TempoDevtools.init();
    }
  }, []);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AuthProvider>
      <GroupsProvider>
        <ThemeProvider value={DefaultTheme}>
          <InitialLayout />
          <StatusBar style="auto" />
        </ThemeProvider>
      </GroupsProvider>
    </AuthProvider>
  );
}
