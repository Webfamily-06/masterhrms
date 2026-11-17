import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Text } from '../../../components/common/Text';
import {
  ArrowLeft,
  Calendar,
  Pencil,
  X,
  Plus,
} from 'lucide-react-native';
import { AppBottomNav } from '../../../components/common/AppBottomNav';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../../../types/navigation.types';
import { AttendanceService, TimesheetItem } from '../../../core/services/attendanceService';

export const TimesheetScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<'Timesheet'>>();

  const [payPeriodMode, setPayPeriodMode] = useState<'weekly' | 'biweekly'>('biweekly');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timesheets, setTimesheets] = useState<TimesheetItem[]>([]);

  // Edit/Add Time Entry Modal
  const [editingEntry, setEditingEntry] = useState<TimesheetItem | null>(null);
  const [editDate, setEditDate] = useState(new Date().toISOString().split('T')[0]);
  const [editHours, setEditHours] = useState('8.00');
  const [editDescription, setEditDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await AttendanceService.getTimesheets();
      setTimesheets(data || []);
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

  // Date range label for current period
  const periodLabel = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    const endDays = payPeriodMode === 'weekly' ? 6 : 13;
    const end = new Date(monday);
    end.setDate(monday.getDate() + endDays);

    const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${fmt(monday)} - ${fmt(end)}, ${end.getFullYear()}`;
  }, [payPeriodMode]);

  // Aggregate stats from real records
  const { regularHours, overtimeHours, totalHours } = useMemo(() => {
    let reg = 0;
    let ot = 0;
    timesheets.forEach((t) => {
      const h = Number(t.hours) || 0;
      if (h > 8) {
        reg += 8;
        ot += h - 8;
      } else {
        reg += h;
      }
    });
    return {
      regularHours: reg.toFixed(1),
      overtimeHours: ot.toFixed(1),
      totalHours: (reg + ot).toFixed(1),
    };
  }, [timesheets]);

  const handleOpenAdd = () => {
    setEditingEntry(null);
    setEditDate(new Date().toISOString().split('T')[0]);
    setEditHours('8.00');
    setEditDescription('');
  };

  const handleOpenEdit = (entry: TimesheetItem) => {
    setEditingEntry(entry);
    setEditDate(entry.date?.split('T')[0] || new Date().toISOString().split('T')[0]);
    setEditHours(String(entry.hours || '8.00'));
    setEditDescription(entry.description || '');
  };

  const handleSaveEntry = async () => {
    const hoursNum = parseFloat(editHours);
    if (isNaN(hoursNum) || hoursNum <= 0) {
      Alert.alert('Invalid Hours', 'Please enter a valid positive number of hours.');
      return;
    }

    try {
      setSaving(true);
      await AttendanceService.createTimesheet({
        date: editDate,
        hours: hoursNum,
        description: editDescription,
      });
      setEditingEntry(null);
      await loadData();
      Alert.alert('Success', 'Timesheet entry saved.');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not save timesheet entry.');
    } finally {
      setSaving(false);
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
        <Text style={styles.headerTitle}>Timesheet</Text>
        <TouchableOpacity
          onPress={handleOpenAdd}
          style={styles.backCircleBtn}
          accessibilityRole="button"
          accessibilityLabel="Add Time Entry"
        >
          <Plus size={18} color="#0284C7" strokeWidth={2.4} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Card: Pay Period */}
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
            <Text style={styles.weekRangeText}>{periodLabel}</Text>
            <Text style={styles.pendingApprovalText}>
              ({timesheets.length > 0 ? `${timesheets.length} Entries` : 'No Entries'})
            </Text>
          </View>

          {/* 4 Stats Boxes */}
          <View style={styles.fourStatsGrid}>
            <View style={[styles.statBox, { backgroundColor: '#E0F2FE' }]}>
              <Text style={styles.statVal}>{regularHours}</Text>
              <Text style={styles.statLabel}>Regular</Text>
            </View>

            <View style={[styles.statBox, { backgroundColor: '#FEF3C7' }]}>
              <Text style={styles.statVal}>{overtimeHours}</Text>
              <Text style={styles.statLabel}>Overtime</Text>
            </View>

            <View style={[styles.statBox, { backgroundColor: '#F3E8FF' }]}>
              <Text style={styles.statVal}>0.0</Text>
              <Text style={styles.statLabel}>Leave</Text>
            </View>

            <View style={[styles.statBox, { backgroundColor: '#DCFCE7' }]}>
              <Text style={styles.statVal}>{totalHours}</Text>
              <Text style={styles.statLabel}>Total Hours</Text>
            </View>
          </View>
        </View>

        {/* Card: Daily Breakdown */}
        <View style={styles.mainCard}>
          <Text style={styles.cardSectionTitle}>Daily Breakdown</Text>

          {loading ? (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <ActivityIndicator size="small" color="#0284C7" />
            </View>
          ) : timesheets.length === 0 ? (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <Text style={{ color: '#64748B', fontSize: 13 }}>No timesheet records found for this period.</Text>
            </View>
          ) : (
            <View style={styles.entriesList}>
              {timesheets.map((item) => {
                const itemDate = new Date(item.date);
                const dayName = isNaN(itemDate.getTime())
                  ? 'Workday'
                  : itemDate.toLocaleDateString('en-US', { weekday: 'long' });
                const dateFmt = isNaN(itemDate.getTime())
                  ? item.date
                  : itemDate.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });

                return (
                  <View key={item.id} style={styles.entryRowCard}>
                    <View style={[styles.entryIconBox, { backgroundColor: '#E0F2FE' }]}>
                      <Calendar size={18} color="#0284C7" />
                    </View>

                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.entryDayTitle}>{dayName}</Text>
                      <Text style={styles.entryDateSub}>{dateFmt}</Text>
                      {item.projectName && (
                        <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                          {item.projectName}
                        </Text>
                      )}
                    </View>

                    <Text style={styles.entryHoursText}>{Number(item.hours).toFixed(2)} Hrs</Text>

                    <TouchableOpacity
                      style={styles.pencilEditBtn}
                      onPress={() => handleOpenEdit(item)}
                    >
                      <Pencil size={16} color="#64748B" />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Edit/Add Time Entry Modal */}
      <Modal visible={Boolean(editingEntry)} animationType="slide" transparent onRequestClose={() => setEditingEntry(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.editModalSheet}>
            <TouchableOpacity onPress={() => setEditingEntry(null)} style={styles.floatingCloseBtn}>
              <X size={18} color="#0F172A" />
            </TouchableOpacity>

            <Text style={styles.editModalTitle}>
              {editingEntry ? 'Edit Time Entry' : 'New Time Entry'}
            </Text>
            <View style={styles.dividerThin} />

            <TextInput
              style={styles.inputOutline}
              value={editDate}
              onChangeText={setEditDate}
              placeholder="Date (YYYY-MM-DD)"
            />

            <TextInput
              style={styles.inputOutline}
              value={editHours}
              onChangeText={setEditHours}
              placeholder="Hours (e.g. 8.0)"
              keyboardType="numeric"
            />

            <TextInput
              style={[styles.inputOutline, { height: 64 }]}
              value={editDescription}
              onChangeText={setEditDescription}
              placeholder="Work description / notes"
              multiline
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
                onPress={handleSaveEntry}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.blueBtnText}>Save</Text>
                )}
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
