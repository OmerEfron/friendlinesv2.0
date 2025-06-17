import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Users, UserPlus, Settings } from "lucide-react-native";
import { groupService, GroupWithMembers } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useGroups } from "../../context/GroupsContext";

export default function GroupDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { userGroups, leaveGroup } = useGroups();
  const [group, setGroup] = useState<GroupWithMembers | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isOwner = group?.ownerId === user?.id;
  const isMember = userGroups?.owned.some(g => g.id === id) || 
                   userGroups?.member.some(g => g.id === id);

  useEffect(() => {
    const fetchGroup = async () => {
      if (!id || !user) return;

      try {
        setIsLoading(true);
        const response = await groupService.getGroup(id, user.id);
        setGroup(response.data);
      } catch (error) {
        console.error("Failed to fetch group:", error);
        Alert.alert("Error", "Failed to load group details.");
        router.back();
      } finally {
        setIsLoading(false);
      }
    };

    fetchGroup();
  }, [id, user]);

  const handleLeaveGroup = async () => {
    if (!group || !user) return;

    Alert.alert(
      "Leave Group",
      `Are you sure you want to leave ${group.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            const success = await leaveGroup(group.id);
            if (success) {
              Alert.alert("Left", `Left ${group.name} successfully.`, [
                { text: "OK", onPress: () => router.back() }
              ]);
            } else {
              Alert.alert("Error", "Failed to leave group. Please try again.");
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="mt-4 text-gray-600">Loading group...</Text>
      </View>
    );
  }

  if (!group) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <Text className="text-gray-600">Group not found</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-4 bg-blue-500 px-4 py-2 rounded-lg"
        >
          <Text className="text-white">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="bg-white p-4 border-b border-gray-200">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={() => router.back()} className="p-2">
            <ArrowLeft size={24} color="#000" />
          </TouchableOpacity>

          <Text className="text-lg font-bold">Group Details</Text>

          <View style={{ width: 40 }} />
        </View>
      </View>

      <ScrollView className="flex-1">
        {/* Group Info */}
        <View className="bg-white p-6 border-b border-gray-200">
          <View className="flex-row items-center mb-4">
            <View className="w-16 h-16 bg-blue-500 rounded-full items-center justify-center mr-4">
              <Users size={32} color="white" />
            </View>
            <View className="flex-1">
              <Text className="text-2xl font-bold text-gray-900 mb-1">
                {group.name}
              </Text>
              <Text className="text-gray-600">
                {group.memberCount || group.members.length} members
              </Text>
            </View>
          </View>

          {group.description && (
            <Text className="text-gray-700 mb-4 leading-6">
              {group.description}
            </Text>
          )}

          {/* Action Buttons */}
          <View className="flex-row space-x-3">
            {isOwner && (
              <TouchableOpacity className="flex-1 bg-blue-500 p-3 rounded-lg flex-row items-center justify-center">
                <UserPlus size={20} color="white" />
                <Text className="text-white font-bold ml-2">Invite Members</Text>
              </TouchableOpacity>
            )}

            {isMember && !isOwner && (
              <TouchableOpacity 
                onPress={handleLeaveGroup}
                className="flex-1 bg-red-500 p-3 rounded-lg flex-row items-center justify-center"
              >
                <Text className="text-white font-bold">Leave Group</Text>
              </TouchableOpacity>
            )}

            {isOwner && (
              <TouchableOpacity className="bg-gray-200 p-3 rounded-lg">
                <Settings size={20} color="#374151" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Members List */}
        <View className="bg-white mt-4">
          <View className="p-4 border-b border-gray-200">
            <Text className="text-lg font-bold text-gray-900">
              Members ({group.members.length})
            </Text>
          </View>

          {group.members.map((member, index) => (
            <View
              key={member.id}
              className={`flex-row items-center p-4 ${
                index < group.members.length - 1 ? "border-b border-gray-100" : ""
              }`}
            >
              <View className="w-10 h-10 bg-gray-300 rounded-full items-center justify-center mr-3">
                <Text className="text-gray-600 font-bold">
                  {member.fullName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="font-medium text-gray-900">
                  {member.fullName}
                  {member.id === group.ownerId && (
                    <Text className="text-blue-600 text-sm"> (Owner)</Text>
                  )}
                </Text>
                <Text className="text-sm text-gray-500">{member.email}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Group Stats */}
        <View className="bg-white mt-4 p-4">
          <Text className="text-lg font-bold text-gray-900 mb-3">
            Group Stats
          </Text>
          <View className="flex-row justify-between">
            <View className="items-center">
              <Text className="text-2xl font-bold text-blue-600">
                {group.members.length}
              </Text>
              <Text className="text-sm text-gray-600">Members</Text>
            </View>
            <View className="items-center">
              <Text className="text-2xl font-bold text-green-600">0</Text>
              <Text className="text-sm text-gray-600">Posts</Text>
            </View>
            <View className="items-center">
              <Text className="text-2xl font-bold text-purple-600">
                {new Date(group.createdAt).toLocaleDateString()}
              </Text>
              <Text className="text-sm text-gray-600">Created</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
} 