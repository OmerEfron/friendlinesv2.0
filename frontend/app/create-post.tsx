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
import { postService, NewsflashOptions, NewsflashPreview } from "../services/api";
import { useGroups } from "../context/GroupsContext";
import { useAuth } from "../context/AuthContext";

const MAX_CHARACTERS = 280;

export default function CreatePostScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { userGroups } = useGroups();
  const [rawText, setRawText] = useState("");
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [preview, setPreview] = useState<NewsflashPreview | null>(null);
  
  // GPT options
  const [tone, setTone] = useState<NewsflashOptions['tone']>('satirical');
  const [length, setLength] = useState<NewsflashOptions['length']>('short');
  const [temperature, setTemperature] = useState(0.7);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const remainingCharacters = MAX_CHARACTERS - rawText.length;
  const isOverLimit = remainingCharacters < 0;

  // Get available groups (owned + member)
  const availableGroups = [
    ...(userGroups?.owned || []),
    ...(userGroups?.member || []),
  ];

  const handlePreview = async () => {
    if (!rawText.trim() || !user) return;

    setIsPreviewLoading(true);
    try {
      const options: NewsflashOptions = {
        tone,
        length,
        temperature,
      };

      const response = await postService.generateNewsflashPreview(
        rawText.trim(),
        user.id,
        options
      );
      
      setPreview(response.data);
    } catch (error: any) {
      Alert.alert('Preview Error', error.response?.data?.message || 'Failed to generate preview');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!rawText.trim() || !user) return;

    setIsLoading(true);
    try {
      const options: NewsflashOptions = {
        tone,
        length,
        temperature,
      };

      await postService.createPost(
        rawText.trim(),
        user.id,
        selectedGroupIds.length > 0 ? selectedGroupIds : undefined,
        options
      );
      
      Alert.alert('Success', 'Post created successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to create post');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleGroup = (groupId: string) => {
    setSelectedGroupIds(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const getSelectedGroupNames = () => {
    return availableGroups
      .filter(group => selectedGroupIds.includes(group.id))
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
          disabled={isOverLimit || !rawText.trim() || isLoading}
          className={`p-2 rounded-full ${isOverLimit || !rawText.trim() || isLoading ? "opacity-50" : "opacity-100"}`}
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
            value={rawText}
            onChangeText={setRawText}
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

          {/* GPT Options */}
          <View className="mb-4">
            <TouchableOpacity 
              onPress={() => setShowAdvanced(!showAdvanced)}
              className="flex-row justify-between items-center py-2"
            >
              <Text className="text-lg font-semibold">Newsflash Options</Text>
              <Text className="text-blue-500">{showAdvanced ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
            
            {showAdvanced && (
              <View className="bg-gray-50 p-4 rounded-lg">
                <View className="mb-3">
                  <Text className="font-medium mb-2">Tone</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {(['satirical', 'serious', 'humorous', 'sarcastic', 'excited'] as const).map((t) => (
                      <TouchableOpacity
                        key={t}
                        onPress={() => setTone(t)}
                        className={`px-3 py-1 rounded-full ${
                          tone === t ? 'bg-blue-500' : 'bg-gray-200'
                        }`}
                      >
                        <Text className={`capitalize ${tone === t ? 'text-white' : 'text-gray-700'}`}>
                          {t}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                
                <View className="mb-3">
                  <Text className="font-medium mb-2">Length</Text>
                  <View className="flex-row gap-2">
                    {(['short', 'long'] as const).map((l) => (
                      <TouchableOpacity
                        key={l}
                        onPress={() => setLength(l)}
                        className={`px-4 py-2 rounded-lg ${
                          length === l ? 'bg-blue-500' : 'bg-gray-200'
                        }`}
                      >
                        <Text className={`capitalize ${length === l ? 'text-white' : 'text-gray-700'}`}>
                          {l}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                
                <View className="mb-3">
                  <Text className="font-medium mb-2">Creativity (Temperature: {temperature})</Text>
                  <View className="flex-row gap-2">
                    {[0.3, 0.7, 1.0, 1.5].map((t) => (
                      <TouchableOpacity
                        key={t}
                        onPress={() => setTemperature(t)}
                        className={`px-3 py-2 rounded-lg ${
                          temperature === t ? 'bg-blue-500' : 'bg-gray-200'
                        }`}
                      >
                        <Text className={`${temperature === t ? 'text-white' : 'text-gray-700'}`}>
                          {t}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Preview Section */}
          {rawText.trim() && (
            <View className="mb-4">
              <TouchableOpacity
                onPress={handlePreview}
                disabled={isPreviewLoading}
                className="bg-gray-500 py-3 px-4 rounded-lg mb-3"
              >
                <Text className="text-white text-center font-semibold">
                  {isPreviewLoading ? 'Generating Preview...' : 'Preview Newsflash'}
                </Text>
              </TouchableOpacity>
              
              {preview && (
                <View className="bg-blue-50 p-4 rounded-lg">
                  <View className="flex-row justify-between items-center mb-2">
                    <Text className="font-semibold text-blue-800">Preview</Text>
                    <Text className="text-xs text-blue-600 capitalize">
                      {preview.method} • {preview.options.tone}
                    </Text>
                  </View>
                  <Text className="text-gray-800 italic">"{preview.generatedText}"</Text>
                </View>
              )}
            </View>
          )}

          {/* Group Selection */}
          {availableGroups.length > 0 && (
            <View className="mb-4">
              <TouchableOpacity
                className="flex-row items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <View className="flex-row items-center">
                  <Users size={20} color="#6b7280" />
                  <Text className="text-gray-700 ml-2">
                    {selectedGroupIds.length > 0
                      ? `Post to ${selectedGroupIds.length} group${selectedGroupIds.length > 1 ? 's' : ''}`
                      : "Post to groups (optional)"}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Selected Groups Display */}
              {selectedGroupIds.length > 0 && (
                <Text className="text-sm text-blue-600 mt-1 ml-1">
                  {getSelectedGroupNames()}
                </Text>
              )}

              {/* Group Selector */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-2">
                  {availableGroups.map((group) => (
                    <TouchableOpacity
                      key={group.id}
                      onPress={() => toggleGroup(group.id)}
                      className={`px-3 py-2 rounded-full border ${
                        selectedGroupIds.includes(group.id)
                          ? 'bg-blue-500 border-blue-500'
                          : 'bg-white border-gray-300'
                      }`}
                    >
                      <Text className={`${
                        selectedGroupIds.includes(group.id) ? 'text-white' : 'text-gray-700'
                      }`}>
                        {group.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
