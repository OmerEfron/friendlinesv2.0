import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { X, Edit3 } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import api from "../services/api";

interface EditPostModalProps {
  visible: boolean;
  onClose: () => void;
  postId: string;
  currentText: string;
  onPostUpdated?: (postId: string, newText: string) => void;
}

const EditPostModal: React.FC<EditPostModalProps> = ({
  visible,
  onClose,
  postId,
  currentText,
  onPostUpdated,
}) => {
  const [newText, setNewText] = useState(currentText);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset text when modal opens with new post
  useEffect(() => {
    if (visible) {
      setNewText(currentText);
    }
  }, [visible, currentText]);

  const handleUpdate = async () => {
    if (!newText.trim() || isSubmitting) return;

    if (newText.trim().length > 280) {
      Alert.alert("Error", "Post must be 280 characters or less.");
      return;
    }

    if (newText.trim() === currentText.trim()) {
      // No changes made
      onClose();
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await api.put(`/posts/${postId}`, {
        rawText: newText.trim(),
      });

      const updatedPost = response.data.data;

      // Notify parent about the update
      if (onPostUpdated) {
        onPostUpdated(postId, updatedPost.generatedText);
      }

      onClose();

    } catch (error: any) {
      console.error("Failed to update post:", error);
      const errorMessage = error.response?.data?.message || "Failed to update post. Please try again.";
      Alert.alert("Error", errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (newText.trim() !== currentText.trim()) {
      Alert.alert(
        "Discard Changes",
        "Are you sure you want to discard your changes?",
        [
          { text: "Keep Editing", style: "cancel" },
          { text: "Discard", style: "destructive", onPress: onClose }
        ]
      );
    } else {
      onClose();
    }
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
            <TouchableOpacity onPress={handleCancel} className="p-1">
              <X size={24} color="#6b7280" />
            </TouchableOpacity>
            <Text className="text-lg font-semibold text-gray-800">
              Edit Post
            </Text>
            <TouchableOpacity
              onPress={handleUpdate}
              disabled={!newText.trim() || isSubmitting || newText.trim() === currentText.trim()}
              className={`px-4 py-2 rounded-full ${
                newText.trim() && newText.trim() !== currentText.trim() && !isSubmitting
                  ? "bg-indigo-600"
                  : "bg-gray-300"
              }`}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text
                  className={`font-medium ${
                    newText.trim() && newText.trim() !== currentText.trim() && !isSubmitting
                      ? "text-white"
                      : "text-gray-500"
                  }`}
                >
                  Update
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View className="flex-1 p-4">
            <View className="flex-row mb-4">
              <View className="bg-indigo-100 p-2 rounded-full mr-3">
                <Edit3 size={20} color="#6366f1" />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-semibold text-gray-800 mb-1">
                  Edit your newsflash
                </Text>
                <Text className="text-sm text-gray-600">
                  Your update will be automatically transformed into a newsflash format.
                </Text>
              </View>
            </View>

            <TextInput
              className="flex-1 p-4 bg-gray-50 rounded-lg text-gray-800 text-base"
              placeholder="What's happening in your life?"
              value={newText}
              onChangeText={setNewText}
              multiline
              textAlignVertical="top"
              maxLength={280}
              editable={!isSubmitting}
              autoFocus
            />

            <View className="flex-row justify-between items-center mt-4">
              <Text className="text-sm text-gray-500">
                {newText.length}/280 characters
              </Text>
              {newText.trim() !== currentText.trim() && (
                <Text className="text-sm text-orange-600 font-medium">
                  Changes will regenerate your newsflash
                </Text>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

export default EditPostModal; 