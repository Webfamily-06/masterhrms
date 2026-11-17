import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { Text } from '../../../components/common/Text';
import {
  ArrowLeft,
  Calendar,
  Pencil,
  X,
} from 'lucide-react-native';
import { AppBottomNav } from '../../../components/common/AppBottomNav';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../../../types/navigation.types';

export const TimesheetScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<'Timesheet'>>();

  const [payPeriodMode, setPayPeriodMode] = useState<'weekly' | 'biweekly'>('biweekly');

  // Daily entries
  const [entries, setEntries] = useState([
    { id: '1', day: 'Monday', date: '15 September, 2025', regularHours: '08.00', overtimeHours: '01.50' },
    { id: '2', day: 'Tuesday', date: '16 September, 2025', regularHours: '08.00', overtimeHours: '02.00' },
    { id: '3', day: 'Wednesday', date: '17 September, 2025', regularHours: '08.00', overtimeHours: '01.50' },
    { id: '4', day: 'Thursday', date: '18 September, 2025', regularHours: '08.00', overtimeHours: '02.00' },
    { id: '5', day: 'Friday', date: '19 September, 2025', regularHours: '08.00', overtimeHours: '02.00' },
    { id: '6', day: 'Saturday', date: '20 September, 2025', regularHours: '08.00', overtimeHours: '00.00' },
  ]);

  // Edit Time Entry Modal (Matches 39_Edit Time Entry.png)
  const [editingEntry, setEditingEntry] = useState<any | null>(null);
  const [editRegular, setEditRegular] = useState('08.00');
  const [editOvertime, setEditOvertime] = useState('01.50');

  const handleOpenEdit = (entry: any) => {
    setEditingEntry(entry);
    setEditRegular(entry.regularHours);
    setEditOvertime(entry.overtimeHours);
  };

  const handleSaveEdit = () => {
    if (!editingEntry) return;
    setEntries((prev) =>
      prev.map((e) =>
        e.id === editingEntry.id
          ? { ...e, regularHours: editRegular, overtimeHours: editOvertime }
          : e
      )
    );
    setEditingEntry(null);
  };

  const handleSubmitTimesheet = () => {
    Alert.alert('Timesheet Submitted', 'Your timesheet has been submitted to your supervisor for review.');
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
        <Text style={styles.headerTitle}>Timesheet</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Card: Pay Period (Matches 38_Timesheet.png) */}
        <View style={styles.mainCard}>
          <Text style={styles.cardSectionTitle}>Pay Period</Text>

          {/* Weekly / Bi-Weekly Switcher */}
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, payPeriodMode === 'weekly' && styles.toggleBtnActive]}
              onPress={() => setPayPeriodMode('weekly')}
            >
              <Text style={[styles.toggleBtnText, payPeriodMode === 'weekly' && styles.toggleBtnTextActive]}>
                Weekly
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toggleBtn, payPeriodMode === 'biweekly' && styles.toggleBtnActive]}
              onPress={() => setPayPeriodMode('biweekly')}
            >
              <Text style={[styles.toggleBtnText, payPeriodMode === 'biweekly' && styles.toggleBtnTextActive]}>
                Bi-Weekly
              </Text>
            </TouchableOpacity>
          </View>

          {/* Week Info & Status */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 12 }}>
            <Text style={styles.weekRangeText}>Week on July 14- June 19</Text>
            <Text style={styles.pendingApprovalText}>(Pending Approval)</Text>
          </View>

          {/* 4 Stats Boxes */}
          <View style={styles.fourStatsGrid}>
            <View style={[styles.statBox, { backgroundColor: '#E0F2FE' }]}>
              <Text style={styles.statVal}>40.0</Text>
              <Text style={styles.statLabel}>Regular</Text>
            </View>

            <View style={[styles.statBox, { backgroundColor: '#FEF3C7' }]}>
              <Text style={styles.statVal}>09.0</Text>
              <Text style={styles.statLabel}>Overtime</Text>
            </View>

            <View style={[styles.statBox, { backgroundColor: '#F3E8FF' }]}>
              <Text style={styles.statVal}>00.0</Text>
              <Text style={styles.statLabel}>Leave</Text>
            </View>

            <View style={[styles.statBox, { backgroundColor: '#DCFCE7' }]}>
              <Text style={styles.statVal}>49.0</Text>
              <Text style={styles.statLabel}>Total Hours</Text>
            </View>
          </View>
        </View>

        {/* Card: Daily Breakdown (Matches 38_Timesheet.png) */}
        <View style={styles.mainCard}>
          <Text style={styles.cardSectionTitle}>Daily Breakdown</Text>

          <View style={styles.entriesList}>
            {entries.map((item) => (
              <View key={item.id} style={styles.entryRowCard}>
                <View style={[styles.entryIconBox, { backgroundColor: '#E0F2FE' }]}>
                  <Calendar size={18} color="#0284C7" />
                </View>

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.entryDayTitle}>{item.day}</Text>
                  <Text style={styles.entryDateSub}>{item.date}</Text>
                </View>

                <Text style={styles.entryHoursText}>{item.regularHours} Hrs</Text>

                <TouchableOpacity
                  style={styles.pencilEditBtn}
                  onPress={() => handleOpenEdit(item)}
                >
                  <Pencil size={16} color="#64748B" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        {/* Bottom Double Actions: Cancel | Submit */}
        <View style={styles.bottomButtonsRow}>
          <TouchableOpacity
            style={styles.whiteBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.whiteBtnText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.blueBtn}
            onPress={handleSubmitTimesheet}
          >
            <Text style={styles.blueBtnText}>Submit</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* 39_Edit Time Entry Modal                                          */}
      {/* ───────────────────────────────────────────────────────────────── */}
      <Modal visible={Boolean(editingEntry)} animationType="slide" transparent onRequestClose={() => setEditingEntry(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.editModalSheet}>
            <TouchableOpacity onPress={() => setEditingEntry(null)} style={styles.floatingCloseBtn}>
              <X size={18} color="#0F172A" />
            </TouchableOpacity>

            <Text style={styles.editModalTitle}>Edit Time Entry</Text>
            <View style={styles.dividerThin} />

            <TextInput
              style={styles.inputOutline}
              value={editRegular}
              onChangeText={setEditRegular}
              placeholder="Regulars time"
              keyboardType="numeric"
            />

            <TextInput
              style={styles.inputOutline}
              value={editOvertime}
              onChangeText={setEditOvertime}
              placeholder="Over time"
              keyboardType="numeric"
            />

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 14 }}>
              <TouchableOpacity
                style={styles.whiteBtn}
                onPress={() => setEditingEntry(null)}
              >
                <Text style={styles.whiteBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.blueBtn}
                onPress={handleSaveEdit}
              >
                <Text style={styles.blueBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Persistent Bottom Nav */}
      <AppBottomNav activeRoute="EmployeeHome" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E0F2FE', // Sky blue backdrop matching screenshot
  },
  scrollContent: {
    paddingBottom: 32,
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
    marginBottom: 16,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardSectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 14,
  },

  /* Toggle Row */
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 4,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
  },
  toggleBtnActive: {
    backgroundColor: '#2563EB',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  toggleBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  toggleBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  weekRangeText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  pendingApprovalText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D97706',
  },

  /* 4 Stats Grid */
  fourStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statBox: {
    width: '48%',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statVal: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },

  /* Entries List */
  entriesList: {
    gap: 10,
  },
  entryRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
  },
  entryIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  entryDayTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  entryDateSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  entryHoursText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    marginRight: 10,
  },
  pencilEditBtn: {
    padding: 6,
  },

  /* Bottom Buttons */
  bottomButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 8,
  },
  whiteBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  whiteBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  blueBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  blueBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Edit Modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  editModalSheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    position: 'relative',
  },
  floatingCloseBtn: {
    position: 'absolute',
    top: -46,
    alignSelf: 'center',
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  dividerThin: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginBottom: 16,
  },
  inputOutline: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 12,
  },
});
