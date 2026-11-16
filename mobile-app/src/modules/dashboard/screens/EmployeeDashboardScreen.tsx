import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { Text } from '../../../components/common/Text';
import { useAuthStore } from '../../../store/authStore';
import { useTenantStore } from '../../../store/tenantStore';
import { PersonaSwitcher } from '../../navigation/PersonaSwitcher';
import { usePermission } from '../../../hooks/usePermission';
import { AttendanceService, DashboardSummaryResponse } from '../../../core/services/attendanceService';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../../../types/navigation.types';

const logoSource = require('../../../assets/images/logo.webp');

export const EmployeeDashboardScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<'EmployeeHome'>>();
  const user = useAuthStore((state) => state.user);
  const currentTenant = useTenantStore((state) => state.currentTenant);
  const logout = useAuthStore((state) => state.logout);
  const { canAccessModule } = usePermission();

  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<DashboardSummaryResponse>({});

  const loadSummary = useCallback(async () => {
    try {
      const data = await AttendanceService.getDashboardSummary();
      setSummary(data);
    } catch {
      // Handled
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadSummary();
  }, [loadSummary]);

  const employeeName = user?.profile?.fullName || user?.email?.split('@')[0] || 'Employee';

  const isCheckedIn = !!summary.todayAttendance?.checkIn && !summary.todayAttendance?.checkOut;

  return (
    <View style={styles.container}>
      <View style={styles.mintGlow} pointerEvents="none" />
      <View style={styles.yellowGlow} pointerEvents="none" />

      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <Image source={logoSource} style={styles.logo} resizeMode="contain" />
          <View style={styles.headerRightActions}>
            <TouchableOpacity
              onPress={() => navigation.navigate('Notifications')}
              style={styles.bellBtn}
              accessibilityRole="button"
              accessibilityLabel="View notifications"
            >
              <Text style={styles.bellBtnText}>🔔</Text>
            </TouchableOpacity>
            <PersonaSwitcher />
            <TouchableOpacity
              onPress={() => navigation.navigate('Profile')}
              style={styles.profileBtn}
              accessibilityRole="button"
              accessibilityLabel="View Profile"
            >
              <Text style={styles.profileBtnText}>👤</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.greetingSection}>
          <Text style={styles.greetingSub}>
            {currentTenant?.name || 'Workspace'}
          </Text>
          <Text style={styles.greetingTitle}>Welcome, {employeeName}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Attendance Punch Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Today's Attendance</Text>
            <View style={[styles.statusPill, isCheckedIn ? styles.statusPillOn : styles.statusPillOff]}>
              <View style={[styles.statusDot, isCheckedIn ? styles.dotGreen : styles.dotGray]} />
              <Text style={styles.statusText}>{isCheckedIn ? 'On Duty' : 'Not Checked In'}</Text>
            </View>
          </View>

          <View style={styles.shiftDetails}>
            <Text style={styles.shiftTime}>
              {summary.shift ? `${summary.shift.name}: ${summary.shift.startTime} - ${summary.shift.endTime}` : 'General Shift: 09:00 AM - 06:00 PM'}
            </Text>
            <Text style={styles.shiftHours}>
              Worked Today: {summary.workedHoursToday ? `${summary.workedHoursToday.toFixed(1)} hrs` : '00h 00m'}
            </Text>
          </View>

          <View style={styles.punchActionRow}>
            <TouchableOpacity
              style={styles.geofenceButton}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('GeofenceMapPunch')}
            >
              <Text style={styles.geofenceBtnText}>📍 Office Geofence Punch</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.checkInButton}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('AttendanceDetail')}
            >
              <Text style={styles.checkInText}>Attendance Log & Regularize →</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Services Grid */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Quick Services</Text>
            <TouchableOpacity onPress={() => navigation.navigate('EmployeeServicesHub')}>
              <Text style={styles.viewAllText}>All Services →</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.quickGrid}>
            <TouchableOpacity
              style={styles.quickItem}
              onPress={() => navigation.navigate('GeofenceMapPunch')}
            >
              <View style={[styles.quickIconCircle, styles.bgIndigoLight]}>
                <Text style={styles.quickIconText}>📍</Text>
              </View>
              <Text style={styles.quickLabel}>Geofence</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickItem}
              onPress={() => navigation.navigate('CalendarLeavePlanner')}
            >
              <View style={[styles.quickIconCircle, styles.bgYellowLight]}>
                <Text style={styles.quickIconText}>📅</Text>
              </View>
              <Text style={styles.quickLabel}>Calendar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickItem}
              onPress={() => navigation.navigate('PaymentCards')}
            >
              <View style={[styles.quickIconCircle, styles.bgBlueLight]}>
                <Text style={styles.quickIconText}>💳</Text>
              </View>
              <Text style={styles.quickLabel}>Cards</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickItem}
              onPress={() => navigation.navigate('ExpenseClaims')}
            >
              <View style={[styles.quickIconCircle, styles.bgGreenLight]}>
                <Text style={styles.quickIconText}>🧾</Text>
              </View>
              <Text style={styles.quickLabel}>Expenses</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickItem}
              onPress={() => navigation.navigate('SalaryAdvanceLoan')}
            >
              <View style={[styles.quickIconCircle, styles.bgRedLight]}>
                <Text style={styles.quickIconText}>💰</Text>
              </View>
              <Text style={styles.quickLabel}>Loans</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickItem}
              onPress={() => navigation.navigate('ShiftSchedule')}
            >
              <View style={[styles.quickIconCircle, styles.bgPurpleLight]}>
                <Text style={styles.quickIconText}>⏱️</Text>
              </View>
              <Text style={styles.quickLabel}>Shifts</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickItem}
              onPress={() => navigation.navigate('Timesheet')}
            >
              <View style={[styles.quickIconCircle, styles.bgSkyLight]}>
                <Text style={styles.quickIconText}>📊</Text>
              </View>
              <Text style={styles.quickLabel}>Timesheet</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickItem}
              onPress={() => navigation.navigate('EmployeeServicesHub')}
            >
              <View style={[styles.quickIconCircle, styles.bgSlateLight]}>
                <Text style={styles.quickIconText}>📱</Text>
              </View>
              <Text style={styles.quickLabel}>More</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Leave Balances */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Leave Balances</Text>
            <TouchableOpacity onPress={() => navigation.navigate('LeaveDetail')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.leaveGrid}>
            <View style={styles.leaveMetric}>
              <Text style={styles.leaveNumber}>
                {summary.leaveBalances?.annual !== undefined ? summary.leaveBalances.annual : 12}
              </Text>
              <Text style={styles.leaveLabel}>Annual</Text>
            </View>
            <View style={styles.leaveMetric}>
              <Text style={styles.leaveNumber}>
                {summary.leaveBalances?.casual !== undefined ? summary.leaveBalances.casual : '05'}
              </Text>
              <Text style={styles.leaveLabel}>Casual</Text>
            </View>
            <View style={styles.leaveMetric}>
              <Text style={styles.leaveNumber}>
                {summary.leaveBalances?.sick !== undefined ? summary.leaveBalances.sick : '08'}
              </Text>
              <Text style={styles.leaveLabel}>Sick</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.secondaryCardAction}
            onPress={() => navigation.navigate('LeaveDetail')}
          >
            <Text style={styles.secondaryActionText}>Request Leave →</Text>
          </TouchableOpacity>
        </View>

        {/* Payslips & Documents */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Recent Payslips</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Payslips')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.payslipRow}
            onPress={() => navigation.navigate('Payslips')}
          >
            <Text style={styles.payslipMonth}>View Detailed Payslips & Form 16</Text>
            <View style={styles.paidBadge}>
              <Text style={styles.paidBadgeText}>Open</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Projects (If module enabled) */}
        {canAccessModule('project') ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>My Assigned Tasks</Text>
            <Text style={styles.emptyNotice}>No pending tasks due today.</Text>
          </View>
        ) : null}

        {/* Sign Out Action */}
        <TouchableOpacity style={styles.logoutButton} onPress={logout} activeOpacity={0.85}>
          <Text style={styles.logoutText}>Sign Out from Workspace</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAF8',
  },
  mintGlow: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(187, 247, 208, 0.4)',
  },
  yellowGlow: {
    position: 'absolute',
    bottom: -80,
    left: -80,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(254, 240, 138, 0.3)',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  brandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  logo: {
    width: 140,
    height: 34,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bellBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bellBtnText: {
    fontSize: 16,
  },
  profileBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileBtnText: {
    fontSize: 16,
  },
  greetingSection: {
    marginTop: 4,
  },
  greetingSub: {
    fontSize: 12,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  greetingTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  viewAllText: {
    fontSize: 12.5,
    color: '#16A34A',
    fontWeight: '600',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPillOn: {
    backgroundColor: '#DCFCE7',
  },
  statusPillOff: {
    backgroundColor: '#F1F5F9',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 6,
  },
  dotGreen: {
    backgroundColor: '#16A34A',
  },
  dotGray: {
    backgroundColor: '#94A3B8',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  shiftDetails: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  shiftTime: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  shiftHours: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  punchActionRow: {
    marginTop: 4,
    gap: 8,
  },
  geofenceButton: {
    backgroundColor: '#1E1B4B',
    borderRadius: 12,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
  },
  geofenceBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  checkInButton: {
    backgroundColor: '#16A34A',
    borderRadius: 12,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkInText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  quickItem: {
    width: '23%',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  quickIconText: {
    fontSize: 20,
  },
  quickLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center',
  },
  bgIndigoLight: {
    backgroundColor: '#EEF2FF',
  },
  bgYellowLight: {
    backgroundColor: '#FEF3C7',
  },
  bgBlueLight: {
    backgroundColor: '#E0E7FF',
  },
  bgGreenLight: {
    backgroundColor: '#D1FAE5',
  },
  bgRedLight: {
    backgroundColor: '#FEE2E2',
  },
  bgPurpleLight: {
    backgroundColor: '#F3E8FF',
  },
  bgSkyLight: {
    backgroundColor: '#E0F2FE',
  },
  bgSlateLight: {
    backgroundColor: '#F1F5F9',
  },
  leaveGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  leaveMetric: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  leaveNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: '#16A34A',
  },
  leaveLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  secondaryCardAction: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  secondaryActionText: {
    fontSize: 13,
    color: '#16A34A',
    fontWeight: '600',
  },
  payslipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  payslipMonth: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '500',
  },
  paidBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  paidBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#15803D',
  },
  emptyNotice: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 6,
  },
  logoutButton: {
    marginTop: 8,
    marginBottom: 24,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
  },
});
