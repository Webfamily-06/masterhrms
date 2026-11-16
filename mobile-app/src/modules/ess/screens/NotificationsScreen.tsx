import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Text } from '../../../components/common/Text';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../../../types/navigation.types';

interface NotificationItem {
  id: string;
  type: 'APPROVAL' | 'PAYROLL' | 'ATTENDANCE' | 'GENERAL';
  title: string;
  message: string;
  time: string;
  read: boolean;
}

export const NotificationsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<'Notifications'>>();
  const [filter, setFilter] = useState<'ALL' | 'APPROVAL' | 'PAYROLL' | 'GENERAL'>('ALL');

  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'n-1',
      type: 'APPROVAL',
      title: 'Leave Approved',
      message: 'Your Casual Leave for Nov 24, 2026 has been approved by your Manager.',
      time: '10m ago',
      read: false,
    },
    {
      id: 'n-2',
      type: 'PAYROLL',
      title: 'October Payslip Available',
      message: 'Your monthly salary statement for Oct 2026 has been generated and disbursed.',
      time: '2h ago',
      read: false,
    },
    {
      id: 'n-3',
      type: 'ATTENDANCE',
      title: 'Geofence Punch Recorded',
      message: 'Office check-in verified at 09:14 AM at BKC Headquarters.',
      time: 'Today',
      read: true,
    },
    {
      id: 'n-4',
      type: 'GENERAL',
      title: 'Townhall Announcement',
      message: 'Annual MasterHRMS All-Hands scheduled for Thursday at 04:00 PM IST.',
      time: 'Yesterday',
      read: true,
    },
  ]);

  const markAllRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
  };

  const filtered = notifications.filter((n) =>
    filter === 'ALL' ? true : n.type === filter
  );

  const getIcon = (t: string) => {
    switch (t) {
      case 'APPROVAL': return '✅';
      case 'PAYROLL': return '💰';
      case 'ATTENDANCE': return '📍';
      default: return '📢';
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
          <Text style={styles.backBtnText}>←</Text>
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

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
          <View key={item.id} style={[styles.itemCard, !item.read && styles.itemCardUnread]}>
            <View style={styles.iconCircle}>
              <Text style={styles.icon}>{getIcon(item.type)}</Text>
            </View>

            <View style={styles.infoCol}>
              <View style={styles.titleRow}>
                <Text style={styles.title}>{item.title}</Text>
                {!item.read && <View style={styles.unreadDot} />}
              </View>
              <Text style={styles.message}>{item.message}</Text>
              <Text style={styles.timeText}>{item.time}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
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
});
