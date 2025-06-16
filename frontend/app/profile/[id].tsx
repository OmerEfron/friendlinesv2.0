import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import { ArrowLeft, UserPlus, UserMinus } from "lucide-react-native";
import api from "../../services/api";
import PostCard from "../../components/PostCard";
import CommentsModal from "../../components/CommentsModal";
import FollowListModal from "../../components/FollowListModal";
import EditPostModal from "../../components/EditPostModal";
import { useAuth } from "../../context/AuthContext";

interface Post {
  id: string;
  content: string;
  timestamp: string;
  likes: number;
  comments: number;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
}

interface UserProfile {
  id: string;
  name: string;
  username: string;
  bio: string;
  avatar: string;
  followers: number;
  following: number;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
}

export default function ProfileScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [followListModalVisible, setFollowListModalVisible] = useState(false);
  const [followListType, setFollowListType] = useState<"followers" | "following">("followers");
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [postToEdit, setPostToEdit] = useState<Post | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchProfileData = async () => {
      setIsLoading(true);
      try {
        const userId = Array.isArray(id) ? id[0] : id;

        // Fetch user profile
        const profileResponse = await api.get(`/users/${userId}`);
        const profileUser = profileResponse.data.data;

        let followStatus = false;
        
        // Get follow status if current user is different from profile user
        if (user && user.id !== userId) {
          try {
            const followResponse = await api.get(`/users/${userId}/follow-status`, {
              params: { userId: user.id }
            });
            followStatus = followResponse.data.data.isFollowing;
          } catch (error) {
            console.error("Failed to get follow status:", error);
          }
        }

        const userProfile: UserProfile = {
          id: profileUser.id,
          name: profileUser.fullName,
          username: profileUser.email.split("@")[0],
          bio: "Living life one newsflash at a time. Coffee enthusiast and weekend hiker.", // mock bio for now
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${profileUser.id}`,
          followers: profileUser.followersCount || 0, // Real backend data
          following: profileUser.followingCount || 0, // Real backend data
          followersCount: profileUser.followersCount || 0,
          followingCount: profileUser.followingCount || 0,
          isFollowing: followStatus, // Real follow status from backend
        };
        setProfile(userProfile);
        setIsFollowing(followStatus);

        // Fetch user posts
        const postsResponse = await api.get(`/posts/${userId}`);
        const userPosts = postsResponse.data.data.map((post: any) => ({
          id: post.id,
          content: post.generatedText,
          timestamp: post.timestamp,
          likes: post.likesCount || 0,
          comments: post.commentsCount || 0,
          likesCount: post.likesCount || 0,
          commentsCount: post.commentsCount || 0,
          sharesCount: post.sharesCount || 0,
        }));
        setPosts(userPosts);
      } catch (error) {
        console.error("Failed to fetch profile data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfileData();
  }, [id]);

  const handleFollowToggle = async () => {
    if (!profile || !user || isFollowLoading) return;

    // Prevent following yourself
    if (user.id === profile.id) return;

    try {
      setIsFollowLoading(true);

      // Optimistic UI update
      const newIsFollowing = !isFollowing;
      setIsFollowing(newIsFollowing);
      setProfile(prev => prev ? {
        ...prev,
        followers: newIsFollowing
          ? prev.followers + 1
          : prev.followers - 1,
        followersCount: newIsFollowing
          ? prev.followersCount + 1
          : prev.followersCount - 1,
      } : null);

      // Make API call
      const response = await api.post(`/users/${profile.id}/follow`, {
        userId: user.id,
      });

      const { isFollowing: serverIsFollowing, followersCount } = response.data.data;

      // Update with real server data
      setIsFollowing(serverIsFollowing);
      setProfile(prev => prev ? {
        ...prev,
        followers: followersCount,
        followersCount: followersCount,
      } : null);

    } catch (error: any) {
      console.error("Failed to toggle follow:", error);
      
      // Revert optimistic updates on error
      setIsFollowing(isFollowing);
      setProfile(prev => prev ? {
        ...prev,
        followers: isFollowing
          ? prev.followers + 1
          : prev.followers - 1,
        followersCount: isFollowing
          ? prev.followersCount + 1
          : prev.followersCount - 1,
      } : null);

      // Show error message
      const errorMessage = error.response?.data?.message || "Failed to update follow status. Please try again.";
      // In a real app, you might want to show a toast or alert here
      console.error("Follow error:", errorMessage);
      
    } finally {
      setIsFollowLoading(false);
    }
  };

  const handleLikePost = async (postId: string) => {
    if (!user) return;

    try {
      const response = await api.post(`/posts/${postId}/like`, {
        userId: user.id,
      });

      const { isLiked, likesCount } = response.data.data;

      // Update local state
      setLikedPosts(prev => {
        const newSet = new Set(prev);
        if (isLiked) {
          newSet.add(postId);
        } else {
          newSet.delete(postId);
        }
        return newSet;
      });

      // Update post likes count
      setPosts(prev => prev.map(post => 
        post.id === postId 
          ? { ...post, likesCount, likes: likesCount }
          : post
      ));

    } catch (error) {
      console.error("Failed to like post:", error);
    }
  };

  const handleCommentPress = (post: Post) => {
    setSelectedPost(post);
    setCommentsModalVisible(true);
  };

  const handleCommentsUpdate = (postId: string, newCount: number) => {
    setPosts(prev => prev.map(post => 
      post.id === postId 
        ? { ...post, commentsCount: newCount, comments: newCount }
        : post
    ));
  };

  const handleFollowersPress = () => {
    setFollowListType("followers");
    setFollowListModalVisible(true);
  };

  const handleFollowingPress = () => {
    setFollowListType("following");
    setFollowListModalVisible(true);
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
        ? { ...post, content: newGeneratedText }
        : post
    ));
  };
  
  if (isLoading || !profile) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center p-4 border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <ArrowLeft size={24} color="#000" />
        </TouchableOpacity>
        <Text className="text-xl font-bold ml-4">{profile.name}</Text>
      </View>

      <ScrollView className="flex-1">
        {/* Profile Info */}
        <View className="p-4">
          <View className="flex-row items-center">
            <Image
              source={{ uri: profile.avatar }}
              className="w-20 h-20 rounded-full bg-gray-200"
              contentFit="cover"
            />
            <View className="ml-4 flex-1">
              <Text className="text-xl font-bold">{profile.name}</Text>
              <Text className="text-gray-500">@{profile.username}</Text>

              <View className="flex-row mt-2">
                <TouchableOpacity onPress={handleFollowersPress} className="mr-4">
                  <Text>
                    <Text className="font-bold">{profile.followers}</Text>{" "}
                    followers
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleFollowingPress}>
                  <Text>
                    <Text className="font-bold">{profile.following}</Text>{" "}
                    following
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <Text className="mt-4 text-gray-700">{profile.bio}</Text>

          {/* Only show follow button if viewing another user's profile */}
          {user && user.id !== profile.id && (
            <TouchableOpacity
              onPress={handleFollowToggle}
              disabled={isFollowLoading}
              className={`mt-4 rounded-full py-2 px-6 ${isFollowing ? "bg-gray-200" : "bg-blue-500"} flex-row justify-center items-center`}
            >
              {isFollowLoading ? (
                <ActivityIndicator
                  size="small"
                  color={isFollowing ? "#000" : "#fff"}
                />
              ) : (
                <>
                  {isFollowing ? (
                    <UserMinus size={18} color="#000" className="mr-2" />
                  ) : (
                    <UserPlus size={18} color="#fff" className="mr-2" />
                  )}
                  <Text
                    className={`font-medium ${isFollowing ? "text-black" : "text-white"}`}
                  >
                    {isFollowing ? "Unfollow" : "Follow"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Posts Section */}
        <View className="px-4 pb-4">
          <Text className="text-lg font-bold mb-2">Posts</Text>
          {posts.length > 0 ? (
            posts.map((post) => (
              <PostCard
                key={post.id}
                id={post.id}
                userId={profile.id}
                username={profile.name}
                avatar={profile.avatar}
                content={post.content}
                timestamp={new Date(post.timestamp).toLocaleDateString()}
                likes={post.likes}
                comments={post.comments}
                isLiked={likedPosts.has(post.id)}
                isOwnPost={user?.id === profile.id}
                onLike={() => handleLikePost(post.id)}
                onComment={() => handleCommentPress(post)}
                onEdit={() => handleEditPost(post)}
                onDelete={() => handleDeletePost(post.id)}
              />
            ))
          ) : (
            <View className="py-8 items-center">
              <Text className="text-gray-500">No posts yet</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Comments Modal */}
      {selectedPost && (
        <CommentsModal
          visible={commentsModalVisible}
          onClose={() => {
            setCommentsModalVisible(false);
            setSelectedPost(null);
          }}
          postId={selectedPost.id}
          postAuthor={profile.name}
          onCommentsUpdate={(count) => handleCommentsUpdate(selectedPost.id, count)}
        />
      )}

      {/* Follow List Modal */}
      <FollowListModal
        visible={followListModalVisible}
        onClose={() => setFollowListModalVisible(false)}
        userId={profile.id}
        userName={profile.name}
        type={followListType}
      />

      {/* Edit Post Modal */}
      {postToEdit && (
        <EditPostModal
          visible={editModalVisible}
          onClose={() => {
            setEditModalVisible(false);
            setPostToEdit(null);
          }}
          postId={postToEdit.id}
          currentText={postToEdit.content}
          onPostUpdated={handlePostUpdated}
        />
      )}
    </View>
  );
}
