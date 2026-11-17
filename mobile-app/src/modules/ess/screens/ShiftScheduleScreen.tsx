import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Text } from '../../../components/common/Text';
import { ArrowLeft, X } from 'lucide-react-native';
import { AppBottomNav } from '../../../components/common/AppBottomNav';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../../../types/navigation.types';

export const ShiftScheduleScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<'ShiftSchedule'>>();
  const [modalVisible, setModalVisible] = useState(false);
  const [colleagueName, setColleagueName] = useState('');
  const [reason, setReason] = useState('');

  const weekShifts = [
    { day: 'Monday', date: 'Nov 16', shift: 'General Day Shift', time: '09:00 AM – 06:00 PM', type: 'WORK' },
    { day: 'Tuesday', date: 'Nov 17', shift: 'General Day Shift', time: '09:00 AM – 06:00 PM', type: 'WORK' },
    { day: 'Wednesday', date: 'Nov 18', shift: 'General Day Shift', time: '09:00 AM – 06:00 PM', type: 'WORK' },
    { day: 'Thursday', date: 'Nov 19', shift: 'General Day Shift', time: '09:00 AM – 06:00 PM', type: 'WORK' },
    { day: 'Friday', date: 'Nov 20', shift: 'General Day Shift', time: '09:00 AM – 06:00 PM', type: 'WORK' },
    { day: 'Saturday', date: 'Nov 21', shift: 'Rotational Support / Half', time: '09:00 AM – 01:00 PM', type: 'HALF' },
    { day: 'Sunday', date: 'Nov 22', shift: 'Weekly Off', time: 'Rest Day', type: 'OFF' },
  ];

  const handleSwapRequest = () => {
    if (!colleagueName.trim()) {
      Alert.alert('Required', 'Please enter colleague name or employee code.');
      return;
    }
    setModalVisible(false);
    setColleagueName('');
    setReason('');
    Alert.alert('Shift Swap Request Sent', 'Request forwarded to your manager and colleague for mutual approval.');
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
          <Text style={styles.swapBtnText}>Swap</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Current Active Shift Banner */}
        <View style={styles.activeShiftCard}>
          <Text style={styles.activeShiftTag}>CURRENT SHIFT</Text>
          <Text style={styles.activeShiftTitle}>General Day Shift</Text>
          <Text style={styles.activeShiftHours}>09:00 AM – 06:00 PM (9.0 Hours)</Text>
          <View style={styles.breakBadge}>
            <Text style={styles.breakText}>Lunch Break: 01:00 PM – 02:00 PM</Text>
          </View>
        </View>

        {/* Weekly Roster List */}
        <Text style={styles.sectionTitle}>This Week's Schedule</Text>

        {weekShifts.map((s, idx) => (
          <View key={idx} style={styles.shiftCard}>
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
          </View>
        ))}
      </ScrollView>

      {/* Swap Request Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request Shift Swap</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={20} color="#64748B" strokeWidth={2.4} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Swap With (Colleague Name / Code)</Text>
            <TextInput
              style={styles.modalInput}
              value={colleagueName}
              onChangeText={setColleagueName}
              placeholder="e.g. John Doe (EMP-024)"
              placeholderTextColor="#94A3B8"
            />

            <Text style={styles.fieldLabel}>Reason for Swap</Text>
            <TextInput
              style={[styles.modalInput, styles.textArea]}
              value={reason}
              onChangeText={setReason}
              placeholder="e.g. Personal family engagement"
              multiline
              placeholderTextColor="#94A3B8"
            />

            <TouchableOpacity style={styles.submitBtn} onPress={handleSwapRequest}>
              <Text style={styles.submitBtnText}>Submit Shift Swap Request</Text>
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
});
