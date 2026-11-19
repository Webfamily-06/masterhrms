import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { NotificationRealtimeBridge } from '../src/components/notification/NotificationRealtimeBridge';
import { realtimeManager } from '../src/core/realtime/realtimeManager';
import { PushNotificationService } from '../src/core/services/pushNotificationService';
import { useAuthStore } from '../src/store/authStore';
import { useTenantStore } from '../src/store/tenantStore';
import { navigationRef } from '../src/app/navigation/navigationRef';
import { createTenantQueryKey } from '../src/core/query/tenantQueryKeys';
import { queryClient, purgeQueryCache } from '../src/core/query/queryClient';
import { NotificationService } from '../src/core/services/notificationService';
import { apiClient } from '../src/core/api/apiClient';

jest.mock('../src/core/api/apiClient', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('../src/core/services/pushNotificationService', () => ({
  PushNotificationService: {
    initListeners: jest.fn(),
    presentLocalNotification: jest.fn().mockResolvedValue('notif-123'),
    getCapabilityStatus: jest.fn().mockReturnValue({
      isPhysicalDevice: true,
      permissionGranted: true,
      tokenType: 'expo',
      pushToken: 'ExponentPushToken[mock]',
      serverRegistrationStatus: 'unsupported_backend',
      statusReason: 'Mock status',
    }),
    registerForPushNotifications: jest.fn().mockResolvedValue('ExponentPushToken[mock]'),
  },
  isExpoGoEnvironment: jest.fn().mockReturnValue(false),
}));

describe('Phase 2: Query Architecture & Isolation', () => {
  it('creates tenant-partitioned query keys with current tenant ID', () => {
    useTenantStore.setState({
      currentTenant: {
        id: 'tenant-alpha',
        name: 'Alpha Corp',
        slug: 'alpha',
      } as any,
    });

    const key = createTenantQueryKey(['calendar', 'events', 2026]);
    expect(key).toEqual(['tenant-alpha', 'calendar', 'events', 2026]);
  });

  it('uses __no_tenant_context__ when tenant is unassigned to prevent leakage', () => {
    useTenantStore.setState({ currentTenant: null });
    useAuthStore.setState({ user: null });

    const key = createTenantQueryKey(['profile']);
    expect(key).toEqual(['__no_tenant_context__', 'profile']);
  });

  it('supports explicit tenant override parameter', () => {
    const key = createTenantQueryKey(['attendance'], 'tenant-custom');
    expect(key).toEqual(['tenant-custom', 'attendance']);
  });

  it('purgeQueryCache clears tanstack queryClient cache cleanly', async () => {
    queryClient.setQueryData(['test-key'], { data: 123 });
    expect(queryClient.getQueryData(['test-key'])).toEqual({ data: 123 });

    await purgeQueryCache();
    expect(queryClient.getQueryData(['test-key'])).toBeUndefined();
  });
});

describe('Phase 3: Notification Service Safe Endpoints', () => {
  it('registerDeviceToken registers native device token with backend', async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      data: { success: true, message: 'Device token registered' },
    });
    const res = await NotificationService.registerDeviceToken('token123', 'android');
    expect(res).toBe(true);
    expect(apiClient.post).toHaveBeenCalledWith('/api/notifications/push/device-token', {
      token: 'token123',
      platform: 'android',
    });
  });
});

