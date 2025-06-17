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
import { X, Check } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useGroups } from "../context/GroupsContext";

export default function CreateGroupScreen() {
  const router = useRouter();
  const { createGroup } = useGroups();
  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isValidGroupName = groupName.trim().length >= 3 && groupName.trim().length <= 50;
  const isValidDescription = description.length <= 200;
  const canSubmit = isValidGroupName && isValidDescription && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    try {
      setIsSubmitting(true);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const group = await createGroup(
        groupName.trim(),
        description.trim() || undefined
      );

      if (group) {
        Alert.alert(
          "Success",
          `Group "${group.name}" created successfully!`,
          [
            {
              text: "OK",
              onPress: () => {
                router.back();
                // Navigate to the new group
                router.push(`/group/${group.id}` as any);
              },
            },
          ]
        );
      } else {
        Alert.alert("Error", "Failed to create group. Please try again.");
      }
    } catch (error) {
      console.error("Error creating group:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", "Failed to create group. Please try again.");
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

        <Text className="text-lg font-bold">Create Group</Text>

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!canSubmit}
          className={`p-2 rounded-full ${!canSubmit ? "opacity-50" : "opacity-100"}`}
        >
          <Check size={24} color="#3b82f6" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView className="flex-1 p-4">
          {/* Group Name */}
          <View className="mb-6">
            <Text className="text-lg font-bold text-gray-900 mb-2">
              Group Name *
            </Text>
            <TextInput
              className="border border-gray-300 rounded-lg p-3 text-base"
              placeholder="Enter group name"
              value={groupName}
              onChangeText={setGroupName}
              maxLength={50}
              autoFocus
            />
            <View className="flex-row justify-between mt-1">
              <Text className={`text-sm ${!isValidGroupName && groupName.length > 0 ? "text-red-500" : "text-gray-500"}`}>
                {groupName.length < 3 && groupName.length > 0
                  ? "Name must be at least 3 characters"
                  : "3-50 characters"}
              </Text>
              <Text className="text-sm text-gray-500">
                {groupName.length}/50
              </Text>
            </View>
          </View>

          {/* Description */}
          <View className="mb-6">
            <Text className="text-lg font-bold text-gray-900 mb-2">
              Description (Optional)
            </Text>
            <TextInput
              className="border border-gray-300 rounded-lg p-3 text-base"
              placeholder="What's this group about?"
              value={description}
              onChangeText={setDescription}
              maxLength={200}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <View className="flex-row justify-between mt-1">
              <Text className={`text-sm ${!isValidDescription ? "text-red-500" : "text-gray-500"}`}>
                Optional group description
              </Text>
              <Text className="text-sm text-gray-500">
                {description.length}/200
              </Text>
            </View>
          </View>

          {/* Info Card */}
          <View className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <Text className="text-blue-900 font-bold mb-2">Group Info</Text>
            <Text className="text-blue-800 text-sm leading-5">
              • You'll be the group owner and can invite others{"\n"}
              • Members can post newsflashes to the group{"\n"}
              • Only group members can see group posts{"\n"}
              • You can manage members and group settings
            </Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!canSubmit}
            className={`p-4 rounded-lg ${
              canSubmit
                ? "bg-blue-500"
                : "bg-gray-300"
            }`}
          >
            <Text
              className={`text-center font-bold ${
                canSubmit ? "text-white" : "text-gray-500"
              }`}
            >
              {isSubmitting ? "Creating..." : "Create Group"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
} 