import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  RefreshControl,
  Alert,
} from 'react-native';
import { Text } from '../../../components/common/Text';
import { ArrowLeft } from 'lucide-react-native';
import { AppBottomNav } from '../../../components/common';
import { ManagerService, TeamApprovals } from '../../../core/services/managerService';
import { useNavigation } from '@react-navigation/native';

export const TeamApprovalsScreen: React.FC = () => {
  const navigation = useNavigation();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [approvals, setApprovals] = useState<TeamApprovals>({
    leaves: [],
    regularizations: [],
  });
  const [activeTab, setActiveTab] = useState<'leaves' | 'regularizations'>('leaves');

  // Reject Modal State
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectingItem, setRejectingItem] = useState<{ id: string; type: 'leave' | 'reg' } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await ManagerService.getTeamApprovals();
      setApprovals(data);
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

  const handleApprove = async (id: string, type: 'leave' | 'reg') => {
    Alert.alert('Approve Request', 'Are you sure you want to approve this request?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: async () => {
          try {
            if (type === 'leave') {
              await ManagerService.actionLeave(id, 'APPROVED');
            } else {
              await ManagerService.actionRegularization(id, 'APPROVED');
            }
            Alert.alert('Approved', 'Request successfully approved.');
            loadData();
          } catch (err: any) {
            Alert.alert('Action Failed', err?.message || 'Unable to approve request.');
          }
        },
      },
    ]);
  };

  const handleConfirmReject = async () => {
    if (!rejectingItem || !rejectReason.trim()) {
      Alert.alert('Validation Error', 'Please state the reason for rejection.');
      return;
    }

    setSubmittingAction(true);
    try {
      if (rejectingItem.type === 'leave') {
        await ManagerService.actionLeave(rejectingItem.id, 'REJECTED', rejectReason.trim());
      } else {
        await ManagerService.actionRegularization(rejectingItem.id, 'REJECTED', rejectReason.trim());
      }
      Alert.alert('Rejected', 'Request marked as rejected.');
      setRejectModalVisible(false);
      setRejectReason('');
      setRejectingItem(null);
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Unable to reject request.');
    } finally {
      setSubmittingAction(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ArrowLeft size={20} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Team Approvals</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Segmented Control */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'leaves' && styles.activeTab]}
          onPress={() => setActiveTab('leaves')}
        >
          <Text style={[styles.tabText, activeTab === 'leaves' && styles.activeTabText]}>
            Leaves ({approvals.leaves.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'regularizations' && styles.activeTab]}
          onPress={() => setActiveTab('regularizations')}
        >
          <Text style={[styles.tabText, activeTab === 'regularizations' && styles.activeTabText]}>
            Regularizations ({approvals.regularizations.length})
          </Text>
        </TouchableOpacity>
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
          {activeTab === 'leaves' ? (
            approvals.leaves.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No pending leave requests from your team.</Text>
              </View>
            ) : (
              approvals.leaves.map((l) => (
                <View key={l.id} style={styles.approvalCard}>
                  <View style={styles.cardTop}>
                    <Text style={styles.empName}>
                      {l.employee
                        ? `${l.employee.firstName} ${l.employee.lastName} (${l.employee.employeeCode})`
                        : 'Team Member'}
                    </Text>
                    <View style={styles.pendingBadge}>
                      <Text style={styles.pendingBadgeText}>PENDING</Text>
                    </View>
                  </View>
                  <Text style={styles.leaveType}>
                    {l.leaveType?.name || 'Leave'}: {l.startDate} to {l.endDate} ({l.days || 1} day
                    {(l.days || 1) > 1 ? 's' : ''})
                  </Text>
                  <Text style={styles.reasonText}>Reason: {l.reason}</Text>

                  {/* Actions */}
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={styles.rejectBtn}
                      onPress={() => {
                        setRejectingItem({ id: l.id, type: 'leave' });
                        setRejectModalVisible(true);
                      }}
                    >
                      <Text style={styles.rejectBtnText}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.approveBtn}
                      onPress={() => handleApprove(l.id, 'leave')}
                    >
                      <Text style={styles.approveBtnText}>Approve</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )
          ) : (
            approvals.regularizations.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No pending regularization requests from your team.</Text>
              </View>
            ) : (
              approvals.regularizations.map((r) => (
                <View key={r.id} style={styles.approvalCard}>
                  <View style={styles.cardTop}>
                    <Text style={styles.empName}>
                      {r.employee
                        ? `${r.employee.firstName} ${r.employee.lastName} (${r.employee.employeeCode})`
                        : 'Team Member'}
                    </Text>
                    <View style={styles.pendingBadge}>
                      <Text style={styles.pendingBadgeText}>PENDING</Text>
                    </View>
                  </View>
                  <Text style={styles.leaveType}>Date: {r.date}</Text>
                  <Text style={styles.reasonText}>Reason: {r.reason}</Text>

                  {/* Actions */}
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={styles.rejectBtn}
                      onPress={() => {
                        setRejectingItem({ id: r.id, type: 'reg' });
                        setRejectModalVisible(true);
                      }}
                    >
                      <Text style={styles.rejectBtnText}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.approveBtn}
                      onPress={() => handleApprove(r.id, 'reg')}
                    >
                      <Text style={styles.approveBtnText}>Approve</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )
          )}
        </ScrollView>
      )}

      {/* Reject Modal */}
      <Modal visible={rejectModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reject Request</Text>
            <Text style={styles.inputLabel}>State reason for rejection</Text>
            <TextInput
              style={styles.textArea}
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="e.g. Critical project deadline, insufficient coverage"
              multiline
              numberOfLines={3}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setRejectModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalRejectBtn}
                onPress={handleConfirmReject}
                disabled={submittingAction}
              >
                {submittingAction ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalRejectText}>Confirm Rejection</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <AppBottomNav activeRoute="ManagerHome" />
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tab: {
    paddingVertical: 12,
    marginRight: 20,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#16A34A',
  },
  tabText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#16A34A',
    fontWeight: '700',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  approvalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardTop: {
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 6,
  },
  textArea: {
    height: 80,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 10,
    fontSize: 14,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  modalCancelText: {
    color: '#64748B',
    fontWeight: '600',
  },
  modalRejectBtn: {
    backgroundColor: '#EF4444',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  modalRejectText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
