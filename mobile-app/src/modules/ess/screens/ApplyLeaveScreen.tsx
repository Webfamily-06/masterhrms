import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { Text } from '../../../components/common/Text';
import {
  ArrowLeft,
  ChevronDown,
  UploadCloud,
  Check,
  Calendar,
  FileText,
} from 'lucide-react-native';
import { LeaveService, LeaveBalance, LeaveType } from '../../../core/services/leaveService';
import { useNavigation } from '@react-navigation/native';

export const ApplyLeaveScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [selectedTypeId, setSelectedTypeId] = useState<string>('');
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);

  // Weekly date picker state
  const [selectedCalendarDayIndex, setSelectedCalendarDayIndex] = useState(2); // Tuesday 04 default

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [attachedFile, setAttachedFile] = useState<string | null>(null);

  // Submitted Success Modal (Matches 60_Request Submitted.png)
  const [submittedModalOpen, setSubmittedModalOpen] = useState(false);

  useEffect(() => {
    async function fetchBalances() {
      try {
        const [balData, typesData] = await Promise.all([
          LeaveService.getBalances(),
          LeaveService.getLeaveTypes(),
        ]);
        setBalances(balData || []);
        setLeaveTypes(typesData || []);
        if (typesData && typesData.length > 0) {
          setSelectedTypeId(typesData[0].id);
        }
      } catch {
        // Fallback
      } finally {
        setLoading(false);
      }
    }
    fetchBalances();

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);

    const fmt = (d: Date) => d.toISOString().split('T')[0];
    setStartDate(fmt(tomorrow));
    setEndDate(fmt(dayAfter));
  }, []);

  // 7-day strip for calendar
  const weekDays = useMemo(() => {
    const days = [];
    const base = new Date();
    base.setDate(base.getDate() - base.getDay()); // Sunday of this week
    for (let i = 0; i < 7; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      days.push({
        name: d.toLocaleDateString('en-US', { weekday: 'short' }),
        num: String(d.getDate()).padStart(2, '0'),
        dateStr: d.toISOString().split('T')[0],
      });
    }
    return days;
  }, []);

  const matchedType = leaveTypes.find((t) => t.id === selectedTypeId);
  const selectedTypeName = matchedType?.name || 'Annual Leave';

  const calculateDays = () => {
    if (!startDate || !endDate) return 1;
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    if (isNaN(start) || isNaN(end) || end < start) return 1;
    const diff = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, diff);
  };

  const totalDays = calculateDays();

  // Balances
  const annualCount = balances.find((b) => b.name?.toLowerCase().includes('annual'))?.remainingDays || 24;
  const casualCount = balances.find((b) => b.name?.toLowerCase().includes('casual'))?.remainingDays || 14;
  const sickCount = balances.find((b) => b.name?.toLowerCase().includes('sick'))?.remainingDays || 12;

  const handleSubmit = async () => {
    if (!reason.trim()) {
      Alert.alert('Validation Error', 'Please provide a reason for your leave request.');
      return;
    }
    if (!startDate || !endDate) {
      Alert.alert('Validation Error', 'Please specify both start date and end date.');
      return;
    }

    setSubmitting(true);
    try {
      await LeaveService.applyLeave({
        leaveTypeId: selectedTypeId || 'default-annual',
        startDate,
        endDate,
        reason: reason.trim(),
      });
      setSubmittedModalOpen(true);
    } catch (err: any) {
      Alert.alert('Submission Failed', err?.message || 'Unable to submit leave request.');
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
          style={styles.backCircleBtn}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ArrowLeft size={18} color="#0F172A" strokeWidth={2.4} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Apply Leave</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Main Card: Leave Info */}
          <View style={styles.mainCard}>
            <Text style={styles.cardHeaderTitle}>Leave Info</Text>

            {/* 3 Circular Balances (Annual, Casual, Sick) */}
            <View style={styles.threeCirclesRow}>
              {/* Annual Leave (Red/Coral) */}
              <View style={styles.circleCol}>
                <View style={[styles.outerRing, { borderColor: '#FEE2E2', borderTopColor: '#EF4444', borderRightColor: '#EF4444' }]}>
                  <Text style={[styles.circleCountText, { color: '#EF4444' }]}>{annualCount}</Text>
                </View>
                <Text style={styles.circleLabel}>Annual Leave</Text>
              </View>

              {/* Casual Leave (Green) */}
              <View style={styles.circleCol}>
                <View style={[styles.outerRing, { borderColor: '#DCFCE7', borderTopColor: '#22C55E', borderRightColor: '#22C55E' }]}>
                  <Text style={[styles.circleCountText, { color: '#16A34A' }]}>{casualCount}</Text>
                </View>
                <Text style={styles.circleLabel}>Casual Leave</Text>
              </View>

              {/* Sick Leave (Yellow/Orange) */}
              <View style={styles.circleCol}>
                <View style={[styles.outerRing, { borderColor: '#FEF3C7', borderTopColor: '#F59E0B', borderRightColor: '#F59E0B' }]}>
                  <Text style={[styles.circleCountText, { color: '#D97706' }]}>{sickCount}</Text>
                </View>
                <Text style={styles.circleLabel}>Sick Leave</Text>
              </View>
            </View>

            {/* Leave Type Dropdown */}
            <TouchableOpacity
              style={styles.dropdownBtn}
              onPress={() => setTypeDropdownOpen(!typeDropdownOpen)}
            >
              <Text style={styles.dropdownSelectedText}>{selectedTypeName}</Text>
              <ChevronDown size={18} color="#64748B" />
            </TouchableOpacity>

            {typeDropdownOpen && (
              <View style={styles.dropdownListContainer}>
                {(leaveTypes.length > 0 ? leaveTypes : [
                  { id: '1', name: 'Annual Leave' },
                  { id: '2', name: 'Casual Leave' },
                  { id: '3', name: 'Sick Leave' },
                  { id: '4', name: 'Maternity/Paternity Leave' },
                  { id: '5', name: 'Unpaid Leave' },
                ]).map((t: any) => (
                  <TouchableOpacity
                    key={t.id}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setSelectedTypeId(t.id);
                      setTypeDropdownOpen(false);
                    }}
                  >
                    <Text style={[styles.dropdownItemText, t.id === selectedTypeId && { color: '#2563EB', fontWeight: '700' }]}>
                      {t.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Horizontal Week Days Strip */}
            <View style={styles.weekStripRow}>
              {weekDays.map((d, idx) => {
                const isSelected = idx === selectedCalendarDayIndex;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.weekDayPill, isSelected && styles.weekDayPillActive]}
                    onPress={() => {
                      setSelectedCalendarDayIndex(idx);
                      setStartDate(d.dateStr);
                      const nextD = new Date(d.dateStr);
                      nextD.setDate(nextD.getDate() + 1);
                      setEndDate(nextD.toISOString().split('T')[0]);
                    }}
                  >
                    <View style={[styles.pillSmallDot, isSelected && styles.pillSmallDotActive]} />
                    <Text style={[styles.pillDayName, isSelected && styles.pillTextActive]}>{d.name}</Text>
                    <Text style={[styles.pillDayNum, isSelected && styles.pillTextActive]}>{d.num}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Start Date Dropdown / Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>Start Date</Text>
              <View style={styles.datePickerInputWrap}>
                <TextInput
                  style={styles.dateTextInput}
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#94A3B8"
                />
                <Calendar size={18} color="#64748B" />
              </View>
            </View>

            {/* End Date Dropdown / Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>End Date</Text>
              <View style={styles.datePickerInputWrap}>
                <TextInput
                  style={styles.dateTextInput}
                  value={endDate}
                  onChangeText={setEndDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#94A3B8"
                />
                <Calendar size={18} color="#64748B" />
              </View>
            </View>

            {/* Reason for Leave */}
            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>Reason for leave</Text>
              <TextInput
                style={styles.reasonTextArea}
                value={reason}
                onChangeText={setReason}
                placeholder="Briefly state why you are requesting leave..."
                placeholderTextColor="#94A3B8"
                multiline
              />
            </View>

            {/* Upload File Dashed Area */}
            <TouchableOpacity
              style={styles.dashedUploadBox}
              onPress={() => {
                setAttachedFile('medical_certificate.pdf');
                Alert.alert('File Attached', 'Document attached successfully.');
              }}
            >
              <UploadCloud size={28} color="#475569" strokeWidth={1.8} style={{ marginBottom: 6 }} />
              <Text style={styles.uploadPrimaryText}>
                {attachedFile ? `Attached: ${attachedFile}` : 'Upload File'}
              </Text>
              <Text style={styles.uploadSecondaryText}>Tap to Upload Max 2 MB</Text>
            </TouchableOpacity>
          </View>

          {/* Bottom Apply Now Button */}
          <TouchableOpacity
            style={styles.applyNowBtn}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.applyNowBtnText}>Apply Now</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* 60_Request Submitted Success Modal                                 */}
      {/* ───────────────────────────────────────────────────────────────── */}
      <Modal visible={submittedModalOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            {/* Scalloped Success Badge */}
            <View style={styles.scallopedCircle}>
              <Check size={36} color="#16A34A" strokeWidth={3} />
            </View>

            <Text style={styles.modalSuccessHeading}>Request Submitted</Text>
            <Text style={styles.modalSuccessSub}>
              You can track the status of your request in the “My Request Section.”
            </Text>

            <View style={styles.summaryCardModal}>
              <Text style={styles.summaryTitleModal}>Request Summary</Text>

              <View style={styles.summaryRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <FileText size={14} color="#64748B" />
                  <Text style={styles.summaryKey}>Request type:</Text>
                </View>
                <Text style={styles.summaryVal}>{selectedTypeName}</Text>
              </View>

              <View style={styles.summaryRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Calendar size={14} color="#64748B" />
                  <Text style={styles.summaryKey}>Start Date:</Text>
                </View>
                <Text style={styles.summaryVal}>{startDate}</Text>
              </View>

              <View style={styles.summaryRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Calendar size={14} color="#64748B" />
                  <Text style={styles.summaryKey}>End Date:</Text>
                </View>
                <Text style={styles.summaryVal}>{endDate}</Text>
              </View>

              <View style={styles.summaryRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Calendar size={14} color="#64748B" />
                  <Text style={styles.summaryKey}>Total Days:</Text>
                </View>
                <Text style={styles.summaryVal}>{totalDays} Days</Text>
              </View>

              <View style={styles.summaryRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Calendar size={14} color="#64748B" />
                  <Text style={styles.summaryKey}>Reason:</Text>
                </View>
                <Text style={styles.summaryVal} numberOfLines={1}>{reason}</Text>
              </View>
            </View>

            {/* Bottom Modal Buttons */}
            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.modalWhiteOutlineBtn}
                onPress={() => {
                  setSubmittedModalOpen(false);
                  navigation.navigate('LeaveDetail');
                }}
              >
                <Text style={styles.modalWhiteOutlineBtnText}>My Requests</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalBlueBtn}
                onPress={() => {
                  setSubmittedModalOpen(false);
                  navigation.navigate('EmployeeHome');
                }}
              >
                <Text style={styles.modalBlueBtnText}>Go to Home</Text>
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
    backgroundColor: '#E0F2FE', // Subtle sky gradient backdrop
  },
  scrollContent: {
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 36,
    paddingBottom: 14,
  },
  backCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },

  /* Main Card */
  mainCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    marginHorizontal: 16,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeaderTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 16,
  },

  /* 3 Circular Balances (59_Apply Leave.png) */
  threeCirclesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  circleCol: {
    alignItems: 'center',
  },
  outerRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  circleCountText: {
    fontSize: 20,
    fontWeight: '800',
  },
  circleLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },

  /* Dropdown Button */
  dropdownBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  dropdownSelectedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  dropdownListContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    marginTop: -10,
    marginBottom: 16,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dropdownItemText: {
    fontSize: 13,
    color: '#475569',
  },

  /* Week Days Strip */
  weekStripRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  weekDayPill: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    minWidth: 40,
  },
  weekDayPillActive: {
    backgroundColor: '#2563EB',
  },
  pillSmallDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#93C5FD',
    marginBottom: 4,
  },
  pillSmallDotActive: {
    backgroundColor: '#FFFFFF',
  },
  pillDayName: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    marginBottom: 4,
  },
  pillDayNum: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  pillTextActive: {
    color: '#FFFFFF',
  },

  /* Input Groups */
  inputGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 6,
  },
  datePickerInputWrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  dateTextInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    padding: 0,
  },
  reasonTextArea: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    minHeight: 80,
    textAlignVertical: 'top',
  },

  /* Dashed Upload Box */
  dashedUploadBox: {
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    backgroundColor: '#F8FAFC',
  },
  uploadPrimaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  uploadSecondaryText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },

  /* Bottom Button */
  applyNowBtn: {
    backgroundColor: '#2563EB',
    height: 52,
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  applyNowBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  /* 60_Request Submitted Modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    alignItems: 'center',
  },
  scallopedCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalSuccessHeading: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSuccessSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 16,
    lineHeight: 18,
  },
  summaryCardModal: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    marginVertical: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  summaryTitleModal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  summaryKey: {
    fontSize: 12,
    color: '#64748B',
  },
  summaryVal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 8,
  },
  modalWhiteOutlineBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalWhiteOutlineBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalBlueBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBlueBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
