import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import {
  ArrowLeft,
  CheckCircle2,
  DollarSign,
  MapPin,
  Megaphone,
  MessageSquare,
  ChevronRight,
} from 'lucide-react-native';
import { Text } from '../../../components/common/Text';
import { AppBottomNav } from '../../../components/common/AppBottomNav';
import { realtimeManager } from '../../../core/realtime/realtimeManager';
import { NotificationService, AppNotification } from '../../../core/services/notificationService';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../../../types/navigation.types';

interface NotificationItem {
  id: string;
  type: 'APPROVAL' | 'PAYROLL' | 'ATTENDANCE' | 'GENERAL' | 'CHAT';
  title: string;
  message: string;
  time: string;
  read: boolean;
  targetRoute?: string;
  targetParams?: any;
}

export const NotificationsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<'Notifications'>>();
  const [filter, setFilter] = useState<'ALL' | 'APPROVAL' | 'PAYROLL' | 'GENERAL'>('ALL');

  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await NotificationService.getNotifications();
      if (Array.isArray(data) && data.length > 0) {
        const mapped: NotificationItem[] = data.map((n: AppNotification) => {
          let itemType: NotificationItem['type'] = 'GENERAL';
          const t = (n.type || '').toUpperCase();
          if (t.includes('APPROVAL') || t.includes('LEAVE')) itemType = 'APPROVAL';
          else if (t.includes('PAYROLL') || t.includes('SALARY')) itemType = 'PAYROLL';
          else if (t.includes('ATTENDANCE') || t.includes('PUNCH')) itemType = 'ATTENDANCE';
          else if (t.includes('CHAT') || t.includes('MESSAGE')) itemType = 'CHAT';

          const timeStr = n.createdAt
            ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : 'Today';

          return {
            id: n.id,
            type: itemType,
            title: n.title || 'Notification',
            message: n.message || '',
            time: timeStr,
            read: Boolean(n.read),
            targetRoute: n.data?.targetRoute || (n.data?.threadId ? 'ChatConversations' : undefined),
            targetParams: n.data?.targetParams || (n.data?.threadId ? { threadId: n.data.threadId } : undefined),
          };
        });
        setNotifications(mapped);
      }
    } catch {
      // Keep empty or current list
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  // Subscribe to live incoming notifications via Pusher / Realtime socket
  useEffect(() => {
    const unsub = realtimeManager.subscribe('notification:new', (payload: any) => {
      if (payload) {
        const newItem: NotificationItem = {
          id: payload.id || `live-${Date.now()}`,
          type: payload.type || 'GENERAL',
          title: payload.title || 'New Notification',
          message: payload.message || payload.body || '',
          time: 'Just now',
          read: false,
          targetRoute: payload.targetRoute || (payload.threadId ? 'ChatConversations' : undefined),
          targetParams: payload.targetParams || (payload.threadId ? { threadId: payload.threadId } : undefined),
        };
        setNotifications((prev) => [newItem, ...prev]);
      }
    });

    return () => unsub();
  }, []);

  const handleNotificationPress = (item: NotificationItem) => {
    // Immediately mark as read to eliminate unread dot and badge
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
    );

    // Persist read state to backend
    if (item.id && !item.id.startsWith('live-')) {
      void NotificationService.markAsRead(item.id);
    }

    // Deep-link / navigate directly to the target destination
    if (item.targetRoute) {
      try {
        (navigation as any).navigate(item.targetRoute, item.targetParams);
      } catch (err) {
        console.warn('[Notification navigation failed]:', err);
      }
    }
  };

  const markAllRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
    void NotificationService.markAllAsRead();
  };

  const filtered = notifications.filter((n) =>
    filter === 'ALL' ? true : n.type === filter
  );

  const renderIcon = (t: string) => {
    switch (t) {
      case 'APPROVAL':
        return <CheckCircle2 size={20} color="#059669" strokeWidth={2.2} />;
      case 'PAYROLL':
        return <DollarSign size={20} color="#2563EB" strokeWidth={2.2} />;
      case 'ATTENDANCE':
        return <MapPin size={20} color="#D97706" strokeWidth={2.2} />;
      case 'CHAT':
        return <MessageSquare size={20} color="#10B981" strokeWidth={2.2} />;
      default:
        return <Megaphone size={20} color="#7C3AED" strokeWidth={2.2} />;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.4} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity
          onPress={markAllRead}
          style={styles.readBtn}
          accessibilityRole="button"
          accessibilityLabel="Mark all read"
        >
          <Text style={styles.readBtnText}>Read All</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#4F46E5"
            colors={['#4F46E5']}
          />
        }
      >
        {/* Filter Tabs */}
        <View style={styles.filterRow}>
          {(['ALL', 'APPROVAL', 'PAYROLL', 'GENERAL'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.filterTab, filter === tab && styles.filterTabActive]}
              onPress={() => setFilter(tab)}
            >
              <Text style={[styles.filterTabText, filter === tab && styles.filterTabTextActive]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Notifications List */}
        {filtered.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.itemCard, !item.read && styles.itemCardUnread]}
            onPress={() => handleNotificationPress(item)}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={`Notification: ${item.title}`}
          >
            <View style={styles.iconCircle}>
              {renderIcon(item.type)}
            </View>

            <View style={styles.infoCol}>
              <View style={styles.titleRow}>
                <Text style={styles.title}>{item.title}</Text>
                {!item.read && <View style={styles.unreadDot} />}
              </View>
              <Text style={styles.message}>{item.message}</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                <Text style={styles.timeText}>{item.time}</Text>
                {item.targetRoute && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                    <Text style={styles.viewLinkText}>View</Text>
                    <ChevronRight size={13} color="#2563EB" />
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Pinned Bottom Navigation */}
      <AppBottomNav activeRoute="Notifications" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#1E1B4B',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  readBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  readBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 8,
  },
  filterTabActive: {
    backgroundColor: '#1E1B4B',
    borderColor: '#1E1B4B',
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  itemCardUnread: {
    borderColor: '#C7D2FE',
    backgroundColor: '#FBFDFF',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 20,
  },
  infoCol: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4F46E5',
  },
  message: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 16,
    marginBottom: 6,
  },
  timeText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  viewLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
});
