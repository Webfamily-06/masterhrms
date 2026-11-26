import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as TaskManager from 'expo-task-manager';
import { isRunningInExpoGo } from 'expo';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { apiClient } from '../api/apiClient';

export type AppRuntimeEnvironment = 'expo-go' | 'development-build' | 'production';

let mockRuntimeOverride: AppRuntimeEnvironment | null = null;
/**
 * Supported Expo runtime environment detection.
 * Distinguishes:
 * 1. 'expo-go': Expo Go StoreClient runner (remote notifications unsupported on Android since SDK 53).
 * 2. 'development-build': Custom native build running in debug mode (npx expo run:android / expo-dev-client).
 * 3. 'production': Standalone production APK / AAB / IPA release build.
 */
export const getAppRuntimeEnvironment = (): AppRuntimeEnvironment => {
  if (mockRuntimeOverride) {
    return mockRuntimeOverride;
  }

  let inExpoGo = false;
  try {
    if (typeof isRunningInExpoGo === 'function') {
      inExpoGo = isRunningInExpoGo();
    }
  } catch {
    inExpoGo = false;
  }

  if (
    !inExpoGo &&
    (Constants?.executionEnvironment === ExecutionEnvironment.StoreClient ||
      Constants?.appOwnership === 'expo' ||
      Boolean(Constants?.expoVersion))
  ) {
    inExpoGo = true;
  }

  if (inExpoGo) {
    return 'expo-go';
  }

  if (__DEV__) {
    return 'development-build';
  }

  return 'production';
};

export const isExpoGoEnvironment = (): boolean => {
  return getAppRuntimeEnvironment() === 'expo-go';
};export type PushTokenType = 'expo' | 'fcm' | 'apns' | 'none';

export const BACKGROUND_NOTIFICATION_TASK = 'MASTERHRMS_BACKGROUND_NOTIFICATION';

