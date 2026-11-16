import { apiClient } from '../api/apiClient';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  type?: string;
  data?: Record<string, any>;
}

export class NotificationService {
  /**
   * Register push device token
   */
  static async registerDeviceToken(token: string, platform: 'android' | 'ios'): Promise<boolean> {
    try {
      await apiClient.post('/api/push/register', { token, platform });
      return true;
    } catch {
      try {
        await apiClient.post('/api/notifications/register', { token, platform });
        return true;
      } catch {
        return false;
      }
    }
  }

  /**
   * Fetch current user notifications
   */
  static async getNotifications(): Promise<AppNotification[]> {
    try {
      const response = await apiClient.get<any>('/api/notifications');
      if (Array.isArray(response.data)) return response.data;
      if (response.data && Array.isArray(response.data.notifications)) {
        return response.data.notifications;
      }
      return [];
    } catch {
      return [];
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(id: string): Promise<boolean> {
    try {
      await apiClient.patch(`/api/notifications/${id}/read`);
      return true;
    } catch {
      return false;
    }
  }
}
