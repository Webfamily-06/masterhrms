import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Text } from '../../../components/common/Text';
import { ArrowLeft } from 'lucide-react-native';
import { AppBottomNav, UserAvatar } from '../../../components/common';
import { HrService } from '../../../core/services/hrService';
import { LeaveRequest } from '../../../core/services/leaveService';
import { useTheme } from '../../../app/providers/ThemeProvider';
import { useNavigation } from '@react-navigation/native';

export const PendingApprovalsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);

  const loadData = useCallback(async () => {
    try {
      const data = await HrService.getAllLeaveRequests('PENDING');
      setRequests(data);
    } catch {
      // Handled
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleAction = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    Alert.alert(
      `${status === 'APPROVED' ? 'Approve' : 'Reject'} Leave Request`,
      `Are you sure you want to mark this request as ${status}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: status === 'APPROVED' ? 'Approve' : 'Reject',
          style: status === 'APPROVED' ? 'default' : 'destructive',
          onPress: async () => {
            try {
              await HrService.updateLeaveStatus(id, status);
              Alert.alert('Updated', `Leave request marked as ${status}.`);
              loadData();
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Unable to update status.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View
        style={[
          styles.header,
          { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backButton, { backgroundColor: theme.colors.surfaceSecondary }]}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ArrowLeft size={20} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Leave Approvals Queue
        </Text>
        <View style={styles.placeholder} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#16A34A" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <Text style={styles.subHeading}>
            Pending Review ({requests.length})
          </Text>

          {requests.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No pending organization leave requests.</Text>
            </View>
          ) : (
            requests.map((r) => (
              <View
                key={r.id}
                style={[
                  styles.card,
                  { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                    <UserAvatar
                      entity={r.employee}
                      name={
                        r.employee
                          ? `${r.employee.firstName || ''} ${r.employee.lastName || ''}`.trim()
                          : 'Employee'
                      }
                      size={38}
                      style={{ marginRight: 10 }}
                    />
                    <Text style={[styles.empName, { color: theme.colors.text, flex: 1 }]} numberOfLines={1}>
                      {r.employee
                        ? `${r.employee.firstName} ${r.employee.lastName} (${r.employee.employeeCode})`
                        : 'Employee'}
                    </Text>
                  </View>
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingBadgeText}>PENDING</Text>
                  </View>
                </View>
                <Text style={styles.leaveType}>
                  {r.leaveType?.name || 'Leave'}: {r.startDate} to {r.endDate} ({r.days || 1} day
                  {(r.days || 1) > 1 ? 's' : ''})
                </Text>
                <Text style={styles.reasonText}>Reason: {r.reason}</Text>

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.rejectBtn}
                    onPress={() => handleAction(r.id, 'REJECTED')}
                  >
                    <Text style={styles.rejectBtnText}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.approveBtn}
                    onPress={() => handleAction(r.id, 'APPROVED')}
                  >
                    <Text style={styles.approveBtnText}>Approve</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
      <AppBottomNav activeRoute="HrAdminHome" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAF8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 20,
    color: '#0F172A',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  placeholder: {
    width: 36,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
  },
  subHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 12,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  empName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  pendingBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pendingBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  leaveType: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
    marginTop: 2,
  },
  reasonText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  rejectBtn: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
  },
  rejectBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#DC2626',
  },
  approveBtn: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#16A34A',
  },
  approveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
