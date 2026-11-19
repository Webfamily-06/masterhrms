import React, { useEffect, useRef } from 'react';
import { navigationRef } from '../../app/navigation/navigationRef';
import { realtimeManager } from '../../core/realtime/realtimeManager';
import { PushNotificationService } from '../../core/services/pushNotificationService';
import { useAuthStore } from '../../store/authStore';

/**
 * Enterprise Foreground Realtime Notification Bridge:
 * Subscribes to realtime WebSocket / Pusher channels for new notifications and chat messages.
 * When the app is in the foreground:
 * 1. Deduplicates events arriving from redundant Socket.IO and Pusher connections.
 * 2. Filters out messages authored by the current authenticated user.
 * 3. Checks whether the user is actively viewing the target conversation.
 *    - If actively viewing: suppresses the notification to avoid disruption.
 *    - If on another screen or conversation: displays an OS local notification.
 * 4. Configures notification tap routing via navigationRef to open the target chat or call.
 */
export const NotificationRealtimeBridge: React.FC = () => {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const recentFingerprintsRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    // 1. Initialize notification response listeners for tap navigation
    PushNotificationService.initListeners((data) => {
      if (!data) return;

      const threadId = data.threadId || data.conversationId;
      if (threadId && navigationRef.isReady()) {
        navigationRef.navigate('ChatConversationDetail', {
          threadId,
          title: data.title || 'Chat',
        });
      }
    });

    // 2. Handle incoming chat / alert events
    const handleIncomingRealtimeEvent = (payload: any, eventName: string) => {
      if (!payload) return;

      // Extract thread / conversation ID
      const threadId =
        payload.threadId ||
        payload.data?.threadId ||
        payload.conversationId ||
        payload.data?.conversationId;

      // Extract sender ID and ignore own sent messages
      const senderId =
        payload.senderId ||
        payload.data?.senderId ||
        payload.sender?.id ||
        payload.authorId ||
        payload.userId;

      if (senderId && currentUserId && String(senderId) === String(currentUserId)) {
        return;
      }

      // Extract unique message or notification identifier for deduplication
      const rawId =
        payload.id ||
        payload.messageId ||
        payload.data?.id ||
        payload.data?.messageId ||
        `${threadId || 'msg'}_${payload.createdAt || Date.now()}`;

      const fingerprint = `${eventName}:${rawId}`;
      const now = Date.now();
      const lastSeen = recentFingerprintsRef.current.get(fingerprint);

      // Deduplicate across Socket.io & Pusher within 4000ms window
      if (lastSeen && now - lastSeen < 4000) {
        return;
      }
      recentFingerprintsRef.current.set(fingerprint, now);

      // Clean up old fingerprints
      if (recentFingerprintsRef.current.size > 100) {
        const cutoff = now - 10000;
        for (const [key, timestamp] of recentFingerprintsRef.current.entries()) {
          if (timestamp < cutoff) {
            recentFingerprintsRef.current.delete(key);
          }
        }
      }

      // Check if user is currently looking at this exact chat conversation
      if (threadId && navigationRef.isReady()) {
        try {
          const currentRoute = navigationRef.getCurrentRoute();
          if (
            currentRoute &&
            currentRoute.name === 'ChatConversationDetail' &&
            (currentRoute.params as any)?.threadId === threadId
          ) {
            // Actively viewing this conversation; suppress popup to prevent distraction
            return;
          }
        } catch {
          // If route cannot be inspected, continue to show notification
        }
      }

      // Format notification contents
      const senderName =
        payload.senderName ||
        payload.data?.senderName ||
        payload.sender?.name ||
        payload.authorName ||
        'MasterHRMS';

      const title = payload.title || (threadId ? senderName : 'MasterHRMS Alert');

      const messageBody =
        payload.body ||
        payload.message ||
        payload.text ||
        payload.content ||
        (payload.attachments && payload.attachments.length > 0
          ? `Sent ${payload.attachments.length} attachment${payload.attachments.length > 1 ? 's' : ''}`
          : 'New message received');

      // Trigger local OS notification banner
      void PushNotificationService.presentLocalNotification({
        title,
        body: messageBody,
        channelId: 'default',
        sound: true,
        data: {
          type: threadId ? 'CHAT_MESSAGE' : 'SYSTEM',
          threadId,
          conversationId: threadId,
          title: senderName,
          ...(payload.data || {}),
        },
      });
    };

    // 3. Subscribe to chat message and notification events
    const unsubNotification = realtimeManager.subscribe('notification:new', (payload) => {
      handleIncomingRealtimeEvent(payload, 'notification:new');
    });

    const unsubChatMessage = realtimeManager.subscribe('chat:message', (payload) => {
      handleIncomingRealtimeEvent(payload, 'chat:message');
    });

    const unsubMessageNew = realtimeManager.subscribe('message:new', (payload) => {
      handleIncomingRealtimeEvent(payload, 'message:new');
    });

    return () => {
      unsubNotification();
      unsubChatMessage();
      unsubMessageNew();
    };
  }, [currentUserId]);

  return null;
};
