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
import Svg, { Circle, Path, Defs, LinearGradient, Stop, G, Line } from 'react-native-svg';
import { Text } from '../../../components/common/Text';
import {
  Calendar,
  Clock,
  ArrowUp,
  ArrowDown,
  Check,
  CheckCircle2,
  ChevronDown,
  MoreVertical,
  Star,
  CheckSquare,
  Square,
  Fingerprint,
  CalendarDays,
  Award,
  Sparkles,
  Sun,
  Moon,
  Bell,
  X,
} from 'lucide-react-native';
import { AppBottomNav } from '../../../components/common/AppBottomNav';
import { UserAvatar } from '../../../components/common/UserAvatar';
import { useAuthStore } from '../../../store/authStore';
import { useTheme } from '../../../app/providers/ThemeProvider';
import { PersonaSwitcher } from '../../navigation/PersonaSwitcher';
import { AttendanceService } from '../../../core/services/attendanceService';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../../../types/navigation.types';

const { width } = Dimensions.get('window');

// ── Donut Chart Component (Matching Web Leaves Breakdown) ───────────────────
interface DonutSlice {
  label: string;
  count: number;
  color: string;
  percent: number;
}

const LEAVES_SLICES: DonutSlice[] = [
  { label: 'On Time', count: 1254, color: '#F26522', percent: 0.15 },
  { label: 'Late Attendance', count: 32, color: '#FFC107', percent: 0.10 },
  { label: 'Work From Home', count: 658, color: '#E70D0D', percent: 0.05 },
  { label: 'Absent', count: 14, color: '#03C95A', percent: 0.10 },
  { label: 'Sick Leave', count: 68, color: '#0C4B5E', percent: 0.60 },
];

const NativeDonutChart: React.FC<{ size?: number; isDark?: boolean }> = ({ size = 150, isDark }) => {
  const radius = size * 0.36;
  const strokeWidth = size * 0.18;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulativeOffset = 0;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <G rotation="-90" origin={`${center}, ${center}`}>
          {/* Base background ring */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={isDark ? '#334155' : '#F1F5F9'}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {LEAVES_SLICES.map((slice, idx) => {
            const strokeDasharray = `${slice.percent * circumference} ${circumference}`;
            const strokeDashoffset = -cumulativeOffset;
            cumulativeOffset += slice.percent * circumference;

            return (
              <Circle
                key={idx}
                cx={center}
                cy={center}
                r={radius}
                stroke={slice.color}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                fill="none"
              />
            );
          })}
        </G>
      </Svg>
    </View>
  );
};

