import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {
  MessageSquare,
  Calendar,
  CheckSquare,
  BarChart2,
  MapPin,
  CalendarDays,
  Palmtree,
  FileSignature,
  FileText,
  CreditCard,
  Receipt,
  DollarSign,
  Users,
  Target,
  Folder,
  Clock,
  TrendingUp,
  Settings,
  ArrowLeft,
  Bell,
} from 'lucide-react-native';
import { Text } from '../../../components/common/Text';
import { AppBottomNav } from '../../../components/common/AppBottomNav';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../../../types/navigation.types';

export const EmployeeServicesHubScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<'EmployeeServicesHub'>>();

  const services = [
    { title: 'Chat & Messages', icon: MessageSquare, color: '#4F46E5', route: 'ChatConversations' as const, desc: 'Direct messages & groups' },
    { title: 'Company Calendar', icon: Calendar, color: '#D97706', route: 'CalendarMain' as const, desc: 'Events, schedules & rooms' },
    { title: 'Tasks & Todo', icon: CheckSquare, color: '#059669', route: 'TodoList' as const, desc: 'Checklists & action items' },
    { title: 'Gantt Timeline', icon: BarChart2, color: '#2563EB', route: 'GanttTimeline' as const, desc: 'Visual project scheduling' },
    { title: 'Geofence Punch', icon: MapPin, color: '#4F46E5', route: 'GeofenceMapPunch' as const, desc: 'GPS attendance check-in' },
    { title: 'Leave Planner', icon: CalendarDays, color: '#D97706', route: 'CalendarLeavePlanner' as const, desc: 'Interactive monthly calendar' },
    { title: 'My Leaves', icon: Palmtree, color: '#059669', route: 'LeaveDetail' as const, desc: 'Balances & history' },
    { title: 'Apply Leave', icon: FileSignature, color: '#2563EB', route: 'ApplyLeave' as const, desc: 'Submit new time-off request' },
    { title: 'Payslips', icon: FileText, color: '#0D9488', route: 'Payslips' as const, desc: 'Salary statements & tax' },
    { title: 'Banking & Cards', icon: CreditCard, color: '#2563EB', route: 'PaymentCards' as const, desc: 'Corporate card & accounts' },
    { title: 'Expense Claims', icon: Receipt, color: '#059669', route: 'ExpenseClaims' as const, desc: 'Reimbursement requests' },
    { title: 'Salary Advances', icon: DollarSign, color: '#DC2626', route: 'SalaryAdvanceLoan' as const, desc: '0% company loans & EMI' },
    { title: 'Team Directory', icon: Users, color: '#6366F1', route: 'EmployeeDirectory' as const, desc: 'Colleagues & departments' },
    { title: 'Performance & OKRs', icon: Target, color: '#EA580C', route: 'Performance' as const, desc: 'Goals & reviews' },
    { title: 'Document Vault', icon: Folder, color: '#7C3AED', route: 'DocumentsVault' as const, desc: 'Policies, contracts & letters' },
    { title: 'Shift Schedule', icon: Clock, color: '#D97706', route: 'ShiftSchedule' as const, desc: 'Work rosters & shift swap' },
    { title: 'Timesheets', icon: TrendingUp, color: '#0284C7', route: 'Timesheet' as const, desc: 'Project work hours log' },
    { title: 'App Settings', icon: Settings, color: '#475569', route: 'Settings' as const, desc: 'Security & preferences' },
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
          <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.4} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Employee Services</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('Notifications')}
          style={styles.bellBtn}
          accessibilityRole="button"
          accessibilityLabel="View notifications"
        >
          <Bell size={18} color="#FFFFFF" strokeWidth={2.2} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionSubtitle}>Select a service to get started</Text>

        <View style={styles.servicesGrid}>
          {services.map((item, idx) => {
            const IconComp = item.icon;
            return (
              <TouchableOpacity
                key={idx}
                style={styles.serviceCard}
                onPress={() => navigation.navigate(item.route)}
                accessibilityRole="button"
                accessibilityLabel={item.title}
                activeOpacity={0.8}
              >
                <View style={[styles.iconCircle, { backgroundColor: `${item.color}15` }]}>
                  <IconComp size={22} color={item.color} strokeWidth={2.2} />
                </View>
                <Text style={styles.serviceTitle}>{item.title}</Text>
                <Text style={styles.serviceDesc}>{item.desc}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Pinned Bottom Navigation */}
      <AppBottomNav activeRoute="EmployeeServicesHub" />
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
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
    backgroundColor: '#1E1B4B',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bellBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  serviceCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  serviceTitle: {
    fontSize: 14,
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
