import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import { X, Send, Trash2 } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

interface Comment {
  id: string;
  userId: string;
  userFullName: string;
  text: string;
  timestamp: string;
  createdAt: string;
}

interface CommentsModalProps {
  visible: boolean;
  onClose: () => void;
  postId: string;
  postAuthor: string;
  onCommentsUpdate?: (count: number) => void;
}

const CommentsModal: React.FC<CommentsModalProps> = ({
  visible,
  onClose,
  postId,
  postAuthor,
  onCommentsUpdate,
}) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Load comments when modal opens
  useEffect(() => {
    if (visible && postId) {
      loadComments(true);
    }
  }, [visible, postId]);

  const loadComments = async (reset = false) => {
    if (isLoading) return;

    try {
      setIsLoading(true);
      const currentPage = reset ? 1 : page;
      
      const response = await api.get(`/posts/${postId}/comments`, {
        params: { page: currentPage, limit: 20 }
      });

      const fetchedComments = response.data.data.comments;
      const pagination = response.data.pagination;

      if (reset) {
        setComments(fetchedComments);
        setPage(2);
      } else {
        setComments(prev => [...prev, ...fetchedComments]);
        setPage(prev => prev + 1);
      }

      setHasMore(pagination.hasNextPage);

      // Notify parent about comments count
      if (onCommentsUpdate) {
        onCommentsUpdate(response.data.data.commentsCount);
      }

    } catch (error) {
      console.error("Failed to load comments:", error);
      Alert.alert("Error", "Failed to load comments. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const addComment = async () => {
    if (!user || !newComment.trim() || isSubmitting) return;

    if (newComment.trim().length > 500) {
      Alert.alert("Error", "Comment must be 500 characters or less.");
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await api.post(`/posts/${postId}/comments`, {
        userId: user.id,
        text: newComment.trim(),
      });

      const addedComment = response.data.data.comment;

      // Add comment to the beginning of the list (newest first)
      setComments(prev => [addedComment, ...prev]);

      // Update comments count
      if (onCommentsUpdate) {
        onCommentsUpdate(response.data.data.commentsCount);
      }

      setNewComment("");

    } catch (error: any) {
      console.error("Failed to add comment:", error);
      const errorMessage = error.response?.data?.message || "Failed to add comment. Please try again.";
      Alert.alert("Error", errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteComment = async (commentId: string) => {
    if (!user) return;

    Alert.alert(
      "Delete Comment",
      "Are you sure you want to delete this comment?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(`/posts/${postId}/comments/${commentId}`, {
                data: { userId: user.id }
              });

              // Remove comment from list
              setComments(prev => prev.filter(c => c.id !== commentId));

              // Update comments count
              if (onCommentsUpdate) {
                onCommentsUpdate(comments.length - 1);
              }

            } catch (error: any) {
              console.error("Failed to delete comment:", error);
              const errorMessage = error.response?.data?.message || "Failed to delete comment. Please try again.";
              Alert.alert("Error", errorMessage);
            }
          }
        }
      ]
    );
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView className="flex-1 bg-white">
        <KeyboardAvoidingView 
          className="flex-1" 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200">
            <Text className="text-lg font-semibold text-gray-800">
              Comments
            </Text>
            <TouchableOpacity onPress={onClose} className="p-1">
              <X size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {/* Comments List */}
          <ScrollView className="flex-1 px-4">
            {isLoading && comments.length === 0 ? (
              <View className="flex-1 justify-center items-center py-8">
                <ActivityIndicator size="large" color="#6366f1" />
                <Text className="mt-2 text-gray-600">Loading comments...</Text>
              </View>
            ) : comments.length === 0 ? (
              <View className="flex-1 justify-center items-center py-8">
                <Text className="text-gray-500 text-center">
                  No comments yet.{"\n"}Be the first to comment!
                </Text>
              </View>
            ) : (
              <View className="py-4">
                {comments.map((comment) => (
                  <View key={comment.id} className="flex-row mb-4">
                    <Image
                      source={{
                        uri: `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.userId}`
                      }}
                      className="w-8 h-8 rounded-full"
                      contentFit="cover"
                    />
                    <View className="ml-3 flex-1">
                      <View className="bg-gray-100 rounded-lg px-3 py-2">
                        <Text className="font-semibold text-gray-800 text-sm">
                          {comment.userFullName}
                        </Text>
                        <Text className="text-gray-700 mt-1">
                          {comment.text}
                        </Text>
                      </View>
                      <View className="flex-row items-center mt-1">
                        <Text className="text-xs text-gray-500">
                          {formatTimestamp(comment.timestamp)}
                        </Text>
                        {user?.id === comment.userId && (
                          <TouchableOpacity
                            onPress={() => deleteComment(comment.id)}
                            className="ml-4 flex-row items-center"
                          >
                            <Trash2 size={14} color="#ef4444" />
                            <Text className="text-xs text-red-500 ml-1">Delete</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>
                ))}

                {/* Load More Button */}
                {hasMore && !isLoading && (
                  <TouchableOpacity
                    onPress={() => loadComments(false)}
                    className="py-3 items-center"
                  >
                    <Text className="text-indigo-600 font-medium">Load more comments</Text>
                  </TouchableOpacity>
                )}

                {isLoading && comments.length > 0 && (
                  <View className="py-3 items-center">
                    <ActivityIndicator size="small" color="#6366f1" />
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          {/* Comment Input */}
          <View className="flex-row items-center px-4 py-3 border-t border-gray-200">
            <Image
              source={{
                uri: user ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}` : ""
              }}
              className="w-8 h-8 rounded-full"
              contentFit="cover"
            />
            <TextInput
              className="flex-1 mx-3 px-4 py-2 bg-gray-100 rounded-full text-gray-800"
              placeholder="Write a comment..."
              value={newComment}
              onChangeText={setNewComment}
              multiline
              maxLength={500}
              editable={!isSubmitting}
            />
            <TouchableOpacity
              onPress={addComment}
              disabled={!newComment.trim() || isSubmitting}
              className={`p-2 rounded-full ${
                newComment.trim() && !isSubmitting
                  ? "bg-indigo-600"
                  : "bg-gray-300"
              }`}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Send
                  size={18}
                  color={newComment.trim() && !isSubmitting ? "#ffffff" : "#9ca3af"}
                />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

export default CommentsModal; 