import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { PlusCircle, User } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import PostCard from "../components/PostCard";
import CommentsModal from "../components/CommentsModal";
import EditPostModal from "../components/EditPostModal";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

interface Post {
  id: string;
  userId: string;
  userFullName: string;
  generatedText: string;
  timestamp: string;
  userAvatar?: string; // Keep it optional for now
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [postToEdit, setPostToEdit] = useState<Post | null>(null);

  // Load liked posts from storage
  const loadLikedPosts = async (): Promise<Set<string>> => {
    try {
      if (!user) return new Set<string>();
      const stored = await AsyncStorage.getItem(`likedPosts_${user.id}`);
      if (stored) {
        const parsedArray: string[] = JSON.parse(stored);
        return new Set(parsedArray);
      }
      return new Set<string>();
    } catch (error) {
      console.error("Failed to load liked posts:", error);
      return new Set<string>();
    }
  };

  // Save liked posts to storage
  const saveLikedPosts = async (likedSet: Set<string>) => {
    try {
      if (!user) return;
      await AsyncStorage.setItem(
        `likedPosts_${user.id}`,
        JSON.stringify(Array.from(likedSet))
      );
    } catch (error) {
      console.error("Failed to save liked posts:", error);
    }
  };

  // Load posts
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setIsLoading(true);
        const response = await api.get("/posts");
        const fetchedPosts = response.data.data.map((post: any) => ({
          ...post,
          userAvatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.userId}`,
        }));
        setPosts(fetchedPosts);
        
        // Note: For now, we'll start with all posts as not liked
        // In a real implementation, we could store liked posts in AsyncStorage
        // or add a batch endpoint to check multiple posts at once
        const likedSet = await loadLikedPosts();
        setLikedPosts(likedSet);
        
      } catch (error) {
        console.error("Failed to fetch posts:", error);
        // Handle error (e.g., show a message to the user)
      } finally {
        setIsLoading(false);
      }
    };

    fetchPosts();
  }, [user]);

  const handleCreatePost = () => {
    router.push("/create-post");
  };

  const handleProfilePress = () => {
    // Navigate to current user's profile
    if (user?.id) {
      router.push(`/profile/${user.id}`);
    }
  };

  const handleLikePost = async (postId: string) => {
    if (!user) return;

    const wasLiked = likedPosts.has(postId);
    const newIsLiked = !wasLiked;

    // Optimistic UI update
    setLikedPosts(prev => {
      const newSet = new Set(prev);
      if (newIsLiked) {
        newSet.add(postId);
      } else {
        newSet.delete(postId);
      }
      saveLikedPosts(newSet);
      return newSet;
    });

    // Optimistic posts count update
    setPosts(prev => prev.map(post => 
      post.id === postId 
        ? { ...post, likesCount: post.likesCount + (newIsLiked ? 1 : -1) }
        : post
    ));

    try {
      const response = await api.post(`/posts/${postId}/like`, {
        userId: user.id,
      });

      const { isLiked, likesCount } = response.data.data;

      // Update with real data from server (in case of conflicts)
      setPosts(prev => prev.map(post => 
        post.id === postId 
          ? { ...post, likesCount }
          : post
      ));

      // Update liked posts with real data
      setLikedPosts(prev => {
        const newSet = new Set(prev);
        if (isLiked) {
          newSet.add(postId);
        } else {
          newSet.delete(postId);
        }
        saveLikedPosts(newSet);
        return newSet;
      });

    } catch (error) {
      console.error("Failed to like post:", error);
      
      // Revert optimistic updates on error
      setLikedPosts(prev => {
        const newSet = new Set(prev);
        if (wasLiked) {
          newSet.add(postId);
        } else {
          newSet.delete(postId);
        }
        saveLikedPosts(newSet);
        return newSet;
      });

      setPosts(prev => prev.map(post => 
        post.id === postId 
          ? { ...post, likesCount: post.likesCount + (wasLiked ? 1 : -1) }
          : post
      ));
    }
  };

  const handleCommentPress = (post: Post) => {
    setSelectedPost(post);
    setCommentsModalVisible(true);
  };

  const handleCommentsUpdate = (postId: string, newCount: number) => {
    setPosts(prev => prev.map(post => 
      post.id === postId 
        ? { ...post, commentsCount: newCount }
        : post
    ));
  };

  const handleEditPost = (post: Post) => {
    setPostToEdit(post);
    setEditModalVisible(true);
  };

  const handleDeletePost = (postId: string) => {
    Alert.alert(
      "Delete Post",
      "Are you sure you want to delete this post? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(`/posts/${postId}`);
              
              // Remove post from local state
              setPosts(prev => prev.filter(post => post.id !== postId));
              
            } catch (error: any) {
              console.error("Failed to delete post:", error);
              const errorMessage = error.response?.data?.message || "Failed to delete post. Please try again.";
              Alert.alert("Error", errorMessage);
            }
          }
        }
      ]
    );
  };

  const handlePostUpdated = (postId: string, newGeneratedText: string) => {
    setPosts(prev => prev.map(post => 
      post.id === postId 
        ? { ...post, generatedText: newGeneratedText }
        : post
    ));
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#6366f1" />
        <Text className="mt-4 text-gray-600">Loading Friendlines...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row justify-between items-center px-4 py-2 border-b border-gray-200">
        <View className="flex-row items-center">
          <Image
            source={require("../assets/images/icon.png")}
            style={{ width: 32, height: 32 }}
            className="rounded-full"
          />
          <Text className="ml-2 text-xl font-bold text-indigo-600">
            Friendlines
          </Text>
        </View>
        <TouchableOpacity onPress={handleProfilePress} className="p-2">
          <User size={24} color="#4b5563" />
        </TouchableOpacity>
      </View>

      {/* Feed */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="p-4">
          <Text className="text-lg font-semibold text-gray-800 mb-4">
            Latest Updates
          </Text>
          {posts.map((post) => (
            <View key={post.id} className="mb-4">
              <PostCard
                id={post.id}
                userId={post.userId}
                username={post.userFullName}
                avatar={post.userAvatar}
                content={post.generatedText}
                timestamp={new Date(post.timestamp).toLocaleDateString()}
                likes={post.likesCount}
                comments={post.commentsCount}
                isLiked={likedPosts.has(post.id)}
                isOwnPost={user?.id === post.userId}
                onLike={() => handleLikePost(post.id)}
                onComment={() => handleCommentPress(post)}
                onEdit={() => handleEditPost(post)}
                onDelete={() => handleDeletePost(post.id)}
              />
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        onPress={handleCreatePost}
        className="absolute bottom-6 right-6 bg-indigo-600 rounded-full p-3 shadow-lg"
        style={{ elevation: 5 }}
      >
        <PlusCircle size={28} color="white" />
      </TouchableOpacity>

      {/* Comments Modal */}
      {selectedPost && (
        <CommentsModal
          visible={commentsModalVisible}
          onClose={() => {
            setCommentsModalVisible(false);
            setSelectedPost(null);
          }}
          postId={selectedPost.id}
          postAuthor={selectedPost.userFullName}
          onCommentsUpdate={(count) => handleCommentsUpdate(selectedPost.id, count)}
        />
      )}

      {/* Edit Post Modal */}
      {postToEdit && (
        <EditPostModal
          visible={editModalVisible}
          onClose={() => {
            setEditModalVisible(false);
            setPostToEdit(null);
          }}
          postId={postToEdit.id}
          currentText={postToEdit.generatedText}
          onPostUpdated={handlePostUpdated}
        />
      )}
    </SafeAreaView>
  );
}