describe('Phase 7: Mobile Foreground Notification Bridge', () => {
  let listeners: Record<string, (payload: any, eventName: string) => void> = {};

  beforeEach(() => {
    jest.clearAllMocks();
    listeners = {};
    jest.spyOn(realtimeManager, 'subscribe').mockImplementation((eventName: string, handler: any) => {
      listeners[eventName] = handler;
      return () => {
        delete listeners[eventName];
      };
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('subscribes to realtime events on mount and unsubscribes on unmount', () => {
    let renderer: any;
    act(() => {
      renderer = ReactTestRenderer.create(<NotificationRealtimeBridge />);
    });

    expect(realtimeManager.subscribe).toHaveBeenCalledWith('notification:new', expect.any(Function));
    expect(realtimeManager.subscribe).toHaveBeenCalledWith('chat:message', expect.any(Function));
    expect(realtimeManager.subscribe).toHaveBeenCalledWith('message:new', expect.any(Function));

    act(() => {
      renderer.unmount();
    });
    expect(Object.keys(listeners).length).toBe(0);
  });

  it('ignores messages authored by the current authenticated user', async () => {
    useAuthStore.setState({
      user: { id: 'user-me', name: 'Current User' } as any,
    });

    let renderer: any;
    act(() => {
      renderer = ReactTestRenderer.create(<NotificationRealtimeBridge />);
    });

    await act(async () => {
      listeners['chat:message']?.(
        {
          id: 'msg-1',
          threadId: 'th-100',
          senderId: 'user-me',
          senderName: 'Current User',
          body: 'Hello self',
        },
        'chat:message'
      );
    });

    expect(PushNotificationService.presentLocalNotification).not.toHaveBeenCalled();
    act(() => {
      renderer.unmount();
    });
  });

  it('suppresses local notification when user is actively viewing that specific conversation', async () => {
    useAuthStore.setState({
      user: { id: 'user-me', name: 'Current User' } as any,
    });

    jest.spyOn(navigationRef, 'isReady').mockReturnValue(true);
    jest.spyOn(navigationRef, 'getCurrentRoute').mockReturnValue({
      name: 'ChatConversationDetail',
      key: 'detail-key',
      params: { threadId: 'thread-active-99' },
    } as any);

    let renderer: any;
    act(() => {
      renderer = ReactTestRenderer.create(<NotificationRealtimeBridge />);
    });

    await act(async () => {
      listeners['chat:message']?.(
        {
          id: 'msg-2',
          threadId: 'thread-active-99',
          senderId: 'user-colleague',
          senderName: 'Alice',
          body: 'Are you free?',
        },
        'chat:message'
      );
    });

    expect(PushNotificationService.presentLocalNotification).not.toHaveBeenCalled();
    act(() => {
      renderer.unmount();
    });
  });

  it('presents local notification when user is on another screen or viewing another conversation', async () => {
    useAuthStore.setState({
      user: { id: 'user-me', name: 'Current User' } as any,
    });

    jest.spyOn(navigationRef, 'isReady').mockReturnValue(true);
    jest.spyOn(navigationRef, 'getCurrentRoute').mockReturnValue({
      name: 'ChatConversationDetail',
      key: 'detail-key',
      params: { threadId: 'different-thread-01' },
    } as any);

    let renderer: any;
    act(() => {
      renderer = ReactTestRenderer.create(<NotificationRealtimeBridge />);
    });

    await act(async () => {
      listeners['chat:message']?.(
        {
          id: 'msg-3',
          threadId: 'thread-urgent-77',
          senderId: 'user-boss',
          senderName: 'Manager John',
          body: 'Please review Q3 report.',
        },
        'chat:message'
      );
    });

    expect(PushNotificationService.presentLocalNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Manager John',
        body: 'Please review Q3 report.',
        channelId: 'default',
        sound: true,
        data: expect.objectContaining({
          type: 'CHAT_MESSAGE',
          threadId: 'thread-urgent-77',
        }),
      })
    );
    act(() => {
      renderer.unmount();
    });
  });

  it('deduplicates duplicate events arriving from Socket.io and Pusher within threshold', async () => {
    useAuthStore.setState({
      user: { id: 'user-me', name: 'Current User' } as any,
    });

    jest.spyOn(navigationRef, 'isReady').mockReturnValue(true);
    jest.spyOn(navigationRef, 'getCurrentRoute').mockReturnValue({
      name: 'Home',
      key: 'home-key',
    } as any);

    let renderer: any;
    act(() => {
      renderer = ReactTestRenderer.create(<NotificationRealtimeBridge />);
    });

    const payload = {
      id: 'msg-dup-1',
      threadId: 'th-55',
      senderId: 'user-other',
      senderName: 'Bob',
      body: 'Check this out',
    };

    // First arrival from Socket.io
    await act(async () => {
      listeners['chat:message']?.(payload, 'chat:message');
    });

    // Redundant arrival from Pusher
    await act(async () => {
      listeners['chat:message']?.(payload, 'chat:message');
    });

    expect(PushNotificationService.presentLocalNotification).toHaveBeenCalledTimes(1);
    act(() => {
      renderer.unmount();
    });
  });
});
