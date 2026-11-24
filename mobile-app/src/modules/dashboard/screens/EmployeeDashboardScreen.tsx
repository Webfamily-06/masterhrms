import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Dimensions,
  Platform,
} from 'react-native';
import { Text } from '../../../components/common/Text';
import {
  Calendar,
  Umbrella,
  Receipt,
  Grid,
  Clock,
  CheckCircle2,
  Megaphone,
  CreditCard,
  DollarSign,
  PiggyBank,
  Users,
  Briefcase,
  Folder,
  Sliders,
  ChevronRight,
  ArrowRight,
  X,
  Bell,
  Hourglass,
  Moon,
  Sun,
  Flame,
  Target,
  Sparkles,
  TrendingUp,
} from 'lucide-react-native';
import { AppBottomNav } from '../../../components/common/AppBottomNav';
import { UserAvatar } from '../../../components/common/UserAvatar';
import { useAuthStore } from '../../../store/authStore';
import { useTenantStore } from '../../../store/tenantStore';
import { useTheme } from '../../../app/providers/ThemeProvider';
import { useCallStore } from '../../../store/callStore';
import { PersonaSwitcher } from '../../navigation/PersonaSwitcher';
import { AttendanceService, DashboardSummaryResponse } from '../../../core/services/attendanceService';
import { LeaveService, LeaveRequest } from '../../../core/services/leaveService';
import { EmployeeService, Announcement } from '../../../core/services/employeeService';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../../../types/navigation.types';
import { Config } from '../../../config/environment';

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

