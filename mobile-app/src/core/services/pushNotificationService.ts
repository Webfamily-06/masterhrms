import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { apiClient } from '../api/apiClient';

// Configure how foreground notifications are handled
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export class PushNotificationService {
  private static isInitialized = false;

  /**
   * Registers the mobile device for push notifications and syncs with backend.
   */
  public static async registerForPushNotifications(): Promise<string | null> {
    try {
      if (!Device.isDevice) {
        console.log('[Push] Must use physical device for native push notifications');
        return null;
      }

      // 1. Request OS permission
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('[Push] Push notification permission not granted');
        return null;
      }

      // Android specific notification channel setup
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'MasterHRMS Alerts',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#4F46E5',
        });

        await Notifications.setNotificationChannelAsync('calls', {
          name: 'MasterHRMS Calls',
          importance: Notifications.AndroidImportance.HIGH,
          sound: 'default',
          vibrationPattern: [0, 500, 250, 500],
          lightColor: '#10B981',
        });
      }

      // 2. Fetch Expo push token
      let pushToken = '';
      try {
        const tokenData = await Notifications.getExpoPushTokenAsync();
        pushToken = tokenData.data;
      } catch {
        // Fallback to native device push token
        const deviceToken = await Notifications.getDevicePushTokenAsync();
        pushToken = deviceToken.data;
      }

      if (!pushToken) {
        console.warn('[Push] Unable to obtain push token');
        return null;
      }

      // 3. Register token with backend push endpoints
      const deviceId = `${Platform.OS}_${Device.modelName || 'device'}_${Date.now()}`;

      // Register with /api/push/register (mobile tokens)
      await Promise.resolve(
        apiClient.post('/api/push/register', {
          token: pushToken,
          platform: Platform.OS,
          deviceId,
        })
      ).catch(() => {});

      // Register with /api/notifications/push/subscribe (standard WebPush/FCM pipeline)
      await Promise.resolve(
        apiClient.post('/api/notifications/push/subscribe', {
          endpoint: pushToken,
          keys: {
            p256dh: 'mobile-app-fcm-native',
            auth: 'mobile-app-fcm-auth',
          },
          deviceId,
          platform: Platform.OS,
        })
      ).catch(() => {});

      return pushToken;
    } catch (err: any) {
      console.warn('[Push] Error registering push notifications:', err?.message || err);
      return null;
    }
  }

  /**
   * Sets up notification event listeners.
   */
  public static initListeners(onNotificationClick?: (data: any) => void) {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Triggered when a notification is received while app is in foreground
    Notifications.addNotificationReceivedListener((notification) => {
      console.log('[Push] Notification received in foreground:', notification.request.content);
    });

    // Triggered when a user interacts with a notification (taps it)
    Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (onNotificationClick && data) {
        onNotificationClick(data);
      }
    });
  }
}
