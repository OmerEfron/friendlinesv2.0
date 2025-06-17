import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

export class DebugUtils {
  /**
   * Clear all AsyncStorage data
   */
  static async clearAsyncStorage(): Promise<void> {
    try {
      await AsyncStorage.clear();
      console.log('AsyncStorage cleared successfully');
      Alert.alert('Success', 'AsyncStorage has been cleared');
    } catch (error) {
      console.error('Failed to clear AsyncStorage:', error);
      Alert.alert('Error', 'Failed to clear AsyncStorage');
    }
  }

  /**
   * Clear specific AsyncStorage keys
   */
  static async clearSpecificKeys(keys: string[]): Promise<void> {
    try {
      await AsyncStorage.multiRemove(keys);
      console.log('Specified keys cleared from AsyncStorage:', keys);
      Alert.alert('Success', `Cleared keys: ${keys.join(', ')}`);
    } catch (error) {
      console.error('Failed to clear specific keys:', error);
      Alert.alert('Error', 'Failed to clear specified keys');
    }
  }

  /**
   * Clear user-specific data (auth + liked posts)
   */
  static async clearUserData(userId?: string): Promise<void> {
    try {
      const keysToRemove = ['user'];
      
      if (userId) {
        keysToRemove.push(`likedPosts_${userId}`);
      } else {
        // Get all keys and find liked posts keys
        const allKeys = await AsyncStorage.getAllKeys();
        const likedPostsKeys = allKeys.filter(key => key.startsWith('likedPosts_'));
        keysToRemove.push(...likedPostsKeys);
      }
      
      await AsyncStorage.multiRemove(keysToRemove);
      console.log('User data cleared from AsyncStorage');
      Alert.alert('Success', 'User data has been cleared');
    } catch (error) {
      console.error('Failed to clear user data:', error);
      Alert.alert('Error', 'Failed to clear user data');
    }
  }

  /**
   * List all AsyncStorage keys (for debugging)
   */
  static async listAllKeys(): Promise<readonly string[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      console.log('AsyncStorage keys:', keys);
      return keys;
    } catch (error) {
      console.error('Failed to get AsyncStorage keys:', error);
      return [];
    }
  }

  /**
   * Get all AsyncStorage data (for debugging)
   */
  static async getAllData(): Promise<Record<string, string | null>> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const items = await AsyncStorage.multiGet(keys);
      const data: Record<string, string | null> = {};
      
      items.forEach(([key, value]) => {
        data[key] = value;
      });
      
      console.log('AsyncStorage data:', data);
      return data;
    } catch (error) {
      console.error('Failed to get AsyncStorage data:', error);
      return {};
    }
  }
}

// Development only helper
export const __DEV_CLEAR_STORAGE__ = async () => {
  if (__DEV__) {
    await DebugUtils.clearAsyncStorage();
  }
}; 