import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
} from "react-native";
import { Image } from "expo-image";
import { X, UserPlus, UserMinus } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

interface User {
  id: string;
  fullName: string;
  email: string;
  followersCount: number;
  followingCount: number;
}

interface FollowListModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  type: "followers" | "following";
}

const FollowListModal: React.FC<FollowListModalProps> = ({
  visible,
  onClose,
  userId,
  userName,
  type,
}) => {
  const { user } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Load users when modal opens
  useEffect(() => {
    if (visible && userId) {
      loadUsers(true);
    }
  }, [visible, userId, type]);

  const loadUsers = async (reset = false) => {
    if (isLoading) return;

    try {
      setIsLoading(true);
      const currentPage = reset ? 1 : page;
      
      const endpoint = type === "followers" ? "followers" : "following";
      const response = await api.get(`/users/${userId}/${endpoint}`, {
        params: { page: currentPage, limit: 20 }
      });

      const fetchedUsers = response.data.data[type];
      const pagination = response.data.pagination;

      if (reset) {
        setUsers(fetchedUsers);
        setPage(2);
      } else {
        setUsers(prev => [...prev, ...fetchedUsers]);
        setPage(prev => prev + 1);
      }

      setHasMore(pagination.hasNextPage);

    } catch (error) {
      console.error(`Failed to load ${type}:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserPress = (targetUserId: string) => {
    onClose();
    router.push(`/profile/${targetUserId}`);
  };

  const title = type === "followers" ? "Followers" : "Following";

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView className="flex-1 bg-white">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200">
          <Text className="text-lg font-semibold text-gray-800">
            {title}
          </Text>
          <TouchableOpacity onPress={onClose} className="p-1">
            <X size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>

        {/* Users List */}
        <ScrollView className="flex-1">
          {isLoading && users.length === 0 ? (
            <View className="flex-1 justify-center items-center py-8">
              <ActivityIndicator size="large" color="#6366f1" />
              <Text className="mt-2 text-gray-600">Loading {type.toLowerCase()}...</Text>
            </View>
          ) : users.length === 0 ? (
            <View className="flex-1 justify-center items-center py-8">
              <Text className="text-gray-500 text-center">
                No {type.toLowerCase()} yet.
              </Text>
            </View>
          ) : (
            <View className="px-4 py-2">
              {users.map((targetUser) => (
                <TouchableOpacity
                  key={targetUser.id}
                  onPress={() => handleUserPress(targetUser.id)}
                  className="flex-row items-center py-3 border-b border-gray-100"
                >
                  <Image
                    source={{
                      uri: `https://api.dicebear.com/7.x/avataaars/svg?seed=${targetUser.id}`
                    }}
                    className="w-12 h-12 rounded-full"
                    contentFit="cover"
                  />
                  <View className="ml-3 flex-1">
                    <Text className="font-semibold text-gray-800">
                      {targetUser.fullName}
                    </Text>
                    <Text className="text-sm text-gray-500">
                      @{targetUser.email.split("@")[0]}
                    </Text>
                    <Text className="text-xs text-gray-400 mt-1">
                      {targetUser.followersCount} followers • {targetUser.followingCount} following
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}

              {/* Load More Button */}
              {hasMore && !isLoading && (
                <TouchableOpacity
                  onPress={() => loadUsers(false)}
                  className="py-4 items-center"
                >
                  <Text className="text-indigo-600 font-medium">Load more</Text>
                </TouchableOpacity>
              )}

              {isLoading && users.length > 0 && (
                <View className="py-4 items-center">
                  <ActivityIndicator size="small" color="#6366f1" />
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

export default FollowListModal; 