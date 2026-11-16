import { apiClient } from '../api/apiClient';

export interface ChatParticipant {
  id: string;
  name: string;
  avatar?: string;
  email?: string;
  role?: string;
  online?: boolean;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  replyTo?: {
    id: string;
    senderName: string;
    content: string;
  };
  attachments?: {
    id: string;
    name: string;
    url: string;
    type: 'image' | 'file' | 'audio';
    size?: number;
  }[];
  reactions?: {
    emoji: string;
    count: number;
    users: string[];
  }[];
  poll?: {
    id: string;
    question: string;
    options: {
      id: string;
      text: string;
      votes: number;
      voters: string[];
    }[];
    closed: boolean;
  };
  isPinned?: boolean;
  isDeleted?: boolean;
}

export interface ChatConversation {
  id: string;
  type: 'direct' | 'group' | 'announcement';
  name: string;
  avatar?: string;
  lastMessage?: {
    content: string;
    senderName: string;
    createdAt: string;
  };
  unreadCount: number;
  isPinned?: boolean;
  isMuted?: boolean;
  participants: ChatParticipant[];
  updatedAt: string;
}

export interface ChatContact {
  id: string;
  name: string;
  email: string;
  department?: string;
  designation?: string;
  avatar?: string;
  online?: boolean;
}

export interface CallLogItem {
  id: string;
  callerId: string;
  callerName: string;
  receiverId: string;
  receiverName: string;
  callType: 'audio' | 'video';
  status: 'COMPLETED' | 'MISSED' | 'REJECTED';
  durationSeconds: number;
  createdAt: string;
}

export class ChatService {
  public static async getConversations(type?: string): Promise<ChatConversation[]> {
    try {
      const res = await apiClient.get('/api/chat/conversations', {
        params: { type, limit: 50 },
      });
      return res.data?.conversations || res.data || [];
    } catch {
      return [];
    }
  }

  public static async createDirectConversation(targetUserId: string): Promise<ChatConversation | null> {
    try {
      const res = await apiClient.post('/api/chat/conversations/direct', { targetUserId });
      return res.data?.conversation || res.data;
    } catch {
      return null;
    }
  }

  public static async getMessages(threadId: string, limit = 50, before?: string): Promise<ChatMessage[]> {
    try {
      const res = await apiClient.get(`/api/chat/messages/${threadId}`, {
        params: { limit, before },
      });
      return res.data?.messages || res.data || [];
    } catch {
      return [];
    }
  }

  public static async sendMessage(payload: {
    threadId: string;
    content: string;
    replyToId?: string;
    attachments?: any[];
    poll?: any;
  }): Promise<ChatMessage | null> {
    const res = await apiClient.post('/api/chat/messages', payload);
    return res.data?.message || res.data;
  }

  public static async editMessage(id: string, content: string): Promise<ChatMessage | null> {
    const res = await apiClient.patch(`/api/chat/messages/${id}`, { content });
    return res.data?.message || res.data;
  }

  public static async deleteMessage(id: string): Promise<boolean> {
    await apiClient.delete(`/api/chat/messages/${id}`);
    return true;
  }

  public static async pinMessage(id: string, isPinned: boolean): Promise<boolean> {
    await apiClient.post(`/api/chat/messages/${id}/pin`, { isPinned });
    return true;
  }

  public static async reactToMessage(id: string, emoji: string): Promise<any> {
    const res = await apiClient.post(`/api/chat/messages/${id}/react`, { emoji });
    return res.data;
  }

  public static async votePoll(messageId: string, optionId: string): Promise<any> {
    const res = await apiClient.post(`/api/chat/messages/${messageId}/poll/vote`, { optionId });
    return res.data;
  }

  public static async markThreadRead(threadId: string): Promise<boolean> {
    try {
      await apiClient.post(`/api/chat/messages/${threadId}/read`);
      return true;
    } catch {
      return false;
    }
  }

  public static async getContacts(search?: string): Promise<ChatContact[]> {
    try {
      const res = await apiClient.get('/api/chat/contacts', {
        params: { search },
      });
      return res.data?.contacts || res.data || [];
    } catch {
      return [];
    }
  }

  public static async getGroups(): Promise<any[]> {
    try {
      const res = await apiClient.get('/api/chat/groups');
      return res.data?.groups || res.data || [];
    } catch {
      return [];
    }
  }

  public static async createGroup(name: string, description?: string, memberIds: string[] = []): Promise<any> {
    const res = await apiClient.post('/api/chat/groups', { name, description, memberIds });
    return res.data?.group || res.data;
  }

  public static async getCalls(limit = 30): Promise<CallLogItem[]> {
    try {
      const res = await apiClient.get('/api/chat/calls', {
        params: { limit },
      });
      return res.data?.calls || res.data || [];
    } catch {
      return [];
    }
  }

  public static async initiateCall(receiverId: string, callType: 'audio' | 'video'): Promise<any> {
    const res = await apiClient.post('/api/chat/calls', { receiverId, callType });
    return res.data;
  }
}
