import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Image,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Text } from '../../../components/common/Text';
import {
  Bell,
  Users,
  Calendar,
  CalendarCheck,
  User,
  Check,
  FileText,
  Moon,
  Sun,
  Clock,
} from 'lucide-react-native';
import { AppBottomNav } from '../../../components/common/AppBottomNav';
import { UserAvatar } from '../../../components/common/UserAvatar';
import { useAuthStore } from '../../../store/authStore';
import { useTenantStore } from '../../../store/tenantStore';
import { useTheme } from '../../../app/providers/ThemeProvider';
import { PersonaSwitcher } from '../../navigation/PersonaSwitcher';
import { AuthService } from '../../../core/auth/authService';
import { HrService, DailyAttendanceReport, EmployeeSummary } from '../../../core/services/hrService';
import { LeaveRequest } from '../../../core/services/leaveService';
import { CalendarService, CalendarEvent } from '../../../core/services/calendarService';
import { TodoService } from '../../../core/services/todoService';
import { NotificationService, AppNotification } from '../../../core/services/notificationService';
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

interface ChartDay {
  day: string;
  pct: number;
}

export const HrAdminDashboardScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<'HrAdminHome'>>();
  const user = useAuthStore((state) => state.user);
  const currentTenant = useTenantStore((state) => state.currentTenant);
  const { theme, toggleTheme } = useTheme();

  const [refreshing, setRefreshing] = useState(false);
  const [employees, setEmployees] = useState<EmployeeSummary[]>([]);
  const [attendanceReport, setAttendanceReport] = useState<DailyAttendanceReport>({
    totalEmployees: 248,
    present: 212,
    absent: 24,
    onLeave: 12,
    lateArrivals: 6,
    halfDays: 4,
  });
  const [pendingLeaves, setPendingLeaves] = useState<LeaveRequest[]>([]);

  // Selected Day in Bar Chart (defaults to Thursday / index 3 like in reference)
  const [selectedDayIdx, setSelectedDayIdx] = useState<number>(3);

  // Interactive Task List
  const [tasks, setTasks] = useState([
    { id: '1', title: 'Verify new joiner documents', completed: true },
    { id: '2', title: 'Finalize April payroll', completed: false },
    { id: '3', title: 'Update leave policy draft', completed: false },
  ]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [recentNotifs, setRecentNotifs] = useState<AppNotification[]>([]);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const loadData = useCallback(async () => {
    try {
      const [empData, repData, leavesData, , calEvents, todoList, notifs] = await Promise.all([
        HrService.getEmployees({ limit: 10 }).catch(() => []),
        HrService.getDailyAttendanceReport().catch(() => null),
        HrService.getAllLeaveRequests('PENDING').catch(() => []),
        AuthService.getCurrentUser().catch(() => null),
        CalendarService.getEvents().catch(() => []),
        TodoService.getTodos().catch(() => []),
        NotificationService.getNotifications().catch(() => []),
      ]);
      if (empData && empData.length > 0) setEmployees(empData);
      if (repData) setAttendanceReport(repData);
      if (leavesData) setPendingLeaves(leavesData);
      if (calEvents && calEvents.length > 0) setEvents(calEvents.slice(0, 3));
      if (todoList && todoList.length > 0) {
        setTasks(
          todoList.slice(0, 3).map((t) => ({
            id: t.id,
            title: t.title,
            completed: Boolean(t.completed),
          }))
        );
      }
      if (notifs && notifs.length > 0) {
        setRecentNotifs(notifs.slice(0, 3));
      }
    } catch {
      // Graceful fallback to rich defaults
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Trigger smooth entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 7,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [loadData, fadeAnim, slideAnim]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const chartDays: ChartDay[] = [
    { day: 'Mon', pct: 75 },
    { day: 'Tue', pct: 68 },
    { day: 'Wed', pct: 78 },
    { day: 'Thu', pct: 85 },
    { day: 'Fri', pct: 70 },
  ];

  const totalEmployeesCount = employees.length > 0 ? employees.length : attendanceReport.totalEmployees || 248;
  const presentCount = attendanceReport.present > 0 ? attendanceReport.present : 212;
  const onLeaveCount = attendanceReport.onLeave > 0 ? attendanceReport.onLeave : 12;
  const lateCount = attendanceReport.lateArrivals > 0 ? attendanceReport.lateArrivals : 6;
  const pendingCount = pendingLeaves.length > 0 ? pendingLeaves.length : 8;

  const tenantName = currentTenant?.name || 'MasterHRMS';

  const adminFullName = useMemo(() => {
    if (user?.profile?.fullName) return user.profile.fullName;
    const nameParts = [user?.profile?.firstName, user?.profile?.lastName].filter(Boolean);
    if (nameParts.length > 0) return nameParts.join(' ');
    if ((user as any)?.name) return (user as any).name;
    if ((user as any)?.fullName) return (user as any).fullName;
    if (user?.email) return user.email.split('@')[0];
    return 'HR Director';
  }, [user]);

  const adminDesignation = useMemo(() => {
    const rawDesig =
      user?.designation ||
      user?.profile?.designation ||
      user?.profile?.position ||
      user?.workspaceRole?.name;
    if (typeof rawDesig === 'object' && rawDesig !== null) {
      return (rawDesig as any).name || (rawDesig as any).title || 'HR Operations Director';
    }
    if (typeof rawDesig === 'string' && rawDesig.trim().length > 0) {
      return rawDesig;
    }
    return 'HR Operations Director';
  }, [user]);

  const avatarUri = useMemo(() => {
    const raw =
      user?.profile?.avatarUrl ||
      (user?.profile as any)?.avatar ||
      (user as any)?.avatarUrl ||
      (user as any)?.avatar;
    if (raw) {
      const normalized = normalizeAvatarUrl(raw);
      if (normalized) return normalized;
    }
    // High-resolution Dicebear avatar guaranteed to render
    const seed = encodeURIComponent(adminFullName || user?.email || 'hr');
    return `https://api.dicebear.com/7.x/avataaars/png?seed=${seed}&backgroundColor=4f46e5`;
  }, [user, adminFullName]);

  const cardTheme = theme.isDark
    ? { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1 }
    : undefined;
  const textPrimary = theme.isDark ? { color: theme.colors.text } : undefined;
  const textSecondary = theme.isDark ? { color: theme.colors.textSecondary } : undefined;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Top Header */}
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
          <Image source={logoSource} style={styles.logo} resizeMode="contain" />
          <View style={styles.brandTextCol}>
            <Text style={[styles.brandTitle, textPrimary]}>{tenantName}</Text>
            <Text style={[styles.brandSub, textSecondary]}>Powered by MasterHRMS</Text>
          </View>
        </View>

        <View style={styles.headerRightActions}>
          <TouchableOpacity
            onPress={toggleTheme}
            style={[
              styles.bellBtn,
              theme.isDark && {
                backgroundColor: theme.colors.surfaceSecondary,
                borderColor: theme.colors.border,
              },
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
              styles.bellBtn,
              theme.isDark && {
                backgroundColor: theme.colors.surfaceSecondary,
                borderColor: theme.colors.border,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Bell size={18} color={theme.colors.text} strokeWidth={2.2} />
            <View style={styles.unreadDot} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('Profile')}
            accessibilityRole="button"
            accessibilityLabel="User Profile"
          >
            <UserAvatar
              entity={user}
              uri={avatarUri}
              name={adminFullName}
              email={user?.email}
              size={40}
              borderWidth={2}
              borderColor="#4F46E5"
            />
          </TouchableOpacity>
        </View>
      </View>

      <Animated.ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#4F46E5"
            colors={['#4F46E5']}
          />
        }
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        bounces={true}
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >
        {/* Hero Welcome Banner */}
        <View style={styles.heroBanner}>
          {/* Subtle Skyline Glow Shape */}
          <View style={styles.skylineOverlay} pointerEvents="none" />
          <View style={styles.skylineBuilding1} pointerEvents="none" />
          <View style={styles.skylineBuilding2} pointerEvents="none" />
          <View style={styles.skylineBuilding3} pointerEvents="none" />

          <View style={styles.heroHeaderRow}>
            <View style={styles.heroTextCol}>
              <Text style={styles.heroGreeting}>Welcome back,</Text>
              <Text style={styles.heroTitle}>{adminFullName}</Text>
              <Text style={styles.heroSubtitle}>{adminDesignation}</Text>
            </View>

            {/* Persona Switcher Pill */}
            <View style={styles.personaContainer}>
              <PersonaSwitcher />
            </View>
          </View>
        </View>

        {/* 2x2 Key Metric Stat Cards */}
        <View style={styles.statsGrid}>
          {/* Card 1: Total Employees */}
          <TouchableOpacity
            style={[styles.statCard, cardTheme]}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('EmployeeDirectory')}
          >
            <View style={styles.statTopRow}>
              <View style={[styles.statIconCircle, styles.statIconPurple]}>
                <Users size={18} color="#6366F1" strokeWidth={2.2} />
              </View>
              <View style={styles.statTrendGreen}>
                <Text style={styles.statTrendGreenText}>↑ +4.2%</Text>
              </View>
            </View>
            <Text style={[styles.statNumber, textPrimary]}>{totalEmployeesCount}</Text>
            <Text style={[styles.statLabel, textSecondary]}>Total Employees</Text>
          </TouchableOpacity>

          {/* Card 2: Present Today */}
          <TouchableOpacity
            style={[styles.statCard, cardTheme]}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('OrgAttendance')}
          >
            <View style={styles.statTopRow}>
              <View style={[styles.statIconCircle, styles.statIconGreen]}>
                <Calendar size={18} color="#10B981" strokeWidth={2.2} />
              </View>
              <View style={styles.statTrendGreen}>
                <Text style={styles.statTrendGreenText}>↑ 85.5%</Text>
              </View>
            </View>
            <Text style={[styles.statNumber, textPrimary]}>{presentCount}</Text>
            <Text style={[styles.statLabel, textSecondary]}>Present Today</Text>
          </TouchableOpacity>

          {/* Card 3: On Leave */}
          <TouchableOpacity
            style={[styles.statCard, cardTheme]}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('PendingApprovals')}
          >
            <View style={styles.statTopRow}>
              <View style={[styles.statIconCircle, styles.statIconRed]}>
                <CalendarCheck size={18} color="#EF4444" strokeWidth={2.2} />
              </View>
              <View style={styles.statTrendRed}>
                <Text style={styles.statTrendRedText}>↓ -8.3%</Text>
              </View>
            </View>
            <Text style={[styles.statNumber, textPrimary]}>{onLeaveCount}</Text>
            <Text style={[styles.statLabel, textSecondary]}>On Leave</Text>
          </TouchableOpacity>

          {/* Card 4: Late Arrivals */}
          <TouchableOpacity
            style={[styles.statCard, cardTheme]}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('OrgAttendance')}
          >
            <View style={styles.statTopRow}>
              <View style={[styles.statIconCircle, styles.statIconOrange]}>
                <Clock size={18} color="#EA580C" strokeWidth={2.2} />
              </View>
              <View style={styles.statTrendRed}>
                <Text style={styles.statTrendRedText}>↓ -14.2%</Text>
              </View>
            </View>
            <Text style={[styles.statNumber, textPrimary]}>{lateCount}</Text>
            <Text style={[styles.statLabel, textSecondary]}>Late Arrivals</Text>
          </TouchableOpacity>
        </View>

        {/* Attendance Overview Card with Interactive Bar Chart */}
        <View style={[styles.chartCard, cardTheme]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, textPrimary]}>Attendance Overview</Text>
            <TouchableOpacity style={styles.filterPill} activeOpacity={0.7}>
              <Text style={styles.filterPillText}>This Week ⌵</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.barChartContainer}>
            {/* Y-Axis Labels */}
            <View style={styles.yAxisCol}>
              <Text style={styles.axisLabel}>100%</Text>
              <Text style={styles.axisLabel}>75%</Text>
              <Text style={styles.axisLabel}>50%</Text>
              <Text style={styles.axisLabel}>25%</Text>
              <Text style={styles.axisLabel}>0%</Text>
            </View>

            {/* Bars Area */}
            <View style={styles.barsArea}>
              {chartDays.map((item, idx) => {
                const isSelected = selectedDayIdx === idx;
                return (
                  <TouchableOpacity
                    key={item.day}
                    style={styles.barColumn}
                    activeOpacity={0.8}
                    onPress={() => setSelectedDayIdx(idx)}
                  >
                    {/* Tooltip Badge */}
                    {isSelected && (
                      <View style={styles.tooltipBadge}>
                        <Text style={styles.tooltipText}>{item.pct}%</Text>
                      </View>
                    )}

                    {/* Bar Track & Fill */}
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          { height: `${item.pct}%` },
                          isSelected && styles.barFillSelected,
                        ]}
                      />
                    </View>

                    {/* Day Label */}
                    <Text style={[styles.dayLabel, isSelected && styles.dayLabelSelected]}>
                      {item.day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* Workforce by Department & Leave Summary Side-by-Side */}
        <View style={styles.dualCardRow}>
          {/* Left Card: Workforce by Department */}
          <View style={[styles.donutCard, cardTheme]}>
            <Text style={[styles.cardHeaderTitle, textPrimary]}>Workforce by Dept</Text>

            <View style={styles.donutContentRow}>
              {/* Circular Gauge Representation */}
              <View style={styles.donutCircleWrapper}>
                <View style={styles.donutOuterRing}>
                  <View style={styles.donutInnerCenter}>
                    <Text style={styles.donutCenterNumber}>248</Text>
                    <Text style={styles.donutCenterLabel}>Employees</Text>
                  </View>
                </View>
              </View>

              {/* Department Legend */}
              <View style={styles.deptLegendCol}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, styles.dotBlue]} />
                  <Text style={styles.legendName}>Ops</Text>
                  <Text style={styles.legendPct}>28%</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, styles.dotGreen]} />
                  <Text style={styles.legendName}>Tech</Text>
                  <Text style={styles.legendPct}>24%</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, styles.dotAmber]} />
                  <Text style={styles.legendName}>Sales</Text>
                  <Text style={styles.legendPct}>18%</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, styles.dotPurple]} />
                  <Text style={styles.legendName}>HR</Text>
                  <Text style={styles.legendPct}>12%</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, styles.dotPink]} />
                  <Text style={styles.legendName}>Fin</Text>
                  <Text style={styles.legendPct}>10%</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Right Card: Leave Summary */}
          <View style={[styles.gaugeCard, cardTheme]}>
            <Text style={[styles.cardHeaderTitle, textPrimary]}>Leave Summary</Text>

            {/* Half Gauge Representation */}
            <View style={styles.halfGaugeWrapper}>
              <View style={styles.halfGaugeArc}>
                <View style={styles.gaugeInnerCutout}>
                  <Text style={styles.gaugeCountNumber}>12</Text>
                  <Text style={styles.gaugeCountLabel}>On Leave</Text>
                </View>
              </View>
            </View>

            {/* Leave Breakdown Grid */}
            <View style={styles.leaveBreakdownGrid}>
              <View style={styles.leaveLegendRow}>
                <View style={[styles.legendDot, styles.dotBlue]} />
                <Text style={styles.leaveLegendName}>Annual</Text>
                <Text style={styles.leaveLegendVal}>5</Text>
              </View>
              <View style={styles.leaveLegendRow}>
                <View style={[styles.legendDot, styles.dotAmber]} />
                <Text style={styles.leaveLegendName}>Casual</Text>
                <Text style={styles.leaveLegendVal}>3</Text>
              </View>
              <View style={styles.leaveLegendRow}>
                <View style={[styles.legendDot, styles.dotRed]} />
                <Text style={styles.leaveLegendName}>Sick</Text>
                <Text style={styles.leaveLegendVal}>2</Text>
              </View>
              <View style={styles.leaveLegendRow}>
                <View style={[styles.legendDot, styles.dotGray]} />
                <Text style={styles.leaveLegendName}>Unpaid</Text>
                <Text style={styles.leaveLegendVal}>2</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Pending Approvals Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, textPrimary]}>Pending Approvals</Text>
            <TouchableOpacity onPress={() => navigation.navigate('PendingApprovals')}>
              <Text style={styles.viewAllLink}>View All &gt;</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.listCard, cardTheme]}>
            {/* Row 1: Leave Requests */}
            <TouchableOpacity
              style={styles.approvalRow}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('PendingApprovals')}
            >
              <View style={[styles.approvalIconCircle, styles.bgBlueLight]}>
                <User size={16} color="#3B82F6" strokeWidth={2.2} />
              </View>
              <Text style={[styles.approvalTitle, textPrimary]}>Leave Requests</Text>
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>{pendingCount} pending</Text>
              </View>
              <Text style={styles.chevronIcon}>&gt;</Text>
            </TouchableOpacity>

            <View style={[styles.rowDivider, theme.isDark && { backgroundColor: theme.colors.borderLight }]} />

            {/* Row 2: Attendance Regularizations */}
            <TouchableOpacity
              style={styles.approvalRow}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('OrgAttendance')}
            >
              <View style={[styles.approvalIconCircle, styles.bgSkyLight]}>
                <Check size={16} color="#0284C7" strokeWidth={2.4} />
              </View>
              <Text style={[styles.approvalTitle, textPrimary]}>Attendance Regularizations</Text>
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>4 pending</Text>
              </View>
              <Text style={styles.chevronIcon}>&gt;</Text>
            </TouchableOpacity>

            <View style={[styles.rowDivider, theme.isDark && { backgroundColor: theme.colors.borderLight }]} />

            {/* Row 3: Document Requests */}
            <TouchableOpacity
              style={styles.approvalRow}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('DocumentsVault')}
            >
              <View style={[styles.approvalIconCircle, styles.bgPurpleLight]}>
                <FileText size={16} color="#8B5CF6" strokeWidth={2.2} />
              </View>
              <Text style={[styles.approvalTitle, textPrimary]}>Document Requests</Text>
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>3 pending</Text>
              </View>
              <Text style={styles.chevronIcon}>&gt;</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Upcoming Events Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, textPrimary]}>Upcoming Events</Text>
            <TouchableOpacity onPress={() => navigation.navigate('CalendarMain')}>
              <Text style={styles.viewAllLink}>View Calendar &gt;</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.listCard, cardTheme]}>
            {events.length > 0 ? (
              events.map((evt, idx) => {
                const d = evt.startDate ? new Date(evt.startDate) : new Date();
                const m = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
                const day = d.getDate();
                const timeStr = evt.allDay
                  ? 'All Day'
                  : `${new Date(evt.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • ${evt.location || 'Online'}`;
                return (
                  <React.Fragment key={evt.id || idx}>
                    <TouchableOpacity
                      style={styles.eventRow}
                      activeOpacity={0.7}
                      onPress={() => navigation.navigate('CalendarMain')}
                    >
                      <View style={styles.dateBox}>
                        <Text style={styles.dateBoxMonth}>{m}</Text>
                        <Text style={styles.dateBoxDay}>{day}</Text>
                      </View>
                      <View style={styles.eventDetails}>
                        <Text style={styles.eventTitle}>{evt.title}</Text>
                        <Text style={styles.eventMeta}>{timeStr}</Text>
                      </View>
                    </TouchableOpacity>
                    {idx < events.length - 1 && <View style={styles.rowDivider} />}
                  </React.Fragment>
                );
              })
            ) : (
              <TouchableOpacity
                style={styles.eventRow}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('CalendarMain')}
              >
                <View style={styles.dateBox}>
                  <Text style={styles.dateBoxMonth}>TODAY</Text>
                  <Text style={styles.dateBoxDay}>{new Date().getDate()}</Text>
                </View>
                <View style={styles.eventDetails}>
                  <Text style={styles.eventTitle}>No upcoming events scheduled</Text>
                  <Text style={styles.eventMeta}>Tap to add or view calendar</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* My Tasks Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, textPrimary]}>My Tasks</Text>
            <TouchableOpacity onPress={() => navigation.navigate('TodoList')}>
              <Text style={styles.viewAllLink}>View All &gt;</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.listCard, cardTheme]}>
            {tasks.map((task, idx) => (
              <React.Fragment key={task.id}>
                <TouchableOpacity
                  style={styles.taskRow}
                  activeOpacity={0.7}
                  onPress={() => toggleTask(task.id)}
                >
                  <View
                    style={[
                      styles.taskCheckbox,
                      task.completed && styles.taskCheckboxActive,
                    ]}
                  >
                    {task.completed && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                  </View>
                  <Text
                    style={[
                      styles.taskTitle,
                      task.completed && styles.taskTitleCompleted,
                    ]}
                  >
                    {task.title}
                  </Text>
                  <Text style={styles.taskOptionsDots}>•••</Text>
                </TouchableOpacity>
                {idx < tasks.length - 1 && <View style={styles.rowDivider} />}
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Recent Notifications Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, textPrimary]}>Recent Notifications</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
              <Text style={styles.viewAllLink}>View All &gt;</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.listCard, cardTheme]}>
            {recentNotifs.length > 0 ? (
              recentNotifs.map((notif, idx) => {
                const timeStr = notif.createdAt
                  ? new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : 'Recent';
                return (
                  <React.Fragment key={notif.id || idx}>
                    <TouchableOpacity
                      style={styles.notifRow}
                      onPress={() => navigation.navigate('Notifications')}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.notifIconCircle, styles.bgBlueLight]}>
                        <Users size={16} color="#3B82F6" strokeWidth={2.2} />
                      </View>
                      <View style={styles.notifDetails}>
                        <View style={styles.notifTopRow}>
                          <Text style={styles.notifTitle}>{notif.title}</Text>
                          <Text style={styles.notifTime}>{timeStr}</Text>
                        </View>
                        <Text style={styles.notifBody}>{notif.message}</Text>
                      </View>
                    </TouchableOpacity>
                    {idx < recentNotifs.length - 1 && <View style={styles.rowDivider} />}
                  </React.Fragment>
                );
              })
            ) : (
              <TouchableOpacity
                style={styles.notifRow}
                onPress={() => navigation.navigate('Notifications')}
                activeOpacity={0.7}
              >
                <View style={[styles.notifIconCircle, styles.bgBlueLight]}>
                  <Users size={16} color="#3B82F6" strokeWidth={2.2} />
                </View>
                <View style={styles.notifDetails}>
                  <View style={styles.notifTopRow}>
                    <Text style={styles.notifTitle}>All caught up!</Text>
                    <Text style={styles.notifTime}>Now</Text>
                  </View>
                  <Text style={styles.notifBody}>
                    No unread notifications at this time.
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Extra Bottom Spacing for Tab Bar */}
        <View style={styles.bottomSpacer} />
      </Animated.ScrollView>

      {/* Persistent Bottom Tab Bar (Pinned) */}
      <AppBottomNav activeRoute="HrAdminHome" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 48 : 24,
    paddingBottom: 12,
    paddingHorizontal: 18,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 36,
    height: 36,
    marginRight: 10,
  },
  brandTextCol: {
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  brandSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  bellIcon: {
    fontSize: 18,
  },
  unreadDot: {
    position: 'absolute',
    top: 8,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  profileBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#4F46E5',
    overflow: 'hidden',
    backgroundColor: '#EEF2FF',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  avatarInner: {
    flex: 1,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  heroBanner: {
    backgroundColor: '#4F46E5',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  skylineOverlay: {
    position: 'absolute',
    right: -20,
    bottom: -20,
    width: 180,
    height: 140,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 30,
    transform: [{ rotate: '15deg' }],
  },
  skylineBuilding1: {
    position: 'absolute',
    right: 40,
    bottom: 0,
    width: 36,
    height: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  skylineBuilding2: {
    position: 'absolute',
    right: 80,
    bottom: 0,
    width: 28,
    height: 65,
    backgroundColor: 'rgba(255, 255, 255, 0.09)',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  skylineBuilding3: {
    position: 'absolute',
    right: 12,
    bottom: 0,
    width: 24,
    height: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroTextCol: {
    flex: 1,
  },
  heroGreeting: {
    color: '#E0E7FF',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    color: '#C7D2FE',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  personaContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 18,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    width: (width - 44) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  statTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statIconPurple: {
    backgroundColor: '#EEF2FF',
  },
  statIconGreen: {
    backgroundColor: '#DCFCE7',
  },
  statIconRed: {
    backgroundColor: '#FEE2E2',
  },
  statIconOrange: {
    backgroundColor: '#FFEDD5',
  },
  statEmoji: {
    fontSize: 18,
  },
  statTrendGreen: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statTrendGreenText: {
    color: '#15803D',
    fontSize: 11,
    fontWeight: '700',
  },
  statTrendRed: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statTrendRedText: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '700',
  },
  statNumber: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  filterPill: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  filterPillText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  barChartContainer: {
    flexDirection: 'row',
    height: 160,
    alignItems: 'flex-end',
    paddingBottom: 6,
  },
  yAxisCol: {
    justifyContent: 'space-between',
    height: 120,
    paddingRight: 10,
    marginBottom: 24,
  },
  axisLabel: {
    fontSize: 10,
    color: '#94A3B8',
    textAlign: 'right',
  },
  barsArea: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: '100%',
  },
  barColumn: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
    width: 36,
  },
  tooltipBadge: {
    backgroundColor: '#1E1B4B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 6,
  },
  tooltipText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  barTrack: {
    width: 28,
    height: 110,
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
    backgroundColor: '#818CF8',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  barFillSelected: {
    backgroundColor: '#4F46E5',
  },
  dayLabel: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 8,
    fontWeight: '600',
  },
  dayLabelSelected: {
    color: '#4F46E5',
    fontWeight: '800',
  },
  dualCardRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  donutCard: {
    flex: 1.15,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  gaugeCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  donutContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  donutCircleWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutOuterRing: {
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 8,
    borderColor: '#3B82F6',
    borderTopColor: '#10B981',
    borderRightColor: '#F59E0B',
    borderBottomColor: '#EC4899',
    justifyContent: 'center',
    alignItems: 'center',
  },
  donutInnerCenter: {
    alignItems: 'center',
  },
  donutCenterNumber: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  donutCenterLabel: {
    fontSize: 9,
    color: '#64748B',
  },
  deptLegendCol: {
    flex: 1,
    marginLeft: 10,
    gap: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 4,
  },
  legendName: {
    fontSize: 10,
    color: '#475569',
    flex: 1,
  },
  legendPct: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0F172A',
  },
  halfGaugeWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  halfGaugeArc: {
    width: 86,
    height: 52,
    borderTopLeftRadius: 43,
    borderTopRightRadius: 43,
    borderWidth: 8,
    borderColor: '#10B981',
    borderLeftColor: '#3B82F6',
    borderRightColor: '#F59E0B',
    borderBottomWidth: 0,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  gaugeInnerCutout: {
    alignItems: 'center',
    marginBottom: 2,
  },
  gaugeCountNumber: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  gaugeCountLabel: {
    fontSize: 9,
    color: '#64748B',
  },
  leaveBreakdownGrid: {
    gap: 3,
  },
  leaveLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leaveLegendName: {
    fontSize: 10,
    color: '#475569',
    flex: 1,
    marginLeft: 4,
  },
  leaveLegendVal: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionContainer: {
    marginBottom: 16,
  },
  viewAllLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4F46E5',
  },
  listCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  approvalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  approvalIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  approvalTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    flex: 1,
  },
  pendingBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  pendingBadgeText: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '700',
  },
  chevronIcon: {
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: '600',
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  dateBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dateBoxMonth: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4F46E5',
    letterSpacing: 0.5,
  },
  dateBoxDay: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1E1B4B',
  },
  eventDetails: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  eventMeta: {
    fontSize: 11,
    color: '#64748B',
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  taskCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  taskCheckboxActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  taskCheckmark: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0F172A',
    flex: 1,
  },
  taskTitleCompleted: {
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  taskOptionsDots: {
    color: '#94A3B8',
    fontSize: 14,
    letterSpacing: 1,
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  notifIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notifDetails: {
    flex: 1,
  },
  notifTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  notifTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  notifTime: {
    fontSize: 11,
    color: '#94A3B8',
  },
  notifBody: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  bottomTabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'ios' ? 76 : 64,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 16 : 4,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 8,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    position: 'relative',
  },
  tabIcon: {
    fontSize: 20,
    color: '#94A3B8',
    marginBottom: 2,
  },
  tabIconActive: {
    color: '#4F46E5',
  },
  tabText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
  },
  tabTextActive: {
    color: '#4F46E5',
    fontWeight: '700',
  },
  activeTabIndicator: {
    position: 'absolute',
    bottom: 0,
    width: 24,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#4F46E5',
  },
  tabIconWrapper: {
    position: 'relative',
  },
  tabBadge: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    minWidth: 16,
    alignItems: 'center',
  },
  tabBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  dotBlue: {
    backgroundColor: '#3B82F6',
  },
  dotGreen: {
    backgroundColor: '#10B981',
  },
  dotAmber: {
    backgroundColor: '#F59E0B',
  },
  dotPurple: {
    backgroundColor: '#8B5CF6',
  },
  dotPink: {
    backgroundColor: '#EC4899',
  },
  dotRed: {
    backgroundColor: '#EF4444',
  },
  dotGray: {
    backgroundColor: '#94A3B8',
  },
  bgBlueLight: {
    backgroundColor: '#EEF2FF',
  },
  bgSkyLight: {
    backgroundColor: '#E0F2FE',
  },
  bgPurpleLight: {
    backgroundColor: '#F3E8FF',
  },
  bgAmberLight: {
    backgroundColor: '#FEF3C7',
  },
  emoji16: {
    fontSize: 16,
  },
  bottomSpacer: {
    height: 80,
  },
});
