import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { X, Send } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../services/api";

const MAX_CHARACTERS = 280;

export default function CreatePostScreen() {
  const router = useRouter();
  const [postText, setPostText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const remainingCharacters = MAX_CHARACTERS - postText.length;
  const isOverLimit = remainingCharacters < 0;

  const handleSubmit = async () => {
    if (isOverLimit || !postText.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      
      // Get the current user from AsyncStorage
      const userString = await AsyncStorage.getItem('user');
      if (!userString) {
        Alert.alert('Error', 'Please log in to create a post');
        return;
      }
      
      const user = JSON.parse(userString);
      const userId = user.id;
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      await api.post("/posts", { rawText: postText, userId });

      // Navigate back to home feed
      router.back();
    } catch (error) {
      console.error("Error creating post:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to create post. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <X size={24} color="#000" />
        </TouchableOpacity>

        <Text className="text-lg font-bold">New Post</Text>

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isOverLimit || !postText.trim() || isSubmitting}
          className={`p-2 rounded-full ${isOverLimit || !postText.trim() || isSubmitting ? "opacity-50" : "opacity-100"}`}
        >
          <Send size={24} color="#3b82f6" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView className="flex-1 p-4">
          {/* Post Input */}
          <TextInput
            className="text-lg"
            placeholder="What's happening?"
            multiline
            value={postText}
            onChangeText={setPostText}
            maxLength={MAX_CHARACTERS + 10} // Allow slightly over to show error state
            autoFocus
            style={{ minHeight: 100 }}
          />

          {/* Character Counter */}
          <Text
            className={`text-right mt-2 ${isOverLimit ? "text-red-500" : "text-gray-500"}`}
          >
            {remainingCharacters}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
