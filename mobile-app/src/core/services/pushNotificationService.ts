import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

export type PushTokenType = 'expo' | 'fcm' | 'apns' | 'none';

export interface PushCapabilityStatus {
  isPhysicalDevice: boolean;
  permissionGranted: boolean;
  tokenType: PushTokenType;
  pushToken: string | null;
  serverRegistrationStatus: 'unsupported_backend' | 'registered' | 'failed' | 'not_attempted';
  statusReason: string;
}

// Configure how foreground notifications are handled safely
try {
  if (Notifications && typeof Notifications.setNotificationHandler === 'function') {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }
} catch (handlerErr) {
  console.warn('[Push] Could not configure notification handler:', handlerErr);
}

export class PushNotificationService {
  private static isInitialized = false;
  private static currentStatus: PushCapabilityStatus = {
    isPhysicalDevice: false,
    permissionGranted: false,
    tokenType: 'none',
    pushToken: null,
    serverRegistrationStatus: 'not_attempted',
    statusReason: 'Push registration not yet initialized',
  };

  /**
   * Returns current honest push notification capability status.
   */
  public static getCapabilityStatus(): PushCapabilityStatus {
    return { ...this.currentStatus };
  }

  /**
   * Registers the mobile device for push notifications and evaluates backend compatibility.
   * Strict Rule: Never send fabricated VAPID keys and never call non-existent endpoints.
   */
  public static async registerForPushNotifications(): Promise<string | null> {
    try {
      if (!Device.isDevice) {
        this.currentStatus = {
          isPhysicalDevice: false,
          permissionGranted: false,
          tokenType: 'none',
          pushToken: null,
          serverRegistrationStatus: 'not_attempted',
          statusReason: 'Simulator / Emulator environment does not support native remote push notifications.',
        };
        console.log('[Push]', this.currentStatus.statusReason);
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
        this.currentStatus = {
          isPhysicalDevice: true,
          permissionGranted: false,
          tokenType: 'none',
          pushToken: null,
          serverRegistrationStatus: 'not_attempted',
          statusReason: 'Push notification permission was denied by user in system settings.',
        };
        console.warn('[Push]', this.currentStatus.statusReason);
        return null;
      }

      // 2. Android specific notification channels setup
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

      // 3. Obtain real device/expo push token
      let pushToken = '';
      let tokenType: PushTokenType = 'none';

      try {
        const tokenData = await Notifications.getExpoPushTokenAsync();
        pushToken = tokenData.data;
        tokenType = 'expo';
      } catch {
        // Fallback to native FCM (Android) or APNs (iOS) token
        try {
          const deviceToken = await Notifications.getDevicePushTokenAsync();
          pushToken = deviceToken.data;
          tokenType = Platform.OS === 'android' ? 'fcm' : 'apns';
        } catch (tokenErr: any) {
          console.warn('[Push] Failed to acquire device push token:', tokenErr?.message);
        }
      }

      if (!pushToken) {
        this.currentStatus = {
          isPhysicalDevice: true,
          permissionGranted: true,
          tokenType: 'none',
          pushToken: null,
          serverRegistrationStatus: 'failed',
          statusReason: 'Unable to acquire native push token from OS provider.',
        };
        return null;
      }

      // 4. Honest Server Registration Evaluation
      // The current MasterHRMS Express backend uses Web Push VAPID subscriptions (/api/notifications/push/subscribe),
      // requiring valid browser P-256 elliptic curve keys (p256dh, auth).
      // The backend does not expose a native FCM/APNs registration route (e.g. /api/push/register does not exist).
      // We document this cleanly and do NOT inject fabricated VAPID keys or call non-existent endpoints.
      this.currentStatus = {
        isPhysicalDevice: true,
        permissionGranted: true,
        tokenType,
        pushToken,
        serverRegistrationStatus: 'unsupported_backend',
        statusReason:
          'Native device push token obtained successfully. Express backend requires native FCM/APNs registration endpoint; current server push pipeline only supports Web Push VAPID subscriptions.',
      };

      console.log(`[Push] Device push token acquired (${tokenType}): ${pushToken.slice(0, 16)}...`);
      console.log(`[Push] Server status: ${this.currentStatus.statusReason}`);

      return pushToken;
    } catch (err: any) {
      this.currentStatus = {
        isPhysicalDevice: Boolean(Device.isDevice),
        permissionGranted: false,
        tokenType: 'none',
        pushToken: null,
        serverRegistrationStatus: 'failed',
        statusReason: err?.message || 'Unexpected error during push registration',
      };
      console.warn('[Push] Registration error:', this.currentStatus.statusReason);
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