// ── Circular Attendance Progress Ring (Matching Web Attendance Card) ───────
const NativeAttendanceRing: React.FC<{ progress?: number; size?: number; isDark?: boolean }> = ({
  progress = 0.65,
  size = 140,
  isDark,
}) => {
  const strokeWidth = 10;
  const center = size / 2;
  const radius = center - strokeWidth / 2 - 4;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <G rotation="-90" origin={`${center}, ${center}`}>
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={isDark ? '#1E293B' : '#E2E8F0'}
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
      <View style={styles.ringCenterTextWrap}>
        <Text style={[styles.ringCenterSub, { color: isDark ? '#94A3B8' : '#64748B' }]}>Total Hours</Text>
        <Text style={[styles.ringCenterTime, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>05:45:32</Text>
      </View>
    </View>
  );
};

// ── Performance Area Trend Chart (Matching Web Area Chart) ──────────────────
const NativePerformanceAreaChart: React.FC<{ isDark?: boolean }> = ({ isDark }) => {
  const chartWidth = Math.min(width - 48, 360);
  const chartHeight = 160;

  // Data points: Jan(20), Feb(20), Mar(35), Apr(35), May(40), Jun(60), Jul(60)
  // min: 10, max: 70
  const points = [
    { x: 20, y: 120 },
    { x: 70, y: 120 },
    { x: 120, y: 85 },
    { x: 170, y: 85 },
    { x: 220, y: 70 },
    { x: 270, y: 25 },
    { x: 320, y: 25 },
  ];

  const pathD = `M 20 120 L 70 120 L 120 85 L 170 85 L 220 70 L 270 25 L 320 25`;
  const areaD = `${pathD} L 320 150 L 20 150 Z`;

  return (
    <View style={{ width: '100%', alignItems: 'center', marginTop: 12 }}>
      <Svg width={chartWidth} height={chartHeight} viewBox="0 0 340 160">
        <Defs>
          <LinearGradient id="perfGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#03C95A" stopOpacity="0.45" />
            <Stop offset="100%" stopColor="#03C95A" stopOpacity="0.02" />
          </LinearGradient>
        </Defs>

        {/* Horizontal gridlines */}
        <Line x1="10" y1="30" x2="330" y2="30" stroke={isDark ? '#334155' : '#E2E8F0'} strokeDasharray="4 4" strokeWidth="1" />
        <Line x1="10" y1="70" x2="330" y2="70" stroke={isDark ? '#334155' : '#E2E8F0'} strokeDasharray="4 4" strokeWidth="1" />
        <Line x1="10" y1="110" x2="330" y2="110" stroke={isDark ? '#334155' : '#E2E8F0'} strokeDasharray="4 4" strokeWidth="1" />
        <Line x1="10" y1="150" x2="330" y2="150" stroke={isDark ? '#334155' : '#E2E8F0'} strokeWidth="1" />

        {/* Shaded Area */}
        <Path d={areaD} fill="url(#perfGrad)" />

        {/* Main Line */}
        <Path d={pathD} fill="none" stroke="#03C95A" strokeWidth="3" />

        {/* Data points */}
        {points.map((pt, idx) => (
          <Circle key={idx} cx={pt.x} cy={pt.y} r="4" fill="#03C95A" stroke="#FFFFFF" strokeWidth="2" />
        ))}
      </Svg>

      {/* Month Labels */}
      <View style={[styles.chartMonthRow, { width: chartWidth - 20 }]}>
        {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'].map((m) => (
          <Text key={m} style={[styles.chartMonthText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            {m}
          </Text>
        ))}
      </View>
    </View>
  );
};

export const EmployeeDashboardScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<'EmployeeHome'>>();
  const user = useAuthStore((state) => state.user);
  const { theme, toggleTheme } = useTheme();

  const [refreshing, setRefreshing] = useState(false);
  const [punchedIn, setPunchedIn] = useState(true);
  const [punchLoading, setPunchLoading] = useState(false);
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [tasks, setTasks] = useState([
    { id: '1', title: 'Patient appointment booking', status: 'Onhold', color: '#EC4899', star: true, done: false },
    { id: '2', title: 'Appointment booking with payment', status: 'Inprogress', color: '#8B5CF6', star: false, done: false },
    { id: '3', title: 'Patient and Doctor video conferencing', status: 'Completed', color: '#10B981', star: false, done: true },
    { id: '4', title: 'Private chat module', status: 'Pending', color: '#64748B', star: false, done: false },
  ]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 600);
  }, []);

  const handleTogglePunch = async () => {
    setPunchLoading(true);
    try {
      if (punchedIn) {
        await AttendanceService.punch({ type: 'check_out' });
        setPunchedIn(false);
      } else {
        await AttendanceService.punch({ type: 'check_in' });
        setPunchedIn(true);
      }
    } catch {
      setPunchedIn(!punchedIn);
    } finally {
      setPunchLoading(false);
    }
  };

  const employeeName = user?.profile?.fullName || 'Stephan Peralt';
  const employeeRole = 'Senior Product Designer';
  const employeeDept = 'UI/UX Design';
  const employeeEmail = user?.email || 'steperde124@example.com';
  const employeePhone = '+1 324 3453 545';
  const reportManager = 'Douglas Martini';
  const joinedDate = '15 Jan 2024';

  const cardBgStyle = {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
  };
  const textPrimary = { color: theme.colors.text };
  const textSecondary = { color: theme.colors.textSecondary };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      {/* ── Top Navigation Bar ────────────────────────────────────────────── */}
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
          <Text style={[styles.headerTitle, textPrimary]}>Employee Dashboard</Text>
          <Text style={[styles.headerBreadcrumb, textSecondary]}>
            Home • Dashboard • <Text style={{ color: '#0D6EFD', fontWeight: '600' }}>Employee</Text>
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
        {/* ── Leave Approved Alert Banner ─────────────────────────────────── */}
        {!alertDismissed && (
          <View style={styles.approvedAlert}>
            <View style={styles.alertIconCircle}>
              <Check size={14} color="#03C95A" strokeWidth={3} />
            </View>
            <Text style={styles.alertText}>
              Your Leave Request on <Text style={{ fontWeight: '700' }}>“24th April 2026”</Text> has been Approved!
            </Text>
            <TouchableOpacity onPress={() => setAlertDismissed(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={16} color="#03C95A" />
            </TouchableOpacity>
          </View>
        )}

        {/* ── 1. Employee Profile Card (Matching Web lines 156-196) ──────── */}
        <View style={[styles.webCard, cardBgStyle]}>
          <View style={styles.profileCardHeaderDark}>
            <View style={styles.profileAvatarContainer}>
              <UserAvatar entity={user} size={54} borderWidth={2} borderColor="#FFFFFF" />
              <View style={styles.verifiedBadge}>
                <CheckCircle2 size={16} color="#03C95A" fill="#FFFFFF" />
              </View>
            </View>
            <View style={styles.profileHeaderTextWrap}>
              <Text style={styles.profileHeaderName}>{employeeName}</Text>
              <View style={styles.profileRoleRow}>
                <Text style={styles.profileHeaderRole}>{employeeRole}</Text>
                <View style={styles.profileDot} />
                <View style={styles.deptBadge}>
                  <Text style={styles.deptBadgeText}>{employeeDept}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.profileCardBody}>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, textSecondary]}>Phone Number</Text>
              <Text style={[styles.infoValue, textPrimary]}>🇺🇸 {employeePhone}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, textSecondary]}>Email Address</Text>
              <Text style={[styles.infoValue, textPrimary]}>{employeeEmail}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, textSecondary]}>Report Office</Text>
              <Text style={[styles.infoValue, textPrimary]}>{reportManager}</Text>
            </View>
            <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
              <Text style={[styles.infoLabel, textSecondary]}>Joined on</Text>
              <Text style={[styles.infoValue, textPrimary]}>{joinedDate}</Text>
            </View>
          </View>
        </View>

        {/* ── 2. Leave Details Breakdown & Donut Chart (Web lines 198-286) ─ */}
        <View style={[styles.webCard, cardBgStyle]}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.cardTitle, textPrimary]}>Leave Details</Text>
            <View style={[styles.yearDropdownPill, { backgroundColor: theme.isDark ? '#1E293B' : '#F1F5F9' }]}>
              <Calendar size={13} color="#0D6EFD" />
              <Text style={styles.yearDropdownText}>2026</Text>
              <ChevronDown size={13} color={theme.colors.textSecondary} />
            </View>
          </View>

          <View style={styles.donutSectionRow}>
            <View style={styles.donutMetricsCol}>
              {LEAVES_SLICES.map((item, idx) => (
                <View key={idx} style={styles.donutMetricItem}>
                  <View style={[styles.dotIndicator, { backgroundColor: item.color }]} />
                  <Text style={[styles.donutMetricCount, textPrimary]}>{item.count}</Text>
                  <Text style={[styles.donutMetricLabel, textSecondary]}>{item.label}</Text>
                </View>
              ))}
            </View>
            <View style={styles.donutChartContainer}>
              <NativeDonutChart size={145} isDark={theme.isDark} />
            </View>
          </View>

          <View style={[styles.betterThanBadge, { backgroundColor: theme.isDark ? '#1E293B' : '#F0FDF4' }]}>
            <View style={styles.betterCheckSquare}>
              <Check size={11} color="#FFFFFF" strokeWidth={3} />
            </View>
            <Text style={[styles.betterThanText, { color: theme.isDark ? '#4ADE80' : '#16A34A' }]}>
              Better than <Text style={{ fontWeight: '700' }}>85%</Text> of Employees
            </Text>
          </View>
        </View>

        {/* ── 3. Leave Allowance & Apply Leave (Web lines 288-360) ───────── */}
        <View style={[styles.webCard, cardBgStyle]}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.cardTitle, textPrimary]}>Leave Allowance</Text>
            <View style={[styles.yearDropdownPill, { backgroundColor: theme.isDark ? '#1E293B' : '#F1F5F9' }]}>
              <Calendar size={13} color="#0D6EFD" />
              <Text style={styles.yearDropdownText}>2026</Text>
              <ChevronDown size={13} color={theme.colors.textSecondary} />
            </View>
          </View>

          <View style={styles.leaveStatsGrid}>
            <View style={styles.leaveStatBox}>
              <Text style={[styles.leaveStatLabel, textSecondary]}>Total Leaves</Text>
              <Text style={[styles.leaveStatNum, textPrimary]}>16</Text>
            </View>
            <View style={styles.leaveStatBox}>
              <Text style={[styles.leaveStatLabel, textSecondary]}>Taken</Text>
              <Text style={[styles.leaveStatNum, textPrimary]}>10</Text>
            </View>
            <View style={styles.leaveStatBox}>
              <Text style={[styles.leaveStatLabel, textSecondary]}>Absent</Text>
              <Text style={[styles.leaveStatNum, textPrimary]}>2</Text>
            </View>
            <View style={styles.leaveStatBox}>
              <Text style={[styles.leaveStatLabel, textSecondary]}>Request</Text>
              <Text style={[styles.leaveStatNum, textPrimary]}>0</Text>
            </View>
            <View style={styles.leaveStatBox}>
              <Text style={[styles.leaveStatLabel, textSecondary]}>Worked Days</Text>
              <Text style={[styles.leaveStatNum, textPrimary]}>240</Text>
            </View>
            <View style={styles.leaveStatBox}>
              <Text style={[styles.leaveStatLabel, textSecondary]}>Loss of Pay</Text>
              <Text style={[styles.leaveStatNum, textPrimary]}>2</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.applyLeaveBtn}
            onPress={() => navigation.navigate('ApplyLeave')}
            activeOpacity={0.85}
          >
            <Text style={styles.applyLeaveBtnText}>Apply New Leave</Text>
          </TouchableOpacity>
        </View>

        {/* ── 4. Attendance Clock & Punch Card (Web lines 363-393) ───────── */}
        <View style={[styles.webCard, styles.attendanceCardBorder, cardBgStyle]}>
          <View style={styles.attendanceClockHeader}>
            <Text style={[styles.attendanceSubTitle, textSecondary]}>Attendance</Text>
            <Text style={[styles.attendanceDateTime, textPrimary]}>08:35 AM, 11 Mar 2026</Text>
          </View>

          <View style={{ alignItems: 'center', marginVertical: 14 }}>
            <NativeAttendanceRing progress={0.65} size={150} isDark={theme.isDark} />
          </View>

          <View style={styles.attendanceCenterActions}>
            <View style={styles.productionBadge}>
              <Text style={styles.productionBadgeText}>Production : 3.45 hrs</Text>
            </View>

            <View style={styles.punchStatusRow}>
              <Fingerprint size={16} color="#0D6EFD" />
              <Text style={[styles.punchStatusText, textPrimary]}>
                {punchedIn ? 'Punch In at 10.00 AM' : 'Checked Out'}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.punchActionBtn, punchedIn ? styles.punchOutBtn : styles.punchInBtn]}
              onPress={handleTogglePunch}
              disabled={punchLoading}
              activeOpacity={0.85}
            >
              <Text style={styles.punchActionBtnText}>
                {punchLoading ? 'Processing...' : punchedIn ? 'Punch Out' : 'Punch In'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 5. 4 Work Hours KPI Stat Cards (Web lines 396-480) ─────────── */}
        <View style={styles.kpiCardsGrid}>
          {/* Total Hours Today */}
          <View style={[styles.kpiCard, cardBgStyle]}>
            <View style={[styles.kpiIconWrap, { backgroundColor: '#EFF6FF' }]}>
              <Clock size={16} color="#0D6EFD" />
            </View>
            <Text style={[styles.kpiMainNum, textPrimary]}>
              8.36 / <Text style={{ fontSize: 13, color: '#94A3B8' }}>9</Text>
            </Text>
            <Text style={[styles.kpiTitle, textSecondary]}>Total Hours Today</Text>
            <View style={styles.kpiDeltaRow}>
              <ArrowUp size={12} color="#16A34A" />
              <Text style={styles.kpiDeltaPositive}>5% This Week</Text>
            </View>
          </View>

          {/* Total Hours Week */}
          <View style={[styles.kpiCard, cardBgStyle]}>
            <View style={[styles.kpiIconWrap, { backgroundColor: '#F1F5F9' }]}>
              <CalendarDays size={16} color="#0F172A" />
            </View>
            <Text style={[styles.kpiMainNum, textPrimary]}>
              10 / <Text style={{ fontSize: 13, color: '#94A3B8' }}>40</Text>
            </Text>
            <Text style={[styles.kpiTitle, textSecondary]}>Total Hours Week</Text>
            <View style={styles.kpiDeltaRow}>
              <ArrowUp size={12} color="#16A34A" />
              <Text style={styles.kpiDeltaPositive}>7% Last Week</Text>
            </View>
          </View>

          {/* Total Hours Month */}
          <View style={[styles.kpiCard, cardBgStyle]}>
            <View style={[styles.kpiIconWrap, { backgroundColor: '#F0F9FF' }]}>
              <Calendar size={16} color="#0284C7" />
            </View>
            <Text style={[styles.kpiMainNum, textPrimary]}>
              75 / <Text style={{ fontSize: 13, color: '#94A3B8' }}>98</Text>
            </Text>
            <Text style={[styles.kpiTitle, textSecondary]}>Total Hours Month</Text>
            <View style={styles.kpiDeltaRow}>
              <ArrowDown size={12} color="#EF4444" />
              <Text style={styles.kpiDeltaNegative}>8% Last Month</Text>
            </View>
          </View>

          {/* Overtime this Month */}
          <View style={[styles.kpiCard, cardBgStyle]}>
            <View style={[styles.kpiIconWrap, { backgroundColor: '#FDF2F8' }]}>
              <Sparkles size={16} color="#DB2777" />
            </View>
            <Text style={[styles.kpiMainNum, textPrimary]}>
              16 / <Text style={{ fontSize: 13, color: '#94A3B8' }}>28</Text>
            </Text>
            <Text style={[styles.kpiTitle, textSecondary]}>Overtime Month</Text>
            <View style={styles.kpiDeltaRow}>
              <ArrowDown size={12} color="#EF4444" />
              <Text style={styles.kpiDeltaNegative}>6% Last Month</Text>
            </View>
          </View>
        </View>

        {/* ── 6. Working Hours Timeline Progress Bar (Web lines 481-569) ─── */}
        <View style={[styles.webCard, cardBgStyle]}>
          <View style={styles.workHoursSummaryRow}>
            <View style={styles.workHoursCol}>
              <Text style={[styles.workHoursLabel, textSecondary]}>Total Working</Text>
              <Text style={[styles.workHoursVal, textPrimary]}>12h 36m</Text>
            </View>
            <View style={styles.workHoursCol}>
              <Text style={[styles.workHoursLabel, textSecondary]}>Productive</Text>
              <Text style={[styles.workHoursVal, { color: '#03C95A' }]}>08h 36m</Text>
            </View>
            <View style={styles.workHoursCol}>
              <Text style={[styles.workHoursLabel, textSecondary]}>Break Hours</Text>
              <Text style={[styles.workHoursVal, { color: '#F59E0B' }]}>22m 15s</Text>
            </View>
            <View style={styles.workHoursCol}>
              <Text style={[styles.workHoursLabel, textSecondary]}>Overtime</Text>
              <Text style={[styles.workHoursVal, { color: '#0284C7' }]}>02h 15m</Text>
            </View>
          </View>

          {/* Segmented Bar */}
          <View style={[styles.timelineBarWrap, { backgroundColor: theme.isDark ? '#334155' : '#E2E8F0' }]}>
            <View style={{ width: '18%', height: '100%', backgroundColor: theme.isDark ? '#475569' : '#FFFFFF' }} />
            <View style={{ width: '18%', height: '100%', backgroundColor: '#03C95A', marginHorizontal: 2 }} />
            <View style={{ width: '6%', height: '100%', backgroundColor: '#F59E0B', marginRight: 2 }} />
            <View style={{ width: '26%', height: '100%', backgroundColor: '#03C95A', marginRight: 2 }} />
            <View style={{ width: '14%', height: '100%', backgroundColor: '#F59E0B', marginRight: 2 }} />
            <View style={{ width: '18%', height: '100%', backgroundColor: '#0284C7' }} />
          </View>

          <View style={styles.timelineHoursMarks}>
            {['06:00', '09:00', '12:00', '15:00', '18:00', '21:00'].map((h) => (
              <Text key={h} style={[styles.timelineHourText, textSecondary]}>
                {h}
              </Text>
            ))}
          </View>
        </View>

        {/* ── 7. Ongoing Projects (Web lines 573-777) ─────────────────────── */}
        <View style={[styles.webCard, cardBgStyle]}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.cardTitle, textPrimary]}>Projects</Text>
            <View style={[styles.projectFilterPill, { backgroundColor: theme.isDark ? '#1E293B' : '#F1F5F9' }]}>
              <Text style={styles.projectFilterText}>Ongoing Projects</Text>
              <ChevronDown size={13} color={theme.colors.textSecondary} />
            </View>
          </View>

          {/* Project Card 1 */}
          <View style={[styles.projectSubCard, { borderColor: theme.isDark ? '#334155' : '#E2E8F0' }]}>
            <View style={styles.projectCardTop}>
              <Text style={[styles.projectName, textPrimary]}>Office Management</Text>
              <MoreVertical size={16} color={theme.colors.textSecondary} />
            </View>

            <View style={styles.projectLeaderRow}>
              <UserAvatar name="Anthony Lewis" size={28} />
              <View style={{ marginLeft: 8 }}>
                <Text style={[styles.projectLeaderName, textPrimary]}>Anthony Lewis</Text>
                <Text style={[styles.projectLeaderSub, textSecondary]}>Project Leader</Text>
              </View>
            </View>

            <View style={styles.projectDeadlineRow}>
              <Calendar size={14} color="#0D6EFD" />
              <Text style={[styles.projectDeadlineText, textSecondary]}>Deadline: 14 Jan 2026</Text>
            </View>

            <View style={[styles.projectTasksRow, { backgroundColor: theme.isDark ? '#1E293B' : '#F8FAFC' }]}>
              <Text style={[styles.projectTasksText, textSecondary]}>
                Tasks: <Text style={[textPrimary, { fontWeight: '700' }]}>6 / 10</Text>
              </Text>
              <View style={styles.avatarMiniStack}>
                <View style={[styles.miniStackAvatar, { backgroundColor: '#3B82F6' }]}><Text style={styles.miniStackText}>AL</Text></View>
                <View style={[styles.miniStackAvatar, { backgroundColor: '#10B981' }]}><Text style={styles.miniStackText}>SP</Text></View>
                <View style={[styles.miniStackAvatar, { backgroundColor: '#F59E0B' }]}><Text style={styles.miniStackText}>DM</Text></View>
              </View>
            </View>

            <View style={[styles.projectTimeSpentBox, { backgroundColor: theme.isDark ? '#1E293B' : '#EFF6FF' }]}>
              <Text style={{ color: '#0D6EFD', fontSize: 12, fontWeight: '600' }}>Time Spent</Text>
              <Text style={{ color: '#0D6EFD', fontSize: 13, fontWeight: '700' }}>65 / 120 Hrs</Text>
            </View>
          </View>
        </View>

        {/* ── 8. Tasks List (Web lines 779-1010) ─────────────────────────── */}
        <View style={[styles.webCard, cardBgStyle]}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.cardTitle, textPrimary]}>Tasks</Text>
            <TouchableOpacity onPress={() => navigation.navigate('TodoList')}>
              <Text style={styles.viewAllTasksLink}>View All →</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tasksList}>
            {tasks.map((task) => (
              <TouchableOpacity
                key={task.id}
                style={[styles.taskItem, { borderColor: theme.isDark ? '#334155' : '#E2E8F0' }]}
                activeOpacity={0.75}
                onPress={() => {
                  setTasks(tasks.map((t) => (t.id === task.id ? { ...t, done: !t.done } : t)));
                }}
              >
                <View style={styles.taskItemLeft}>
                  {task.done ? (
                    <CheckSquare size={17} color="#0D6EFD" />
                  ) : (
                    <Square size={17} color={theme.colors.textSecondary} />
                  )}
                  {task.star ? (
                    <Star size={14} color="#F59E0B" fill="#F59E0B" style={{ marginLeft: 6 }} />
                  ) : (
                    <Star size={14} color={theme.colors.textSecondary} style={{ marginLeft: 6 }} />
                  )}
                  <Text
                    style={[
                      styles.taskItemTitle,
                      textPrimary,
                      task.done && { textDecorationLine: 'line-through', opacity: 0.5 },
                    ]}
                    numberOfLines={1}
                  >
                    {task.title}
                  </Text>
                </View>

                <View style={[styles.taskStatusPill, { backgroundColor: `${task.color}15` }]}>
                  <Text style={[styles.taskStatusText, { color: task.color }]}>{task.status}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── 9. Performance Analytics & Area Curve (Web lines 1012-1056) ─ */}
        <View style={[styles.webCard, cardBgStyle]}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.cardTitle, textPrimary]}>Performance</Text>
            <View style={[styles.yearDropdownPill, { backgroundColor: theme.isDark ? '#1E293B' : '#F1F5F9' }]}>
              <Calendar size={13} color="#0D6EFD" />
              <Text style={styles.yearDropdownText}>2026</Text>
              <ChevronDown size={13} color={theme.colors.textSecondary} />
            </View>
          </View>

          <View style={[styles.perfScoreBanner, { backgroundColor: theme.isDark ? '#1E293B' : '#F8FAFC' }]}>
            <Text style={[styles.perfScoreNum, textPrimary]}>98%</Text>
            <View style={styles.perfScoreBadge}>
              <Text style={styles.perfScoreBadgeText}>12% vs last year</Text>
            </View>
          </View>

          <NativePerformanceAreaChart isDark={theme.isDark} />
        </View>

        {/* ── 10. My Skills (Web lines 1058-1100) ─────────────────────────── */}
        <View style={[styles.webCard, cardBgStyle]}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.cardTitle, textPrimary]}>My Skills</Text>
            <Award size={16} color="#0D6EFD" />
          </View>

          {[
            { name: 'Figma & Prototyping', date: '15 May 2026', percent: 95, color: '#0D6EFD' },
            { name: 'React Native & Mobile UI', date: '10 Apr 2026', percent: 90, color: '#10B981' },
            { name: 'Design Systems & Tokens', date: '02 Mar 2026', percent: 85, color: '#F59E0B' },
          ].map((skill, idx) => (
            <View
              key={idx}
              style={[
                styles.skillRow,
                {
                  backgroundColor: theme.isDark ? '#1E293B' : '#F8FAFC',
                  borderColor: theme.isDark ? '#334155' : '#E2E8F0',
                },
              ]}
            >
              <View style={styles.skillRowLeft}>
                <View style={[styles.skillColorBar, { backgroundColor: skill.color }]} />
                <View>
                  <Text style={[styles.skillName, textPrimary]}>{skill.name}</Text>
                  <Text style={[styles.skillDate, textSecondary]}>Updated : {skill.date}</Text>
                </View>
              </View>
              <View style={[styles.skillPercentBadge, { backgroundColor: `${skill.color}15` }]}>
                <Text style={[styles.skillPercentText, { color: skill.color }]}>{skill.percent}%</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: 28 }} />
      </ScrollView>

      {/* ── Pinned Bottom Nav ────────────────────────────────────────────── */}
      <AppBottomNav activeRoute="EmployeeHome" />
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
  approvedAlert: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  alertIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  alertText: {
    flex: 1,
    fontSize: 12,
    color: '#065F46',
    lineHeight: 17,
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
  profileCardHeaderDark: {
    backgroundColor: '#0F172A',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileAvatarContainer: {
    position: 'relative',
    marginRight: 14,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#FFFFFF',
    borderRadius: 9,
  },
  profileHeaderTextWrap: {
    flex: 1,
  },
  profileHeaderName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 3,
  },
  profileRoleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  profileHeaderRole: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  profileDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#0D6EFD',
    marginHorizontal: 6,
  },
  deptBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  deptBadgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  profileCardBody: {
    padding: 16,
  },
  infoRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.15)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  yearDropdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  yearDropdownText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0D6EFD',
  },
  donutSectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  donutMetricsCol: {
    flex: 1,
    gap: 7,
  },
  donutMetricItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dotIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  donutMetricCount: {
    fontSize: 12,
    fontWeight: '700',
    marginRight: 6,
  },
  donutMetricLabel: {
    fontSize: 11,
  },
  donutChartContainer: {
    marginLeft: 8,
  },
  betterThanBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 10,
    borderRadius: 8,
  },
  betterCheckSquare: {
    width: 18,
    height: 18,
    borderRadius: 4,
    backgroundColor: '#03C95A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  betterThanText: {
    fontSize: 12,
    fontWeight: '500',
  },
  leaveStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  leaveStatBox: {
    width: '33.33%',
    paddingVertical: 10,
  },
  leaveStatLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  leaveStatNum: {
    fontSize: 18,
    fontWeight: '800',
  },
  applyLeaveBtn: {
    backgroundColor: '#0F172A',
    marginHorizontal: 16,
    marginBottom: 16,
    marginTop: 6,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  applyLeaveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  attendanceCardBorder: {
    borderColor: '#0D6EFD',
    borderWidth: 1.5,
  },
  attendanceClockHeader: {
    alignItems: 'center',
    paddingTop: 16,
  },
  attendanceSubTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  attendanceDateTime: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  ringCenterTextWrap: {
    position: 'absolute',
    alignItems: 'center',
  },
  ringCenterSub: {
    fontSize: 11,
    fontWeight: '500',
  },
  ringCenterTime: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
  },
  attendanceCenterActions: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  productionBadge: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 10,
  },
  productionBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  punchStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  punchStatusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  punchActionBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  punchInBtn: {
    backgroundColor: '#03C95A',
  },
  punchOutBtn: {
    backgroundColor: '#0D6EFD',
  },
  punchActionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  kpiCardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  kpiCard: {
    width: (width - 44) / 2,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  kpiIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  kpiMainNum: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
  },
  kpiTitle: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 8,
  },
  kpiDeltaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  kpiDeltaPositive: {
    fontSize: 11,
    color: '#16A34A',
    fontWeight: '600',
  },
  kpiDeltaNegative: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '600',
  },
  workHoursSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  workHoursCol: {
    alignItems: 'center',
  },
  workHoursLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginBottom: 2,
  },
  workHoursVal: {
    fontSize: 14,
    fontWeight: '800',
  },
  timelineBarWrap: {
    height: 18,
    borderRadius: 6,
    marginHorizontal: 16,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 8,
  },
  timelineHoursMarks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  timelineHourText: {
    fontSize: 9,
    fontWeight: '600',
  },
  projectFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  projectFilterText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  projectSubCard: {
    margin: 16,
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  projectCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  projectName: {
    fontSize: 14,
    fontWeight: '700',
  },
  projectLeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  projectLeaderName: {
    fontSize: 12,
    fontWeight: '600',
  },
  projectLeaderSub: {
    fontSize: 10,
  },
  projectDeadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  projectDeadlineText: {
    fontSize: 11,
    fontWeight: '500',
  },
  projectTasksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  projectTasksText: {
    fontSize: 11,
  },
  avatarMiniStack: {
    flexDirection: 'row',
  },
  miniStackAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  miniStackText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  projectTimeSpentBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
  },
  viewAllTasksLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0D6EFD',
  },
  tasksList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  taskItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  taskItemTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  taskStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  taskStatusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  perfScoreBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    padding: 10,
    borderRadius: 10,
    gap: 10,
  },
  perfScoreNum: {
    fontSize: 20,
    fontWeight: '800',
  },
  perfScoreBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  perfScoreBadgeText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '700',
  },
  chartMonthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 6,
    paddingBottom: 12,
  },
  chartMonthText: {
    fontSize: 10,
    fontWeight: '600',
  },
  skillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  skillRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  skillColorBar: {
    width: 4,
    height: 26,
    borderRadius: 2,
  },
  skillName: {
    fontSize: 12,
    fontWeight: '700',
  },
  skillDate: {
    fontSize: 10,
    marginTop: 2,
  },
  skillPercentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  skillPercentText: {
    fontSize: 12,
    fontWeight: '800',
  },
});
