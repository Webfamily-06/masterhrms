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
  AttendanceService,
  AttendanceRecord,
  RegularizationRequest,
} from '../../../core/services/attendanceService';
import { useNavigation } from '@react-navigation/native';

export const AttendanceDetailScreen: React.FC = () => {
  const navigation = useNavigation();

  const [loading, setLoading] = useState(true);
  const [punching, setPunching] = useState(false);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [regularizations, setRegularizations] = useState<RegularizationRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'history' | 'regularizations'>('history');
  const [refreshing, setRefreshing] = useState(false);

  // Regularization Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [regDate, setRegDate] = useState(new Date().toISOString().split('T')[0]);
  const [regCheckIn, setRegCheckIn] = useState('09:00');
  const [regCheckOut, setRegCheckOut] = useState('18:00');
  const [regReason, setRegReason] = useState('');
  const [submittingReg, setSubmittingReg] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [historyData, regData] = await Promise.all([
        AttendanceService.getMyHistory(),
        AttendanceService.getRegularizations(),
      ]);
      setRecords(historyData);
      setRegularizations(regData);
    } catch {
      // Handled gracefully
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

  const handlePunch = async (type: 'check_in' | 'check_out') => {
    setPunching(true);
    try {
      // Use office / device coordinates (19.0657, 72.8687 for Mumbai BKC office)
      const result = await AttendanceService.punch({
        type,
        latitude: 19.0657,
        longitude: 72.8687,
        notes: `Mobile App ${type === 'check_in' ? 'Check-In' : 'Check-Out'}`,
      });

      const message = result.geoFence?.valid
        ? `Successfully punched ${type === 'check_in' ? 'in' : 'out'} within office perimeter.`
        : `Punched ${type === 'check_in' ? 'in' : 'out'}. Geo-verification distance: ${result.geoFence?.distanceMeters || 0}m.`;

      Alert.alert('Attendance Updated', message);
      loadData();
    } catch (err: any) {
      Alert.alert('Punch Failed', err?.message || 'Unable to record attendance punch.');
    } finally {
      setPunching(false);
    }
  };

  const handleSubmitRegularization = async () => {
    if (!regDate || !regReason.trim()) {
      Alert.alert('Validation Error', 'Date and reason are required.');
      return;
    }

    setSubmittingReg(true);
    try {
      await AttendanceService.submitRegularization({
        date: regDate,
        checkIn: `${regDate}T${regCheckIn}:00Z`,
        checkOut: `${regDate}T${regCheckOut}:00Z`,
        reason: regReason.trim(),
      });
      Alert.alert('Submitted', 'Regularization request submitted to your manager.');
      setModalVisible(false);
      setRegReason('');
      loadData();
    } catch (err: any) {
      Alert.alert('Submission Failed', err?.message || 'Could not submit regularization.');
    } finally {
      setSubmittingReg(false);
    }
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
        <Text style={styles.headerTitle}>Attendance Records</Text>
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          style={styles.regButton}
          accessibilityRole="button"
        >
          <Text style={styles.regButtonText}>+ Regularize</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Punch Bar */}
      <View style={styles.punchBar}>
        <TouchableOpacity
          style={[styles.punchButton, styles.checkInBtn]}
          onPress={() => handlePunch('check_in')}
          disabled={punching}
          activeOpacity={0.8}
        >
          <Text style={styles.punchBtnText}>Punch In</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.punchButton, styles.checkOutBtn]}
          onPress={() => handlePunch('check_out')}
          disabled={punching}
          activeOpacity={0.8}
        >
          <Text style={styles.punchBtnText}>Punch Out</Text>
        </TouchableOpacity>
      </View>

      {/* Segmented Control Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.activeTab]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
            History ({records.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'regularizations' && styles.activeTab]}
          onPress={() => setActiveTab('regularizations')}
        >
          <Text style={[styles.tabText, activeTab === 'regularizations' && styles.activeTabText]}>
            Requests ({regularizations.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#16A34A" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {activeTab === 'history' ? (
            records.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No attendance records found for this period.</Text>
              </View>
            ) : (
              records.map((rec) => (
                <View key={rec.id} style={styles.recordCard}>
                  <View style={styles.recordRow}>
                    <Text style={styles.recordDate}>
                      {new Date(rec.date).toLocaleDateString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Text>
                    <View
                      style={[
                        styles.statusBadge,
                        rec.status === 'PRESENT'
                          ? styles.statusPresent
                          : rec.status === 'LATE'
                          ? styles.statusLate
                          : styles.statusAbsent,
                      ]}
                    >
                      <Text style={styles.statusBadgeText}>{rec.status}</Text>
                    </View>
                  </View>
                  <View style={styles.timeRow}>
                    <Text style={styles.timeLabel}>
                      In: {rec.checkIn ? new Date(rec.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                    </Text>
                    <Text style={styles.timeLabel}>
                      Out: {rec.checkOut ? new Date(rec.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                    </Text>
                    <Text style={styles.hoursLabel}>
                      {rec.hours ? `${rec.hours.toFixed(1)} hrs` : '--'}
                    </Text>
                  </View>
                </View>
              ))
            )
          ) : (
            regularizations.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No regularization requests submitted.</Text>
              </View>
            ) : (
              regularizations.map((reg) => (
                <View key={reg.id} style={styles.recordCard}>
                  <View style={styles.recordRow}>
                    <Text style={styles.recordDate}>{reg.date}</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        reg.status === 'APPROVED'
                          ? styles.statusPresent
                          : reg.status === 'PENDING'
                          ? styles.statusLate
                          : styles.statusAbsent,
                      ]}
                    >
                      <Text style={styles.statusBadgeText}>{reg.status}</Text>
                    </View>
                  </View>
                  <Text style={styles.reasonText}>Reason: {reg.reason}</Text>
                </View>
              ))
            )
          )}
        </ScrollView>
      )}

      {/* Regularization Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Request Regularization</Text>
            <Text style={styles.inputLabel}>Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.modalInput}
              value={regDate}
              onChangeText={setRegDate}
              placeholder="YYYY-MM-DD"
            />
            <View style={styles.modalTimeRow}>
              <View style={styles.halfInput}>
                <Text style={styles.inputLabel}>Check-In Time</Text>
                <TextInput
                  style={styles.modalInput}
                  value={regCheckIn}
                  onChangeText={setRegCheckIn}
                  placeholder="09:00"
                />
              </View>
              <View style={styles.halfInput}>
                <Text style={styles.inputLabel}>Check-Out Time</Text>
                <TextInput
                  style={styles.modalInput}
                  value={regCheckOut}
                  onChangeText={setRegCheckOut}
                  placeholder="18:00"
                />
              </View>
            </View>
            <Text style={styles.inputLabel}>Reason / Justification</Text>
            <TextInput
              style={[styles.modalInput, styles.textArea]}
              value={regReason}
              onChangeText={setRegReason}
              placeholder="e.g. Client visit, Biometric scanner glitch"
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
                onPress={handleSubmitRegularization}
                disabled={submittingReg}
              >
                {submittingReg ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalSubmitText}>Submit Request</Text>
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
  regButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#DCFCE7',
    borderRadius: 16,
  },
  regButtonText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#15803D',
  },
  punchBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  punchButton: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkInBtn: {
    backgroundColor: '#16A34A',
  },
  checkOutBtn: {
    backgroundColor: '#EF4444',
  },
  punchBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
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
    gap: 12,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
  },
  recordCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  recordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recordDate: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusPresent: {
    backgroundColor: '#DCFCE7',
  },
  statusLate: {
    backgroundColor: '#FEF3C7',
  },
  statusAbsent: {
    backgroundColor: '#FEE2E2',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
  timeLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  hoursLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#16A34A',
  },
  reasonText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
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
  modalTimeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 10,
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