// Define background notification task safely (custom native builds only; unsupported in Expo Go)
try {
  if (!isExpoGoEnvironment() && TaskManager && typeof TaskManager.defineTask === 'function') {
    if (!TaskManager.isTaskDefined(BACKGROUND_NOTIFICATION_TASK)) {
      TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async ({ data, error, executionInfo }: any) => {
        if (error) {
          console.warn('[Push] Background task error:', error);
          return;
        }
        if (data) {
          console.log('[Push] Background notification received:', data, executionInfo);
        }
      });
    }
  }
} catch (taskErr) {
  // Gracefully silence background task registration warning in Expo Go
}

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
  private static hasLoggedExpoGoNotice = false;
  private static tokenRefreshSubscription: Notifications.Subscription | null = null;
  private static currentStatus: PushCapabilityStatus = {
    isPhysicalDevice: false,
    permissionGranted: false,
    tokenType: 'none',
    pushToken: null,
    serverRegistrationStatus: 'not_attempted',
    statusReason: 'Push registration not yet initialized',
  };

  /**
   * Resets internal status for test isolation.
   */
  public static resetStateForTesting() {
    this.isInitialized = false;
    this.hasLoggedExpoGoNotice = false;
    if (this.tokenRefreshSubscription) {
      try {
        this.tokenRefreshSubscription.remove();
      } catch {
        // ignore
      }
      this.tokenRefreshSubscription = null;
    }
    this.currentStatus = {
      isPhysicalDevice: false,
      permissionGranted: false,
      tokenType: 'none',
      pushToken: null,
      serverRegistrationStatus: 'not_attempted',
      statusReason: 'Push registration not yet initialized',
    };
  }

  /**
   * Returns current honest push notification capability status.
   */
  public static getCapabilityStatus(): PushCapabilityStatus {
    return { ...this.currentStatus };
  }

  /**
   * Configures Android notification channels for native development and production builds.
   * Skipped in Expo Go on Android to prevent NullPointerException from unsupported native channel manager.
   */
  public static async configureAndroidChannelsAsync(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return true;
    }

    if (isExpoGoEnvironment()) {
      return false;
    }

    try {
      if (typeof Notifications.setNotificationChannelAsync === 'function') {
        // 1. Default high-priority notification channel for chat and general alerts
        await Notifications.setNotificationChannelAsync('default', {
          name: 'MasterHRMS Alerts',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#4F46E5',
          enableVibrate: true,
          showBadge: true,
          enableLights: true,
        });

        // 2. High-priority incoming call channel with DND bypass
        await Notifications.setNotificationChannelAsync('calls', {
          name: 'MasterHRMS Calls',
          importance: Notifications.AndroidImportance.MAX,
          sound: 'default',
          vibrationPattern: [0, 500, 250, 500],
          lightColor: '#10B981',
          enableVibrate: true,
          showBadge: true,
          enableLights: true,
          bypassDnd: true,
        });
        return true;
      }
    } catch (chanErr: any) {
      console.warn('[Push] Could not configure notification channels:', chanErr?.message || chanErr);
    }
    return false;
  }

  /**
   * Registers or refreshes the native device push token with the MasterHRMS backend API.
   * Uses bounded exponential retry to handle transient network errors safely without crashing startup.
   */
  public static async syncDeviceTokenWithBackend(
    token: string,
    tokenType: PushTokenType,
    maxRetries: number = 3
  ): Promise<boolean> {
    let attempt = 0;
    while (attempt < maxRetries) {
      attempt++;
      try {
        await apiClient.post('/api/notifications/push/device-token', {
          token,
          platform: Platform.OS,
          tokenType,
          deviceId: Device.modelName || `${Platform.OS}_device`,
          appVersion: Constants?.expoConfig?.version || '0.0.1',
        });

        this.currentStatus = {
          isPhysicalDevice: true,
          permissionGranted: true,
          tokenType,
          pushToken: token,
          serverRegistrationStatus: 'registered',
          statusReason: `Native device push token (${tokenType}) registered successfully with MasterHRMS backend.`,
        };
        return true;
      } catch (regErr: any) {
        const isLastAttempt = attempt >= maxRetries;
        const errMsg =
          regErr?.response?.data?.error || regErr?.message || 'Server rejected device token registration';

        if (isLastAttempt) {
          console.warn(`[Push] Server device token registration failed after ${attempt} attempt(s):`, errMsg);
          this.currentStatus = {
            isPhysicalDevice: true,
            permissionGranted: true,
            tokenType,
            pushToken: token,
            serverRegistrationStatus: 'failed',
            statusReason: errMsg,
          };
          return false;
        }

        // Bounded backoff delay before retry
        await new Promise((res) => setTimeout(() => res(true), attempt * 500));
      }
    }
    return false;
  }

  /**
   * Sets up a listener for token refresh events emitted by Google Play Services / Firebase.
   */
  public static setupTokenRefreshListener() {
    if (this.tokenRefreshSubscription || isExpoGoEnvironment()) {
      return;
    }

    try {
      if (typeof Notifications.addPushTokenListener === 'function') {
        this.tokenRefreshSubscription = Notifications.addPushTokenListener(async (tokenData) => {
          const refreshedToken = tokenData.data;
          const refreshedType: PushTokenType =
            tokenData.type === 'fcm' ? 'fcm' : Platform.OS === 'android' ? 'fcm' : 'apns';

          if (refreshedToken && refreshedToken !== this.currentStatus.pushToken) {
            console.log(`[Push] Native token refreshed (${refreshedType}): ${refreshedToken.slice(0, 16)}...`);
            await this.syncDeviceTokenWithBackend(refreshedToken, refreshedType, 3);
          }
        });
      }
    } catch (refreshErr: any) {
      console.warn('[Push] Could not attach token refresh listener:', refreshErr?.message || refreshErr);
    }
  }

  /**
   * Registers the mobile device for push notifications based on active runtime environment.
   *
   * Behavior matrix:
   * - In Expo Go on Android: Skips remote push registration & channel setup; logs a single clear notice.
   * - In Custom Dev / Standalone builds: Configures channels, requests OS permissions, acquires actual FCM token,
   *   and registers with MasterHRMS backend with bounded retry.
   */
  public static async registerForPushNotifications(): Promise<string | null> {
    try {
      // 1. Runtime environment check: Expo Go vs Custom Native Development Build
      const runtime = getAppRuntimeEnvironment();
      if (runtime === 'expo-go') {
        if (!this.hasLoggedExpoGoNotice) {
          this.hasLoggedExpoGoNotice = true;
          console.info(
            '[Push] Running in Expo Go. Native remote push notifications (FCM) and notification channels are unsupported in Expo Go on Android (SDK 53+). Local in-app notifications and Socket.IO bridges remain active. Custom development build required for native FCM.'
          );
        }
        this.currentStatus = {
          isPhysicalDevice: Boolean(Device.isDevice),
          permissionGranted: false,
          tokenType: 'none',
          pushToken: null,
          serverRegistrationStatus: 'unsupported_backend',
          statusReason:
            'Expo Go environment: Native remote push registration skipped. Use custom development build (npx expo run:android).',
        };
        return null;
      }

      // 2. Physical device check
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

      // 3. Android notification channels setup (native development / standalone builds only)
      if (Platform.OS === 'android') {
        await this.configureAndroidChannelsAsync();
      }

      // 4. Request OS permissions contextually
      let existingStatus: Notifications.PermissionStatus | undefined;
      try {
        const perm = await Notifications.getPermissionsAsync();
        existingStatus = perm?.status;
      } catch (permErr: any) {
        console.warn('[Push] Error checking notification permissions:', permErr?.message || permErr);
      }

      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        try {
          const req = await Notifications.requestPermissionsAsync();
          finalStatus = req?.status;
        } catch (reqErr: any) {
          console.warn('[Push] Error requesting notification permissions:', reqErr?.message || reqErr);
        }
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

      // 5. Register background notification task (native builds only)
      try {
        if (typeof Notifications.registerTaskAsync === 'function') {
          await Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK);
        }
      } catch {
        // Non-fatal if already registered
      }

      // 6. Acquire native FCM device token (Android) or APNs (iOS), falling back to Expo token
      let pushToken = '';
      let tokenType: PushTokenType = 'none';

      // On Android native development build, acquire direct FCM device push token
      if (Platform.OS === 'android') {
        try {
          const deviceToken = await Notifications.getDevicePushTokenAsync();
          if (deviceToken?.data) {
            pushToken = deviceToken.data;
            tokenType = 'fcm';
          }
        } catch (fcmErr: any) {
          console.warn(
            '[Push] Direct getDevicePushTokenAsync (FCM) returned error, attempting fallback to Expo token:',
            fcmErr?.message || fcmErr
          );
        }
      } else if (Platform.OS === 'ios') {
        try {
          const deviceToken = await Notifications.getDevicePushTokenAsync();
          if (deviceToken?.data) {
            pushToken = deviceToken.data;
            tokenType = 'apns';
          }
        } catch {
          // fallback to expo push token
        }
      }

      // Fallback to Expo Push Token if direct native provider token was not acquired
      if (!pushToken) {
        try {
          const tokenData = await Notifications.getExpoPushTokenAsync();
          if (tokenData?.data) {
            pushToken = tokenData.data;
            tokenType = 'expo';
          }
        } catch (expoErr: any) {
          console.warn('[Push] Failed to acquire Expo push token:', expoErr?.message || expoErr);
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

      // 7. Register native device token with MasterHRMS backend
      await this.syncDeviceTokenWithBackend(pushToken, tokenType, 3);

      console.log(`[Push] Device push token acquired (${tokenType}): ${pushToken.slice(0, 16)}...`);
      console.log(`[Push] Server status: ${this.currentStatus.statusReason}`);

      // 8. Attach token refresh listener for future token rotations
      this.setupTokenRefreshListener();

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
   * Revokes the active device push token from the backend upon user logout.
   */
  public static async unregisterDeviceToken(): Promise<boolean> {
    try {
      const activeToken = this.currentStatus.pushToken;
      if (!activeToken) return true;

      await apiClient.delete('/api/notifications/push/device-token', {
        data: {
          token: activeToken,
          deviceId: Device.modelName || undefined,
        },
      });

      this.currentStatus = {
        ...this.currentStatus,
        pushToken: null,
        serverRegistrationStatus: 'not_attempted',
        statusReason: 'Device token revoked on logout.',
      };
      return true;
    } catch (err: any) {
      console.warn('[Push] Failed to unregister device token on logout:', err?.message || err);
      return false;
    }
  }

  /**
   * Immediately presents a system notification in the device notification tray.
   * Safe for both Expo Go (omits custom channel to prevent crash) and native builds (uses configured channels).
   */
  public static async presentLocalNotification(params: {
    title: string;
    body: string;
    data?: Record<string, any>;
    channelId?: 'default' | 'calls';
    sound?: boolean;
  }): Promise<string | null> {
    try {
      const isExpoGo = isExpoGoEnvironment();
      const channelId = isExpoGo ? undefined : params.channelId || 'default';

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: params.title,
          body: params.body,
          data: params.data || {},
          sound: params.sound !== false,
          priority: Notifications.AndroidNotificationPriority.MAX,
          vibrate: [0, 250, 250, 250],
          ...(Platform.OS === 'android' && channelId ? { channelId } : {}),
        },
        trigger: null, // triggers immediately
      });
      return notificationId;
    } catch (err) {
      console.warn('[Push] Error presenting local notification:', err);
      return null;
    }
  }

  /**
   * Sets up notification event listeners.
   */
  public static initListeners(onNotificationClick?: (data: any) => void) {
    if (this.isInitialized) return;
    this.isInitialized = true;

    try {
      if (typeof Notifications.addNotificationReceivedListener === 'function') {
        // Triggered when a notification is received while app is in foreground
        Notifications.addNotificationReceivedListener((notification) => {
          console.log('[Push] Notification received in foreground:', notification.request.content);
        });
      }
    } catch (e) {
      // Ignored in unsupported environments
    }

    try {
      if (typeof Notifications.addNotificationResponseReceivedListener === 'function') {
        // Triggered when a user interacts with a notification (taps it)
        Notifications.addNotificationResponseReceivedListener((response) => {
          const data = response.notification?.request?.content?.data;
          if (onNotificationClick && data) {
            onNotificationClick(data);
          }
        });
      }
    } catch (e) {
      // Ignored in unsupported environments
    }
  }
}
