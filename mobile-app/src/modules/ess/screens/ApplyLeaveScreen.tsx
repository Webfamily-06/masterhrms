import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Text } from '../../../components/common/Text';
import { LeaveService, LeaveBalance, LeaveType } from '../../../core/services/leaveService';
import { useNavigation } from '@react-navigation/native';

export const ApplyLeaveScreen: React.FC = () => {
  const navigation = useNavigation();

  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [selectedTypeId, setSelectedTypeId] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [duration, setDuration] = useState<'FULL' | 'FIRST_HALF' | 'SECOND_HALF'>('FULL');
  const [reason, setReason] = useState('');
  const [hasAttachment, setHasAttachment] = useState(false);

  useEffect(() => {
    async function fetchBalances() {
      try {
        const [balData, typesData] = await Promise.all([
          LeaveService.getBalances(),
          LeaveService.getLeaveTypes(),
        ]);
        setBalances(balData);
        setLeaveTypes(typesData);
        if (typesData.length > 0) {
          setSelectedTypeId(typesData[0].id);
        } else if (balData.length > 0) {
          setSelectedTypeId(balData[0].leaveTypeId);
        }
      } catch {
        // Fallback
      } finally {
        setLoading(false);
      }
    }
    fetchBalances();

    // Default dates to tomorrow and day after
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);

    const fmt = (d: Date) => d.toISOString().split('T')[0];
    setStartDate(fmt(tomorrow));
    setEndDate(fmt(dayAfter));
  }, []);

  const calculateDays = () => {
    if (!startDate || !endDate) return 1;
    if (duration !== 'FULL') return 0.5;
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    if (isNaN(start) || isNaN(end) || end < start) return 1;
    const diff = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, diff);
  };

  const totalDays = calculateDays();

  const matchedType = leaveTypes.find((t) => t.id === selectedTypeId);
  const selectedTypeName = matchedType?.name || 'Leave';
  const matchedBal = balances.find((b) => b.leaveTypeId === selectedTypeId);
  const currentBalance = matchedBal?.remainingDays ?? matchedBal?.available ?? 12;

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
        leaveTypeId: selectedTypeId,
        startDate,
        endDate,
        reason: reason.trim(),
        halfDay: duration !== 'FULL',
      });

      Alert.alert('Application Submitted', 'Your leave request has been sent to your manager for approval.', [
        { text: 'Done', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Submission Failed', err?.message || 'Unable to submit leave request. Please check your balance.');
    } finally {
      setSubmitting(false);
    }
  };

  const typesList = leaveTypes.length > 0
    ? leaveTypes
    : [
        { id: '1', name: 'Casual Leave', code: 'CL' },
        { id: '2', name: 'Sick Leave', code: 'SL' },
        { id: '3', name: 'Earned Leave', code: 'EL' },
        { id: '4', name: 'Unpaid Leave', code: 'UL' },
      ];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
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
        <Text style={styles.headerTitle}>Apply for Leave</Text>
        <View style={styles.placeholder} />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Balance Notice Card */}
          <View style={styles.balanceNoticeCard}>
            <View>
              <Text style={styles.balanceNoticeLabel}>Available {selectedTypeName}</Text>
              <Text style={styles.balanceNoticeValue}>{currentBalance} Days Remaining</Text>
            </View>
            <View style={styles.balanceTag}>
              <Text style={styles.balanceTagText}>Annual Cycle</Text>
            </View>
          </View>

          {/* Leave Type Selector */}
          <Text style={styles.sectionHeader}>Select Leave Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
            {typesList.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[styles.typeChip, selectedTypeId === type.id && styles.typeChipActive]}
                onPress={() => setSelectedTypeId(type.id)}
              >
                <Text style={[styles.typeChipText, selectedTypeId === type.id && styles.typeChipTextActive]}>
                  {type.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Date Inputs */}
          <Text style={styles.sectionHeader}>Leave Dates</Text>
          <View style={styles.formCard}>
            <View style={styles.dateRow}>
              <View style={styles.dateCol}>
                <Text style={styles.inputLabel}>Start Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.dateInput}
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholder="2026-11-20"
                  placeholderTextColor="#94A3B8"
                />
              </View>
              <View style={styles.dateCol}>
                <Text style={styles.inputLabel}>End Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.dateInput}
                  value={endDate}
                  onChangeText={setEndDate}
                  placeholder="2026-11-22"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            {/* Duration Selector */}
            <Text style={styles.inputLabel}>Duration</Text>
            <View style={styles.durationRow}>
              <TouchableOpacity
                style={[styles.durationBtn, duration === 'FULL' && styles.durationBtnActive]}
                onPress={() => setDuration('FULL')}
              >
                <Text style={[styles.durationBtnText, duration === 'FULL' && styles.durationBtnTextActive]}>
                  Full Day
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.durationBtn, duration === 'FIRST_HALF' && styles.durationBtnActive]}
                onPress={() => setDuration('FIRST_HALF')}
              >
                <Text style={[styles.durationBtnText, duration === 'FIRST_HALF' && styles.durationBtnTextActive]}>
                  First Half
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.durationBtn, duration === 'SECOND_HALF' && styles.durationBtnActive]}
                onPress={() => setDuration('SECOND_HALF')}
              >
                <Text style={[styles.durationBtnText, duration === 'SECOND_HALF' && styles.durationBtnTextActive]}>
                  Second Half
                </Text>
              </TouchableOpacity>
            </View>

            {/* Computed Days Banner */}
            <View style={styles.daysBanner}>
              <Text style={styles.daysBannerText}>Total Leave Duration: <Text style={styles.daysHighlight}>{totalDays} Day(s)</Text></Text>
            </View>
          </View>

          {/* Reason Text Input */}
          <Text style={styles.sectionHeader}>Reason & Remarks</Text>
          <View style={styles.formCard}>
            <TextInput
              style={styles.reasonInput}
              multiline
              numberOfLines={4}
              value={reason}
              onChangeText={setReason}
              placeholder="Please explain the reason for your leave request..."
              placeholderTextColor="#94A3B8"
            />
          </View>

          {/* Attachment Optional */}
          <TouchableOpacity
            style={styles.attachmentBox}
            onPress={() => setHasAttachment(!hasAttachment)}
            activeOpacity={0.7}
          >
            <Text style={styles.attachmentIcon}>{hasAttachment ? '📎' : '➕'}</Text>
            <View style={styles.attachmentDetails}>
              <Text style={styles.attachmentTitle}>
                {hasAttachment ? 'Medical_Certificate.pdf attached' : 'Attach Supporting Document'}
              </Text>
              <Text style={styles.attachmentSub}>
                {hasAttachment ? 'Tap to remove attachment' : 'PDF, JPEG, or PNG up to 10MB (Optional)'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>Submit Leave Application</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  placeholder: {
    width: 40,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  balanceNoticeCard: {
    backgroundColor: '#1E1B4B',
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceNoticeLabel: {
    color: '#A5B4FC',
    fontSize: 12,
    fontWeight: '600',
  },
  balanceNoticeValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 4,
  },
  balanceTag: {
    backgroundColor: 'rgba(52, 211, 153, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#34D399',
  },
  balanceTagText: {
    color: '#34D399',
    fontSize: 11,
    fontWeight: '600',
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginLeft: 4,
  },
  chipsScroll: {
    gap: 8,
    marginBottom: 20,
    paddingVertical: 2,
  },
  typeChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  typeChipActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  typeChipTextActive: {
    color: '#FFFFFF',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  dateCol: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 6,
  },
  dateInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1E293B',
  },
  durationRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  durationBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  durationBtnActive: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1.5,
    borderColor: '#4F46E5',
  },
  durationBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  durationBtnTextActive: {
    color: '#4F46E5',
    fontWeight: '700',
  },
  daysBanner: {
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    alignItems: 'center',
  },
  daysBannerText: {
    fontSize: 13,
    color: '#166534',
    fontWeight: '600',
  },
  daysHighlight: {
    color: '#15803D',
    fontWeight: '800',
  },
  reasonInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#1E293B',
    height: 100,
    textAlignVertical: 'top',
  },
  attachmentBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    marginBottom: 24,
    gap: 12,
  },
  attachmentIcon: {
    fontSize: 24,
  },
  attachmentDetails: {
    flex: 1,
  },
  attachmentTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  attachmentSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  submitButton: {
    backgroundColor: '#22C55E',
    borderRadius: 16,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
