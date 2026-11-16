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
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../../../types/navigation.types';

export const TimesheetScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<'Timesheet'>>();
  const [modalVisible, setModalVisible] = useState(false);
  const [project, setProject] = useState('MasterHRMS Mobile');
  const [taskName, setTaskName] = useState('');
  const [hours, setHours] = useState('8.0');

  const daysLog = [
    { day: 'Mon, Nov 16', hours: 8.5, task: 'Biometrics & Navigation Architecture', project: 'MasterHRMS Mobile' },
    { day: 'Tue, Nov 17', hours: 8.0, task: 'Live Geofence Map Punch Module', project: 'MasterHRMS Mobile' },
    { day: 'Wed, Nov 18', hours: 7.5, task: 'Salary Advances & Expense Workflows', project: 'Enterprise ERP' },
    { day: 'Thu, Nov 19', hours: 8.0, task: 'Interactive Leave Calendar Integration', project: 'MasterHRMS Mobile' },
    { day: 'Fri, Nov 20', hours: 6.0, task: 'Sprint Review & QA Automation', project: 'MasterHRMS Core' },
  ];

  const totalHours = daysLog.reduce((acc, curr) => acc + curr.hours, 0);

  const handleLogHours = () => {
    if (!taskName.trim()) {
      Alert.alert('Required', 'Please describe the task or milestone completed.');
      return;
    }
    setModalVisible(false);
    setTaskName('');
    Alert.alert('Timesheet Saved', `${hours} hours logged successfully for ${project}.`);
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
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Timesheets</Text>
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          style={styles.addBtn}
          accessibilityRole="button"
          accessibilityLabel="Log hours"
        >
          <Text style={styles.addBtnText}>+ Log</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Total Hours Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTag}>WEEKLY HOURS LOGGED</Text>
          <Text style={styles.summaryHours}>{totalHours.toFixed(1)} / 40.0 hrs</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${Math.min(100, (totalHours / 40) * 100)}%` }]} />
          </View>
          <Text style={styles.progressText}>95% of standard 40h weekly quota completed</Text>
        </View>

        {/* Project Allocation Breakdown */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Project Allocation</Text>

          <View style={styles.projRow}>
            <View style={styles.projLeft}>
              <View style={[styles.projDot, styles.dotIndigo]} />
              <Text style={styles.projName}>MasterHRMS Mobile</Text>
            </View>
            <Text style={styles.projPercent}>65% (24.5h)</Text>
          </View>
          <View style={styles.projRow}>
            <View style={styles.projLeft}>
              <View style={[styles.projDot, styles.dotGreen]} />
              <Text style={styles.projName}>Enterprise ERP</Text>
            </View>
            <Text style={styles.projPercent}>20% (7.5h)</Text>
          </View>
          <View style={styles.projRow}>
            <View style={styles.projLeft}>
              <View style={[styles.projDot, styles.dotAmber]} />
              <Text style={styles.projName}>MasterHRMS Core</Text>
            </View>
            <Text style={styles.projPercent}>15% (6.0h)</Text>
          </View>
        </View>

        {/* Daily Timesheet Logs */}
        <Text style={styles.sectionTitle}>Daily Time Entries</Text>

        {daysLog.map((item, idx) => (
          <View key={idx} style={styles.entryCard}>
            <View style={styles.entryHeader}>
              <Text style={styles.entryDay}>{item.day}</Text>
              <View style={styles.hoursBadge}>
                <Text style={styles.hoursText}>{item.hours.toFixed(1)} hrs</Text>
              </View>
            </View>
            <Text style={styles.entryTask}>{item.task}</Text>
            <Text style={styles.entryProject}>📁 {item.project}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Log Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Log Work Hours</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Project</Text>
            <View style={styles.projectPicker}>
              {['MasterHRMS Mobile', 'Enterprise ERP', 'MasterHRMS Core'].map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.projPill, project === p && styles.projPillActive]}
                  onPress={() => setProject(p)}
                >
                  <Text style={[styles.projPillText, project === p && styles.projPillTextActive]}>
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Task Description</Text>
            <TextInput
              style={styles.modalInput}
              value={taskName}
              onChangeText={setTaskName}
              placeholder="e.g. Geofence Punch UI & Tests"
              placeholderTextColor="#94A3B8"
            />

            <Text style={styles.fieldLabel}>Hours Worked</Text>
            <TextInput
              style={styles.modalInput}
              value={hours}
              onChangeText={setHours}
              keyboardType="numeric"
              placeholderTextColor="#94A3B8"
            />

            <TouchableOpacity style={styles.submitBtn} onPress={handleLogHours}>
              <Text style={styles.submitBtnText}>Save Time Entry</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  addBtn: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  summaryCard: {
    backgroundColor: '#1E1B4B',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  summaryTag: {
    color: '#A5B4FC',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  summaryHours: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  progressText: {
    color: '#CBD5E1',
    fontSize: 11,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  projRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  projLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  projDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  dotIndigo: {
    backgroundColor: '#4F46E5',
  },
  dotGreen: {
    backgroundColor: '#10B981',
  },
  dotAmber: {
    backgroundColor: '#F59E0B',
  },
  projName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  projPercent: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  entryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  entryDay: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  hoursBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  hoursText: {
    color: '#4F46E5',
    fontSize: 11,
    fontWeight: '700',
  },
  entryTask: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
    marginBottom: 6,
  },
  entryProject: {
    fontSize: 11,
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
  projectPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 14,
  },
  projPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    marginRight: 6,
    marginBottom: 6,
  },
  projPillActive: {
    backgroundColor: '#4F46E5',
  },
  projPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  projPillTextActive: {
    color: '#FFFFFF',
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
