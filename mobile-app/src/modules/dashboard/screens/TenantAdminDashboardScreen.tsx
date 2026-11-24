import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  Dimensions,
  Modal,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Text } from '../../../components/common/Text';
import {
  Users,
  Briefcase,
  CheckSquare,
  DollarSign,
  TrendingUp,
  Calendar,
  Clock,
  Plus,
  ChevronRight,
  Sun,
  Moon,
  Bell,
  Settings,
  Award,
  FileText,
  Cake,
  Video,
  ArrowUpRight,
  UserCheck,
  Building,
  X,
} from 'lucide-react-native';
import { AppBottomNav } from '../../../components/common/AppBottomNav';
import { UserAvatar } from '../../../components/common/UserAvatar';
import { useAuthStore } from '../../../store/authStore';
import { useTenantStore } from '../../../store/tenantStore';
import { useTheme } from '../../../app/providers/ThemeProvider';
import { PersonaSwitcher } from '../../navigation/PersonaSwitcher';
import { TenantAdminService, SeatUtilization } from '../../../core/services/tenantAdminService';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../../../types/navigation.types';
import { Config } from '../../../config/environment';

const logoSource = require('../../../assets/images/logo.webp');
const { width } = Dimensions.get('window');

const normalizeAvatarUrl = (url?: string | null): string | null => {
  if (!url) return null;
  let normalized = url.trim();
  if (!normalized) return null;
  if (normalized.includes('api.dicebear.com') && normalized.includes('/svg?')) {
    normalized = normalized.replace('/svg?', '/png?');
  }
  if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
    return normalized;
  }
  if (normalized.startsWith('/')) {
    return `${Config.API_BASE_URL}${normalized}`;
  }
  return normalized;
};

// ── Native Semicircle Gauge Component (Matching ApexCharts Half-Donut) ────────
interface GaugeSlice {
  label: string;
  value: number;
  color: string;
}

