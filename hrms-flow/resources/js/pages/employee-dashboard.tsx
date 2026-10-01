import React, { useState, useEffect } from 'react';
import { PageTemplate } from '@/components/page-template';
import {
  RefreshCw, Bell, Users, Trophy, AlertTriangle, MessageSquareWarning,
  Clock, ChevronRight, ArrowUpRight, LogIn, LogOut,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import { usePage, router, Link } from '@inertiajs/react';
import { toast } from '@/components/custom-toast';
import { hasPermission } from '@/utils/authorization';
import UserInitials from '@/components/user-initials';

interface EmployeeDashboardData {
  stats: {
    totalAwards: number;
    totalWarnings: number;
    totalComplaints: number;
  };
  recentActivities: {
    announcements: Array<any>;
    meetings: Array<any>;
  };
  shifts: Array<any>;
  attendancePolicies: Array<any>;
  todayAttendance: any;
  currentTime: string;
  employeeShift: any;
  userType: string;
}

export default function EmployeeDashboard({ dashboardData }: { dashboardData: EmployeeDashboardData }) {
  const { t } = useTranslation();
  const { auth } = usePage().props as any;
  const permissions = auth?.permissions || [];
  const [mounted, setMounted] = useState(false);
  const [primaryColor, setPrimaryColor] = useState('#3b82f6');
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [clockInTime, setClockInTime] = useState<string | null>(null);
  const [clockOutTime, setClockOutTime] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const raw = getComputedStyle(document.documentElement).getPropertyValue('--theme-color').trim();
    if (raw) setPrimaryColor(raw);

    const attendance = dashboardData?.todayAttendance;
    if (attendance) {
      if (attendance.clock_in) {
        setClockInTime(window.appSettings?.formatTime(attendance.clock_in) || attendance.clock_in);
        setIsClockedIn(!attendance.clock_out);
      } else {
        setClockInTime(null);
        setIsClockedIn(false);
      }
      if (attendance.clock_out) {
        setClockOutTime(window.appSettings?.formatTime(attendance.clock_out) || attendance.clock_out);
      } else {
        setClockOutTime(null);
      }
    } else {
      setClockInTime(null);
      setClockOutTime(null);
      setIsClockedIn(false);
    }

    const checkAutoClockOut = () => {
      const shift = dashboardData?.employeeShift;
      const att = dashboardData?.todayAttendance;
      if (shift && att?.clock_in && !att?.clock_out && isClockedIn) {
        const currentTimezone = window.appSettings?.timezone || 'UTC';
        try {
          const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: currentTimezone,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hourCycle: 'h23',
          });
          const parts = formatter.formatToParts(new Date());
          const h = parts.find(p => p.type === 'hour')?.value || '00';
          const m = parts.find(p => p.type === 'minute')?.value || '00';
          const s = parts.find(p => p.type === 'second')?.value || '00';

          const shiftEnd = new Date(`1970-01-01T${shift.end_time}`);
          const cur = new Date(`1970-01-01T${h}:${m}:${s}`);
          if (cur > shiftEnd) window.location.reload();
        } catch (e) {
          console.error('Error in checkAutoClockOut timezone format:', e);
        }
      }
    };
    const interval = setInterval(checkAutoClockOut, 60000);
    return () => clearInterval(interval);
  }, [dashboardData, isClockedIn]);

  const handleClockIn = () => {
    toast.loading(t('Clocking in...'));
    router.post(route('hr.attendance.clock-in'), { employee_id: auth.user.id }, {
      onSuccess: (page) => {
        toast.dismiss();
        if (page.props.flash?.success) {
          const att = (page.props as any).dashboardData?.todayAttendance;
          if (att) {
            setIsClockedIn(!att.clock_out);
            if (att.clock_in) {
              setClockInTime(window.appSettings?.formatTime(att.clock_in) || att.clock_in);
            }
          }
          toast.success(t(page.props.flash.success));
        } else {
          toast.error(t(page.props.flash?.error || 'Failed to clock in'));
        }
      },
      onError: (errors: any, page: any) => {
        toast.dismiss();
        if (page?.props?.flash?.error) toast.error(t(page.props.flash.error));
        else toast.error(t('Failed to clock in. Please try again.'));
      },
    });
  };

  const handleClockOut = () => {
    toast.loading(t('Clocking out...'));
    router.post(route('hr.attendance.clock-out'), { employee_id: auth.user.id }, {
      onSuccess: (page) => {
        toast.dismiss();
        if (page.props.flash?.success) {
          setIsClockedIn(false);
          const att = (page.props as any).dashboardData?.todayAttendance;
          if (att && att.clock_out) {
            setClockOutTime(window.appSettings?.formatTime(att.clock_out) || att.clock_out);
          }
          toast.success(t(page.props.flash.success));
        } else {
          toast.error(t(page.props.flash?.error || 'Failed to clock out'));
        }
      },
      onError: (errors: any, page: any) => {
        toast.dismiss();
        if (page?.props?.flash?.error) toast.error(t(page.props.flash.error));
        else toast.error(t('Failed to clock out. Please try again.'));
      },
    });
  };

  const pageActions = [
    {
      label: t('Refresh'),
      icon: <RefreshCw className="h-4 w-4" />,
      variant: 'outline' as const,
      onClick: () => window.location.reload(),
    },
  ];

  const stats = dashboardData?.stats || { totalAwards: 0, totalWarnings: 0, totalComplaints: 0 };
  const recentActivities = dashboardData?.recentActivities || { announcements: [], meetings: [] };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return t('Good morning');
    if (h < 17) return t('Good afternoon');
    return t('Good evening');
  };

  const fadeUp = (delay = 0) =>
    `transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`
    + (delay ? ` delay-${delay}` : '');

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      approved: 'bg-green-50 text-green-700 ring-green-600/20',
      pending: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
      rejected: 'bg-red-50 text-red-700 ring-red-600/20',
      Scheduled: 'bg-blue-50 text-blue-700 ring-blue-600/20',
      'In Progress': 'bg-yellow-50 text-yellow-800 ring-yellow-600/20',
      Completed: 'bg-green-50 text-green-700 ring-green-600/20',
      Cancelled: 'bg-red-50 text-red-700 ring-red-600/10',
    };
    return colors[status] || 'bg-gray-50 text-gray-700 ring-gray-600/20';
  };

  return (
    <PageTemplate
      title={t('Dashboard')}
      url="/dashboard"
      actions={pageActions}
      description={t('Your personal overview — attendance, announcements and meetings.')}
    >
      <style>{`
        @keyframes waterWave {
          0%   { transform: translateX(0); }
          50%  { transform: translateX(-25%); }
          100% { transform: translateX(0); }
        }
        .animate-water-wave-1 { animation: waterWave 4s ease-in-out infinite; will-change: transform; }
        .animate-water-wave-2 { animation: waterWave 6s ease-in-out infinite reverse; will-change: transform; }
        .animate-water-wave-3 { animation: waterWave 8s ease-in-out infinite; will-change: transform; }
        @keyframes handWave {
          0%   { transform: rotate(0deg); }
          10%  { transform: rotate(18deg); }
          20%  { transform: rotate(-8deg); }
          30%  { transform: rotate(18deg); }
          40%  { transform: rotate(-4deg); }
          50%  { transform: rotate(12deg); }
          60%  { transform: rotate(0deg); }
          100% { transform: rotate(0deg); }
        }
        .animate-hand-wave { animation: handWave 2.2s ease-in-out infinite; transform-origin: 70% 70%; display: inline-block; }
      `}</style>
      <div className="space-y-6">

        {/* ── Greeting Banner ── */}
        <div className={`group relative overflow-hidden rounded-2xl bg-slate-800 dark:bg-slate-900 px-6 py-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between ${fadeUp(0)}`}>
          {/* bg orbs */}
          <span className="pointer-events-none absolute -top-10 -left-10 w-48 h-48 rounded-full bg-emerald-500/10 blur-2xl animate-pulse" style={{ animationDuration: '4s' }} />
          <span className="pointer-events-none absolute -bottom-10 right-0 w-56 h-56 rounded-full bg-blue-500/10 blur-2xl animate-pulse" style={{ animationDuration: '5s', animationDelay: '1.5s' }} />
          <span className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full bg-violet-500/5 blur-2xl animate-pulse" style={{ animationDuration: '6s', animationDelay: '0.8s' }} />
          {/* glowing dots */}
          <span className="pointer-events-none absolute top-4 left-1/3 w-1.5 h-1.5 rounded-full bg-emerald-400/80 shadow-[0_0_6px_2px_rgba(52,211,153,0.6)] animate-ping" style={{ animationDuration: '3s' }} />
          <span className="pointer-events-none absolute bottom-4 left-1/4 w-1 h-1 rounded-full bg-blue-400/70 shadow-[0_0_4px_2px_rgba(96,165,250,0.5)] animate-ping" style={{ animationDuration: '4s', animationDelay: '1s' }} />
          <span className="pointer-events-none absolute top-3 right-1/4 w-1.5 h-1.5 rounded-full bg-violet-400/70 shadow-[0_0_6px_2px_rgba(167,139,250,0.5)] animate-ping" style={{ animationDuration: '3.5s', animationDelay: '0.5s' }} />
          <span className="pointer-events-none absolute bottom-3 right-1/3 w-1 h-1 rounded-full bg-emerald-300/80 shadow-[0_0_4px_2px_rgba(110,231,183,0.5)] animate-ping" style={{ animationDuration: '2.8s', animationDelay: '1.8s' }} />
          {/* water wave layers at bottom */}
          <div className="pointer-events-none absolute bottom-0 left-0 w-full overflow-hidden" style={{ height: '40px' }}>
            <div className="absolute bottom-0 left-0 w-[200%] animate-water-wave-1">
              <svg viewBox="0 0 2400 40" preserveAspectRatio="none" className="w-full h-[40px]">
                <path fill="rgba(52,211,153,0.12)" d="M0,20 C150,38 350,0 600,20 C850,38 1050,0 1200,20 C1350,38 1550,0 1800,20 C2050,38 2250,0 2400,20 L2400,40 L0,40 Z" />
              </svg>
            </div>
            <div className="absolute bottom-0 left-0 w-[200%] animate-water-wave-2">
              <svg viewBox="0 0 2400 40" preserveAspectRatio="none" className="w-full h-[40px]">
                <path fill="rgba(96,165,250,0.09)" d="M0,26 C200,10 400,38 600,22 C800,8 1000,36 1200,24 C1400,10 1600,38 1800,22 C2000,8 2200,36 2400,24 L2400,40 L0,40 Z" />
              </svg>
            </div>
            <div className="absolute bottom-0 left-0 w-[200%] animate-water-wave-3">
              <svg viewBox="0 0 2400 40" preserveAspectRatio="none" className="w-full h-[40px]">
                <path fill="rgba(167,139,250,0.07)" d="M0,30 C300,14 500,38 700,28 C900,16 1100,38 1200,28 C1400,14 1600,38 1900,28 C2100,16 2300,38 2400,28 L2400,40 L0,40 Z" />
              </svg>
            </div>
          </div>
          <div className="group-hover:translate-x-2 transition-transform duration-300 min-w-0">
            <p className="text-slate-400 text-sm mb-0.5">{greeting()},</p>
            <div className="flex items-center gap-2">
              <h2 className="text-white text-xl sm:text-2xl font-bold truncate group-hover:text-emerald-300 transition-colors duration-300">
                {auth?.user?.name ?? 'Employee'}
              </h2>
              <span className="animate-hand-wave text-2xl sm:text-3xl select-none">👋</span>
            </div>
            <p className="text-slate-400 text-xs mt-1 hidden sm:block group-hover:text-slate-300 transition-colors duration-300">
              {t("Here's your personal overview for today.")}
            </p>
            <div className="flex items-center gap-3 mt-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-emerald-400/70 rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1.2s' }} />
                <div className="w-2 h-2 bg-emerald-300/50 rounded-full animate-bounce" style={{ animationDelay: '150ms', animationDuration: '1.2s' }} />
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms', animationDuration: '1.2s' }} />
              </div>
              <span className="text-emerald-400 font-semibold text-sm group-hover:scale-105 transition-transform duration-200">
                {isClockedIn ? t('Currently clocked in') : clockInTime ? t('Clocked out') : t('Not clocked in yet')}
              </span>
            </div>
          </div>
          {/* Shift info pill */}
          {dashboardData?.employeeShift && (
            <div className="flex items-center gap-2 shrink-0">
              <div className="rounded-xl bg-white/10 px-4 py-2.5 text-center hover:bg-white/15 hover:scale-105 transition-all duration-300">
                <p className="text-white text-sm font-bold leading-tight">{dashboardData.employeeShift.name}</p>
                <p className="text-slate-400 text-[11px]">{dashboardData.employeeShift.start_time} - {dashboardData.employeeShift.end_time}</p>
              </div>
            </div>
          )}
        </div>

        {/* ── KPI Cards ── */}
        <div className={`grid grid-cols-1 gap-3 sm:grid-cols-3 ${fadeUp(100)}`}>

          {/* Awards */}
          <Card className="h-full border border-emerald-200 dark:border-emerald-900/50 shadow-sm bg-emerald-50 dark:bg-emerald-950/30 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            <CardContent className="relative overflow-hidden p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-emerald-100 dark:bg-emerald-900/60 p-2.5 shrink-0">
                  <Trophy className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-emerald-700 dark:text-emerald-400 text-xs mb-0.5">{t('Total Awards')}</p>
                  <p className="text-emerald-900 dark:text-emerald-100 text-2xl font-bold tracking-tight">{stats.totalAwards}</p>
                  <p className="text-emerald-600 dark:text-emerald-500 text-[11px] mt-0.5">{t('recognitions received')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Warnings */}
          <Card className="h-full border border-amber-200 dark:border-amber-900/50 shadow-sm bg-amber-50 dark:bg-amber-950/30 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            <CardContent className="relative overflow-hidden p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-amber-100 dark:bg-amber-900/50 p-2.5 shrink-0">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-amber-700 dark:text-amber-400 text-xs mb-0.5">{t('Total Warnings')}</p>
                  <p className="text-amber-900 dark:text-amber-100 text-2xl font-bold tracking-tight">{stats.totalWarnings}</p>
                  <p className="text-amber-600 dark:text-amber-500 text-[11px] mt-0.5">{t('issued to you')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Complaints */}
          <Card className="h-full border border-red-200 dark:border-red-900/50 shadow-sm bg-red-50 dark:bg-red-950/30 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            <CardContent className="relative overflow-hidden p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-red-100 dark:bg-red-900/50 p-2.5 shrink-0">
                  <MessageSquareWarning className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-red-700 dark:text-red-400 text-xs mb-0.5">{t('Total Complaints')}</p>
                  <p className="text-red-900 dark:text-red-100 text-2xl font-bold tracking-tight">{stats.totalComplaints}</p>
                  <p className="text-red-600 dark:text-red-500 text-[11px] mt-0.5">{t('filed against you')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* ── Attendance Card ── */}
        {hasPermission(permissions, 'clock-in-out') && (
          <div className={fadeUp(200)}>
            <Card className="border border-border shadow-sm dark:bg-slate-900 overflow-hidden">
              <CardHeader className="pb-3 pt-5 px-5 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold">{t('Attendance')}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">{t("Today's clock in / clock out")}</p>
                  </div>
                  <div className="rounded-xl bg-violet-100 dark:bg-violet-900/40 p-2">
                    <Clock className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Clock In */}
                  <div className="flex-1 w-full rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 p-4 text-center">
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mb-1">{t('Clock In')}</p>
                    <p className="text-2xl font-bold text-emerald-800 dark:text-emerald-200">{clockInTime || '--:--'}</p>
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-500 mt-1">{clockInTime ? t('Today') : t('Not clocked in')}</p>
                  </div>
                  {/* Buttons */}
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={handleClockIn}
                      disabled={isClockedIn}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 shadow-sm ${isClockedIn ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-600 text-white hover:-translate-y-0.5 hover:shadow-md'}`}
                    >
                      <LogIn className="h-4 w-4" /> {t('Clock In')}
                    </button>
                    <button
                      onClick={handleClockOut}
                      disabled={!isClockedIn}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 shadow-sm ${!isClockedIn ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'bg-red-500 hover:bg-red-600 text-white hover:-translate-y-0.5 hover:shadow-md'}`}
                    >
                      <LogOut className="h-4 w-4 rotate-180" /> {t('Clock Out')}
                    </button>
                  </div>
                  {/* Clock Out */}
                  <div className="flex-1 w-full rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 p-4 text-center">
                    <p className="text-xs text-red-600 dark:text-red-400 font-medium mb-1">{t('Clock Out')}</p>
                    <p className="text-2xl font-bold text-red-800 dark:text-red-200">{clockOutTime || '--:--'}</p>
                    <p className="text-[11px] text-red-600 dark:text-red-500 mt-1">{clockOutTime ? t('Today') : t('Not clocked out')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Recent Activities ── */}
        <div className={`grid gap-4 lg:grid-cols-2 ${fadeUp(300)}`}>

          {/* Recent Announcements */}
          {hasPermission(permissions, 'view-announcements') && <Card className="border border-blue-100 dark:border-blue-900/40 shadow-sm dark:bg-slate-900 overflow-hidden">
            <CardHeader className="pb-3 pt-5 px-5 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">{t('Recent Announcements')}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('Latest company announcements')}</p>
                </div>
                {hasPermission(permissions, 'manage-announcements') && (
                  <Link href={route('hr.announcements.index')} className="flex items-center gap-1 text-xs text-primary font-medium shrink-0 hover:gap-1.5 transition-all duration-150">
                    {t('View all')} <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {recentActivities.announcements.length > 0 ? (
                <div>
                  {recentActivities.announcements.map((announcement: any, i: number) => (
                    <div key={i} className="flex items-start gap-3 px-5 py-3.5 hover:bg-muted/50 dark:hover:bg-slate-800/60 transition-colors duration-150">
                      <div className="rounded-xl bg-blue-100 dark:bg-blue-900/50 p-2 shrink-0 mt-0.5">
                        <Bell className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold truncate leading-tight">{announcement.title}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {announcement.category} &bull; {announcement.created_at ? (window.appSettings?.formatDateTimeSimple(announcement.created_at, false) || announcement.created_at) : 'N/A'}
                        </p>
                      </div>
                      {announcement.is_high_priority && (
                        <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20">{t('Urgent')}</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-40 gap-3">
                  <div className="rounded-full bg-muted p-4 animate-pulse">
                    <Bell className="h-6 w-6 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm text-muted-foreground">{t('No recent announcements')}</p>
                </div>
              )}
            </CardContent>
          </Card>}

          {/* Upcoming Meetings */}
          {hasPermission(permissions, 'view-meetings') && <Card className="border border-violet-100 dark:border-violet-900/40 shadow-sm dark:bg-slate-900 overflow-hidden">
            <CardHeader className="pb-3 pt-5 px-5 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">{t('Upcoming Meetings')}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('Scheduled meetings from today onwards')}</p>
                </div>
                {hasPermission(permissions, 'manage-meetings') && (
                  <Link href={route('meetings.meetings.index')} className="flex items-center gap-1 text-xs text-primary font-medium shrink-0 hover:gap-1.5 transition-all duration-150">
                    {t('View all')} <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0 max-h-[350px] overflow-auto">
              {recentActivities.meetings.length > 0 ? (
                <div>
                  {recentActivities.meetings.map((meeting: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/50 dark:hover:bg-slate-800/60 transition-colors duration-150">
                      <div className="rounded-xl bg-violet-100 dark:bg-violet-900/50 p-2 shrink-0">
                        <Users className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate leading-tight">{meeting.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {(() => {
                            if (!meeting.meeting_date) return t('No date set');
                            const dateStr = window.appSettings?.formatDateTimeSimple(meeting.meeting_date, false) || meeting.meeting_date;
                            const timeStr = meeting.start_time && meeting.end_time ? ` • ${meeting.start_time} - ${meeting.end_time}` : '';
                            return dateStr + timeStr;
                          })()}
                        </p>
                      </div>
                      <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${getStatusColor(meeting.status)}`}>
                        {t(meeting.status)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-40 gap-3">
                  <div className="rounded-full bg-muted p-4 animate-pulse">
                    <Users className="h-6 w-6 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm text-muted-foreground">{t('No upcoming meetings')}</p>
                </div>
              )}
            </CardContent>
          </Card>}

        </div>

      </div>
    </PageTemplate>
  );
}
