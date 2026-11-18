import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Text } from '../../../components/common/Text';
import { ArrowLeft, X, ArrowLeftRight, Clock, User, Calendar as CalendarIcon } from 'lucide-react-native';
import { AppBottomNav } from '../../../components/common/AppBottomNav';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../../../types/navigation.types';
import {
  AttendanceService,
  ShiftRosterItem,
  ShiftSwapItem,
} from '../../../core/services/attendanceService';
import { EmployeeService, EmployeeProfile } from '../../../core/services/employeeService';

export const ShiftScheduleScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<'ShiftSchedule'>>();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Data
  const [currentProfile, setCurrentProfile] = useState<EmployeeProfile | null>(null);
  const [rosters, setRosters] = useState<ShiftRosterItem[]>([]);
  const [swaps, setSwaps] = useState<ShiftSwapItem[]>([]);
  const [shiftData, setShiftData] = useState<{ name: string; startTime: string; endTime: string } | null>(null);
  const [colleagues, setColleagues] = useState<Array<{ id: string; firstName: string; lastName: string; employeeCode: string }>>([]);

  // Swap Form State
  const [selectedPeerId, setSelectedPeerId] = useState<string>('');
  const [colleagueSearch, setColleagueSearch] = useState('');
  const [shiftDate, setShiftDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [summary, shiftsRes, profile, peerList] = await Promise.all([
        AttendanceService.getDashboardSummary().catch(() => null),
        AttendanceService.getMyShifts().catch(() => ({ rosters: [], swaps: [] })),
        EmployeeService.getMyProfile().catch(() => null),
        EmployeeService.getEmployees().catch(() => []),
      ]);

      if (summary?.shift) {
        setShiftData(summary.shift);
      }
      setRosters(shiftsRes.rosters || []);
      setSwaps(shiftsRes.swaps || []);
      if (profile) setCurrentProfile(profile);
      if (Array.isArray(peerList)) {
        setColleagues(peerList.filter((p) => p.id !== profile?.id));
      }
    } catch {
      // Non-fatal
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

  const weekShifts = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);

    const defaultShiftName = shiftData?.name || 'General Day Shift';
    const defaultShiftTime = shiftData?.startTime && shiftData?.endTime
      ? `${shiftData.startTime} – ${shiftData.endTime}`
      : '09:00 AM – 06:00 PM';

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return days.map((dayName, idx) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + idx);
      const isoDateStr = d.toISOString().split('T')[0];
      const dateLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      // Match real roster entry from backend if exists
      const rosterEntry = rosters.find((r) => r.rosterDate?.startsWith(isoDateStr));

      if (rosterEntry && rosterEntry.shift) {
        return {
          day: dayName,
          date: dateLabel,
          isoDate: isoDateStr,
          shift: rosterEntry.shift.name,
          time: `${rosterEntry.shift.startTime} – ${rosterEntry.shift.endTime}`,
          type: rosterEntry.shift.type?.toUpperCase() === 'HALF' ? 'HALF' : 'WORK',
        };
      }

      const isSunday = idx === 6;
      const isSaturday = idx === 5;
      return {
        day: dayName,
        date: dateLabel,
        isoDate: isoDateStr,
        shift: isSunday ? 'Weekly Off' : isSaturday ? 'Weekend Support / Half' : defaultShiftName,
        time: isSunday ? 'Rest Day' : isSaturday ? '09:00 AM – 01:00 PM' : defaultShiftTime,
        type: isSunday ? 'OFF' : isSaturday ? 'HALF' : 'WORK',
      };
    });
  }, [shiftData, rosters]);

  const filteredColleagues = useMemo(() => {
    if (!colleagueSearch.trim()) return colleagues.slice(0, 5);
    const q = colleagueSearch.toLowerCase();
    return colleagues.filter(
      (c) =>
        c.firstName?.toLowerCase().includes(q) ||
        c.lastName?.toLowerCase().includes(q) ||
        c.employeeCode?.toLowerCase().includes(q)
    ).slice(0, 6);
  }, [colleagues, colleagueSearch]);

  const handleOpenSwapForDate = (isoDate: string) => {
    setShiftDate(isoDate);
    setModalVisible(true);
  };

  const handleSwapRequest = async () => {
    if (!selectedPeerId) {
      Alert.alert('Required', 'Please select a colleague to swap shifts with.');
      return;
    }
    if (!shiftDate.trim()) {
      Alert.alert('Required', 'Please specify the shift date to swap.');
      return;
    }
    if (!reason.trim()) {
      Alert.alert('Required', 'Please state a reason for the shift swap.');
      return;
    }

    const requesterId = currentProfile?.id;
    if (!requesterId) {
      Alert.alert('Profile Error', 'Unable to resolve your employee record ID. Please try again.');
      return;
    }

    try {
      setSubmitting(true);
      await AttendanceService.createShiftSwap({
        requesterEmployeeId: requesterId,
        targetEmployeeId: selectedPeerId,
        shiftDate,
        reason: reason.trim(),
      });
      setModalVisible(false);
      setSelectedPeerId('');
      setColleagueSearch('');
      setReason('');
      await loadData();
      Alert.alert(
        'Shift Swap Submitted',
        'Your shift swap request has been sent for colleague and manager review.'
      );
    } catch (err: any) {
      Alert.alert('Swap Request Failed', err?.message || 'Could not submit shift swap request.');
    } finally {
      setSubmitting(false);
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
        <Text style={styles.headerTitle}>Shift Roster</Text>
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          style={styles.swapBtn}
          accessibilityRole="button"
          accessibilityLabel="Swap shift"
        >
          <ArrowLeftRight size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
          <Text style={styles.swapBtnText}>Swap</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Current Active Shift Banner */}
        <View style={styles.activeShiftCard}>
          <Text style={styles.activeShiftTag}>CURRENT SHIFT</Text>
          <Text style={styles.activeShiftTitle}>{shiftData?.name || 'General Day Shift'}</Text>
          <Text style={styles.activeShiftHours}>
            {shiftData?.startTime && shiftData?.endTime
              ? `${shiftData.startTime} – ${shiftData.endTime}`
              : '09:00 AM – 06:00 PM'}
          </Text>
          <View style={styles.breakBadge}>
            <Clock size={12} color="#00D287" style={{ marginRight: 4 }} />
            <Text style={styles.breakText}>Lunch Break: 01:00 PM – 02:00 PM</Text>
          </View>
        </View>

        {/* Weekly Roster List */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={styles.sectionTitle}>This Week's Schedule</Text>
          {loading && <ActivityIndicator size="small" color="#4F46E5" />}
        </View>

        {weekShifts.map((s, idx) => (
          <TouchableOpacity
            key={idx}
            style={styles.shiftCard}
            activeOpacity={0.8}
            onPress={() => s.type !== 'OFF' && handleOpenSwapForDate(s.isoDate)}
          >
            <View style={styles.dateCol}>
              <Text style={styles.dayText}>{s.day}</Text>
              <Text style={styles.dateText}>{s.date}</Text>
            </View>

            <View style={styles.shiftDetails}>
              <Text style={styles.shiftName}>{s.shift}</Text>
              <Text style={styles.shiftTime}>{s.time}</Text>
            </View>

            <View
              style={[
                styles.typePill,
                s.type === 'WORK'
                  ? styles.typePillGreen
                  : s.type === 'HALF'
                  ? styles.typePillYellow
                  : styles.typePillGray,
              ]}
            >
              <Text
                style={[
                  styles.typePillText,
                  s.type === 'WORK'
                    ? styles.textGreen
                    : s.type === 'HALF'
                    ? styles.textYellow
                    : styles.textGray,
                ]}
              >
                {s.type}
              </Text>
            </View>
          </TouchableOpacity>
        ))}

        {/* Active Shift Swap Requests */}
        {swaps.length > 0 && (
          <View style={{ marginTop: 20 }}>
            <Text style={styles.sectionTitle}>Shift Swap Requests</Text>
            {swaps.map((sw) => {
              const isRequester = sw.requesterEmployeeId === currentProfile?.id;
              const peerName = isRequester
                ? `${sw.targetEmployee?.firstName || ''} ${sw.targetEmployee?.lastName || 'Colleague'}`.trim()
                : `${sw.requesterEmployee?.firstName || ''} ${sw.requesterEmployee?.lastName || 'Colleague'}`.trim();
              const formattedDate = new Date(sw.shiftDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });

              return (
                <View key={sw.id} style={styles.swapCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <User size={14} color="#6366F1" />
                      <Text style={styles.swapPeerName}>
                        {isRequester ? `With: ${peerName}` : `From: ${peerName}`}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusPill,
                        sw.status === 'approved'
                          ? styles.statusApproved
                          : sw.status === 'rejected' || sw.status === 'declined'
                          ? styles.statusRejected
                          : styles.statusPending,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          sw.status === 'approved'
                            ? styles.textGreen
                            : sw.status === 'rejected' || sw.status === 'declined'
                            ? styles.textRed
                            : styles.textYellow,
                        ]}
                      >
                        {sw.status?.replace('_', ' ').toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                    <CalendarIcon size={12} color="#64748B" />
                    <Text style={styles.swapDateText}>Shift Date: {formattedDate}</Text>
                  </View>
                  {Boolean(sw.reason) && (
                    <Text style={styles.swapReasonText} numberOfLines={2}>
                      Reason: {sw.reason}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Swap Request Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request Shift Swap</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={20} color="#64748B" strokeWidth={2.4} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Shift Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.modalInput}
              value={shiftDate}
              onChangeText={setShiftDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#94A3B8"
            />

            <Text style={styles.fieldLabel}>Select Colleague</Text>
            <TextInput
              style={[styles.modalInput, { marginBottom: 8 }]}
              value={colleagueSearch}
              onChangeText={setColleagueSearch}
              placeholder="Search by name or code..."
              placeholderTextColor="#94A3B8"
            />

            {filteredColleagues.length > 0 && (
              <View style={styles.peerListWrap}>
                {filteredColleagues.map((c) => {
                  const isSelected = selectedPeerId === c.id;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.peerRow, isSelected && styles.peerRowSelected]}
                      onPress={() => {
                        setSelectedPeerId(c.id);
                        setColleagueSearch(`${c.firstName} ${c.lastName} (${c.employeeCode})`);
                      }}
                    >
                      <Text style={[styles.peerNameText, isSelected && styles.peerNameSelected]}>
                        {c.firstName} {c.lastName}
                      </Text>
                      <Text style={styles.peerCodeText}>{c.employeeCode}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <Text style={styles.fieldLabel}>Reason for Swap</Text>
            <TextInput
              style={[styles.modalInput, styles.textArea]}
              value={reason}
              onChangeText={setReason}
              placeholder="e.g. Personal family emergency or shift adjustment"
              multiline
              placeholderTextColor="#94A3B8"
            />

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSwapRequest}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitBtnText}>Submit Shift Swap Request</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Pinned Bottom Navigation */}
      <AppBottomNav activeRoute="ShiftSchedule" />
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
  swapBtn: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  swapBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  activeShiftCard: {
    backgroundColor: '#1E1B4B',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  activeShiftTag: {
    color: '#A5B4FC',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  activeShiftTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  activeShiftHours: {
    color: '#CBD5E1',
    fontSize: 13,
    marginBottom: 12,
  },
  breakBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  breakText: {
    color: '#E0E7FF',
    fontSize: 11,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  shiftCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  dateCol: {
    width: 80,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  dateText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  shiftDetails: {
    flex: 1,
    paddingHorizontal: 8,
  },
  shiftName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  shiftTime: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  typePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  typePillGreen: {
    backgroundColor: '#D1FAE5',
  },
  typePillYellow: {
    backgroundColor: '#FEF3C7',
  },
  typePillGray: {
    backgroundColor: '#F1F5F9',
  },
  typePillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  textGreen: {
    color: '#065F46',
  },
  textYellow: {
    color: '#B45309',
  },
  textGray: {
    color: '#64748B',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalCloseText: {
    fontSize: 18,
    color: '#64748B',
    fontWeight: 'bold',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  submitBtn: {
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  peerListWrap: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    maxHeight: 140,
    overflow: 'hidden',
  },
  peerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  peerRowSelected: {
    backgroundColor: '#EEF2FF',
  },
  peerNameText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  peerNameSelected: {
    color: '#4F46E5',
    fontWeight: '700',
  },
  peerCodeText: {
    fontSize: 11,
    color: '#64748B',
  },
  swapCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  swapPeerName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  swapDateText: {
    fontSize: 12,
    color: '#64748B',
  },
  swapReasonText: {
    fontSize: 12,
    color: '#475569',
    marginTop: 4,
    fontStyle: 'italic',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusApproved: {
    backgroundColor: '#D1FAE5',
  },
  statusPending: {
    backgroundColor: '#FEF3C7',
  },
  statusRejected: {
    backgroundColor: '#FEE2E2',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  textRed: {
    color: '#DC2626',
  },
});
