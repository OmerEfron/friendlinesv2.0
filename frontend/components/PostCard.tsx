import React, { useState } from "react";
import { View, Text, TouchableOpacity, Pressable, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { Heart, MessageCircle, Share2, MoreHorizontal, Edit3, Trash2 } from "lucide-react-native";
import { useRouter } from "expo-router";

interface PostCardProps {
  id?: string;
  avatar?: string;
  username?: string;
  userId?: string;
  content?: string;
  timestamp?: string;
  likes?: number;
  comments?: number;
  isLiked?: boolean;
  onLike?: () => Promise<void>;
  onComment?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  isOwnPost?: boolean;
}

const PostCard = ({
  id = "post-1",
  avatar = "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
  username = "Jane Doe",
  userId = "user-1",
  content = "just discovered the best coffee shop downtown. The atmosphere is amazing!",
  timestamp = "2 hours ago",
  likes = 12,
  comments = 3,
  isLiked = false,
  onLike,
  onComment,
  onEdit,
  onDelete,
  isOwnPost = false,
}: PostCardProps) => {
  const router = useRouter();
  const [isLiking, setIsLiking] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const handleProfilePress = () => {
    router.push(`/profile/${userId}`);
  };

  const handleLikePress = async () => {
    if (onLike && !isLiking) {
      setIsLiking(true);
      try {
        await onLike();
      } catch (error) {
        console.error("Error liking post:", error);
      } finally {
        setIsLiking(false);
      }
    }
  };

  const handleCommentPress = () => {
    if (onComment) {
      onComment();
    }
  };

  const handleSharePress = () => {
    // Handle share functionality
    console.log("Share pressed for post:", id);
  };

  const handleEditPress = () => {
    if (onEdit) {
      onEdit();
    }
    setShowActions(false);
  };

  const handleDeletePress = () => {
    if (onDelete) {
      onDelete();
    }
    setShowActions(false);
  };

  return (
    <View className="bg-white p-4 mb-2 rounded-lg shadow-sm border border-gray-100">
      <View className="flex-row items-center mb-3">
        <Pressable onPress={handleProfilePress}>
          <Image
            source={{ uri: avatar }}
            className="w-10 h-10 rounded-full"
            contentFit="cover"
          />
        </Pressable>
        <View className="ml-3 flex-1">
          <Pressable onPress={handleProfilePress}>
            <Text className="font-bold text-gray-800">{username}</Text>
          </Pressable>
          <Text className="text-xs text-gray-500">{timestamp}</Text>
        </View>
        {isOwnPost && (
          <View className="relative">
            <TouchableOpacity
              onPress={() => setShowActions(!showActions)}
              className="p-2"
            >
              <MoreHorizontal size={20} color="#6b7280" />
            </TouchableOpacity>
            {showActions && (
              <View className="absolute right-0 top-10 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-10">
                <TouchableOpacity
                  onPress={handleEditPress}
                  className="flex-row items-center px-4 py-2"
                >
                  <Edit3 size={16} color="#6366f1" />
                  <Text className="ml-2 text-gray-700">Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleDeletePress}
                  className="flex-row items-center px-4 py-2"
                >
                  <Trash2 size={16} color="#ef4444" />
                  <Text className="ml-2 text-red-500">Delete</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>

      <Text className="text-gray-800 mb-3">
        <Text className="font-bold">{username.split(" ")[0]}</Text> {content}
      </Text>

      <View className="flex-row justify-between pt-2 border-t border-gray-100">
        <TouchableOpacity
          className="flex-row items-center"
          onPress={handleLikePress}
          disabled={isLiking}
        >
          {isLiking ? (
            <ActivityIndicator size="small" color="#f43f5e" />
          ) : (
            <Heart
              size={18}
              color={isLiked ? "#f43f5e" : "#6b7280"}
              fill={isLiked ? "#f43f5e" : "transparent"}
            />
          )}
          <Text className="ml-1 text-gray-600 text-sm">{likes}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-row items-center"
          onPress={handleCommentPress}
        >
          <MessageCircle size={18} color="#6b7280" />
          <Text className="ml-1 text-gray-600 text-sm">{comments}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-row items-center"
          onPress={handleSharePress}
        >
          <Share2 size={18} color="#6b7280" />
          <Text className="ml-1 text-gray-600 text-sm">Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default PostCard;
