import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Text } from '../../../components/common/Text';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../../../types/navigation.types';

export const EmployeeServicesHubScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<'EmployeeServicesHub'>>();

  const services = [
    { title: 'Chat & Messages', icon: '💬', route: 'ChatConversations' as const, desc: 'Direct messages & groups' },
    { title: 'Company Calendar', icon: '🗓️', route: 'CalendarMain' as const, desc: 'Events, schedules & rooms' },
    { title: 'Tasks & Todo', icon: '📋', route: 'TodoList' as const, desc: 'Checklists & action items' },
    { title: 'Gantt Timeline', icon: '📊', route: 'GanttTimeline' as const, desc: 'Visual project scheduling' },
    { title: 'Geofence Punch', icon: '📍', route: 'GeofenceMapPunch' as const, desc: 'GPS attendance check-in' },
    { title: 'Leave Planner', icon: '📅', route: 'CalendarLeavePlanner' as const, desc: 'Interactive monthly calendar' },
    { title: 'My Leaves', icon: '🏖️', route: 'LeaveDetail' as const, desc: 'Balances & history' },
    { title: 'Apply Leave', icon: '✍️', route: 'ApplyLeave' as const, desc: 'Submit new time-off request' },
    { title: 'Payslips', icon: '📄', route: 'Payslips' as const, desc: 'Salary statements & tax' },
    { title: 'Banking & Cards', icon: '💳', route: 'PaymentCards' as const, desc: 'Corporate card & accounts' },
    { title: 'Expense Claims', icon: '🧾', route: 'ExpenseClaims' as const, desc: 'Reimbursement requests' },
    { title: 'Salary Advances', icon: '💰', route: 'SalaryAdvanceLoan' as const, desc: '0% company loans & EMI' },
    { title: 'Team Directory', icon: '👥', route: 'EmployeeDirectory' as const, desc: 'Colleagues & departments' },
    { title: 'Performance & OKRs', icon: '🎯', route: 'Performance' as const, desc: 'Goals & reviews' },
    { title: 'Document Vault', icon: '📁', route: 'DocumentsVault' as const, desc: 'Policies, contracts & letters' },
    { title: 'Shift Schedule', icon: '⏱️', route: 'ShiftSchedule' as const, desc: 'Work rosters & shift swap' },
    { title: 'Timesheets', icon: '📈', route: 'Timesheet' as const, desc: 'Project work hours log' },
    { title: 'App Settings', icon: '⚙️', route: 'Settings' as const, desc: 'Security & preferences' },
  ];

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
        <Text style={styles.headerTitle}>Employee Services</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('Notifications')}
          style={styles.bellBtn}
          accessibilityRole="button"
          accessibilityLabel="View notifications"
        >
          <Text style={styles.bellBtnText}>🔔</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionSubtitle}>Select a service to get started</Text>

        <View style={styles.servicesGrid}>
          {services.map((item, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.serviceCard}
              onPress={() => navigation.navigate(item.route)}
              accessibilityRole="button"
              accessibilityLabel={item.title}
            >
              <View style={styles.iconCircle}>
                <Text style={styles.serviceIcon}>{item.icon}</Text>
              </View>
              <Text style={styles.serviceTitle}>{item.title}</Text>
              <Text style={styles.serviceDesc}>{item.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
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
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bellBtnText: {
    fontSize: 18,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  serviceCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  serviceIcon: {
    fontSize: 24,
  },
  serviceTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  serviceDesc: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
  },
});
