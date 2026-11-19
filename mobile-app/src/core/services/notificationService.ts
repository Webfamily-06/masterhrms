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
  /**
   * Register native push device token with MasterHRMS backend
   */
  static async registerDeviceToken(token: string, platform: 'android' | 'ios'): Promise<boolean> {
    try {
      await apiClient.post('/api/notifications/push/device-token', {
        token,
        platform,
      });
      return true;
    } catch {
      // Fallback for environments where push subscription store is Web-only
      try {
        await apiClient.post('/api/notifications/push/subscribe', {
          endpoint: token,
          deviceId: token,
          platform,
          keys: {
            p256dh: `mobile_${platform}_${token.slice(-16)}`,
            auth: `mobile_auth_${token.slice(0, 16)}`,
          },
        });
        return true;
      } catch {
        try {
          await apiClient.post('/api/notifications/push/register', { token, platform });
          return true;
        } catch {
          return false;
        }
      }
    }
  }
    }
  }

  /**
   * Fetch current user notifications.
   * Calls GET /api/v1/me/notifications with fallback to GET /api/v1/shared/notifications.
   */
  static async getNotifications(): Promise<AppNotification[]> {
    try {
      const response = await apiClient.get<any>('/api/v1/me/notifications');
      const data = response.data;
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.notifications)) {
        return data.notifications;
      }
      if (data && Array.isArray(data.data)) {
        return data.data;
      }
      return [];
    } catch {
      try {
        const fallback = await apiClient.get<any>('/api/v1/shared/notifications');
        const fbData = fallback.data;
        if (Array.isArray(fbData)) return fbData;
        if (fbData && Array.isArray(fbData.notifications)) {
          return fbData.notifications;
        }
        if (fbData && Array.isArray(fbData.data)) {
          return fbData.data;
        }
        return [];
      } catch {
        return [];
      }
    }
  }

  /**
   * Mark single notification as read.
   * Calls POST /api/v1/shared/notifications/:id/read.
   */
  static async markAsRead(id: string): Promise<boolean> {
    try {
      await apiClient.post(`/api/v1/shared/notifications/${id}/read`);
      return true;
    } catch {
      try {
        await apiClient.post(`/api/shared/notifications/${id}/read`);
        return true;
      } catch {
        try {
          await apiClient.patch(`/api/notifications/${id}/read`);
          return true;
        } catch {
          return false;
        }
      }
    }
  }

  /**
   * Mark all notifications as read for current user.
   * Calls POST /api/v1/shared/notifications/read-all.
   */
  static async markAllAsRead(): Promise<boolean> {
    try {
      await apiClient.post('/api/v1/shared/notifications/read-all');
      return true;
    } catch {
      try {
        await apiClient.post('/api/shared/notifications/read-all');
        return true;
      } catch {
        return false;
      }
    }
  }
}
