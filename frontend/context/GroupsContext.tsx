import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import { groupService, Group, UserGroups } from "../services/api";

interface GroupsContextType {
  userGroups: UserGroups | null;
  isLoading: boolean;
  refreshGroups: () => Promise<void>;
  createGroup: (name: string, description?: string) => Promise<Group | null>;
  inviteToGroup: (groupId: string, userIds: string[]) => Promise<boolean>;
  acceptInvitation: (groupId: string) => Promise<boolean>;
  leaveGroup: (groupId: string) => Promise<boolean>;
}

const GroupsContext = createContext<GroupsContextType | undefined>(undefined);

export const GroupsProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [userGroups, setUserGroups] = useState<UserGroups | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refreshGroups = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const response = await groupService.getUserGroups(user.id);
      setUserGroups(response.data);
    } catch (error) {
      console.error("Failed to fetch user groups:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const createGroup = async (
    name: string,
    description?: string
  ): Promise<Group | null> => {
    if (!user) return null;

    try {
      const response = await groupService.createGroup(user.id, {
        name,
        description,
      });
      
      // Refresh groups after creating
      await refreshGroups();
      
      return response.data;
    } catch (error) {
      console.error("Failed to create group:", error);
      return null;
    }
  };

  const inviteToGroup = async (
    groupId: string,
    userIds: string[]
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      await groupService.inviteToGroup(groupId, {
        userIds,
        userId: user.id,
      });
      
      // Refresh groups after inviting
      await refreshGroups();
      
      return true;
    } catch (error) {
      console.error("Failed to invite to group:", error);
      return false;
    }
  };

  const acceptInvitation = async (groupId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      await groupService.acceptInvitation(groupId, user.id);
      
      // Refresh groups after accepting
      await refreshGroups();
      
      return true;
    } catch (error) {
      console.error("Failed to accept invitation:", error);
      return false;
    }
  };

  const leaveGroup = async (groupId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      await groupService.leaveGroup(groupId, user.id);
      
      // Refresh groups after leaving
      await refreshGroups();
      
      return true;
    } catch (error) {
      console.error("Failed to leave group:", error);
      return false;
    }
  };

  // Load groups when user changes
  useEffect(() => {
    if (user) {
      refreshGroups();
    } else {
      setUserGroups(null);
    }
  }, [user]);

  return (
    <GroupsContext.Provider
      value={{
        userGroups,
        isLoading,
        refreshGroups,
        createGroup,
        inviteToGroup,
        acceptInvitation,
        leaveGroup,
      }}
    >
      {children}
    </GroupsContext.Provider>
  );
};

export const useGroups = () => {
  const context = useContext(GroupsContext);
  if (context === undefined) {
    throw new Error("useGroups must be used within a GroupsProvider");
  }
  return context;
}; 