export const EmployeeDashboardScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<'EmployeeHome'>>();
  const user = useAuthStore((state) => state.user);
  const currentTenant = useTenantStore((state) => state.currentTenant);
  const { theme, toggleTheme } = useTheme();

  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<DashboardSummaryResponse>({});
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [punchLoading, setPunchLoading] = useState(false);
  const [widgetsSummary, setWidgetsSummary] = useState({
    attendanceStreakDays: 12,
    streakDelta: '+2 vs last wk',
    netPayFormatted: '₹85,000',
    financeDelta: '+4.2%',
    okrProgress: 78,
    okrRemainingMilestones: 2,
  });

  // Live timer for current clock
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('');
  const [currentDateStr, setCurrentDateStr] = useState<string>('');
  const [workingElapsedSec, setWorkingElapsedSec] = useState<number>(0);

  // Load dashboard, announcements, and recent leaves
  const loadData = useCallback(async () => {
    try {
      const [sumData, annData, leaveData, widData] = await Promise.all([
        AttendanceService.getDashboardSummary(),
        EmployeeService.getAnnouncements(),
        LeaveService.getMyRequests(),
        EmployeeService.getHomeWidgetsSummary(),
      ]);
      setSummary(sumData || {});
      setAnnouncements(annData || []);
      setLeaveRequests(leaveData || []);
      if (widData) setWidgetsSummary(widData);
    } catch {
      // Handled gracefully
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

  // Clock tick & elapsed timer
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Format: "Thursday, 12 Feb"
      const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'short' };
      setCurrentDateStr(now.toLocaleDateString('en-US', dateOptions));

      // Format: "08:32 AM"
      const timeOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: true };
      setCurrentTimeStr(now.toLocaleTimeString('en-US', timeOptions));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Calculate elapsed working time if checked in
  useEffect(() => {
    const checkInTime = summary.todayAttendance?.checkIn;
    const checkOutTime = summary.todayAttendance?.checkOut;

    if (checkInTime && !checkOutTime) {
      const startMs = new Date(checkInTime).getTime();
      const calcSec = () => Math.max(0, Math.floor((Date.now() - startMs) / 1000));
      setWorkingElapsedSec(calcSec());

      const timer = setInterval(() => {
        setWorkingElapsedSec(calcSec());
      }, 1000);
      return () => clearInterval(timer);
    } else {
      setWorkingElapsedSec(0);
      return undefined;
    }
  }, [summary.todayAttendance?.checkIn, summary.todayAttendance?.checkOut]);

  const formatElapsed = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const employeeName = user?.profile?.fullName || user?.email?.split('@')[0] || 'Sarah';
  const firstName = employeeName.split(' ')[0];

  const avatarUri = useMemo(
    () => normalizeAvatarUrl(user?.profile?.avatarUrl),
    [user?.profile?.avatarUrl]
  );

  // Attendance state determination (Matches 13, 14, 15, 16)
  const isCheckedIn = Boolean(summary.todayAttendance?.checkIn && !summary.todayAttendance?.checkOut);
  const isCheckedOut = Boolean(summary.todayAttendance?.checkIn && summary.todayAttendance?.checkOut);
  const isOnLeave = summary.todayAttendance?.status === 'ON_LEAVE';

  // Format check-in / check-out times for display
  const formatTimeOnly = (iso?: string | null) => {
    if (!iso) return '-:-';
    try {
      return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return '-:-';
    }
  };

  // Greeting
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  // Check In / Check Out Handler
  const handleTogglePunch = async () => {
    if (punchLoading) return;
    setPunchLoading(true);
    try {
      const type = isCheckedIn ? 'check_out' : 'check_in';
      await AttendanceService.punch({
        type,
        latitude: 13.0827,
        longitude: 80.2707,
        notes: `Mobile Check-${type === 'check_in' ? 'In' : 'Out'}`,
      });
      await loadData();
    } catch {
      // Handled
    } finally {
      setPunchLoading(false);
    }
  };

  const cardBgStyle = theme.isDark
    ? { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1 }
    : undefined;
  const textPrimaryStyle = theme.isDark ? { color: theme.colors.text } : undefined;
  const textSecondaryStyle = theme.isDark ? { color: theme.colors.textSecondary } : undefined;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Curved Deep Blue/Purple Gradient Header Banner */}
        <View style={[styles.headerCurvedBanner, theme.isDark && { backgroundColor: '#1E1B4B' }]}>
          <View style={styles.headerTopRow}>
            <View>
              <Text style={styles.headerDateText}>{currentDateStr || 'Today'}{currentTenant?.name ? ` • ${currentTenant.name}` : ''}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                <Text style={styles.headerGreeting}>
                  {isOnLeave ? `Relax & Recharge,` : `${timeGreeting},`}
                </Text>
              </View>
              <Text style={styles.headerName}>
                {firstName}
              </Text>
            </View>

            <View style={styles.headerRightActions}>
              <PersonaSwitcher />
              <TouchableOpacity
                style={styles.bellIconBtn}
                onPress={toggleTheme}
                accessibilityRole="button"
                accessibilityLabel="Toggle dark mode"
              >
                {theme.isDark ? (
                  <Sun size={18} color="#FBBF24" />
                ) : (
                  <Moon size={18} color="#FFFFFF" />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.bellIconBtn}
                onPress={() => navigation.navigate('Notifications')}
                accessibilityRole="button"
                accessibilityLabel="Notifications"
              >
                <Bell size={18} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => navigation.navigate('Profile')}
                style={styles.avatarWrap}
                accessibilityRole="button"
                accessibilityLabel="Profile"
              >
                <UserAvatar
                  entity={user}
                  uri={avatarUri}
                  name={employeeName}
                  email={user?.email}
                  size={44}
                  borderWidth={2}
                  borderColor="#FFFFFF"
                />
                <View style={styles.avatarActiveDot} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Floating Attendance Card (Matches 13, 14, 15, 16) */}
        <View style={[styles.attendanceCard, cardBgStyle]}>
          <View style={styles.cardTopRow}>
            <View>
              <Text style={[styles.currentTimeLabel, textSecondaryStyle]}>CURRENT TIME</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <Text style={[styles.currentTimeVal, textPrimaryStyle]}>{currentTimeStr.split(' ')[0] || '08:32'}</Text>
                <Text style={[styles.currentTimeAmPm, textSecondaryStyle]}> {currentTimeStr.split(' ')[1] || 'AM'}</Text>
              </View>
            </View>

            {/* Status Pill */}
            {isOnLeave ? (
              <View style={[styles.statusPill, styles.statusPillGray]}>
                <View style={[styles.statusPillDot, styles.dotGray]} />
                <Text style={styles.statusPillTextGray}>Checked Out</Text>
              </View>
            ) : isCheckedOut ? (
              <View style={[styles.statusPill, styles.statusPillGray]}>
                <View style={[styles.statusPillDot, styles.dotGray]} />
                <Text style={styles.statusPillTextGray}>Checked Out</Text>
              </View>
            ) : (
              <View style={[styles.statusPill, styles.statusPillGreen]}>
                <View style={[styles.statusPillDot, styles.dotGreen]} />
                <Text style={styles.statusPillTextGreen}>On Time</Text>
              </View>
            )}
          </View>

          {/* Schedule or Timer Row */}
          {isOnLeave ? (
            /* 16. Home – Leave/Off State */
            <View style={styles.leaveBox}>
              <Text style={styles.leaveBoxTitle}>You're off today</Text>
              <Text style={styles.leaveBoxSub}>Enjoy your time away</Text>
              <View style={styles.leaveBoxDivider} />
              <View style={styles.leaveBoxRow}>
                <Text style={styles.leaveBoxLabel}>Status</Text>
                <View style={styles.leaveBoxBadge}>
                  <Text style={styles.leaveBoxBadgeText}>Annual Leave</Text>
                </View>
              </View>
              <View style={styles.leaveBoxRow}>
                <Text style={styles.leaveBoxLabel}>Back on</Text>
                <Text style={styles.leaveBoxValue}>Mon, 28 Feb</Text>
              </View>
            </View>
          ) : isCheckedOut ? (
            /* 15. Home – Checked Out State */
            <View style={styles.checkedOutBox}>
              <View style={styles.checkedOutBoxHeader}>
                <Text style={styles.checkedOutBoxLabel}>TOTAL HOURS</Text>
                <Hourglass size={18} color="#4F46E5" />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 4 }}>
                <Text style={styles.checkedOutBigHrs}>08</Text>
                <Text style={styles.checkedOutUnit}>h </Text>
                <Text style={styles.checkedOutBigHrs}>15</Text>
                <Text style={styles.checkedOutUnit}>m</Text>
              </View>
              <Text style={styles.checkedOutSubText}>Great job today! You've met your daily goal.</Text>
            </View>
          ) : isCheckedIn ? (
            /* 14. Home – Checked In (Working) State */
            <View style={styles.timerRow}>
              <Clock size={16} color="#16A34A" />
              <Text style={styles.workingTimerText}> {formatElapsed(workingElapsedSec)} </Text>
              <Text style={styles.scheduleText}>Working Time</Text>
            </View>
          ) : (
            /* 13. Home – Default (Not Checked In) State */
            <View style={styles.timerRow}>
              <Clock size={16} color="#2563EB" />
              <Text style={styles.scheduleText}>
                {summary.shift ? ` ${summary.shift.startTime} - ${summary.shift.endTime} Work Schedule` : ' 09:00 - 17:00 Work Schedule'}
              </Text>
            </View>
          )}

          {/* Slide/Tap Action Button (Hidden if On Leave or Checked Out) */}
          {!isOnLeave && !isCheckedOut && (
            <TouchableOpacity
              style={[styles.punchSliderBtn, isCheckedIn ? styles.punchBtnRed : styles.punchBtnBlue]}
              onPress={handleTogglePunch}
              activeOpacity={0.88}
              disabled={punchLoading}
            >
              <View style={styles.punchBtnIconCircle}>
                <ArrowRight size={18} color="#FFFFFF" strokeWidth={2.6} />
              </View>
              <Text style={styles.punchBtnLabel}>
                {isCheckedIn ? 'Slide to Check Out' : 'Slide to Check In'}
              </Text>
              <ChevronRight size={18} color="#FFFFFF" strokeWidth={2.4} style={{ opacity: 0.8 }} />
            </TouchableOpacity>
          )}

          {/* Current Status Text */}
          {!isOnLeave && (
            <View style={styles.currentStatusRow}>
              <Text style={styles.currentStatusPrefix}>You're Currently: </Text>
              <Text style={[styles.currentStatusVal, isCheckedIn && { color: '#16A34A' }]}>
                {isCheckedIn ? 'Working' : 'Checked Out'}
              </Text>
            </View>
          )}

          {/* Check In / Check Out Timestamp Columns */}
          <View style={styles.punchSplitRow}>
            <View style={styles.punchCol}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <View style={[styles.arrowCircleSmall, { backgroundColor: '#DCFCE7' }]}>
                  <ArrowRight size={12} color="#16A34A" strokeWidth={2.4} />
                </View>
                <Text style={styles.punchColLabel}>Check In</Text>
              </View>
              <Text style={styles.punchColTime}>
                {formatTimeOnly(summary.todayAttendance?.checkIn)}
              </Text>
            </View>

            <View style={styles.punchColDivider} />

            <View style={styles.punchCol}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <View style={[styles.arrowCircleSmall, { backgroundColor: '#FEE2E2' }]}>
                  <ArrowRight size={12} color="#EF4444" strokeWidth={2.4} style={{ transform: [{ rotate: '180deg' }] }} />
                </View>
                <Text style={styles.punchColLabel}>Check Out</Text>
              </View>
              <Text style={styles.punchColTime}>
                {formatTimeOnly(summary.todayAttendance?.checkOut)}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Actions (4-pack matching 13. Home - Default.png) */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, textPrimaryStyle]}>Quick Actions</Text>
        </View>
        <View style={styles.quickActionsRow}>
          {/* Attendance */}
          <TouchableOpacity
            style={styles.quickActionItem}
            onPress={() => navigation.navigate('AttendanceDetail')}
            accessibilityRole="button"
            accessibilityLabel="Attendance"
          >
            <View style={[styles.quickActionIconBox, { backgroundColor: theme.isDark ? '#1E293B' : '#EFF6FF' }]}>
              <Calendar size={24} color="#2563EB" />
            </View>
            <Text style={[styles.quickActionLabel, textPrimaryStyle]}>Attendance</Text>
          </TouchableOpacity>

          {/* Leave */}
          <TouchableOpacity
            style={styles.quickActionItem}
            onPress={() => navigation.navigate('LeaveDetail')}
            accessibilityRole="button"
            accessibilityLabel="Leave"
          >
            <View style={[styles.quickActionIconBox, { backgroundColor: theme.isDark ? '#1E293B' : '#FFF7ED' }]}>
              <Umbrella size={24} color="#F97316" />
            </View>
            <Text style={[styles.quickActionLabel, textPrimaryStyle]}>Leave</Text>
          </TouchableOpacity>

          {/* Payslip */}
          <TouchableOpacity
            style={styles.quickActionItem}
            onPress={() => navigation.navigate('Payslips')}
            accessibilityRole="button"
            accessibilityLabel="Payslip"
          >
            <View style={[styles.quickActionIconBox, { backgroundColor: theme.isDark ? '#1E293B' : '#ECFDF5' }]}>
              <Receipt size={24} color="#10B981" />
            </View>
            <Text style={[styles.quickActionLabel, textPrimaryStyle]}>Payslip</Text>
          </TouchableOpacity>

          {/* More */}
          <TouchableOpacity
            style={styles.quickActionItem}
            onPress={() => setShortcutsOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="More Shortcuts"
          >
            <View style={[styles.quickActionIconBox, { backgroundColor: theme.isDark ? '#1E293B' : '#F1F5F9' }]}>
              <Grid size={24} color={theme.isDark ? '#94A3B8' : '#64748B'} />
            </View>
            <Text style={[styles.quickActionLabel, textPrimaryStyle]}>More</Text>
          </TouchableOpacity>
        </View>

        {/* Smart Widgets & Dynamic Island Hub (Matches Widget/Finance & Dynamic Iland/) */}
        <View style={[styles.sectionHeaderRow, { marginTop: 22 }]}>
          <Text style={[styles.sectionTitle, textPrimaryStyle]}>Live Widgets & Dynamic Island</Text>
          <TouchableOpacity onPress={() => navigation.navigate('PaymentCards')}>
            <Text style={styles.viewAllLink}>All Widgets</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.widgetsRow}>
          <TouchableOpacity
            style={[styles.smallHomeWidget, cardBgStyle]}
            activeOpacity={0.85}
            onPress={() =>
              useCallStore.getState().showDynamicIsland({
                type: 'daily_streak',
                title: 'Daily Streak',
                subtitle: `${widgetsSummary.attendanceStreakDays} Days On-Time Attendance`,
                metricValue: `${widgetsSummary.attendanceStreakDays}d`,
                metricDelta: widgetsSummary.streakDelta,
                progress: Math.min(100, widgetsSummary.attendanceStreakDays * 7),
                mode: 'expanded',
                targetRoute: 'AttendanceDetail',
              })
            }
          >
            <View style={styles.widgetTopMeta}>
              <View style={[styles.widgetMiniIcon, { backgroundColor: '#FFF7ED' }]}>
                <Flame size={15} color="#EA580C" />
              </View>
              <Text style={styles.widgetPinText}>Pin</Text>
            </View>
            <Text style={[styles.widgetBigNum, textPrimaryStyle]}>{widgetsSummary.attendanceStreakDays} Days</Text>
            <Text style={[styles.widgetSubLabel, textSecondaryStyle]}>Attendance Streak</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.smallHomeWidget, { backgroundColor: '#0F172A', borderColor: '#1E293B' }]}
            activeOpacity={0.85}
            onPress={() =>
              useCallStore.getState().showDynamicIsland({
                type: 'finance_statistic',
                title: 'Finance Statistic',
                subtitle: 'Latest Net Pay & Claims',
                metricValue: widgetsSummary.netPayFormatted,
                metricDelta: widgetsSummary.financeDelta,
                progress: 74,
                mode: 'expanded',
                targetRoute: 'PaymentCards',
              })
            }
          >
            <View style={styles.widgetTopMeta}>
              <View style={[styles.widgetMiniIcon, { backgroundColor: 'rgba(52,211,153,0.16)' }]}>
                <TrendingUp size={15} color="#34D399" />
              </View>
              <Text style={[styles.widgetPinText, { color: '#34D399' }]}>{widgetsSummary.financeDelta}</Text>
            </View>
            <Text style={[styles.widgetBigNum, { color: '#FFFFFF' }]}>{widgetsSummary.netPayFormatted}</Text>
            <Text style={[styles.widgetSubLabel, { color: '#94A3B8' }]}>Finance Widget</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.mediumGoalWidget, cardBgStyle]}>
          <View style={styles.mediumGoalTop}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={[styles.widgetMiniIcon, { backgroundColor: '#EEF2FF' }]}>
                <Target size={15} color="#4F46E5" />
              </View>
              <View>
                <Text style={[styles.mediumGoalTitle, textPrimaryStyle]}>Q4 OKR Goal Progress</Text>
                <Text style={[styles.widgetSubLabel, textSecondaryStyle]}>
                  {widgetsSummary.okrProgress}% completed • {widgetsSummary.okrRemainingMilestones} milestones left
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.islandQuickBtn}
              onPress={() =>
                useCallStore.getState().showDynamicIsland({
                  type: 'timer',
                  title: 'Shift Focus Timer',
                  subtitle: 'Active Work Session',
                  progress: widgetsSummary.okrProgress,
                  mode: 'compact',
                  targetRoute: 'Timesheet',
                })
              }
            >
              <Sparkles size={12} color="#FBBF24" />
              <Text style={styles.islandQuickBtnText}>Start Island</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.goalBarTrack}>
            <View style={[styles.goalBarFill, { width: `${widgetsSummary.okrProgress}%` }]} />
          </View>
        </View>

        {/* Recent Updates (Matches 13. Home - Default.png and 18. Home – Notification Preview.png) */}
        <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
          <Text style={[styles.sectionTitle, textPrimaryStyle]}>Recent Updates</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
            <Text style={styles.viewAllLink}>View All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.updatesList}>
          {/* Recent Leave Status Item */}
          {leaveRequests.length > 0 ? (
            leaveRequests.slice(0, 1).map((lr) => (
              <TouchableOpacity
                key={lr.id}
                style={[styles.updateCard, cardBgStyle]}
                onPress={() => navigation.navigate('LeaveDetail')}
              >
                <View style={[styles.updateIconCircle, { backgroundColor: '#DCFCE7' }]}>
                  <CheckCircle2 size={20} color="#16A34A" />
                </View>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={[styles.updateTitle, textPrimaryStyle]}>
                    {lr.status === 'APPROVED' ? 'Leave Request Approved' : 'Leave Request Submitted'}
                  </Text>
                  <Text style={[styles.updateSnippet, textSecondaryStyle]} numberOfLines={1}>
                    {lr.reason || `Your leave starting ${lr.startDate} is ${lr.status.toLowerCase()}`}
                  </Text>
                </View>
                <Text style={styles.updateTime}>1h ago</Text>
              </TouchableOpacity>
            ))
          ) : (
            <TouchableOpacity
              style={[styles.updateCard, cardBgStyle]}
              onPress={() => navigation.navigate('LeaveDetail')}
            >
              <View style={[styles.updateIconCircle, { backgroundColor: '#DCFCE7' }]}>
                <CheckCircle2 size={20} color="#16A34A" />
              </View>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={[styles.updateTitle, textPrimaryStyle]}>Leave Request Approved</Text>
                <Text style={[styles.updateSnippet, textSecondaryStyle]} numberOfLines={1}>
                  Your annual leave for next month has been approved.
                </Text>
              </View>
              <Text style={styles.updateTime}>1h ago</Text>
            </TouchableOpacity>
          )}

          {/* Office Announcement Item */}
          {announcements.length > 0 ? (
            announcements.slice(0, 1).map((ann) => (
              <TouchableOpacity
                key={ann.id}
                style={[styles.updateCard, cardBgStyle]}
                onPress={() => navigation.navigate('Notifications')}
              >
                <View style={[styles.updateIconCircle, { backgroundColor: '#EFF6FF' }]}>
                  <Megaphone size={20} color="#2563EB" />
                </View>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={[styles.updateTitle, textPrimaryStyle]}>{ann.title || 'Office Announcement'}</Text>
                  <Text style={[styles.updateSnippet, textSecondaryStyle]} numberOfLines={1}>
                    {ann.content || 'Office will be closed this Friday for maintenance.'}
                  </Text>
                </View>
                <Text style={styles.updateTime}>2h ago</Text>
              </TouchableOpacity>
            ))
          ) : (
            <TouchableOpacity
              style={[styles.updateCard, cardBgStyle]}
              onPress={() => navigation.navigate('Notifications')}
            >
              <View style={[styles.updateIconCircle, { backgroundColor: '#EFF6FF' }]}>
                <Megaphone size={20} color="#2563EB" />
              </View>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={[styles.updateTitle, textPrimaryStyle]}>Office Announcement</Text>
                <Text style={[styles.updateSnippet, textSecondaryStyle]} numberOfLines={1}>
                  Office will be closed this Friday for system upgrades.
                </Text>
              </View>
              <Text style={styles.updateTime}>2h ago</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Shortcuts Bottom Sheet Modal (Matches 17. Home – Shortcut Expanded.png) */}
      <Modal visible={shortcutsOpen} animationType="slide" transparent onRequestClose={() => setShortcutsOpen(false)}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShortcutsOpen(false)}
        >
          <View style={styles.shortcutsSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.sheetHandleBar} />
            <View style={styles.shortcutsHeader}>
              <Text style={styles.shortcutsTitle}>Shortcuts</Text>
              <TouchableOpacity onPress={() => setShortcutsOpen(false)} style={styles.shortcutsCloseBtn}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 520 }}>
              {/* TIME MANAGEMENT */}
              <Text style={styles.categoryTitle}>TIME MANAGEMENT</Text>
              <View style={styles.shortcutsGrid}>
                <TouchableOpacity
                  style={styles.shortcutItem}
                  onPress={() => { setShortcutsOpen(false); navigation.navigate('AttendanceDetail'); }}
                >
                  <View style={[styles.shortcutCircle, { backgroundColor: '#EFF6FF' }]}>
                    <Calendar size={22} color="#2563EB" />
                  </View>
                  <Text style={styles.shortcutLabel}>Attendance</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.shortcutItem}
                  onPress={() => { setShortcutsOpen(false); navigation.navigate('LeaveDetail'); }}
                >
                  <View style={[styles.shortcutCircle, { backgroundColor: '#FFF7ED' }]}>
                    <Umbrella size={22} color="#F97316" />
                  </View>
                  <Text style={styles.shortcutLabel}>Leave</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.shortcutItem}
                  onPress={() => { setShortcutsOpen(false); navigation.navigate('ShiftSchedule'); }}
                >
                  <View style={[styles.shortcutCircle, { backgroundColor: '#F3E8FF' }]}>
                    <Clock size={22} color="#8B5CF6" />
                  </View>
                  <Text style={styles.shortcutLabel}>Overtime</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.shortcutItem}
                  onPress={() => { setShortcutsOpen(false); navigation.navigate('ShiftSchedule'); }}
                >
                  <View style={[styles.shortcutCircle, { backgroundColor: '#F0F9FF' }]}>
                    <Moon size={22} color="#0EA5E9" />
                  </View>
                  <Text style={styles.shortcutLabel}>Shift</Text>
                </TouchableOpacity>
              </View>

              {/* FINANCE */}
              <Text style={styles.categoryTitle}>FINANCE</Text>
              <View style={styles.shortcutsGrid}>
                <TouchableOpacity
                  style={styles.shortcutItem}
                  onPress={() => { setShortcutsOpen(false); navigation.navigate('Payslips'); }}
                >
                  <View style={[styles.shortcutCircle, { backgroundColor: '#ECFDF5' }]}>
                    <Receipt size={22} color="#10B981" />
                  </View>
                  <Text style={styles.shortcutLabel}>Payslip</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.shortcutItem}
                  onPress={() => { setShortcutsOpen(false); navigation.navigate('ExpenseClaims'); }}
                >
                  <View style={[styles.shortcutCircle, { backgroundColor: '#ECFEFF' }]}>
                    <CreditCard size={22} color="#06B6D4" />
                  </View>
                  <Text style={styles.shortcutLabel}>Reimburse</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.shortcutItem}
                  onPress={() => { setShortcutsOpen(false); navigation.navigate('SalaryAdvanceLoan'); }}
                >
                  <View style={[styles.shortcutCircle, { backgroundColor: '#F5F3FF' }]}>
                    <DollarSign size={22} color="#8B5CF6" />
                  </View>
                  <Text style={styles.shortcutLabel}>Loan</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.shortcutItem}
                  onPress={() => { setShortcutsOpen(false); navigation.navigate('Payslips'); }}
                >
                  <View style={[styles.shortcutCircle, { backgroundColor: '#ECFDF5' }]}>
                    <PiggyBank size={22} color="#059669" />
                  </View>
                  <Text style={styles.shortcutLabel}>Tax</Text>
                </TouchableOpacity>
              </View>

              {/* REQUESTS & GENERAL */}
              <Text style={styles.categoryTitle}>REQUESTS & GENERAL</Text>
              <View style={styles.shortcutsGrid}>
                <TouchableOpacity
                  style={styles.shortcutItem}
                  onPress={() => { setShortcutsOpen(false); navigation.navigate('EmployeeDirectory'); }}
                >
                  <View style={[styles.shortcutCircle, { backgroundColor: '#FCE7F3' }]}>
                    <Users size={22} color="#EC4899" />
                  </View>
                  <Text style={styles.shortcutLabel}>Team</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.shortcutItem}
                  onPress={() => { setShortcutsOpen(false); navigation.navigate('DocumentsVault'); }}
                >
                  <View style={[styles.shortcutCircle, { backgroundColor: '#FEF9C3' }]}>
                    <Briefcase size={22} color="#EAB308" />
                  </View>
                  <Text style={styles.shortcutLabel}>Assets</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.shortcutItem}
                  onPress={() => { setShortcutsOpen(false); navigation.navigate('DocumentsVault'); }}
                >
                  <View style={[styles.shortcutCircle, { backgroundColor: '#E0F2FE' }]}>
                    <Folder size={22} color="#06B6D4" />
                  </View>
                  <Text style={styles.shortcutLabel}>Docs</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.shortcutItem}
                  onPress={() => { setShortcutsOpen(false); navigation.navigate('Settings'); }}
                >
                  <View style={[styles.shortcutCircle, { backgroundColor: '#F1F5F9' }]}>
                    <Sliders size={22} color="#475569" />
                  </View>
                  <Text style={styles.shortcutLabel}>Manage</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Persistent Bottom Nav */}
      <AppBottomNav activeRoute="EmployeeHome" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingBottom: 24,
  },

  /* Curved Header Banner */
  headerCurvedBanner: {
    backgroundColor: '#4338CA',
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    paddingTop: Platform.OS === 'ios' ? 54 : 44,
    paddingBottom: 70,
    paddingHorizontal: 20,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerDateText: {
    color: '#C7D2FE',
    fontSize: 13,
    fontWeight: '500',
  },
  headerGreeting: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
  },
  headerName: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    marginTop: 2,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bellIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarWrap: {
    position: 'relative',
  },
  avatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3B82F6',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarFallbackText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  avatarActiveDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },

  /* Floating Attendance Card (13, 14, 15, 16) */
  attendanceCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: -48,
    borderRadius: 24,
    padding: 20,
    shadowColor: '#1E1B4B',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  currentTimeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  currentTimeVal: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0F172A',
  },
  currentTimeAmPm: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusPillGreen: {
    backgroundColor: '#DCFCE7',
  },
  statusPillGray: {
    backgroundColor: '#F1F5F9',
  },
  statusPillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  dotGreen: {
    backgroundColor: '#16A34A',
  },
  dotGray: {
    backgroundColor: '#64748B',
  },
  statusPillTextGreen: {
    fontSize: 12,
    fontWeight: '600',
    color: '#16A34A',
  },
  statusPillTextGray: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  workingTimerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#16A34A',
  },
  scheduleText: {
    fontSize: 13,
    color: '#64748B',
  },

  /* Punch Button */
  punchSliderBtn: {
    height: 52,
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  punchBtnBlue: {
    backgroundColor: '#2563EB',
    shadowColor: '#2563EB',
  },
  punchBtnRed: {
    backgroundColor: '#DC2626',
    shadowColor: '#DC2626',
  },
  punchBtnIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  punchBtnLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  /* Status and Timestamps */
  currentStatusRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 16,
  },
  currentStatusPrefix: {
    fontSize: 13,
    color: '#64748B',
  },
  currentStatusVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  punchSplitRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 16,
  },
  punchCol: {
    flex: 1,
    alignItems: 'center',
  },
  arrowCircleSmall: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  punchColLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  punchColTime: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  punchColDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#F1F5F9',
  },

  /* Leave State (16) */
  leaveBox: {
    backgroundColor: '#6366F1',
    borderRadius: 18,
    padding: 16,
    marginVertical: 12,
  },
  leaveBoxTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  leaveBoxSub: {
    color: '#E0E7FF',
    fontSize: 12,
    marginTop: 2,
  },
  leaveBoxDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: 12,
  },
  leaveBoxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 3,
  },
  leaveBoxLabel: {
    color: '#E0E7FF',
    fontSize: 13,
  },
  leaveBoxBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  leaveBoxBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  leaveBoxValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  /* Checked Out State Box (15) */
  checkedOutBox: {
    backgroundColor: '#EEF2FF',
    borderRadius: 18,
    padding: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  checkedOutBoxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  checkedOutBoxLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4F46E5',
    letterSpacing: 0.5,
  },
  checkedOutBigHrs: {
    fontSize: 30,
    fontWeight: '800',
    color: '#0F172A',
  },
  checkedOutUnit: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748B',
    marginRight: 6,
  },
  checkedOutSubText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },

  /* Quick Actions (4-pack) */
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  viewAllLink: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  quickActionItem: {
    alignItems: 'center',
    width: (width - 40 - 36) / 4,
  },
  quickActionIconBox: {
    width: 60,
    height: 60,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },

  /* Updates List (13 & 18) */
  updatesList: {
    paddingHorizontal: 20,
    gap: 12,
  },
  updateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  updateIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  updateTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  updateSnippet: {
    fontSize: 12,
    color: '#64748B',
  },
  updateTime: {
    fontSize: 11,
    color: '#94A3B8',
  },

  /* Shortcuts Sheet Modal (17) */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  shortcutsSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  sheetHandleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 16,
  },
  shortcutsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  shortcutsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  shortcutsCloseBtn: {
    padding: 4,
  },
  categoryTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 12,
  },
  shortcutsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  shortcutItem: {
    width: (width - 40 - 42) / 4,
    alignItems: 'center',
    marginBottom: 12,
  },
  shortcutCircle: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  shortcutLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center',
  },
  widgetsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  smallHomeWidget: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  widgetTopMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  widgetMiniIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  widgetPinText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#2563EB',
  },
  widgetBigNum: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  widgetSubLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  mediumGoalWidget: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  mediumGoalTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mediumGoalTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  islandQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#020617',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  islandQuickBtnText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '700',
  },
  goalBarTrack: {
    height: 7,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  goalBarFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#4F46E5',
  },
});
