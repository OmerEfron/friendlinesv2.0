import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { ArrowLeft, Plus, Users, Clock, Crown } from "lucide-react-native";
import { useGroups } from "../context/GroupsContext";
import { useAuth } from "../context/AuthContext";
import { Group } from "../services/api";

export default function GroupsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { userGroups, isLoading, refreshGroups, acceptInvitation, leaveGroup } =
    useGroups();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshGroups();
    setRefreshing(false);
  };

  const handleAcceptInvitation = async (groupId: string, groupName: string) => {
    const success = await acceptInvitation(groupId);
    if (success) {
      Alert.alert("Success", `Joined ${groupName} successfully!`);
    } else {
      Alert.alert("Error", "Failed to join group. Please try again.");
    }
  };

  const handleLeaveGroup = async (groupId: string, groupName: string) => {
    Alert.alert(
      "Leave Group",
      `Are you sure you want to leave ${groupName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            const success = await leaveGroup(groupId);
            if (success) {
              Alert.alert("Left", `Left ${groupName} successfully.`);
            } else {
              Alert.alert("Error", "Failed to leave group. Please try again.");
            }
          },
        },
      ]
    );
  };

  const GroupCard = ({ group, type }: { group: Group; type: string }) => (
    <TouchableOpacity
      className="bg-white rounded-lg p-4 mb-3 border border-gray-200"
      onPress={() => router.push(`/group/${group.id}` as any)}
    >
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-lg font-bold text-gray-900 flex-1">
          {group.name}
        </Text>
        {type === "owned" && <Crown size={20} color="#f59e0b" />}
        {type === "invited" && <Clock size={20} color="#3b82f6" />}
      </View>

      {group.description && (
        <Text className="text-gray-600 mb-2">{group.description}</Text>
      )}

      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <Users size={16} color="#6b7280" />
          <Text className="text-gray-600 ml-1">
            {group.memberCount || group.members?.length || 0} members
          </Text>
        </View>

        {type === "invited" && (
          <TouchableOpacity
            className="bg-blue-500 px-3 py-1 rounded-full"
            onPress={() => handleAcceptInvitation(group.id, group.name)}
          >
            <Text className="text-white text-sm font-medium">Accept</Text>
          </TouchableOpacity>
        )}

        {(type === "member" || type === "owned") && (
          <TouchableOpacity
            className="bg-gray-100 px-3 py-1 rounded-full"
            onPress={() =>
              type === "member"
                ? handleLeaveGroup(group.id, group.name)
                : router.push(`/group/${group.id}` as any)
            }
          >
            <Text className="text-gray-700 text-sm font-medium">
              {type === "member" ? "Leave" : "Manage"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  const GroupSection = ({ title, groups, type }: { 
    title: string; 
    groups: Group[]; 
    type: string;
  }) => {
    if (groups.length === 0) return null;

    return (
      <View className="mb-6">
        <Text className="text-xl font-bold text-gray-900 mb-3">{title}</Text>
        {groups.map((group) => (
          <GroupCard key={group.id} group={group} type={type} />
        ))}
      </View>
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="bg-white p-4 border-b border-gray-200">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={() => router.back()} className="p-2">
            <ArrowLeft size={24} color="#000" />
          </TouchableOpacity>

          <Text className="text-lg font-bold">My Groups</Text>

          <TouchableOpacity
            onPress={() => router.push("/create-group" as any)}
            className="p-2"
          >
            <Plus size={24} color="#3b82f6" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        className="flex-1 p-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {isLoading && !userGroups ? (
          <View className="flex-1 justify-center items-center py-20">
            <Text className="text-gray-600">Loading groups...</Text>
          </View>
        ) : !userGroups || 
          (userGroups.owned.length === 0 && 
           userGroups.member.length === 0 && 
           userGroups.invited.length === 0) ? (
          <View className="flex-1 justify-center items-center py-20">
            <Users size={64} color="#d1d5db" />
            <Text className="text-xl font-bold text-gray-600 mt-4 mb-2">
              No Groups Yet
            </Text>
            <Text className="text-gray-500 text-center mb-6">
              Create your first group or wait for invitations
            </Text>
            <TouchableOpacity
              className="bg-blue-500 px-6 py-3 rounded-full"
              onPress={() => router.push("/create-group" as any)}
            >
              <Text className="text-white font-bold">Create Group</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <GroupSection
              title="Invitations"
              groups={userGroups.invited}
              type="invited"
            />
            <GroupSection
              title="Groups I Own"
              groups={userGroups.owned}
              type="owned"
            />
            <GroupSection
              title="Groups I'm In"
              groups={userGroups.member}
              type="member"
            />
          </>
        )}
      </ScrollView>
    </View>
  );
} 