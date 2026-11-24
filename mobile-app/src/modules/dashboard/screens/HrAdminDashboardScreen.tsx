import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Platform,
} from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { Text } from '../../../components/common/Text';
import {
  Users,
  UserPlus,
  Clock,
  DollarSign,
  Calendar,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Sun,
  Moon,
  Bell,
  Check,
  X,
  BarChart3,
} from 'lucide-react-native';
import { AppBottomNav } from '../../../components/common/AppBottomNav';
import { UserAvatar } from '../../../components/common/UserAvatar';
import { useAuthStore } from '../../../store/authStore';
import { useTheme } from '../../../app/providers/ThemeProvider';
import { PersonaSwitcher } from '../../navigation/PersonaSwitcher';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../../../types/navigation.types';

const { width } = Dimensions.get('window');

// ── Native Leave Radial Gauge (Matching Web leaveRadialOptions) ─────────────
const NativeLeaveRadialGauge: React.FC<{ percent?: number; isDark?: boolean }> = ({
  percent = 70,
  isDark,
}) => {
  const size = 130;
  const strokeWidth = 12;
  const center = size / 2;
  const radius = center - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - percent / 100);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <G rotation="-90" origin={`${center}, ${center}`}>
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={isDark ? '#334155' : '#F1F5F9'}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke="#03C95A"
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="none"
          />
        </G>
      </Svg>
      <View style={styles.radialCenterWrap}>
        <Text style={[styles.radialPercentText, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
          {percent}%
        </Text>
        <Text style={[styles.radialSubText, { color: isDark ? '#94A3B8' : '#64748B' }]}>On Leave</Text>
      </View>
    </View>
  );
};

