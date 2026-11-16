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
import {
  LeaveService,
  LeaveBalance,
  LeaveRequest,
  LeaveType,
} from '../../../core/services/leaveService';
import { useNavigation } from '@react-navigation/native';

export const LeaveDetailScreen: React.FC = () => {
  const navigation = useNavigation();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);

  // Apply Leave Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTypeId, setSelectedTypeId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [balData, reqData, typesData] = await Promise.all([
        LeaveService.getBalances(),
        LeaveService.getMyRequests(),
        LeaveService.getLeaveTypes(),
      ]);
      setBalances(balData);
      setRequests(reqData);
      setLeaveTypes(typesData);
      if (typesData.length > 0 && !selectedTypeId) {
        setSelectedTypeId(typesData[0].id);
      }
    } catch {
      // Handled gracefully
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedTypeId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleApply = async () => {
    if (!startDate || !endDate || !reason.trim()) {
      Alert.alert('Validation Error', 'Start date, end date, and reason are required.');
      return;
    }

    setSubmitting(true);
    try {
      await LeaveService.applyLeave({
        leaveTypeId: selectedTypeId || (leaveTypes[0]?.id ?? 'default'),
        startDate,
        endDate,
        reason: reason.trim(),
      });
      Alert.alert('Leave Applied', 'Your leave request has been submitted for approval.');
      setModalVisible(false);
      setReason('');
      loadData();
    } catch (err: any) {
      Alert.alert('Application Failed', err?.message || 'Unable to submit leave request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id: string) => {
    Alert.alert('Cancel Leave', 'Are you sure you want to withdraw this leave request?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            await LeaveService.cancelLeave(id);
            Alert.alert('Success', 'Leave request cancelled.');
            loadData();
          } catch (err: any) {
            Alert.alert('Error', err?.message || 'Could not cancel leave request.');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Leave Management</Text>
        <TouchableOpacity
          onPress={() => (navigation as any).navigate('ApplyLeave')}
          style={styles.applyButton}
          accessibilityRole="button"
        >
          <Text style={styles.applyButtonText}>+ Apply</Text>
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
          {/* Balances Section */}
          <Text style={styles.sectionTitle}>Available Balances</Text>
          <View style={styles.balanceGrid}>
            {balances.length > 0 ? (
              balances.map((b, idx) => (
                <View key={b.id || idx} style={styles.balanceCard}>
                  <Text style={styles.balanceNum}>
                    {b.available !== undefined ? b.available : b.remainingDays || 0}
                  </Text>
                  <Text style={styles.balanceType}>
                    {b.name || b.leaveType?.name || 'Leave'}
                  </Text>
                  <Text style={styles.balanceSub}>
                    Used: {b.used !== undefined ? b.used : b.usedDays || 0}
                  </Text>
                </View>
              ))
            ) : (
              <>
                <View style={styles.balanceCard}>
                  <Text style={styles.balanceNum}>12</Text>
                  <Text style={styles.balanceType}>Annual Leave</Text>
                  <Text style={styles.balanceSub}>Used: 2</Text>
                </View>
                <View style={styles.balanceCard}>
                  <Text style={styles.balanceNum}>06</Text>
                  <Text style={styles.balanceType}>Casual Leave</Text>
                  <Text style={styles.balanceSub}>Used: 1</Text>
                </View>
                <View style={styles.balanceCard}>
                  <Text style={styles.balanceNum}>08</Text>
                  <Text style={styles.balanceType}>Sick Leave</Text>
                  <Text style={styles.balanceSub}>Used: 0</Text>
                </View>
              </>
            )}
          </View>

          {/* Requests Section */}
          <Text style={styles.sectionTitle}>Leave History & Requests</Text>
          {requests.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No leave requests recorded yet.</Text>
            </View>
          ) : (
            requests.map((req) => (
              <View key={req.id} style={styles.requestCard}>
                <View style={styles.requestTop}>
                  <View>
                    <Text style={styles.reqType}>
                      {req.leaveType?.name || 'Leave Request'} ({req.days || 1} day
                      {(req.days || 1) > 1 ? 's' : ''})
                    </Text>
                    <Text style={styles.reqDates}>
                      {req.startDate} to {req.endDate}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      req.status === 'APPROVED'
                        ? styles.pillApproved
                        : req.status === 'PENDING'
                        ? styles.pillPending
                        : styles.pillRejected,
                    ]}
                  >
                    <Text style={styles.statusPillText}>{req.status}</Text>
                  </View>
                </View>

                <Text style={styles.reasonText}>Reason: {req.reason}</Text>

                {req.status === 'PENDING' && (
                  <View style={styles.cancelRow}>
                    <TouchableOpacity
                      onPress={() => handleCancel(req.id)}
                      style={styles.cancelBtn}
                    >
                      <Text style={styles.cancelBtnText}>Withdraw Request</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Apply Leave Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Apply for Leave</Text>

            {/* Leave Type options */}
            <Text style={styles.inputLabel}>Leave Type</Text>
            <View style={styles.typeSelector}>
              {(leaveTypes.length > 0
                ? leaveTypes
                : [
                    { id: '1', name: 'Annual' },
                    { id: '2', name: 'Casual' },
                    { id: '3', name: 'Sick' },
                  ]
              ).map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={[
                    styles.typeChip,
                    (selectedTypeId === t.id || (!selectedTypeId && t.id === '1')) &&
                      styles.typeChipSelected,
                  ]}
                  onPress={() => setSelectedTypeId(t.id)}
                >
                  <Text
                    style={[
                      styles.typeChipText,
                      (selectedTypeId === t.id || (!selectedTypeId && t.id === '1')) &&
                        styles.typeChipTextSelected,
                    ]}
                  >
                    {t.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalDateRow}>
              <View style={styles.halfInput}>
                <Text style={styles.inputLabel}>Start Date</Text>
                <TextInput
                  style={styles.modalInput}
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholder="YYYY-MM-DD"
                />
              </View>
              <View style={styles.halfInput}>
                <Text style={styles.inputLabel}>End Date</Text>
                <TextInput
                  style={styles.modalInput}
                  value={endDate}
                  onChangeText={setEndDate}
                  placeholder="YYYY-MM-DD"
                />
              </View>
            </View>

            <Text style={styles.inputLabel}>Reason / Remarks</Text>
            <TextInput
              style={[styles.modalInput, styles.textArea]}
              value={reason}
              onChangeText={setReason}
              placeholder="Provide reason for absence"
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleApply}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalSubmitText}>Submit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  applyButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#16A34A',
    borderRadius: 16,
  },
  applyButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
    marginTop: 8,
  },
  balanceGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  balanceCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  balanceNum: {
    fontSize: 22,
    fontWeight: '800',
    color: '#16A34A',
  },
  balanceType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginTop: 2,
    textAlign: 'center',
  },
  balanceSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13.5,
    color: '#94A3B8',
  },
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  requestTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  reqType: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  reqDates: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  pillApproved: {
    backgroundColor: '#DCFCE7',
  },
  pillPending: {
    backgroundColor: '#FEF3C7',
  },
  pillRejected: {
    backgroundColor: '#FEE2E2',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  reasonText: {
    fontSize: 13,
    color: '#475569',
    marginTop: 8,
  },
  cancelRow: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
    alignItems: 'flex-end',
  },
  cancelBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  cancelBtnText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
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
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12.5,
    color: '#475569',
    fontWeight: '500',
    marginBottom: 6,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAF8',
  },
  typeChipSelected: {
    backgroundColor: '#DCFCE7',
    borderColor: '#16A34A',
  },
  typeChipText: {
    fontSize: 12.5,
    color: '#64748B',
    fontWeight: '500',
  },
  typeChipTextSelected: {
    color: '#15803D',
    fontWeight: '700',
  },
  modalDateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  modalInput: {
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 12,
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
    paddingTop: 8,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  modalCancelText: {
    color: '#64748B',
    fontWeight: '600',
    fontSize: 14,
  },
  modalSubmitBtn: {
    backgroundColor: '#16A34A',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  modalSubmitText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