const NativeSemicircleGauge: React.FC<{
  slices: GaugeSlice[];
  totalLabel: string;
  totalValue: string | number;
  isDark?: boolean;
}> = ({ slices, totalLabel, totalValue, isDark }) => {
  const size = 190;
  const strokeWidth = 16;
  const radius = (size - strokeWidth * 2) / 2;
  const cx = size / 2;
  const cy = size / 2 + 10;

  let currentAngle = Math.PI;
  const total = slices.reduce((acc, s) => acc + s.value, 0) || 100;

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size * 0.62} viewBox={`0 0 ${size} ${size * 0.65}`}>
        <Path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          stroke={isDark ? '#334155' : '#E2E8F0'}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
        />
        {slices.map((slice, index) => {
          const sliceAngle = (slice.value / total) * Math.PI;
          const startAngle = currentAngle;
          const endAngle = currentAngle - sliceAngle;
          currentAngle = endAngle;

          const x1 = cx + radius * Math.cos(startAngle);
          const y1 = cy - radius * Math.sin(startAngle);
          const x2 = cx + radius * Math.cos(endAngle);
          const y2 = cy - radius * Math.sin(endAngle);

          return (
            <Path
              key={index}
              d={`M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2}`}
              stroke={slice.color}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="butt"
            />
          );
        })}
      </Svg>
      <View style={styles.gaugeCenterWrap}>
        <Text style={[styles.gaugeSubText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
          {totalLabel}
        </Text>
        <Text style={[styles.gaugeValText, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
          {totalValue}
        </Text>
      </View>
    </View>
  );
};

// ── Native 12-Month Sales & Income vs Expenses Stacked Bar Chart ──────────────
const NativeSalesIncomeChart: React.FC<{ isDark?: boolean }> = ({ isDark }) => {
  const months = [
    { m: 'Jan', inc: 40, exp: 60 },
    { m: 'Feb', inc: 30, exp: 70 },
    { m: 'Mar', inc: 45, exp: 55 },
    { m: 'Apr', inc: 80, exp: 20 },
    { m: 'May', inc: 85, exp: 15 },
    { m: 'Jun', inc: 90, exp: 10 },
    { m: 'Jul', inc: 80, exp: 20 },
    { m: 'Aug', inc: 80, exp: 20 },
    { m: 'Sep', inc: 80, exp: 20 },
    { m: 'Oct', inc: 85, exp: 15 },
    { m: 'Nov', inc: 20, exp: 80 },
    { m: 'Dec', inc: 80, exp: 20 },
  ];

  const maxTotal = 100;
  const chartHeight = 120;

  return (
    <View style={styles.salesChartWrap}>
      <View style={styles.salesLegendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#FF6F28' }]} />
          <Text style={[styles.legendText, { color: isDark ? '#94A3B8' : '#64748B' }]}>Income</Text>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[styles.legendDot, { backgroundColor: isDark ? '#475569' : '#CBD5E1' }]}
          />
          <Text style={[styles.legendText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            Expenses
          </Text>
        </View>
        <Text style={[styles.lastUpdatedText, { color: isDark ? '#64748B' : '#94A3B8' }]}>
          Updated 11:30 PM
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.salesBarsScroll}>
        {months.map((item) => {
          const incH = (item.inc / maxTotal) * chartHeight;
          const expH = (item.exp / maxTotal) * chartHeight;

          return (
            <View key={item.m} style={styles.salesMonthCol}>
              <View style={[styles.salesBarStack, { height: chartHeight }]}>
                {/* Expenses (Top Segment) */}
                <View
                  style={[
                    styles.salesSegment,
                    {
                      height: expH,
                      backgroundColor: isDark ? '#475569' : '#E2E8F0',
                      borderTopLeftRadius: 4,
                      borderTopRightRadius: 4,
                    },
                  ]}
                />
                {/* Income (Bottom Segment) */}
                <View
                  style={[
                    styles.salesSegment,
                    {
                      height: incH,
                      backgroundColor: '#FF6F28',
                      borderBottomLeftRadius: 4,
                      borderBottomRightRadius: 4,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.salesMonthText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                {item.m}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

// ── Native Department Headcount Bar Chart ─────────────────────────────────────
const NativeDepartmentBars: React.FC<{ isDark?: boolean }> = ({ isDark }) => {
  const departments = [
    { name: 'UI/UX', count: 80, max: 120 },
    { name: 'Development', count: 110, max: 120 },
    { name: 'Management', count: 80, max: 120 },
    { name: 'HR', count: 20, max: 120 },
    { name: 'Testing', count: 60, max: 120 },
    { name: 'Marketing', count: 100, max: 120 },
  ];

  return (
    <View style={styles.deptContainer}>
      {departments.map((dept) => {
        const pct = Math.round((dept.count / dept.max) * 100);
        return (
          <View key={dept.name} style={styles.deptRow}>
            <View style={styles.deptLabelWrap}>
              <Text style={[styles.deptNameText, { color: isDark ? '#F1F5F9' : '#1E293B' }]}>
                {dept.name}
              </Text>
              <Text style={[styles.deptCountText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                {dept.count}
              </Text>
            </View>
            <View
              style={[
                styles.deptTrack,
                { backgroundColor: isDark ? '#334155' : '#F1F5F9' },
              ]}
            >
              <View style={[styles.deptFill, { width: `${pct}%`, backgroundColor: '#FF6F28' }]} />
            </View>
          </View>
        );
      })}
      <View style={styles.deptFooter}>
        <View style={styles.dotOrange} />
        <Text style={[styles.deptFooterText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
          No of Employees increased by{' '}
          <Text style={{ color: '#03C95A', fontWeight: '700' }}>+20%</Text> from last Week
        </Text>
      </View>
    </View>
  );
};

// ── Main Tenant Admin Dashboard Screen Component ─────────────────────────────
export const TenantAdminDashboardScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<'TenantAdminHome'>>();
  const user = useAuthStore((state) => state.user);
  const currentTenant = useTenantStore((state) => state.currentTenant);
  const { theme, toggleTheme } = useTheme();

  const [refreshing, setRefreshing] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [newScheduleTitle, setNewScheduleTitle] = useState('');
  const [newScheduleDate, setNewScheduleDate] = useState('2025-02-20 10:00 AM');
  const [requestType, setRequestType] = useState('Leave Request');
  const [requestNotes, setRequestNotes] = useState('');

  const [usage, setUsage] = useState<SeatUtilization>({
    activeEmployees: 154,
    maxSeats: 200,
    utilizationPercentage: 77,
    planName: 'Enterprise Growth',
  });

  const loadData = useCallback(async () => {
    try {
      const data = await TenantAdminService.getSeatUtilization();
      if (data) setUsage(data);
    } catch {
      // Retain fallback state
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const avatarUri = useMemo(
    () => normalizeAvatarUrl(user?.profile?.avatarUrl),
    [user?.profile?.avatarUrl]
  );

  const adminName =
    user?.profile?.fullName?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    'Adrian';

  const cardTheme = theme.isDark
    ? { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }
    : undefined;
  const textPrimary = theme.isDark ? { color: theme.colors.text } : undefined;
  const textSecondary = theme.isDark ? { color: theme.colors.textSecondary } : undefined;

  const handleSaveSchedule = () => {
    if (!newScheduleTitle.trim()) {
      Alert.alert('Required', 'Please enter a schedule title.');
      return;
    }
    Alert.alert('Schedule Created', `"${newScheduleTitle}" has been scheduled for ${newScheduleDate}.`);
    setNewScheduleTitle('');
    setScheduleModalOpen(false);
  };

  const handleSaveRequest = () => {
    Alert.alert('Request Submitted', `${requestType} submitted for workspace administrator review.`);
    setRequestNotes('');
    setRequestModalOpen(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* ── Top Bar / Header ─────────────────────────────────────────────── */}
      <View
        style={[
          styles.header,
          theme.isDark && {
            backgroundColor: theme.colors.surface,
            borderBottomColor: theme.colors.border,
          },
        ]}
      >
        <View style={styles.brandRow}>
          <View style={styles.brandLeft}>
            <Image source={logoSource} style={styles.logo} resizeMode="contain" />
            <View style={styles.badgeTenant}>
              <Text style={styles.badgeTenantText}>
                {currentTenant?.name || 'Acme Workspace'}
              </Text>
            </View>
          </View>

          <View style={styles.headerRightActions}>
            <PersonaSwitcher />

            <TouchableOpacity
              onPress={toggleTheme}
              style={[
                styles.iconBtn,
                theme.isDark && { backgroundColor: theme.colors.surfaceSecondary },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Toggle dark mode"
            >
              {theme.isDark ? (
                <Sun size={18} color="#FBBF24" strokeWidth={2.2} />
              ) : (
                <Moon size={18} color="#0F172A" strokeWidth={2.2} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('Notifications')}
              style={[
                styles.iconBtn,
                theme.isDark && { backgroundColor: theme.colors.surfaceSecondary },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Notifications"
            >
              <Bell size={18} color={theme.colors.text} strokeWidth={2} />
              <View style={styles.notifBadge} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('Profile')}
              accessibilityRole="button"
              accessibilityLabel="Profile"
            >
              <UserAvatar
                entity={user}
                uri={avatarUri}
                name={adminName}
                email={user?.email}
                size={36}
                borderWidth={1.5}
                borderColor="#0D6EFD"
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ── Scrollable Body ──────────────────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 1. Welcome Card (Matching Web welcome wrap) ────────────────── */}
        <View style={[styles.welcomeCard, cardTheme]}>
          <View style={styles.welcomeInfoRow}>
            <UserAvatar
              entity={user}
              uri={avatarUri}
              name={adminName}
              size={52}
              borderWidth={2}
              borderColor="#0D6EFD"
            />
            <View style={styles.welcomeTextWrap}>
              <Text style={[styles.welcomeTitle, textPrimary]}>
                Welcome Back, {adminName}
              </Text>
              <Text style={[styles.welcomeSubtitle, textSecondary]}>
                You have <Text style={styles.textUnderlinePrimary}>21</Text> Pending Approvals &{' '}
                <Text style={styles.textUnderlinePrimary}>14</Text> Leave Requests
              </Text>
            </View>
          </View>

          <View style={styles.welcomeActionsRow}>
            <TouchableOpacity
              style={styles.btnAddSchedule}
              onPress={() => setScheduleModalOpen(true)}
              activeOpacity={0.8}
            >
              <Calendar size={15} color="#0D6EFD" strokeWidth={2} />
              <Text style={styles.btnAddScheduleText}>Add Schedule</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnAddRequest}
              onPress={() => setRequestModalOpen(true)}
              activeOpacity={0.8}
            >
              <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.btnAddRequestText}>Add Requests</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 2. 8 Overview KPI Cards (Matching Web 8 widget cards) ──────── */}
        <View style={styles.kpiGrid}>
          {/* Attendance Overview */}
          <View style={[styles.kpiCard, cardTheme]}>
            <View style={[styles.kpiIconBadge, { backgroundColor: '#0D6EFD15' }]}>
              <Calendar size={18} color="#0D6EFD" strokeWidth={2.2} />
            </View>
            <Text style={[styles.kpiLabel, textSecondary]}>Attendance Overview</Text>
            <Text style={[styles.kpiValue, textPrimary]}>120/154</Text>
            <TouchableOpacity onPress={() => navigation.navigate('OrgAttendance')}>
              <Text style={styles.kpiLink}>View Details →</Text>
            </TouchableOpacity>
          </View>

          {/* Total No of Projects */}
          <View style={[styles.kpiCard, cardTheme]}>
            <View style={[styles.kpiIconBadge, { backgroundColor: '#4F46E515' }]}>
              <Briefcase size={18} color="#4F46E5" strokeWidth={2.2} />
            </View>
            <Text style={[styles.kpiLabel, textSecondary]}>Total Projects</Text>
            <Text style={[styles.kpiValue, textPrimary]}>90/125</Text>
            <TouchableOpacity onPress={() => navigation.navigate('TeamProjects')}>
              <Text style={styles.kpiLink}>View All →</Text>
            </TouchableOpacity>
          </View>

          {/* Total No of Clients */}
          <View style={[styles.kpiCard, cardTheme]}>
            <View style={[styles.kpiIconBadge, { backgroundColor: '#0284C715' }]}>
              <Users size={18} color="#0284C7" strokeWidth={2.2} />
            </View>
            <Text style={[styles.kpiLabel, textSecondary]}>Total Clients</Text>
            <Text style={[styles.kpiValue, textPrimary]}>69/86</Text>
            <TouchableOpacity onPress={() => navigation.navigate('EmployeeDirectory')}>
              <Text style={styles.kpiLink}>View All →</Text>
            </TouchableOpacity>
          </View>

          {/* Total No of Tasks */}
          <View style={[styles.kpiCard, cardTheme]}>
            <View style={[styles.kpiIconBadge, { backgroundColor: '#E11D4815' }]}>
              <CheckSquare size={18} color="#E11D48" strokeWidth={2.2} />
            </View>
            <Text style={[styles.kpiLabel, textSecondary]}>Total Tasks</Text>
            <Text style={[styles.kpiValue, textPrimary]}>96/100</Text>
            <TouchableOpacity onPress={() => navigation.navigate('TodoList', undefined)}>
              <Text style={styles.kpiLink}>View All →</Text>
            </TouchableOpacity>
          </View>

          {/* Earnings */}
          <View style={[styles.kpiCard, cardTheme]}>
            <View style={[styles.kpiIconBadge, { backgroundColor: '#9333EA15' }]}>
              <DollarSign size={18} color="#9333EA" strokeWidth={2.2} />
            </View>
            <Text style={[styles.kpiLabel, textSecondary]}>Earnings</Text>
            <Text style={[styles.kpiValue, textPrimary]}>$21,445</Text>
            <View style={styles.kpiSubRow}>
              <ArrowUpRight size={13} color="#03C95A" />
              <Text style={styles.kpiSubGreen}>+15%</Text>
              <Text style={[styles.kpiSubNote, textSecondary]}>mo</Text>
            </View>
          </View>

          {/* Profit This Week */}
          <View style={[styles.kpiCard, cardTheme]}>
            <View style={[styles.kpiIconBadge, { backgroundColor: '#03C95A15' }]}>
              <TrendingUp size={18} color="#03C95A" strokeWidth={2.2} />
            </View>
            <Text style={[styles.kpiLabel, textSecondary]}>Profit This Week</Text>
            <Text style={[styles.kpiValue, textPrimary]}>$5,544</Text>
            <View style={styles.kpiSubRow}>
              <ArrowUpRight size={13} color="#03C95A" />
              <Text style={styles.kpiSubGreen}>+8%</Text>
              <Text style={[styles.kpiSubNote, textSecondary]}>gain</Text>
            </View>
          </View>

          {/* Job Applicants */}
          <View style={[styles.kpiCard, cardTheme]}>
            <View style={[styles.kpiIconBadge, { backgroundColor: '#F59E0B15' }]}>
              <UserCheck size={18} color="#F59E0B" strokeWidth={2.2} />
            </View>
            <Text style={[styles.kpiLabel, textSecondary]}>Job Applicants</Text>
            <Text style={[styles.kpiValue, textPrimary]}>98</Text>
            <TouchableOpacity onPress={() => navigation.navigate('EmployeeDirectory')}>
              <Text style={styles.kpiLink}>View All →</Text>
            </TouchableOpacity>
          </View>

          {/* New Hire */}
          <View style={[styles.kpiCard, cardTheme]}>
            <View style={[styles.kpiIconBadge, { backgroundColor: '#0F172A15' }]}>
              <Award size={18} color={theme.isDark ? '#F8FAFC' : '#0F172A'} strokeWidth={2.2} />
            </View>
            <Text style={[styles.kpiLabel, textSecondary]}>New Hires</Text>
            <Text style={[styles.kpiValue, textPrimary]}>45/48</Text>
            <TouchableOpacity onPress={() => navigation.navigate('EmployeeDirectory')}>
              <Text style={styles.kpiLink}>Onboarding →</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 3. Employees By Department ─────────────────────────────────── */}
        <View style={[styles.card, cardTheme]}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={[styles.cardTitle, textPrimary]}>Employees By Department</Text>
              <Text style={[styles.cardSubtitle, textSecondary]}>Headcount breakdown</Text>
            </View>
            <View style={styles.pillBadge}>
              <Text style={styles.pillBadgeText}>This Week</Text>
            </View>
          </View>
          <NativeDepartmentBars isDark={theme.isDark} />
        </View>

        {/* ── 4. Employee Status & Top Performer ─────────────────────────── */}
        <View style={[styles.card, cardTheme]}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={[styles.cardTitle, textPrimary]}>Employee Status</Text>
              <Text style={[styles.cardSubtitle, textSecondary]}>Total 154 Active Employees</Text>
            </View>
            <View style={styles.pillBadge}>
              <Text style={styles.pillBadgeText}>Current Period</Text>
            </View>
          </View>

          {/* Stacked Progress Bar */}
          <View style={styles.stackedBarTrack}>
            <View style={[styles.stackedBarSegment, { width: '48%', backgroundColor: '#0D6EFD' }]} />
            <View style={[styles.stackedBarSegment, { width: '20%', backgroundColor: '#4F46E5' }]} />
            <View style={[styles.stackedBarSegment, { width: '22%', backgroundColor: '#E11D48' }]} />
            <View style={[styles.stackedBarSegment, { width: '10%', backgroundColor: '#EC4899' }]} />
          </View>

          {/* 4 Quadrants */}
          <View style={styles.statusGrid}>
            <View style={styles.statusGridItem}>
              <View style={styles.statusLegendRow}>
                <View style={[styles.dotStatus, { backgroundColor: '#0D6EFD' }]} />
                <Text style={[styles.statusItemLabel, textSecondary]}>Fulltime (48%)</Text>
              </View>
              <Text style={[styles.statusItemVal, textPrimary]}>112</Text>
            </View>

            <View style={styles.statusGridItem}>
              <View style={styles.statusLegendRow}>
                <View style={[styles.dotStatus, { backgroundColor: '#4F46E5' }]} />
                <Text style={[styles.statusItemLabel, textSecondary]}>Contract (20%)</Text>
              </View>
              <Text style={[styles.statusItemVal, textPrimary]}>112</Text>
            </View>

            <View style={styles.statusGridItem}>
              <View style={styles.statusLegendRow}>
                <View style={[styles.dotStatus, { backgroundColor: '#E11D48' }]} />
                <Text style={[styles.statusItemLabel, textSecondary]}>Probation (22%)</Text>
              </View>
              <Text style={[styles.statusItemVal, textPrimary]}>12</Text>
            </View>

            <View style={styles.statusGridItem}>
              <View style={styles.statusLegendRow}>
                <View style={[styles.dotStatus, { backgroundColor: '#EC4899' }]} />
                <Text style={[styles.statusItemLabel, textSecondary]}>WFH (20%)</Text>
              </View>
              <Text style={[styles.statusItemVal, textPrimary]}>04</Text>
            </View>
          </View>

          {/* Top Performer Card */}
          <Text style={[styles.sectionMiniHeading, textSecondary]}>TOP PERFORMER</Text>
          <View style={[styles.topPerformerCard, { borderColor: '#0D6EFD40', backgroundColor: '#0D6EFD08' }]}>
            <View style={styles.topPerformerLeft}>
              <Award size={26} color="#0D6EFD" strokeWidth={2.2} />
              <View style={styles.topPerformerAvatarWrap}>
                <UserAvatar name="Daniel Esbella" size={38} borderWidth={1.5} borderColor="#0D6EFD" />
              </View>
              <View>
                <Text style={[styles.performerName, textPrimary]}>Daniel Esbella</Text>
                <Text style={[styles.performerRole, textSecondary]}>iOS Developer</Text>
              </View>
            </View>
            <View style={styles.topPerformerRight}>
              <Text style={[styles.perfScoreLabel, textSecondary]}>Performance</Text>
              <Text style={styles.perfScoreVal}>99%</Text>
            </View>
          </View>
        </View>

        {/* ── 5. Attendance Overview Semicircle Gauge ─────────────────────── */}
        <View style={[styles.card, cardTheme]}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={[styles.cardTitle, textPrimary]}>Attendance Overview</Text>
              <Text style={[styles.cardSubtitle, textSecondary]}>Daily Presence Ratio</Text>
            </View>
            <View style={styles.pillBadge}>
              <Text style={styles.pillBadgeText}>Today</Text>
            </View>
          </View>

          <NativeSemicircleGauge
            slices={[
              { label: 'Late', value: 40, color: '#0C4B5E' },
              { label: 'Present', value: 20, color: '#03C95A' },
              { label: 'Permission', value: 30, color: '#FFC107' },
              { label: 'Absent', value: 10, color: '#E70D0D' },
            ]}
            totalLabel="Total Attendance"
            totalValue="120"
            isDark={theme.isDark}
          />

          {/* Breakdown Rows */}
          <View style={styles.gaugeLegendList}>
            <View style={styles.gaugeLegendRow}>
              <View style={styles.legendDotTitle}>
                <View style={[styles.legendDot, { backgroundColor: '#03C95A' }]} />
                <Text style={[styles.gaugeLegendLabel, textSecondary]}>Present</Text>
              </View>
              <Text style={[styles.gaugeLegendPct, textPrimary]}>59%</Text>
            </View>

            <View style={styles.gaugeLegendRow}>
              <View style={styles.legendDotTitle}>
                <View style={[styles.legendDot, { backgroundColor: '#0C4B5E' }]} />
                <Text style={[styles.gaugeLegendLabel, textSecondary]}>Late</Text>
              </View>
              <Text style={[styles.gaugeLegendPct, textPrimary]}>21%</Text>
            </View>

            <View style={styles.gaugeLegendRow}>
              <View style={styles.legendDotTitle}>
                <View style={[styles.legendDot, { backgroundColor: '#FFC107' }]} />
                <Text style={[styles.gaugeLegendLabel, textSecondary]}>Permission</Text>
              </View>
              <Text style={[styles.gaugeLegendPct, textPrimary]}>2%</Text>
            </View>

            <View style={styles.gaugeLegendRow}>
              <View style={styles.legendDotTitle}>
                <View style={[styles.legendDot, { backgroundColor: '#E70D0D' }]} />
                <Text style={[styles.gaugeLegendLabel, textSecondary]}>Absent</Text>
              </View>
              <Text style={[styles.gaugeLegendPct, textPrimary]}>15%</Text>
            </View>
          </View>

          {/* Absentees Stack */}
          <View style={[styles.absenteesStrip, { backgroundColor: theme.isDark ? '#1E293B' : '#F8FAFC' }]}>
            <View style={styles.absenteesLeft}>
              <Text style={[styles.absenteesLabel, textSecondary]}>Total Absentees</Text>
              <View style={styles.avatarStackMini}>
                <UserAvatar name="Sara Connor" size={26} borderWidth={1.5} borderColor="#FFFFFF" />
                <UserAvatar name="Liam Vance" size={26} borderWidth={1.5} borderColor="#FFFFFF" />
                <View style={styles.avatarMoreBubble}>
                  <Text style={styles.avatarMoreText}>+1</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('OrgAttendance')}>
              <Text style={styles.linkPrimaryUnderline}>View Details</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 6. Clock-In / Clock-Out Realtime Activity ───────────────────── */}
        <View style={[styles.card, cardTheme]}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={[styles.cardTitle, textPrimary]}>Clock-In / Out</Text>
              <Text style={[styles.cardSubtitle, textSecondary]}>Live departmental activity</Text>
            </View>
            <View style={styles.pillBadge}>
              <Text style={styles.pillBadgeText}>All Depts</Text>
            </View>
          </View>

          {/* Employee 1 */}
          <View style={[styles.clockItem, { borderColor: theme.isDark ? '#334155' : '#E2E8F0' }]}>
            <View style={styles.clockItemTop}>
              <UserAvatar name="Daniel Esbella" size={38} borderWidth={1} borderColor="#CBD5E1" />
              <View style={styles.clockUserWrap}>
                <Text style={[styles.clockUserName, textPrimary]}>Daniel Esbella</Text>
                <Text style={[styles.clockUserRole, textSecondary]}>UI/UX Designer</Text>
              </View>
              <View style={[styles.badgeSuccessSoft]}>
                <View style={styles.dotSuccess} />
                <Text style={styles.badgeSuccessText}>09:15</Text>
              </View>
            </View>
          </View>

          {/* Employee 2 */}
          <View style={[styles.clockItem, { borderColor: theme.isDark ? '#334155' : '#E2E8F0' }]}>
            <View style={styles.clockItemTop}>
              <UserAvatar name="Doglas Martini" size={38} borderWidth={1} borderColor="#CBD5E1" />
              <View style={styles.clockUserWrap}>
                <Text style={[styles.clockUserName, textPrimary]}>Doglas Martini</Text>
                <Text style={[styles.clockUserRole, textSecondary]}>Project Manager</Text>
              </View>
              <View style={styles.badgeSuccessSoft}>
                <View style={styles.dotSuccess} />
                <Text style={styles.badgeSuccessText}>09:36</Text>
              </View>
            </View>
          </View>

          {/* Employee 3 with full shift stats */}
          <View style={[styles.clockItem, { borderColor: theme.isDark ? '#334155' : '#E2E8F0' }]}>
            <View style={styles.clockItemTop}>
              <UserAvatar name="Brian Villalobos" size={38} borderWidth={1} borderColor="#CBD5E1" />
              <View style={styles.clockUserWrap}>
                <Text style={[styles.clockUserName, textPrimary]}>Brian Villalobos</Text>
                <Text style={[styles.clockUserRole, textSecondary]}>PHP Developer</Text>
              </View>
              <View style={styles.badgeSuccessSoft}>
                <View style={styles.dotSuccess} />
                <Text style={styles.badgeSuccessText}>09:15</Text>
              </View>
            </View>

            <View style={[styles.shiftDetailBox, { backgroundColor: theme.isDark ? '#1E293B' : '#F8FAFC' }]}>
              <View>
                <Text style={[styles.shiftSub, textSecondary]}>Clock In</Text>
                <Text style={[styles.shiftVal, { color: '#03C95A' }]}>10:30 AM</Text>
              </View>
              <View>
                <Text style={[styles.shiftSub, textSecondary]}>Clock Out</Text>
                <Text style={[styles.shiftVal, { color: '#E11D48' }]}>09:45 AM</Text>
              </View>
              <View>
                <Text style={[styles.shiftSub, textSecondary]}>Production</Text>
                <Text style={[styles.shiftVal, { color: '#F59E0B' }]}>09:21 Hrs</Text>
              </View>
            </View>
          </View>

          {/* Late employee */}
          <Text style={[styles.sectionMiniHeading, textSecondary]}>LATE LOGS</Text>
          <View style={[styles.clockItem, { borderColor: '#E11D4830', backgroundColor: '#E11D4805' }]}>
            <View style={styles.clockItemTop}>
              <UserAvatar name="Anthony Lewis" size={38} borderWidth={1} borderColor="#E11D48" />
              <View style={styles.clockUserWrap}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.clockUserName, textPrimary]}>Anthony Lewis</Text>
                  <View style={styles.badgeDangerMini}>
                    <Text style={styles.badgeDangerMiniText}>30 Min</Text>
                  </View>
                </View>
                <Text style={[styles.clockUserRole, textSecondary]}>Marketing Head</Text>
              </View>
              <View style={styles.badgeSuccessSoft}>
                <View style={styles.dotSuccess} />
                <Text style={styles.badgeSuccessText}>08:35</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── 7. Sales & Income vs Expenses Overview ──────────────────────── */}
        <View style={[styles.card, cardTheme]}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={[styles.cardTitle, textPrimary]}>Sales Overview</Text>
              <Text style={[styles.cardSubtitle, textSecondary]}>12-month Income vs Expenses</Text>
            </View>
            <View style={styles.pillBadge}>
              <Text style={styles.pillBadgeText}>2025</Text>
            </View>
          </View>
          <NativeSalesIncomeChart isDark={theme.isDark} />
        </View>

        {/* ── 8. Invoices ────────────────────────────────────────────────── */}
        <View style={[styles.card, cardTheme]}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={[styles.cardTitle, textPrimary]}>Invoices</Text>
              <Text style={[styles.cardSubtitle, textSecondary]}>Recent client payments</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('TodoList', undefined)}>
              <Text style={styles.kpiLink}>View All →</Text>
            </TouchableOpacity>
          </View>

          {/* Invoice 1 */}
          <View style={[styles.invoiceRow, { borderBottomColor: theme.isDark ? '#334155' : '#F1F5F9' }]}>
            <View style={styles.invoiceLeft}>
              <View style={[styles.invoiceIcon, { backgroundColor: '#0D6EFD15' }]}>
                <FileText size={16} color="#0D6EFD" />
              </View>
              <View>
                <Text style={[styles.invoiceTitle, textPrimary]}>Redesign Website</Text>
                <Text style={[styles.invoiceSub, textSecondary]}>#INVO02 · Logistics</Text>
              </View>
            </View>
            <View style={styles.invoiceRight}>
              <Text style={[styles.invoiceAmount, textPrimary]}>$3,560</Text>
              <View style={styles.badgeDangerSoft}>
                <Text style={styles.badgeDangerText}>Unpaid</Text>
              </View>
            </View>
          </View>

          {/* Invoice 2 */}
          <View style={[styles.invoiceRow, { borderBottomColor: theme.isDark ? '#334155' : '#F1F5F9' }]}>
            <View style={styles.invoiceLeft}>
              <View style={[styles.invoiceIcon, { backgroundColor: '#4F46E515' }]}>
                <FileText size={16} color="#4F46E5" />
              </View>
              <View>
                <Text style={[styles.invoiceTitle, textPrimary]}>Module Completion</Text>
                <Text style={[styles.invoiceSub, textSecondary]}>#INVO05 · Yip Corp</Text>
              </View>
            </View>
            <View style={styles.invoiceRight}>
              <Text style={[styles.invoiceAmount, textPrimary]}>$4,175</Text>
              <View style={styles.badgeDangerSoft}>
                <Text style={styles.badgeDangerText}>Unpaid</Text>
              </View>
            </View>
          </View>

          {/* Invoice 3 */}
          <View style={[styles.invoiceRow, { borderBottomColor: theme.isDark ? '#334155' : '#F1F5F9' }]}>
            <View style={styles.invoiceLeft}>
              <View style={[styles.invoiceIcon, { backgroundColor: '#EC489915' }]}>
                <FileText size={16} color="#EC4899" />
              </View>
              <View>
                <Text style={[styles.invoiceTitle, textPrimary]}>Change on Emp Module</Text>
                <Text style={[styles.invoiceSub, textSecondary]}>#INVO03 · Ignis LLP</Text>
              </View>
            </View>
            <View style={styles.invoiceRight}>
              <Text style={[styles.invoiceAmount, textPrimary]}>$6,985</Text>
              <View style={styles.badgeDangerSoft}>
                <Text style={styles.badgeDangerText}>Unpaid</Text>
              </View>
            </View>
          </View>

          {/* Invoice 4 */}
          <View style={[styles.invoiceRow, { borderBottomWidth: 0 }]}>
            <View style={styles.invoiceLeft}>
              <View style={[styles.invoiceIcon, { backgroundColor: '#03C95A15' }]}>
                <FileText size={16} color="#03C95A" />
              </View>
              <View>
                <Text style={[styles.invoiceTitle, textPrimary]}>Hospital Management</Text>
                <Text style={[styles.invoiceSub, textSecondary]}>#INVO06 · HCL Corp</Text>
              </View>
            </View>
            <View style={styles.invoiceRight}>
              <Text style={[styles.invoiceAmount, textPrimary]}>$6,458</Text>
              <View style={styles.badgeSuccessSoft}>
                <Text style={styles.badgeSuccessText}>Paid</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── 9. Tasks & Projects Statistics Donut ────────────────────────── */}
        <View style={[styles.card, cardTheme]}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={[styles.cardTitle, textPrimary]}>Tasks Statistics</Text>
              <Text style={[styles.cardSubtitle, textSecondary]}>Delivery Status</Text>
            </View>
            <View style={styles.pillBadge}>
              <Text style={styles.pillBadgeText}>This Week</Text>
            </View>
          </View>

          <NativeSemicircleGauge
            slices={[
              { label: 'Ongoing', value: 24, color: '#FFC107' },
              { label: 'On Hold', value: 10, color: '#1B84FF' },
              { label: 'Overdue', value: 16, color: '#E11D48' },
              { label: 'Completed', value: 40, color: '#0D7858' },
            ]}
            totalLabel="Total Projects"
            totalValue="90"
            isDark={theme.isDark}
          />

          <View style={styles.taskStatsColsRow}>
            <View style={styles.taskStatCol}>
              <Text style={[styles.taskStatColLabel, textSecondary]}>Ongoing</Text>
              <Text style={[styles.taskStatColVal, { color: '#FFC107' }]}>24%</Text>
            </View>
            <View style={styles.taskStatCol}>
              <Text style={[styles.taskStatColLabel, textSecondary]}>On Hold</Text>
              <Text style={[styles.taskStatColVal, { color: '#1B84FF' }]}>10%</Text>
            </View>
            <View style={styles.taskStatCol}>
              <Text style={[styles.taskStatColLabel, textSecondary]}>Overdue</Text>
              <Text style={[styles.taskStatColVal, { color: '#E11D48' }]}>16%</Text>
            </View>
            <View style={styles.taskStatCol}>
              <Text style={[styles.taskStatColLabel, textSecondary]}>Done</Text>
              <Text style={[styles.taskStatColVal, { color: '#0D7858' }]}>40%</Text>
            </View>
          </View>

          <View style={[styles.hoursSpentBanner, { backgroundColor: theme.isDark ? '#0F172A' : '#1E293B' }]}>
            <Text style={styles.hoursSpentVal}>389/689 hrs</Text>
            <Text style={styles.hoursSpentLabel}>Spent on Overall Tasks This Week</Text>
          </View>
        </View>

        {/* ── 10. Schedules & Upcoming Interviews ─────────────────────────── */}
        <View style={[styles.card, cardTheme]}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={[styles.cardTitle, textPrimary]}>Schedules</Text>
              <Text style={[styles.cardSubtitle, textSecondary]}>Interviews & Meetings</Text>
            </View>
            <TouchableOpacity onPress={() => setScheduleModalOpen(true)}>
              <Text style={styles.kpiLink}>+ Add</Text>
            </TouchableOpacity>
          </View>

          {/* Schedule 1 */}
          <View style={[styles.scheduleBox, { backgroundColor: theme.isDark ? '#1E293B' : '#F8FAFC' }]}>
            <View style={styles.scheduleBadgeRow}>
              <View style={styles.badgeSecondarySoft}>
                <Text style={styles.badgeSecondaryText}>UI/UX Designer</Text>
              </View>
            </View>
            <Text style={[styles.scheduleTitle, textPrimary]}>
              Interview Candidates - UI/UX Designer
            </Text>
            <View style={styles.scheduleMetaRow}>
              <Calendar size={13} color={theme.isDark ? '#94A3B8' : '#64748B'} />
              <Text style={[styles.scheduleMetaText, textSecondary]}>Thu, 15 Feb 2025</Text>
              <Clock size={13} color={theme.isDark ? '#94A3B8' : '#64748B'} style={{ marginLeft: 8 }} />
              <Text style={[styles.scheduleMetaText, textSecondary]}>01:00 PM - 02:20 PM</Text>
            </View>

            <View style={styles.scheduleFooterRow}>
              <View style={styles.avatarStackMini}>
                <UserAvatar name="Candidate 1" size={26} borderWidth={1} borderColor="#FFF" />
                <UserAvatar name="Candidate 2" size={26} borderWidth={1} borderColor="#FFF" />
                <UserAvatar name="Candidate 3" size={26} borderWidth={1} borderColor="#FFF" />
                <View style={styles.avatarMoreBubble}>
                  <Text style={styles.avatarMoreText}>+3</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.btnJoinMeeting}
                onPress={() => Alert.alert('Meeting', 'Launching virtual interview room...')}
              >
                <Video size={13} color="#0D6EFD" />
                <Text style={styles.btnJoinMeetingText}>Join Meeting</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Schedule 2 */}
          <View style={[styles.scheduleBox, { backgroundColor: theme.isDark ? '#1E293B' : '#F8FAFC', marginTop: 12 }]}>
            <View style={styles.scheduleBadgeRow}>
              <View style={styles.badgeDarkSoft}>
                <Text style={styles.badgeDarkText}>iOS Developer</Text>
              </View>
            </View>
            <Text style={[styles.scheduleTitle, textPrimary]}>
              Interview Candidates - iOS Developer
            </Text>
            <View style={styles.scheduleMetaRow}>
              <Calendar size={13} color={theme.isDark ? '#94A3B8' : '#64748B'} />
              <Text style={[styles.scheduleMetaText, textSecondary]}>Thu, 15 Feb 2025</Text>
              <Clock size={13} color={theme.isDark ? '#94A3B8' : '#64748B'} style={{ marginLeft: 8 }} />
              <Text style={[styles.scheduleMetaText, textSecondary]}>02:00 PM - 04:20 PM</Text>
            </View>

            <View style={styles.scheduleFooterRow}>
              <View style={styles.avatarStackMini}>
                <UserAvatar name="Alex R" size={26} borderWidth={1} borderColor="#FFF" />
                <UserAvatar name="John D" size={26} borderWidth={1} borderColor="#FFF" />
                <UserAvatar name="Sara T" size={26} borderWidth={1} borderColor="#FFF" />
                <View style={styles.avatarMoreBubble}>
                  <Text style={styles.avatarMoreText}>+2</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.btnJoinMeeting}
                onPress={() => Alert.alert('Meeting', 'Launching virtual interview room...')}
              >
                <Video size={13} color="#0D6EFD" />
                <Text style={styles.btnJoinMeetingText}>Join Meeting</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── 11. Recent Activities Feed ─────────────────────────────────── */}
        <View style={[styles.card, cardTheme]}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={[styles.cardTitle, textPrimary]}>Recent Activities</Text>
              <Text style={[styles.cardSubtitle, textSecondary]}>Tenant audit trail</Text>
            </View>
            <View style={styles.pillBadge}>
              <Text style={styles.pillBadgeText}>Live</Text>
            </View>
          </View>

          {/* Activity 1 */}
          <View style={styles.activityItem}>
            <UserAvatar name="Matt Morgan" size={36} borderWidth={1} borderColor="#0D6EFD" />
            <View style={styles.activityContent}>
              <View style={styles.activityHeaderRow}>
                <Text style={[styles.activityUserName, textPrimary]}>Matt Morgan</Text>
                <Text style={[styles.activityTime, textSecondary]}>05:30 PM</Text>
              </View>
              <Text style={[styles.activityDesc, textSecondary]}>
                Added New Project <Text style={{ color: '#0D6EFD', fontWeight: '600' }}>HRMS Dashboard</Text>
              </Text>
            </View>
          </View>

          {/* Activity 2 */}
          <View style={styles.activityItem}>
            <UserAvatar name="Jay Ze" size={36} borderWidth={1} borderColor="#4F46E5" />
            <View style={styles.activityContent}>
              <View style={styles.activityHeaderRow}>
                <Text style={[styles.activityUserName, textPrimary]}>Jay Ze</Text>
                <Text style={[styles.activityTime, textSecondary]}>05:00 PM</Text>
              </View>
              <Text style={[styles.activityDesc, textSecondary]}>
                Commented on Uploaded Document
              </Text>
            </View>
          </View>

          {/* Activity 3 */}
          <View style={styles.activityItem}>
            <UserAvatar name="Mary Donald" size={36} borderWidth={1} borderColor="#03C95A" />
            <View style={styles.activityContent}>
              <View style={styles.activityHeaderRow}>
                <Text style={[styles.activityUserName, textPrimary]}>Mary Donald</Text>
                <Text style={[styles.activityTime, textSecondary]}>04:15 PM</Text>
              </View>
              <Text style={[styles.activityDesc, textSecondary]}>
                Approved Task Projects
              </Text>
            </View>
          </View>

          {/* Activity 4 */}
          <View style={[styles.activityItem, { borderBottomWidth: 0 }]}>
            <UserAvatar name="George David" size={36} borderWidth={1} borderColor="#EC4899" />
            <View style={styles.activityContent}>
              <View style={styles.activityHeaderRow}>
                <Text style={[styles.activityUserName, textPrimary]}>George David</Text>
                <Text style={[styles.activityTime, textSecondary]}>03:40 PM</Text>
              </View>
              <Text style={[styles.activityDesc, textSecondary]}>
                Requesting Access to Module Tickets
              </Text>
            </View>
          </View>
        </View>

        {/* ── 12. Birthdays Card ─────────────────────────────────────────── */}
        <View style={[styles.card, cardTheme]}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={[styles.cardTitle, textPrimary]}>Birthdays</Text>
              <Text style={[styles.cardSubtitle, textSecondary]}>Celebrate team milestones</Text>
            </View>
            <View style={styles.pillBadge}>
              <Cake size={13} color="#0D6EFD" />
              <Text style={[styles.pillBadgeText, { marginLeft: 4 }]}>Celebrations</Text>
            </View>
          </View>

          {/* Today */}
          <Text style={[styles.sectionMiniHeading, textSecondary]}>TODAY</Text>
          <View style={[styles.birthdayCard, { borderColor: '#0D6EFD50', backgroundColor: '#0D6EFD08' }]}>
            <View style={styles.birthdayLeft}>
              <UserAvatar name="Andrew Jermia" size={36} borderWidth={1} borderColor="#0D6EFD" />
              <View>
                <Text style={[styles.birthdayName, textPrimary]}>Andrew Jermia</Text>
                <Text style={[styles.birthdayRole, textSecondary]}>iOS Developer</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.btnSendWish}
              onPress={() => Alert.alert('Sent', 'Birthday wishes sent to Andrew Jermia!')}
            >
              <Cake size={13} color="#0D6EFD" />
              <Text style={styles.btnSendWishText}>Send Wish</Text>
            </TouchableOpacity>
          </View>

          {/* Tomorrow */}
          <Text style={[styles.sectionMiniHeading, textSecondary]}>TOMORROW</Text>
          <View style={[styles.birthdayCard, { borderColor: theme.isDark ? '#334155' : '#E2E8F0' }]}>
            <View style={styles.birthdayLeft}>
              <UserAvatar name="Mary Zeen" size={36} borderWidth={1} borderColor="#CBD5E1" />
              <View>
                <Text style={[styles.birthdayName, textPrimary]}>Mary Zeen</Text>
                <Text style={[styles.birthdayRole, textSecondary]}>UI/UX Designer</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.btnSendWish}
              onPress={() => Alert.alert('Scheduled', 'Birthday wish scheduled for Mary Zeen!')}
            >
              <Cake size={13} color="#0D6EFD" />
              <Text style={styles.btnSendWishText}>Send Wish</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 13. Tenant Administration Quick Links ─────────────────────── */}
        <View style={[styles.card, cardTheme]}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={[styles.cardTitle, textPrimary]}>Organization Quick Links</Text>
              <Text style={[styles.cardSubtitle, textSecondary]}>Administrative modules</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.quickLinkRow, { borderBottomColor: theme.isDark ? '#334155' : '#F1F5F9' }]}
            onPress={() => navigation.navigate('EmployeeDirectory')}
          >
            <View style={styles.quickLinkLeft}>
              <Users size={18} color="#0D6EFD" />
              <Text style={[styles.quickLinkText, textPrimary]}>Staff & Employee Directory</Text>
            </View>
            <ChevronRight size={18} color={theme.isDark ? '#94A3B8' : '#64748B'} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickLinkRow, { borderBottomColor: theme.isDark ? '#334155' : '#F1F5F9' }]}
            onPress={() => navigation.navigate('UserAccess')}
          >
            <View style={styles.quickLinkLeft}>
              <Building size={18} color="#4F46E5" />
              <Text style={[styles.quickLinkText, textPrimary]}>Seat Utilization & Licences ({usage.activeEmployees}/{usage.maxSeats})</Text>
            </View>
            <ChevronRight size={18} color={theme.isDark ? '#94A3B8' : '#64748B'} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickLinkRow, { borderBottomWidth: 0 }]}
            onPress={() => navigation.navigate('WorkspaceSettings')}
          >
            <View style={styles.quickLinkLeft}>
              <Settings size={18} color="#EC4899" />
              <Text style={[styles.quickLinkText, textPrimary]}>Workspace Configuration</Text>
            </View>
            <ChevronRight size={18} color={theme.isDark ? '#94A3B8' : '#64748B'} />
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Add Schedule Modal ───────────────────────────────────────────── */}
      <Modal
        visible={scheduleModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setScheduleModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalBox, cardTheme]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, textPrimary]}>Add New Schedule</Text>
              <TouchableOpacity onPress={() => setScheduleModalOpen(false)}>
                <X size={20} color={theme.isDark ? '#94A3B8' : '#64748B'} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={[styles.inputLabel, textSecondary]}>Event / Meeting Title</Text>
              <TextInput
                style={[
                  styles.modalInput,
                  {
                    color: theme.isDark ? '#F8FAFC' : '#0F172A',
                    backgroundColor: theme.isDark ? '#1E293B' : '#F8FAFC',
                    borderColor: theme.isDark ? '#334155' : '#CBD5E1',
                  },
                ]}
                placeholder="e.g. Client Review Meeting"
                placeholderTextColor={theme.isDark ? '#64748B' : '#94A3B8'}
                value={newScheduleTitle}
                onChangeText={setNewScheduleTitle}
              />

              <Text style={[styles.inputLabel, textSecondary, { marginTop: 12 }]}>
                Date & Time
              </Text>
              <TextInput
                style={[
                  styles.modalInput,
                  {
                    color: theme.isDark ? '#F8FAFC' : '#0F172A',
                    backgroundColor: theme.isDark ? '#1E293B' : '#F8FAFC',
                    borderColor: theme.isDark ? '#334155' : '#CBD5E1',
                  },
                ]}
                placeholder="YYYY-MM-DD HH:MM"
                placeholderTextColor={theme.isDark ? '#64748B' : '#94A3B8'}
                value={newScheduleDate}
                onChangeText={setNewScheduleDate}
              />
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.btnModalCancel}
                onPress={() => setScheduleModalOpen(false)}
              >
                <Text style={styles.btnModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnModalSubmit} onPress={handleSaveSchedule}>
                <Text style={styles.btnModalSubmitText}>Save Schedule</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Add Request Modal ────────────────────────────────────────────── */}
      <Modal
        visible={requestModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setRequestModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalBox, cardTheme]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, textPrimary]}>Add Request</Text>
              <TouchableOpacity onPress={() => setRequestModalOpen(false)}>
                <X size={20} color={theme.isDark ? '#94A3B8' : '#64748B'} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={[styles.inputLabel, textSecondary]}>Request Type</Text>
              <View style={styles.reqTypePillRow}>
                {['Leave', 'Expense', 'Equipment', 'Permission'].map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.reqTypePill,
                      requestType === t && styles.reqTypePillActive,
                      {
                        backgroundColor:
                          requestType === t
                            ? '#0D6EFD'
                            : theme.isDark
                            ? '#1E293B'
                            : '#F1F5F9',
                      },
                    ]}
                    onPress={() => setRequestType(t)}
                  >
                    <Text
                      style={[
                        styles.reqTypePillText,
                        requestType === t
                          ? { color: '#FFF' }
                          : { color: theme.isDark ? '#94A3B8' : '#64748B' },
                      ]}
                    >
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.inputLabel, textSecondary, { marginTop: 14 }]}>
                Notes & Description
              </Text>
              <TextInput
                style={[
                  styles.modalInput,
                  styles.modalTextArea,
                  {
                    color: theme.isDark ? '#F8FAFC' : '#0F172A',
                    backgroundColor: theme.isDark ? '#1E293B' : '#F8FAFC',
                    borderColor: theme.isDark ? '#334155' : '#CBD5E1',
                  },
                ]}
                placeholder="Details of the request..."
                placeholderTextColor={theme.isDark ? '#64748B' : '#94A3B8'}
                multiline
                numberOfLines={3}
                value={requestNotes}
                onChangeText={setRequestNotes}
              />
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.btnModalCancel}
                onPress={() => setRequestModalOpen(false)}
              >
                <Text style={styles.btnModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnModalSubmit} onPress={handleSaveRequest}>
                <Text style={styles.btnModalSubmitText}>Submit Request</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Fixed Bottom Navigation ──────────────────────────────────────── */}
      <AppBottomNav activeRoute="TenantAdminHome" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 52 : 28,
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logo: {
    width: 34,
    height: 34,
  },
  badgeTenant: {
    backgroundColor: '#0D6EFD15',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeTenantText: {
    color: '#0D6EFD',
    fontSize: 12,
    fontWeight: '700',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: 7,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#E11D48',
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },

  // Welcome Card
  welcomeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 14,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6 },
      android: { elevation: 2 },
    }),
  },
  welcomeInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  welcomeTextWrap: {
    flex: 1,
  },
  welcomeTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 3,
  },
  welcomeSubtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  textUnderlinePrimary: {
    color: '#0D6EFD',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  welcomeActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  btnAddSchedule: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#0D6EFD12',
    borderWidth: 1,
    borderColor: '#0D6EFD30',
  },
  btnAddScheduleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0D6EFD',
  },
  btnAddRequest: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#0D6EFD',
  },
  btnAddRequestText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // 8 KPI Grid
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  kpiCard: {
    width: (width - 42) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  kpiIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  kpiLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  kpiLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0D6EFD',
  },
  kpiSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  kpiSubGreen: {
    fontSize: 12,
    fontWeight: '700',
    color: '#03C95A',
  },
  kpiSubNote: {
    fontSize: 11,
    color: '#64748B',
  },

  // Standard Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6 },
      android: { elevation: 2 },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  pillBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
  },
  pillBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },

  // Department Bars
  deptContainer: {
    gap: 10,
  },
  deptRow: {
    gap: 5,
  },
  deptLabelWrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deptNameText: {
    fontSize: 13,
    fontWeight: '600',
  },
  deptCountText: {
    fontSize: 13,
    fontWeight: '700',
  },
  deptTrack: {
    height: 7,
    borderRadius: 4,
    overflow: 'hidden',
  },
  deptFill: {
    height: '100%',
    borderRadius: 4,
  },
  deptFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  dotOrange: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#FF6F28',
  },
  deptFooterText: {
    fontSize: 12,
  },

  // Employee Status
  stackedBarTrack: {
    height: 10,
    borderRadius: 5,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 14,
  },
  stackedBarSegment: {
    height: '100%',
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 14,
  },
  statusGridItem: {
    width: '50%',
    padding: 10,
    borderWidth: 0.5,
    borderColor: '#E2E8F0',
  },
  statusLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  dotStatus: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusItemLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusItemVal: {
    fontSize: 18,
    fontWeight: '800',
  },
  sectionMiniHeading: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 8,
    marginTop: 4,
  },
  topPerformerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  topPerformerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  topPerformerAvatarWrap: {
    position: 'relative',
  },
  performerName: {
    fontSize: 14,
    fontWeight: '700',
  },
  performerRole: {
    fontSize: 12,
  },
  topPerformerRight: {
    alignItems: 'flex-end',
  },
  perfScoreLabel: {
    fontSize: 11,
  },
  perfScoreVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0D6EFD',
  },

  // Gauge & Attendance
  gaugeCenterWrap: {
    position: 'absolute',
    top: 48,
    alignItems: 'center',
  },
  gaugeSubText: {
    fontSize: 11,
    fontWeight: '600',
  },
  gaugeValText: {
    fontSize: 22,
    fontWeight: '900',
  },
  gaugeLegendList: {
    marginTop: 10,
    gap: 8,
  },
  gaugeLegendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  legendDotTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  gaugeLegendLabel: {
    fontSize: 13,
  },
  gaugeLegendPct: {
    fontSize: 13,
    fontWeight: '700',
  },
  absenteesStrip: {
    marginTop: 14,
    padding: 10,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  absenteesLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  absenteesLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  avatarStackMini: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarMoreBubble: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#0D6EFD',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -6,
  },
  avatarMoreText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  linkPrimaryUnderline: {
    color: '#0D6EFD',
    fontSize: 12,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },

  // Clock In / Out
  clockItem: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  clockItemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  clockUserWrap: {
    flex: 1,
  },
  clockUserName: {
    fontSize: 13,
    fontWeight: '700',
  },
  clockUserRole: {
    fontSize: 11,
  },
  badgeSuccessSoft: {
    backgroundColor: '#03C95A15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dotSuccess: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#03C95A',
  },
  badgeSuccessText: {
    color: '#03C95A',
    fontSize: 11,
    fontWeight: '700',
  },
  badgeDangerMini: {
    backgroundColor: '#E11D4815',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  badgeDangerMiniText: {
    color: '#E11D48',
    fontSize: 10,
    fontWeight: '700',
  },
  shiftDetailBox: {
    marginTop: 8,
    padding: 8,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  shiftSub: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 2,
  },
  shiftVal: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Sales Chart
  salesChartWrap: {
    gap: 10,
  },
  salesLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendText: {
    fontSize: 12,
  },
  lastUpdatedText: {
    marginLeft: 'auto',
    fontSize: 11,
  },
  salesBarsScroll: {
    paddingVertical: 6,
    gap: 8,
  },
  salesMonthCol: {
    alignItems: 'center',
    width: 26,
    gap: 4,
  },
  salesBarStack: {
    width: 14,
    justifyContent: 'flex-end',
  },
  salesSegment: {
    width: '100%',
  },
  salesMonthText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Invoices
  invoiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  invoiceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  invoiceIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  invoiceTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  invoiceSub: {
    fontSize: 11,
  },
  invoiceRight: {
    alignItems: 'flex-end',
    gap: 3,
  },
  invoiceAmount: {
    fontSize: 13,
    fontWeight: '800',
  },
  badgeDangerSoft: {
    backgroundColor: '#E11D4815',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeDangerText: {
    color: '#E11D48',
    fontSize: 10,
    fontWeight: '700',
  },

  // Task Statistics
  taskStatsColsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  taskStatCol: {
    alignItems: 'center',
  },
  taskStatColLabel: {
    fontSize: 11,
  },
  taskStatColVal: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  hoursSpentBanner: {
    marginTop: 10,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hoursSpentVal: {
    color: '#03C95A',
    fontSize: 18,
    fontWeight: '900',
  },
  hoursSpentLabel: {
    color: '#E2E8F0',
    fontSize: 12,
    marginTop: 2,
  },

  // Schedules
  scheduleBox: {
    padding: 12,
    borderRadius: 12,
    gap: 6,
  },
  scheduleBadgeRow: {
    flexDirection: 'row',
  },
  badgeSecondarySoft: {
    backgroundColor: '#4F46E515',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeSecondaryText: {
    color: '#4F46E5',
    fontSize: 11,
    fontWeight: '700',
  },
  badgeDarkSoft: {
    backgroundColor: '#0F172A15',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeDarkText: {
    color: '#0F172A',
    fontSize: 11,
    fontWeight: '700',
  },
  scheduleTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  scheduleMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scheduleMetaText: {
    fontSize: 11,
  },
  scheduleFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  btnJoinMeeting: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#0D6EFD15',
  },
  btnJoinMeetingText: {
    color: '#0D6EFD',
    fontSize: 11,
    fontWeight: '700',
  },

  // Activities Feed
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  activityContent: {
    flex: 1,
  },
  activityHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activityUserName: {
    fontSize: 13,
    fontWeight: '700',
  },
  activityTime: {
    fontSize: 11,
  },
  activityDesc: {
    fontSize: 12,
    marginTop: 2,
  },

  // Birthdays
  birthdayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  birthdayLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  birthdayName: {
    fontSize: 13,
    fontWeight: '700',
  },
  birthdayRole: {
    fontSize: 11,
  },
  btnSendWish: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#0D6EFD15',
  },
  btnSendWishText: {
    color: '#0D6EFD',
    fontSize: 11,
    fontWeight: '700',
  },

  // Quick Links
  quickLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  quickLinkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  quickLinkText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Modals
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  modalBody: {
    gap: 4,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  modalTextArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  reqTypePillRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  reqTypePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  reqTypePillActive: {},
  reqTypePillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 18,
  },
  btnModalCancel: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  btnModalCancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  btnModalSubmit: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#0D6EFD',
  },
  btnModalSubmitText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
