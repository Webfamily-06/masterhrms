import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import {
  PushNotificationService,
  setAppRuntimeOverrideForTesting,
} from '../src/core/services/pushNotificationService';
import { apiClient } from '../src/core/api/apiClient';

jest.mock('../src/core/api/apiClient', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('MASTERHRMS Notification Lifecycle & Native FCM Development Build Suite', () => {
  const origPlatformOS = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    PushNotificationService.resetStateForTesting();
    setAppRuntimeOverrideForTesting(null);
    Object.defineProperty(Platform, 'OS', { value: 'android', writable: true });
    (Device as any).isDevice = true;
    (Device as any).modelName = 'Pixel 7 Pro';
  });

  afterAll(() => {
    Object.defineProperty(Platform, 'OS', { value: origPlatformOS, writable: true });
    setAppRuntimeOverrideForTesting(null);
  });

  // 1. Expo Go skips native push initialization
  it('1. Expo Go skips native push initialization, channel setup, and token acquisition', async () => {
    setAppRuntimeOverrideForTesting('expo-go');

    const channelSpy = jest.spyOn(Notifications, 'setNotificationChannelAsync');
    const deviceTokenSpy = jest.spyOn(Notifications, 'getDevicePushTokenAsync');
    const expoTokenSpy = jest.spyOn(Notifications, 'getExpoPushTokenAsync');
    const postSpy = jest.spyOn(apiClient, 'post');

    const token = await PushNotificationService.registerForPushNotifications();

    expect(token).toBeNull();
    expect(channelSpy).not.toHaveBeenCalled();
    expect(deviceTokenSpy).not.toHaveBeenCalled();
    expect(expoTokenSpy).not.toHaveBeenCalled();
    expect(postSpy).not.toHaveBeenCalled();

    const status = PushNotificationService.getCapabilityStatus();
    expect(status.serverRegistrationStatus).toBe('unsupported_backend');
    expect(status.statusReason).toContain('Expo Go environment');
    expect(status.tokenType).toBe('none');

    // Subsequent calls in Expo Go should cleanly return null without repeating warnings
    const tokenSecondCall = await PushNotificationService.registerForPushNotifications();
    expect(tokenSecondCall).toBeNull();
  });

  // 2. Development build configures notification channels
  it('2. Development build configures default and calls notification channels on Android', async () => {
    setAppRuntimeOverrideForTesting('development-build');

    const channelSuccess = await PushNotificationService.configureAndroidChannelsAsync();
    expect(channelSuccess).toBe(true);

    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
      'default',
      expect.objectContaining({
        name: 'MasterHRMS Alerts',
        importance: Notifications.AndroidImportance.MAX,
        lightColor: '#4F46E5',
        showBadge: true,
      })
    );

    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
      'calls',
      expect.objectContaining({
        name: 'MasterHRMS Calls',
        importance: Notifications.AndroidImportance.MAX,
        lightColor: '#10B981',
        bypassDnd: true,
      })
    );
  });

  // 3. Development build acquires native FCM token
  it('3. Development build acquires actual native FCM token via getDevicePushTokenAsync', async () => {
    setAppRuntimeOverrideForTesting('development-build');

    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'granted' });
    (Notifications.getDevicePushTokenAsync as jest.Mock).mockResolvedValueOnce({
      type: 'fcm',
      data: 'fcm_native_real_device_token_xyz_999',
    });
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      data: { success: true, message: 'Device token registered' },
    });

    const token = await PushNotificationService.registerForPushNotifications();

    expect(token).toBe('fcm_native_real_device_token_xyz_999');
    const status = PushNotificationService.getCapabilityStatus();
    expect(status.isPhysicalDevice).toBe(true);
    expect(status.tokenType).toBe('fcm');
    expect(status.pushToken).toBe('fcm_native_real_device_token_xyz_999');
  });

  // 4. Backend registration succeeds
  it('4. Backend registration succeeds with registered status and correct payload', async () => {
    setAppRuntimeOverrideForTesting('development-build');

    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'granted' });
    (Notifications.getDevicePushTokenAsync as jest.Mock).mockResolvedValueOnce({
      type: 'fcm',
      data: 'fcm_token_test_123',
    });
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      data: { success: true },
    });

    await PushNotificationService.registerForPushNotifications();

    expect(apiClient.post).toHaveBeenCalledWith('/api/notifications/push/device-token', {
      token: 'fcm_token_test_123',
      platform: 'android',
      tokenType: 'fcm',
      deviceId: 'Pixel 7 Pro',
      appVersion: expect.any(String),
    });

    const status = PushNotificationService.getCapabilityStatus();
    expect(status.serverRegistrationStatus).toBe('registered');
    expect(status.statusReason).toContain('registered successfully with MasterHRMS backend');
  });

  // 5. Token refresh works
  it('5. Token refresh listener syncs rotated FCM token with backend', async () => {
    setAppRuntimeOverrideForTesting('development-build');

    let listenerCallback: ((data: any) => Promise<void>) | null = null;
    (Notifications.addPushTokenListener as jest.Mock).mockImplementationOnce((cb) => {
      listenerCallback = cb;
      return { remove: jest.fn() };
    });

    // Initial registration
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'granted' });
    (Notifications.getDevicePushTokenAsync as jest.Mock).mockResolvedValueOnce({
      type: 'fcm',
      data: 'fcm_initial_token_111',
    });
    (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: { success: true } });

    await PushNotificationService.registerForPushNotifications();
    expect(PushNotificationService.getCapabilityStatus().pushToken).toBe('fcm_initial_token_111');

    // Simulate token refresh from Google Play Services
    expect(listenerCallback).toBeDefined();
    (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: { success: true } });

    if (listenerCallback) {
      await (listenerCallback as any)({
        type: 'fcm',
        data: 'fcm_refreshed_token_222',
      });
    }

    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/notifications/push/device-token',
      expect.objectContaining({
        token: 'fcm_refreshed_token_222',
        tokenType: 'fcm',
      })
    );
    expect(PushNotificationService.getCapabilityStatus().pushToken).toBe('fcm_refreshed_token_222');
  });

  // 6. Logout revokes token
  it('6. Logout revokes token through backend unregister endpoint', async () => {
    setAppRuntimeOverrideForTesting('development-build');

    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'granted' });
    (Notifications.getDevicePushTokenAsync as jest.Mock).mockResolvedValueOnce({
      type: 'fcm',
      data: 'fcm_token_to_revoke',
    });
    (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: { success: true } });

    await PushNotificationService.registerForPushNotifications();
    expect(PushNotificationService.getCapabilityStatus().pushToken).toBe('fcm_token_to_revoke');

    (apiClient.delete as jest.Mock).mockResolvedValueOnce({
      data: { success: true, revoked: true },
    });

    const revoked = await PushNotificationService.unregisterDeviceToken();
    expect(revoked).toBe(true);
    expect(apiClient.delete).toHaveBeenCalledWith('/api/notifications/push/device-token', {
      data: {
        token: 'fcm_token_to_revoke',
        deviceId: 'Pixel 7 Pro',
      },
    });

    const status = PushNotificationService.getCapabilityStatus();
    expect(status.pushToken).toBeNull();
    expect(status.serverRegistrationStatus).toBe('not_attempted');
  });

  // 7. Failed registration does not crash app startup
  it('7. Failed backend registration does not crash app startup and records failure status', async () => {
    setAppRuntimeOverrideForTesting('development-build');

    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'granted' });
    (Notifications.getDevicePushTokenAsync as jest.Mock).mockResolvedValueOnce({
      type: 'fcm',
      data: 'fcm_token_error_test',
    });
    // Simulate server 500 error on all retries
    (apiClient.post as jest.Mock).mockRejectedValue(new Error('Network error: 500 Internal Server Error'));

    // Should resolve safely without throwing unhandled promise rejection
    let threwError = false;
    try {
      await PushNotificationService.registerForPushNotifications();
    } catch {
      threwError = true;
    }

    expect(threwError).toBe(false);
    const status = PushNotificationService.getCapabilityStatus();
    expect(status.serverRegistrationStatus).toBe('failed');
    expect(status.statusReason).toContain('500');
  });

  // 8. Socket.IO notifications still work
  it('8. Socket.IO in-app notifications still present local notifications safely in Expo Go and native builds', async () => {
    (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue('local_notif_1001');

    // Case A: In Expo Go, channelId is safely omitted to prevent Android NullPointerException
    setAppRuntimeOverrideForTesting('expo-go');
    const notifIdExpo = await PushNotificationService.presentLocalNotification({
      title: 'New Message from Alice',
      body: 'Reviewing the Q3 roadmap',
      data: { threadId: 'thread-123' },
      channelId: 'default',
      sound: true,
    });

    expect(notifIdExpo).toBe('local_notif_1001');
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
      content: expect.objectContaining({
        title: 'New Message from Alice',
        body: 'Reviewing the Q3 roadmap',
        data: { threadId: 'thread-123' },
        sound: true,
      }),
      trigger: null,
    });
    // Should NOT pass channelId in Expo Go
    const lastCallExpo = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls[0][0];
    expect(lastCallExpo.content.channelId).toBeUndefined();

    // Case B: In Development Build, channelId is preserved and sent to Android notification manager
    setAppRuntimeOverrideForTesting('development-build');
    (Notifications.scheduleNotificationAsync as jest.Mock).mockClear();

    const notifIdDev = await PushNotificationService.presentLocalNotification({
      title: 'Incoming Call',
      body: 'Bob is calling...',
      data: { callId: 'call-456' },
      channelId: 'calls',
      sound: true,
    });

    expect(notifIdDev).toBe('local_notif_1001');
    const lastCallDev = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls[0][0];
    expect(lastCallDev.content.channelId).toBe('calls');
  });
});
