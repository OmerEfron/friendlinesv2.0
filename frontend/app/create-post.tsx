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
import { X, Send, Users, ChevronDown } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { postService } from "../services/api";
import { useGroups } from "../context/GroupsContext";
import { useAuth } from "../context/AuthContext";

const MAX_CHARACTERS = 280;

export default function CreatePostScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { userGroups } = useGroups();
  const [postText, setPostText] = useState("");
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [showGroupSelector, setShowGroupSelector] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const remainingCharacters = MAX_CHARACTERS - postText.length;
  const isOverLimit = remainingCharacters < 0;

  // Get available groups (owned + member)
  const availableGroups = [
    ...(userGroups?.owned || []),
    ...(userGroups?.member || []),
  ];

  const handleSubmit = async () => {
    if (isOverLimit || !postText.trim() || isSubmitting || !user) return;

    try {
      setIsSubmitting(true);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      await postService.createPost(
        postText.trim(),
        user.id,
        selectedGroups.length > 0 ? selectedGroups : undefined
      );

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

  const toggleGroupSelection = (groupId: string) => {
    setSelectedGroups(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const getSelectedGroupNames = () => {
    return availableGroups
      .filter(group => selectedGroups.includes(group.id))
      .map(group => group.name)
      .join(", ");
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
            className={`text-right mt-2 mb-4 ${isOverLimit ? "text-red-500" : "text-gray-500"}`}
          >
            {remainingCharacters}
          </Text>

          {/* Group Selection */}
          {availableGroups.length > 0 && (
            <View className="mb-4">
              <TouchableOpacity
                className="flex-row items-center justify-between p-3 bg-gray-50 rounded-lg"
                onPress={() => setShowGroupSelector(!showGroupSelector)}
              >
                <View className="flex-row items-center">
                  <Users size={20} color="#6b7280" />
                  <Text className="text-gray-700 ml-2">
                    {selectedGroups.length > 0
                      ? `Post to ${selectedGroups.length} group${selectedGroups.length > 1 ? 's' : ''}`
                      : "Post to groups (optional)"}
                  </Text>
                </View>
                <ChevronDown
                  size={20}
                  color="#6b7280"
                  style={{
                    transform: [{ rotate: showGroupSelector ? "180deg" : "0deg" }],
                  }}
                />
              </TouchableOpacity>

              {/* Selected Groups Display */}
              {selectedGroups.length > 0 && (
                <Text className="text-sm text-blue-600 mt-1 ml-1">
                  {getSelectedGroupNames()}
                </Text>
              )}

              {/* Group Selector */}
              {showGroupSelector && (
                <View className="mt-3 bg-white border border-gray-200 rounded-lg">
                  {availableGroups.map((group) => (
                    <TouchableOpacity
                      key={group.id}
                      className={`flex-row items-center justify-between p-3 border-b border-gray-100 last:border-b-0 ${
                        selectedGroups.includes(group.id) ? "bg-blue-50" : ""
                      }`}
                      onPress={() => toggleGroupSelection(group.id)}
                    >
                      <View className="flex-1">
                        <Text className="font-medium text-gray-900">
                          {group.name}
                        </Text>
                        {group.description && (
                          <Text className="text-sm text-gray-600 mt-1">
                            {group.description}
                          </Text>
                        )}
                      </View>
                      <View className="ml-3">
                        <View
                          className={`w-5 h-5 rounded border-2 ${
                            selectedGroups.includes(group.id)
                              ? "bg-blue-500 border-blue-500"
                              : "border-gray-300"
                          }`}
                        >
                          {selectedGroups.includes(group.id) && (
                            <Text className="text-white text-xs text-center leading-4">
                              ✓
                            </Text>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                  
                  {selectedGroups.length > 0 && (
                    <View className="p-3 bg-blue-50 border-t border-blue-200">
                      <Text className="text-xs text-blue-800">
                        This post will only be visible to members of the selected groups.
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
