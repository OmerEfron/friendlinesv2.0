import axios from "axios";
import { Platform } from "react-native";

const API_URL =
  Platform.OS === "web"
    ? "http://localhost:3000/api"
    : "http://192.168.1.132:3000/api"; // For Android emulator

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Group interfaces
export interface Group {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  members: string[];
  invites: string[];
  memberCount?: number;
  createdAt: string;
  updatedAt: string;
  settings?: {
    postNotifications: boolean;
    membershipNotifications: boolean;
  };
}

export interface GroupWithMembers extends Omit<Group, 'members'> {
  members: Array<{
    id: string;
    fullName: string;
    email: string;
  }>;
}

export interface UserGroups {
  owned: Group[];
  member: Group[];
  invited: Group[];
}

export interface CreateGroupData {
  name: string;
  description?: string;
}

export interface InviteToGroupData {
  userIds: string[];
  userId: string;
}

export interface UserActionData {
  userId: string;
}

// Notification services
export const notificationService = {
  registerPushToken: async (userId: string, expoPushToken: string) => {
    const response = await api.post(`/users/${userId}/push-token`, {
      expoPushToken,
    });
    return response.data;
  },
};

// Group services
export const groupService = {
  createGroup: async (userId: string, groupData: CreateGroupData) => {
    const response = await api.post(`/groups/${userId}`, groupData);
    return response.data;
  },

  inviteToGroup: async (groupId: string, inviteData: InviteToGroupData) => {
    const response = await api.post(`/groups/${groupId}/invite`, inviteData);
    return response.data;
  },

  acceptInvitation: async (groupId: string, userId: string) => {
    const response = await api.post(`/groups/${groupId}/accept`, { userId });
    return response.data;
  },

  leaveGroup: async (groupId: string, userId: string) => {
    const response = await api.post(`/groups/${groupId}/leave`, { userId });
    return response.data;
  },

  getGroup: async (groupId: string, userId?: string) => {
    const params = userId ? { userId } : {};
    const response = await api.get(`/groups/${groupId}`, { params });
    return response.data;
  },

  getUserGroups: async (userId: string): Promise<{ data: UserGroups }> => {
    const response = await api.get(`/groups/user/${userId}`);
    return response.data;
  },

  getGroupPosts: async (groupId: string, userId: string, page = 1, limit = 20) => {
    const response = await api.get(`/groups/${groupId}/posts`, {
      params: { userId, page, limit }
    });
    return response.data;
  },
};

// Post interfaces
export interface NewsflashOptions {
  tone?: 'satirical' | 'serious' | 'humorous' | 'sarcastic' | 'excited';
  length?: 'short' | 'long';
  temperature?: number;
}

export interface NewsflashPreview {
  rawText: string;
  generatedText: string;
  method: 'gpt' | 'deterministic';
  user: {
    id: string;
    fullName: string;
  };
  options: {
    tone: string;
    length: string;
    temperature: number;
  };
}

// Post services (extending existing)
export const postService = {
  createPost: async (
    rawText: string, 
    userId: string, 
    groupIds?: string[], 
    options?: NewsflashOptions
  ) => {
    const response = await api.post("/posts", {
      rawText,
      userId,
      ...(groupIds && groupIds.length > 0 && { groupIds }),
      ...(options && {
        tone: options.tone,
        length: options.length,
        temperature: options.temperature,
      }),
    });
    return response.data;
  },

  generateNewsflashPreview: async (
    rawText: string,
    userId: string,
    options?: NewsflashOptions
  ): Promise<{ data: NewsflashPreview }> => {
    const response = await api.post("/posts/generate-newsflash", {
      rawText,
      userId,
      ...(options && {
        tone: options.tone,
        length: options.length,
        temperature: options.temperature,
      }),
    });
    return response.data;
  },

  getAllPosts: async (page = 1, limit = 20) => {
    const response = await api.get(`/posts?page=${page}&limit=${limit}`);
    return response.data;
  },

  getUserPosts: async (userId: string, page = 1, limit = 20) => {
    const response = await api.get(`/posts/${userId}?page=${page}&limit=${limit}`);
    return response.data;
  },
};

export default api; 