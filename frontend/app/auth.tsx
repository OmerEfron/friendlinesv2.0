import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Mail, Lock, Eye, EyeOff, User } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function AuthScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();

  const handleTabChange = (tab: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
    setError("");
    // Clear fields when switching tabs
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setFullName("");
  };

  const handleAuth = async () => {
    setError("");
    setIsLoading(true);

    try {
      let response;
      if (activeTab === "register") {
        if (!email || !password || !fullName) {
          throw new Error("Please fill in all fields");
        }
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match");
        }
        response = await api.post("/login", { email, fullName });
      } else {
        // Login
        if (!email) {
          throw new Error("Please enter your email");
        }
        const nameFromEmail =
          email.split("@")[0] + " " + email.split("@")[1].split(".")[0];
        response = await api.post("/login", { email, fullName: nameFromEmail });
      }

      const user = response.data.data;
      await login(user);

      // The redirection is handled by the root layout, but we can keep this for safety.
      router.replace("/");
    } catch (err: any) {
      setError(
        err.response?.data?.message || err.message || "Authentication failed"
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowPassword(!showPassword);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-white"
    >
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 px-6 pt-16 pb-8 items-center justify-center">
          {/* App Logo */}
          <View className="items-center mb-10">
            <Image
              source={{
                uri: "https://api.dicebear.com/7.x/shapes/svg?seed=friendlines",
              }}
              className="w-24 h-24 mb-4"
            />
            <Text className="text-3xl font-bold text-blue-600">
              Friendlines
            </Text>
            <Text className="text-gray-500 text-center mt-2">
              Share your moments in newsflash style
            </Text>
          </View>

          {/* Auth Tabs */}
          <View className="flex-row w-full mb-6 border-b border-gray-200">
            <TouchableOpacity
              className={`flex-1 py-3 ${
                activeTab === "login" ? "border-b-2 border-blue-600" : ""
              }`}
              onPress={() => handleTabChange("login")}
            >
              <Text
                className={`text-center font-medium ${
                  activeTab === "login" ? "text-blue-600" : "text-gray-500"
                }`}
              >
                Login
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-1 py-3 ${
                activeTab === "register" ? "border-b-2 border-blue-600" : ""
              }`}
              onPress={() => handleTabChange("register")}
            >
              <Text
                className={`text-center font-medium ${
                  activeTab === "register" ? "text-blue-600" : "text-gray-500"
                }`}
              >
                Register
              </Text>
            </TouchableOpacity>
          </View>

          {/* Error Message */}
          {error ? (
            <View className="w-full bg-red-100 p-3 rounded-lg mb-4">
              <Text className="text-red-600 text-center">{error}</Text>
            </View>
          ) : null}

          {/* Full Name Input (Register only) */}
          {activeTab === "register" && (
            <View className="w-full mb-4 relative">
              <View className="absolute left-3 top-3 z-10">
                <User size={20} color="#6B7280" />
              </View>
              <TextInput
                className="w-full bg-gray-100 rounded-lg px-10 py-3 text-gray-800"
                placeholder="Full Name"
                placeholderTextColor="#9CA3AF"
                value={fullName}
                onChangeText={setFullName}
              />
            </View>
          )}

          {/* Email Input */}
          <View className="w-full mb-4 relative">
            <View className="absolute left-3 top-3 z-10">
              <Mail size={20} color="#6B7280" />
            </View>
            <TextInput
              className="w-full bg-gray-100 rounded-lg px-10 py-3 text-gray-800"
              placeholder="Email address"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          {/* Password and Confirm Password for Register tab */}
          {activeTab === "register" && (
            <>
              {/* Password Input */}
              <View className="w-full mb-4 relative">
                <View className="absolute left-3 top-3 z-10">
                  <Lock size={20} color="#6B7280" />
                </View>
                <TextInput
                  className="w-full bg-gray-100 rounded-lg px-10 py-3 text-gray-800"
                  placeholder="Password"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity
                  className="absolute right-3 top-3 z-10"
                  onPress={togglePasswordVisibility}
                >
                  {showPassword ? (
                    <EyeOff size={20} color="#6B7280" />
                  ) : (
                    <Eye size={20} color="#6B7280" />
                  )}
                </TouchableOpacity>
              </View>

              {/* Confirm Password Input */}
              <View className="w-full mb-4 relative">
                <View className="absolute left-3 top-3 z-10">
                  <Lock size={20} color="#6B7280" />
                </View>
                <TextInput
                  className="w-full bg-gray-100 rounded-lg px-10 py-3 text-gray-800"
                  placeholder="Confirm Password"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
              </View>
            </>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            className={`w-full rounded-lg py-3 mt-4 ${
              isLoading ? "bg-blue-400" : "bg-blue-600"
            }`}
            onPress={handleAuth}
            disabled={isLoading}
          >
            <Text className="text-white font-medium text-center">
              {isLoading
                ? activeTab === "login"
                  ? "Logging in..."
                  : "Registering..."
                : activeTab === "login"
                ? "Login"
                : "Register"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