// ── Native Weekly Attendance Bar Chart (Matching Web attendanceBarOptions) ──
const NativeAttendanceBarChart: React.FC<{ isDark?: boolean }> = ({ isDark }) => {
  const days = [
    { day: 'Mon', present: 80, absent: 20 },
    { day: 'Tue', present: 85, absent: 15 },
    { day: 'Wed', present: 90, absent: 10 },
    { day: 'Thu', present: 88, absent: 12 },
    { day: 'Fri', present: 92, absent: 8 },
  ];

  const maxVal = 100;
  const chartHeight = 130;

  return (
    <View style={styles.attendanceBarContainer}>
      <View style={styles.attendanceBarRow}>
        {days.map((item) => {
          const presentH = (item.present / maxVal) * chartHeight;
          const absentH = (item.absent / maxVal) * chartHeight;

          return (
            <View key={item.day} style={styles.attendanceCol}>
              <View style={[styles.barStackWrap, { height: chartHeight }]}>
                {/* Absent Segment (Red) */}
                <View style={[styles.barSegment, { height: absentH, backgroundColor: '#EF4444' }]} />
                {/* Present Segment (Green) */}
                <View style={[styles.barSegment, { height: presentH, backgroundColor: '#03C95A' }]} />
              </View>
              <Text style={[styles.barDayLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                {item.day}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Legend */}
      <View style={styles.chartLegendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#03C95A' }]} />
          <Text style={[styles.legendText, { color: isDark ? '#94A3B8' : '#64748B' }]}>Present</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
          <Text style={[styles.legendText, { color: isDark ? '#94A3B8' : '#64748B' }]}>Absent</Text>
        </View>
      </View>
    </View>
  );
};

// ── Native Employee Distribution Yearly Bar (Matching Web empDistribution) ─
const NativeYearlyDistributionChart: React.FC<{ isDark?: boolean }> = ({ isDark }) => {
  const months = [
    { m: 'Jan', val: 40 },
    { m: 'Feb', val: 50 },
    { m: 'Mar', val: 60 },
    { m: 'Apr', val: 70 },
    { m: 'May', val: 80 },
    { m: 'Jun', val: 90 },
    { m: 'Jul', val: 100 },
    { m: 'Aug', val: 80 },
    { m: 'Sep', val: 70 },
    { m: 'Oct', val: 60 },
    { m: 'Nov', val: 50 },
    { m: 'Dec', val: 40 },
  ];

  const maxVal = 100;
  const barMaxH = 110;

  return (
    <View style={{ width: '100%', marginTop: 8 }}>
      <View style={styles.yearlyBarRow}>
        {months.map((item) => {
          const h = (item.val / maxVal) * barMaxH;
          return (
            <View key={item.m} style={styles.yearlyCol}>
              <View style={[styles.yearlyBarWrap, { height: barMaxH }]}>
                <View style={[styles.yearlyBar, { height: h, backgroundColor: '#FF7129' }]} />
              </View>
              <Text style={[styles.yearlyMonthLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                {item.m}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

export const HrAdminDashboardScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<'HrAdminHome'>>();
  const user = useAuthStore((state) => state.user);
  const { theme, toggleTheme } = useTheme();

  const [refreshing, setRefreshing] = useState(false);
  const [approvals, setApprovals] = useState([
    { id: '1', name: 'John Doe', type: 'Annual Leave', dates: '24 Apr - 26 Apr', days: '3 Days', avatar: 'JD' },
    { id: '2', name: 'Emma Watson', type: 'Sick Leave', dates: '22 Apr', days: '1 Day', avatar: 'EW' },
    { id: '3', name: 'Robert Fox', type: 'Casual Leave', dates: '28 Apr - 29 Apr', days: '2 Days', avatar: 'RF' },
  ]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 600);
  }, []);

  const cardBgStyle = {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
  };
  const textPrimary = { color: theme.colors.text };
  const textSecondary = { color: theme.colors.textSecondary };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      {/* ── Top Header Bar ──────────────────────────────────────────────── */}
      <View
        style={[
          styles.topHeader,
          {
            backgroundColor: theme.isDark ? '#0F172A' : '#FFFFFF',
            borderBottomColor: theme.colors.border,
          },
        ]}
      >
        <View style={styles.topHeaderLeft}>
          <Text style={[styles.headerTitle, textPrimary]}>HR Dashboard</Text>
          <Text style={[styles.headerBreadcrumb, textSecondary]}>
            Home • Dashboard • <Text style={{ color: '#0D6EFD', fontWeight: '600' }}>HR Admin</Text>
          </Text>
        </View>

        <View style={styles.topHeaderRight}>
          <PersonaSwitcher />
          <TouchableOpacity
            style={[styles.headerBtn, { backgroundColor: theme.isDark ? '#1E293B' : '#F1F5F9' }]}
            onPress={toggleTheme}
            accessibilityRole="button"
            accessibilityLabel="Toggle Dark Mode"
          >
            {theme.isDark ? <Sun size={17} color="#FBBF24" /> : <Moon size={17} color="#0F172A" />}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerBtn, { backgroundColor: theme.isDark ? '#1E293B' : '#F1F5F9' }]}
            onPress={() => navigation.navigate('Notifications')}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Bell size={17} color={theme.isDark ? '#F8FAFC' : '#0F172A'} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('Profile')}
            accessibilityRole="button"
            accessibilityLabel="Profile"
          >
            <UserAvatar entity={user} size={36} borderWidth={1.5} borderColor="#0D6EFD" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollBody}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0D6EFD" />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 1. Overview Statistics (Web lines 342-450) ─────────────────── */}
        <View style={styles.statsGrid}>
          {/* Total Employees */}
          <View style={[styles.statCard, cardBgStyle]}>
            <View style={styles.statCardHeader}>
              <View style={[styles.statIconCircle, { backgroundColor: '#EFF6FF' }]}>
                <Users size={18} color="#0D6EFD" />
              </View>
              <View style={[styles.deltaBadge, { backgroundColor: '#DCFCE7' }]}>
                <Text style={styles.deltaBadgePositive}>+18%</Text>
                <ArrowUpRight size={12} color="#16A34A" />
              </View>
            </View>
            <Text style={[styles.statNum, textPrimary]}>1,848</Text>
            <Text style={[styles.statLabel, textSecondary]}>Total Employees</Text>
            <Text style={[styles.statSub, textSecondary]}>Headcount Overview</Text>
          </View>

          {/* New Joinees */}
          <View style={[styles.statCard, cardBgStyle]}>
            <View style={styles.statCardHeader}>
              <View style={[styles.statIconCircle, { backgroundColor: '#F0FDF4' }]}>
                <UserPlus size={18} color="#16A34A" />
              </View>
              <View style={[styles.deltaBadge, { backgroundColor: '#DCFCE7' }]}>
                <Text style={styles.deltaBadgePositive}>+22%</Text>
                <ArrowUpRight size={12} color="#16A34A" />
              </View>
            </View>
            <Text style={[styles.statNum, textPrimary]}>1,248</Text>
            <Text style={[styles.statLabel, textSecondary]}>New Joinees</Text>
            <Text style={[styles.statSub, textSecondary]}>All Departments</Text>
          </View>

          {/* Late Arrivals Today */}
          <View style={[styles.statCard, cardBgStyle]}>
            <View style={styles.statCardHeader}>
              <View style={[styles.statIconCircle, { backgroundColor: '#FEF2F2' }]}>
                <Clock size={18} color="#EF4444" />
              </View>
              <View style={[styles.deltaBadge, { backgroundColor: '#FEE2E2' }]}>
                <Text style={styles.deltaBadgeNegative}>-16%</Text>
                <ArrowDownRight size={12} color="#DC2626" />
              </View>
            </View>
            <Text style={[styles.statNum, textPrimary]}>12</Text>
            <Text style={[styles.statLabel, textSecondary]}>Late Arrivals Today</Text>
            <Text style={[styles.statSub, textSecondary]}>Delayed Logins Today</Text>
          </View>

          {/* Total Payroll Cost */}
          <View style={[styles.statCard, cardBgStyle]}>
            <View style={styles.statCardHeader}>
              <View style={[styles.statIconCircle, { backgroundColor: '#FAF5FF' }]}>
                <DollarSign size={18} color="#9333EA" />
              </View>
              <View style={[styles.deltaBadge, { backgroundColor: '#DCFCE7' }]}>
                <Text style={styles.deltaBadgePositive}>+16%</Text>
                <ArrowUpRight size={12} color="#16A34A" />
              </View>
            </View>
            <Text style={[styles.statNum, textPrimary]}>$2.4M</Text>
            <Text style={[styles.statLabel, textSecondary]}>Total Payroll Cost</Text>
            <Text style={[styles.statSub, textSecondary]}>Payroll Outflow</Text>
          </View>
        </View>

        {/* ── 2. Employee Status & Type (Web lines 198-236) ──────────────── */}
        <View style={[styles.webCard, cardBgStyle]}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.cardTitle, textPrimary]}>Employee Status & Type</Text>
            <TouchableOpacity onPress={() => navigation.navigate('EmployeeDirectory')}>
              <Text style={styles.viewLinkText}>View All →</Text>
            </TouchableOpacity>
          </View>

          {/* Horizontal Proportion Gauge */}
          <View style={styles.statusGaugeContainer}>
            <View style={[styles.gaugeSegment, { width: '62%', backgroundColor: '#0D6EFD' }]} />
            <View style={[styles.gaugeSegment, { width: '33%', backgroundColor: '#64748B' }]} />
            <View style={[styles.gaugeSegment, { width: '5%', backgroundColor: '#F59E0B' }]} />
          </View>

          <View style={styles.statusStatsRow}>
            <View style={styles.statusStatCol}>
              <Text style={[styles.statusStatNum, textPrimary]}>1,054</Text>
              <View style={styles.statusLabelRow}>
                <View style={[styles.statusLegendDot, { backgroundColor: '#0D6EFD' }]} />
                <Text style={[styles.statusStatLabel, textSecondary]}>Full-Time</Text>
              </View>
            </View>
            <View style={styles.statusStatCol}>
              <Text style={[styles.statusStatNum, textPrimary]}>568</Text>
              <View style={styles.statusLabelRow}>
                <View style={[styles.statusLegendDot, { backgroundColor: '#64748B' }]} />
                <Text style={[styles.statusStatLabel, textSecondary]}>Contract</Text>
              </View>
            </View>
            <View style={styles.statusStatCol}>
              <Text style={[styles.statusStatNum, textPrimary]}>80</Text>
              <View style={styles.statusLabelRow}>
                <View style={[styles.statusLegendDot, { backgroundColor: '#F59E0B' }]} />
                <Text style={[styles.statusStatLabel, textSecondary]}>Probation</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── 3. Leave Type Distribution (Web lines 238-305) ─────────────── */}
        <View style={[styles.webCard, cardBgStyle]}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.cardTitle, textPrimary]}>Leave Type Distribution</Text>
            <View style={[styles.filterPill, { backgroundColor: theme.isDark ? '#1E293B' : '#F1F5F9' }]}>
              <Calendar size={12} color="#0D6EFD" />
              <Text style={styles.filterPillText}>Monthly</Text>
              <ChevronDown size={12} color={theme.colors.textSecondary} />
            </View>
          </View>

          <View style={styles.radialSectionRow}>
            <NativeLeaveRadialGauge percent={70} isDark={theme.isDark} />
            <View style={styles.leaveTypeBreakdownList}>
              <View style={styles.leaveTypeItem}>
                <View style={styles.leaveTypeLeft}>
                  <View style={[styles.statusLegendDot, { backgroundColor: '#0D6EFD' }]} />
                  <Text style={[styles.leaveTypeName, textPrimary]}>Sick Leave</Text>
                </View>
                <View style={[styles.countPill, { backgroundColor: theme.isDark ? '#1E293B' : '#F1F5F9' }]}>
                  <Text style={[styles.countPillText, textPrimary]}>45</Text>
                </View>
              </View>

              <View style={styles.leaveTypeItem}>
                <View style={styles.leaveTypeLeft}>
                  <View style={[styles.statusLegendDot, { backgroundColor: '#3B82F6' }]} />
                  <Text style={[styles.leaveTypeName, textPrimary]}>Casual Leave</Text>
                </View>
                <View style={[styles.countPill, { backgroundColor: theme.isDark ? '#1E293B' : '#F1F5F9' }]}>
                  <Text style={[styles.countPillText, textPrimary]}>68</Text>
                </View>
              </View>

              <View style={styles.leaveTypeItem}>
                <View style={styles.leaveTypeLeft}>
                  <View style={[styles.statusLegendDot, { backgroundColor: '#60A5FA' }]} />
                  <Text style={[styles.leaveTypeName, textPrimary]}>Unpaid Leave</Text>
                </View>
                <View style={[styles.countPill, { backgroundColor: theme.isDark ? '#1E293B' : '#F1F5F9' }]}>
                  <Text style={[styles.countPillText, textPrimary]}>12</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* ── 4. Weekly Attendance Comparison (Web attendanceBarOptions) ── */}
        <View style={[styles.webCard, cardBgStyle]}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.cardTitle, textPrimary]}>Attendance Comparison</Text>
            <TouchableOpacity onPress={() => navigation.navigate('OrgAttendance')}>
              <Text style={styles.viewLinkText}>Details →</Text>
            </TouchableOpacity>
          </View>
          <NativeAttendanceBarChart isDark={theme.isDark} />
        </View>

        {/* ── 5. Employee Distribution Yearly (Web empDistribution) ─────── */}
        <View style={[styles.webCard, cardBgStyle]}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.cardTitle, textPrimary]}>Hiring & Growth Distribution</Text>
            <BarChart3 size={16} color="#FF7129" />
          </View>
          <NativeYearlyDistributionChart isDark={theme.isDark} />
        </View>

        {/* ── 6. Pending Approvals List (Web lines 600+) ─────────────────── */}
        <View style={[styles.webCard, cardBgStyle]}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.cardTitle, textPrimary]}>Pending Approvals</Text>
            <TouchableOpacity onPress={() => navigation.navigate('PendingApprovals')}>
              <Text style={styles.viewLinkText}>All (21) →</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.approvalsList}>
            {approvals.map((app) => (
              <View
                key={app.id}
                style={[
                  styles.approvalCard,
                  {
                    backgroundColor: theme.isDark ? '#1E293B' : '#F8FAFC',
                    borderColor: theme.isDark ? '#334155' : '#E2E8F0',
                  },
                ]}
              >
                <View style={styles.approvalTop}>
                  <View style={styles.approvalUserRow}>
                    <View style={styles.approvalAvatarCircle}>
                      <Text style={styles.approvalAvatarText}>{app.avatar}</Text>
                    </View>
                    <View style={{ marginLeft: 8 }}>
                      <Text style={[styles.approvalUserName, textPrimary]}>{app.name}</Text>
                      <Text style={[styles.approvalDates, textSecondary]}>{app.type} • {app.dates}</Text>
                    </View>
                  </View>
                  <View style={styles.daysBadge}>
                    <Text style={styles.daysBadgeText}>{app.days}</Text>
                  </View>
                </View>

                <View style={styles.approvalActionsRow}>
                  <TouchableOpacity
                    style={styles.approveBtn}
                    onPress={() => setApprovals(approvals.filter((a) => a.id !== app.id))}
                  >
                    <Check size={14} color="#FFFFFF" strokeWidth={2.6} />
                    <Text style={styles.approveBtnText}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.rejectBtn}
                    onPress={() => setApprovals(approvals.filter((a) => a.id !== app.id))}
                  >
                    <X size={14} color="#EF4444" strokeWidth={2.6} />
                    <Text style={styles.rejectBtnText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: 28 }} />
      </ScrollView>

      {/* ── Pinned Bottom Nav ────────────────────────────────────────────── */}
      <AppBottomNav activeRoute="HrAdminHome" />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  topHeader: {
    paddingTop: Platform.OS === 'ios' ? 48 : 16,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  topHeaderLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerBreadcrumb: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
  topHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: {
    padding: 16,
    paddingBottom: 100,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    width: (width - 44) / 2,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  statCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deltaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  deltaBadgePositive: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16A34A',
  },
  deltaBadgeNegative: {
    fontSize: 10,
    fontWeight: '700',
    color: '#DC2626',
  },
  statNum: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  statSub: {
    fontSize: 10,
    marginTop: 2,
  },
  webCard: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  viewLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0D6EFD',
  },
  statusGaugeContainer: {
    height: 12,
    borderRadius: 6,
    marginHorizontal: 16,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 14,
  },
  gaugeSegment: {
    height: '100%',
  },
  statusStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  statusStatCol: {
    alignItems: 'center',
  },
  statusStatNum: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  statusLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusLegendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  statusStatLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0D6EFD',
  },
  radialSectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  radialCenterWrap: {
    position: 'absolute',
    alignItems: 'center',
  },
  radialPercentText: {
    fontSize: 18,
    fontWeight: '800',
  },
  radialSubText: {
    fontSize: 9,
    fontWeight: '600',
  },
  leaveTypeBreakdownList: {
    flex: 1,
    marginLeft: 16,
    gap: 10,
  },
  leaveTypeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leaveTypeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  leaveTypeName: {
    fontSize: 12,
    fontWeight: '600',
  },
  countPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  attendanceBarContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  attendanceBarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 150,
    paddingTop: 10,
  },
  attendanceCol: {
    alignItems: 'center',
    flex: 1,
  },
  barStackWrap: {
    width: 22,
    justifyContent: 'flex-end',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barSegment: {
    width: '100%',
  },
  barDayLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6,
  },
  chartLegendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '600',
  },
  yearlyBarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 14,
    height: 135,
  },
  yearlyCol: {
    alignItems: 'center',
    flex: 1,
  },
  yearlyBarWrap: {
    width: 14,
    justifyContent: 'flex-end',
  },
  yearlyBar: {
    width: '100%',
    borderRadius: 4,
  },
  yearlyMonthLabel: {
    fontSize: 9,
    fontWeight: '600',
    marginTop: 4,
  },
  approvalsList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 10,
  },
  approvalCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  approvalTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  approvalUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  approvalAvatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0D6EFD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  approvalAvatarText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  approvalUserName: {
    fontSize: 13,
    fontWeight: '700',
  },
  approvalDates: {
    fontSize: 10,
    marginTop: 2,
  },
  daysBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  daysBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0D6EFD',
  },
  approvalActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  approveBtn: {
    flex: 1,
    backgroundColor: '#03C95A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 8,
  },
  approveBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  rejectBtn: {
    flex: 1,
    backgroundColor: '#FEE2E2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 8,
  },
  rejectBtnText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
  },
});
