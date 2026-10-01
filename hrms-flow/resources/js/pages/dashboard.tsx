import React, { useState, useEffect } from 'react';
import { PageTemplate } from '@/components/page-template';
import {
  RefreshCw, Users, Building2, Briefcase, UserPlus, Calendar,
  Clock, TrendingUp, Bell, ExternalLink, Copy, CheckCircle,
  ArrowUpRight, ChevronRight, Settings, BarChart3,
  DollarSign, Package, AlertTriangle, PartyPopper, FileText, GraduationCap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import { router, Link, usePage } from '@inertiajs/react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  PieChart, Pie, Cell, BarChart, Bar, LabelList,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { hasPermission } from '@/utils/authorization';
import UserInitials from '@/components/user-initials';
import { getImagePath } from '@/utils/helpers';

interface CompanyDashboardData {
  stats: {
    totalEmployees: number;
    totalBranches: number;
    totalDepartments: number;
    newEmployeesThisMonth: number;
    jobPostsThisMonth: number;
    candidatesThisMonth: number;
    attendanceRate: number;
    presentToday: number;
    pendingLeaves: number;
    onLeaveToday: number;
    activeJobPostings: number;
    totalCandidates: number;
    totalPayrollThisMonth: number;
    payrollRunsThisMonth: number;
    totalAssets: number;
    assignedAssets: number;
    pendingWarnings: number;
    upcomingHolidays: number;
    activeContracts: number;
    expiringContracts: number;
    activeTrainings: number;
    completedTrainings: number;
  };
  charts: {
    departmentStats: Array<{ name: string; value: number; color: string }>;
    hiringTrend: Array<{ month: string; short: string; hires: number }>;
    hiringYear: number;
    availableYears: number[];
    growthYear: number;
    payrollYear: number;
    candidateStatusStats: Array<{ name: string; value: number; color: string }>;
    leaveTypesStats: Array<{ name: string; value: number; color: string }>;
    employeeGrowthChart: Array<{ month: string; employees: number }>;
    leaveOverview: Array<{ name: string; value: number; color: string }>;
    attendanceWeekly: Array<{ day: string; present: number; absent: number; leave: number }>;
    payrollTrend: Array<{ month: string; netPay: number }>;
    assetStatusStats: Array<{ name: string; value: number; color: string }>;
  };
  recentActivities: {
    leaves: Array<any>;
    candidates: Array<any>;
    announcements: Array<any>;
    meetings: Array<any>;
  };
  todayBirthdays: Array<{ id: number; name: string; designation: string; avatar?: string }>;
  todayOnLeave: Array<{ id: number; name: string; designation: string; leaveType: string; avatar?: string }>;
  userType: string;
}

export default function Dashboard({ dashboardData }: { dashboardData: CompanyDashboardData }) {
  const { t } = useTranslation();
  const { auth, companySlug } = usePage().props as any;
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [primaryColor, setPrimaryColor] = useState('#3b82f6');
  const [selectedHiringYear, setSelectedHiringYear] = useState<number>(() => dashboardData?.charts?.hiringYear ?? new Date().getFullYear());
  const [selectedGrowthYear, setSelectedGrowthYear] = useState<number>(() => dashboardData?.charts?.growthYear ?? new Date().getFullYear());
  const [selectedPayrollYear, setSelectedPayrollYear] = useState<number>(() => dashboardData?.charts?.payrollYear ?? new Date().getFullYear());

  useEffect(() => {
    setMounted(true);
    const raw = getComputedStyle(document.documentElement).getPropertyValue('--theme-color').trim();
    if (raw) setPrimaryColor(raw);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    router.reload({ only: ['dashboardData'] });
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleCopyCareerLink = () => {
    const careerUrl = companySlug ? route('career.index', companySlug) : route('career.index');
    console.log(navigator);
console.log(navigator.clipboard);
    navigator.clipboard.writeText(careerUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const openCareerPage = () => {
    const careerUrl = companySlug ? route('career.index', companySlug) : route('career.index');
    window.open(careerUrl, '_blank');
  };

  const pageActions = [
    {
      label: t('Refresh'),
      icon: <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />,
      variant: 'outline' as const,
      onClick: handleRefresh,
    },
  ];

  const stats = dashboardData?.stats || {
    totalEmployees: 0, totalBranches: 0, totalDepartments: 0,
    newEmployeesThisMonth: 0, jobPostsThisMonth: 0, candidatesThisMonth: 0,
    attendanceRate: 0, presentToday: 0, pendingLeaves: 0,
    onLeaveToday: 0, activeJobPostings: 0, totalCandidates: 0,
    totalPayrollThisMonth: 0, payrollRunsThisMonth: 0,
    totalAssets: 0, assignedAssets: 0, pendingWarnings: 0,
    upcomingHolidays: 0, activeContracts: 0, expiringContracts: 0,
    activeTrainings: 0, completedTrainings: 0,
  };

  const charts = dashboardData?.charts || {
    departmentStats: [], hiringTrend: [], hiringYear: new Date().getFullYear(),
    availableYears: [new Date().getFullYear()], growthYear: new Date().getFullYear(), payrollYear: new Date().getFullYear(),
    candidateStatusStats: [], leaveTypesStats: [], employeeGrowthChart: [],
    leaveOverview: [], attendanceWeekly: [], payrollTrend: [], assetStatusStats: [],
  };
  const availableYears = dashboardData?.charts?.availableYears || [new Date().getFullYear()];

  const handleHiringYearChange = (year: number) => {
    setSelectedHiringYear(year);
    router.reload({ data: { hiringYear: year, growthYear: selectedGrowthYear, payrollYear: selectedPayrollYear }, only: ['dashboardData'], preserveState: true });
  };
  const handleGrowthYearChange = (year: number) => {
    setSelectedGrowthYear(year);
    router.reload({ data: { hiringYear: selectedHiringYear, growthYear: year, payrollYear: selectedPayrollYear }, only: ['dashboardData'], preserveState: true });
  };
  const handlePayrollYearChange = (year: number) => {
    setSelectedPayrollYear(year);
    router.reload({ data: { hiringYear: selectedHiringYear, growthYear: selectedGrowthYear, payrollYear: year }, only: ['dashboardData'], preserveState: true });
  };

  const recentActivities = dashboardData?.recentActivities || {
    leaves: [], candidates: [], announcements: [], meetings: [],
  };

  const userType = dashboardData?.userType || 'employee';
  const isCompanyUser = userType === 'company';
  const perms = auth?.permissions || [];

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
      'approved': 'bg-green-50 text-green-700 ring-green-600/20',
      'pending': 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
      'rejected': 'bg-red-50 text-red-700 ring-red-600/20',
      'New': 'bg-blue-50 text-blue-700 ring-blue-600/20',
      'Screening': 'bg-yellow-50 text-yellow-800 ring-yellow-600/20',
      'Interview': 'bg-purple-50 text-purple-700 ring-purple-600/20',
      'Offer': 'bg-orange-50 text-orange-700 ring-orange-600/20',
      'Hired': 'bg-green-50 text-green-700 ring-green-600/20',
      'Rejected': 'bg-red-50 text-red-700 ring-red-600/10',
      'Scheduled': 'bg-blue-50 text-blue-700 ring-blue-600/20',
      'In Progress': 'bg-yellow-50 text-yellow-800 ring-yellow-600/20',
      'Completed': 'bg-green-50 text-green-700 ring-green-600/20',
      'Cancelled': 'bg-red-50 text-red-700 ring-red-600/10',
    };
    return colors[status] || 'bg-gray-50 text-gray-700 ring-gray-600/20';
  };

  const formatCurrency = (val: number) =>
    window.appSettings?.formatCurrency(val) ?? `$${val.toLocaleString()}`;

  return (
    <PageTemplate
      title={t('Dashboard')}
      url="/dashboard"
      actions={pageActions}
      description={t('Overview of your company stats, attendance, and recent activity.')}
    >
      <div className="space-y-6">
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
        {/* ── Greeting Banner ── */}
        <div className={`group relative overflow-hidden rounded-2xl bg-slate-800 dark:bg-slate-900 px-6 py-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between ${fadeUp(0)}`}>
          {/* flowing gradient orbs */}
          <span className="pointer-events-none absolute -top-10 -left-10 w-48 h-48 rounded-full bg-emerald-500/10 blur-2xl animate-pulse" style={{ animationDuration: '4s' }} />
          <span className="pointer-events-none absolute -bottom-10 right-0 w-56 h-56 rounded-full bg-blue-500/10 blur-2xl animate-pulse" style={{ animationDuration: '5s', animationDelay: '1.5s' }} />
          <span className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full bg-violet-500/5 blur-2xl animate-pulse" style={{ animationDuration: '6s', animationDelay: '0.8s' }} />
          {/* crisp glowing dots */}
          <span className="pointer-events-none absolute top-4 left-1/3 w-1.5 h-1.5 rounded-full bg-emerald-400/80 shadow-[0_0_6px_2px_rgba(52,211,153,0.6)] animate-ping" style={{ animationDuration: '3s' }} />
          <span className="pointer-events-none absolute bottom-4 left-1/4 w-1 h-1 rounded-full bg-blue-400/70 shadow-[0_0_4px_2px_rgba(96,165,250,0.5)] animate-ping" style={{ animationDuration: '4s', animationDelay: '1s' }} />
          <span className="pointer-events-none absolute top-3 right-1/4 w-1.5 h-1.5 rounded-full bg-violet-400/70 shadow-[0_0_6px_2px_rgba(167,139,250,0.5)] animate-ping" style={{ animationDuration: '3.5s', animationDelay: '0.5s' }} />
          <span className="pointer-events-none absolute bottom-3 right-1/3 w-1 h-1 rounded-full bg-emerald-300/80 shadow-[0_0_4px_2px_rgba(110,231,183,0.5)] animate-ping" style={{ animationDuration: '2.8s', animationDelay: '1.8s' }} />
          {/* water wave layers at bottom */}
          <div className="pointer-events-none absolute bottom-0 left-0 w-full overflow-hidden" style={{ height: '40px' }}>
            <div className="absolute bottom-0 left-0 w-[200%] animate-water-wave-1">
              <svg viewBox="0 0 2400 40" preserveAspectRatio="none" className="w-full h-[40px]"><path fill="rgba(52,211,153,0.12)" d="M0,20 C150,38 350,0 600,20 C850,38 1050,0 1200,20 C1350,38 1550,0 1800,20 C2050,38 2250,0 2400,20 L2400,40 L0,40 Z" /></svg>
            </div>
            <div className="absolute bottom-0 left-0 w-[200%] animate-water-wave-2">
              <svg viewBox="0 0 2400 40" preserveAspectRatio="none" className="w-full h-[40px]"><path fill="rgba(96,165,250,0.09)" d="M0,26 C200,10 400,38 600,22 C800,8 1000,36 1200,24 C1400,10 1600,38 1800,22 C2000,8 2200,36 2400,24 L2400,40 L0,40 Z" /></svg>
            </div>
            <div className="absolute bottom-0 left-0 w-[200%] animate-water-wave-3">
              <svg viewBox="0 0 2400 40" preserveAspectRatio="none" className="w-full h-[40px]"><path fill="rgba(167,139,250,0.07)" d="M0,30 C300,14 500,38 700,28 C900,16 1100,38 1200,28 C1400,14 1600,38 1900,28 C2100,16 2300,38 2400,28 L2400,40 L0,40 Z" /></svg>
            </div>
          </div>
          <div className="group-hover:translate-x-2 transition-transform duration-300 min-w-0">
            <p className="text-slate-400 text-sm mb-0.5 transition-colors duration-300">{greeting()},</p>
            <div className="flex items-center gap-2">
              <h2 className="text-white text-xl sm:text-2xl font-bold truncate group-hover:text-emerald-300 transition-colors duration-300">
                {auth?.user?.name ?? 'Company Admin'}
              </h2>
              <span className="animate-hand-wave text-2xl sm:text-3xl select-none">👋</span>
            </div>
            <p className="text-slate-400 text-xs mt-1 hidden sm:block group-hover:text-slate-300 transition-colors duration-300">
              {t("Here's what's happening across your company today.")}
            </p>
            <div className="flex items-center gap-3 mt-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-emerald-400/70 rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1.2s' }} />
                <div className="w-2 h-2 bg-emerald-300/50 rounded-full animate-bounce" style={{ animationDelay: '150ms', animationDuration: '1.2s' }} />
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms', animationDuration: '1.2s' }} />
              </div>
              <span className="text-emerald-400 font-semibold text-sm group-hover:scale-105 transition-transform duration-200">
                {stats.presentToday} {t('present today')}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {/* <div className="rounded-xl bg-white/10 px-4 py-2.5 text-center min-w-[80px] hover:bg-white/15 hover:scale-105 transition-all duration-300">
              <p className="text-white text-lg font-bold leading-tight">{stats.totalEmployees}</p>
              <p className="text-slate-400 text-[11px]">{t('Employees')}</p>
            </div>
            <div className="rounded-xl bg-white/10 px-4 py-2.5 text-center min-w-[80px] hover:bg-white/15 hover:scale-105 transition-all duration-300">
              <p className="text-emerald-400 text-lg font-bold leading-tight">{stats.attendanceRate}%</p>
              <p className="text-slate-400 text-[11px]">{t('Attendance')}</p>
            </div> */}
            {isCompanyUser && (
              <>
                {stats.activeJobPostings > 0 && hasPermission(perms, 'manage-career-page') && (
                  <>
                    <div className="w-px h-10 bg-white/10 hidden sm:block" />
                    <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 hover:bg-white/15 transition-all duration-200">
                      <div className="relative shrink-0">
                        <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
                          <Briefcase className="h-3.5 w-3.5 text-primary-foreground" />
                        </div>
                        <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-primary rounded-full flex items-center justify-center">
                          <div className="w-1 h-1 bg-white rounded-full animate-ping" style={{ animationDuration: '2s' }} />
                        </div>
                      </div>
                      <div className="min-w-0">
                        <p className="text-white text-[11px] font-semibold leading-tight">{t('Career Page')}</p>
                        <p className="text-primary text-[10px] font-medium">{stats.activeJobPostings} {t('open')}</p>
                      </div>
                      <div className="flex gap-1 ml-1">
                        <button onClick={handleCopyCareerLink} className="rounded-md bg-white/10 hover:bg-white/20 p-1.5 transition-colors duration-150 cursor-pointer">
                          {copied ? <CheckCircle className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3 text-slate-300" />}
                        </button>
                        <button onClick={openCareerPage} className="rounded-md bg-primary/80 hover:bg-primary p-1.5 transition-colors duration-150 cursor-pointer">
                          <ExternalLink className="h-3 w-3 text-primary-foreground" />
                        </button>
                      </div>
                    </div>
                  </>
                )}
                <div className="w-px h-10 bg-white/10 hidden sm:block" />
                {[
                  ...(hasPermission(perms, 'manage-job-postings') ? [{ icon: Briefcase, label: t('Jobs'), href: route('hr.recruitment.job-postings.index'), color: 'text-amber-300 hover:text-amber-200', bg: 'hover:bg-amber-400/10' }] : []),
                  ...(hasPermission(perms, 'manage-candidates') ? [{ icon: UserPlus, label: t('Candidates'), href: route('hr.recruitment.candidates.index'), color: 'text-violet-300 hover:text-violet-200', bg: 'hover:bg-violet-400/10' }] : []),
                  ...(hasPermission(perms, 'manage-settings') ? [{ icon: Settings, label: t('Settings'), href: route('settings'), color: 'text-slate-300 hover:text-slate-200', bg: 'hover:bg-white/10' }] : []),
                ].map(({ icon: Icon, label, href, color, bg }) => (
                  <Link key={label} href={href} className={`flex flex-col items-center gap-1 rounded-xl px-3 py-2 transition-all duration-200 ${bg} group/qa`}>
                    <Icon className={`h-5 w-5 transition-all duration-200 ${color} group-hover/qa:-translate-y-0.5`} />
                    <span className="text-slate-400 text-[10px] group-hover/qa:text-slate-300 transition-colors duration-200">{label}</span>
                  </Link>
                ))}
              </>
            )}
          </div>
        </div>

        {/* ── KPI Row ── */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">

          {/* Payroll This Month */}
          {hasPermission(perms, 'manage-payroll-runs') && (
            <Link href={route('hr.payroll-runs.index')} className={`group col-span-1 ${fadeUp(270)}`}>
              <Card className="h-full border border-teal-200 dark:border-teal-900/50 shadow-sm bg-teal-50 dark:bg-teal-950/30 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
                <CardContent className="relative overflow-hidden p-5">
                  {/* <span className="pointer-events-none absolute top-3 right-3 w-3 h-3 rounded-full bg-teal-400 shadow-[0_0_12px_4px_rgba(45,212,191,0.8)] animate-ping" style={{ animationDuration: '2.5s' }} /> */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="rounded-xl bg-teal-100 dark:bg-teal-900/50 p-2.5">
                      <DollarSign className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-teal-200 group-hover:text-teal-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all duration-200" />
                  </div>
                  <p className="text-teal-700 dark:text-teal-400 text-xs mb-1">{t('Payroll This Month')}</p>
                  <p className="text-teal-900 dark:text-teal-100 text-2xl font-bold tracking-tight">{formatCurrency(stats.totalPayrollThisMonth)}</p>
                  <p className="text-teal-600 dark:text-teal-500 text-[11px] mt-1.5">{stats.payrollRunsThisMonth} {t('runs completed')}</p>
                </CardContent>
              </Card>
            </Link>
          )}

          {/* Total Employees */}
          {hasPermission(perms, 'manage-employees') && <Link href={route('hr.employees.index')} className={`group col-span-1 ${fadeUp(100)}`}>
            <Card className="h-full border border-blue-200 dark:border-blue-900/50 shadow-sm bg-blue-50 dark:bg-blue-950/30 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
              <CardContent className="relative overflow-hidden p-5">
                {/* <span className="pointer-events-none absolute top-3 right-3 w-3 h-3 rounded-full bg-blue-400 shadow-[0_0_12px_4px_rgba(96,165,250,0.8)] animate-ping" style={{ animationDuration: '2.8s', animationDelay: '0.4s' }} /> */}
                <div className="flex items-start justify-between mb-4">
                  <div className="rounded-xl bg-blue-100 dark:bg-blue-900/50 p-2.5">
                    <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-blue-200 group-hover:text-blue-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all duration-200" />
                </div>
                <p className="text-blue-700 dark:text-blue-400 text-xs mb-1">{t('Total Employees')}</p>
                <p className="text-blue-900 dark:text-blue-100 text-2xl font-bold tracking-tight">{stats.totalEmployees.toLocaleString()}</p>
                <p className="text-emerald-600 text-[11px] mt-1.5 flex items-center gap-0.5">
                  <TrendingUp className="h-3 w-3" /> {stats.newEmployeesThisMonth} {t('this month')}
                </p>
              </CardContent>
            </Card>
          </Link>}

          {/* Branches */}
          {hasPermission(perms, 'manage-branches') && <Link href={route('hr.branches.index')} className={`group col-span-1 ${fadeUp(130)}`}>
            <Card className="h-full border border-emerald-200 dark:border-emerald-900/50 shadow-sm bg-emerald-50 dark:bg-emerald-950/30 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
              <CardContent className="relative overflow-hidden p-5">
                {/* <span className="pointer-events-none absolute top-3 right-3 w-3 h-3 rounded-full bg-emerald-400 shadow-[0_0_12px_4px_rgba(52,211,153,0.8)] animate-ping" style={{ animationDuration: '3s', animationDelay: '0.8s' }} /> */}
                <div className="flex items-start justify-between mb-4">
                  <div className="rounded-xl bg-emerald-100 dark:bg-emerald-900/60 p-2.5">
                    <Building2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-emerald-300 group-hover:text-emerald-600 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all duration-200" />
                </div>
                <p className="text-emerald-700 dark:text-emerald-400 text-xs mb-1">{t('Branches')}</p>
                <p className="text-emerald-900 dark:text-emerald-100 text-2xl font-bold tracking-tight">{stats.totalBranches.toLocaleString()}</p>
                <p className="text-emerald-600 dark:text-emerald-500 text-[11px] mt-1.5">{stats.totalDepartments} {t('departments')}</p>
              </CardContent>
            </Card>
          </Link>}

          {/* Attendance Rate */}
          {hasPermission(perms, 'manage-attendance-records') && <div className={`group col-span-1 ${fadeUp(160)}`}>
            <Card className="h-full border border-violet-200 dark:border-violet-900/50 shadow-sm bg-violet-50 dark:bg-violet-950/30 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
              <CardContent className="relative overflow-hidden p-5">
                {/* <span className="pointer-events-none absolute top-3 right-3 w-3 h-3 rounded-full bg-violet-400 shadow-[0_0_12px_4px_rgba(167,139,250,0.8)] animate-ping" style={{ animationDuration: '2.6s', animationDelay: '1.2s' }} /> */}
                <div className="flex items-start justify-between mb-4">
                  <div className="rounded-xl bg-violet-100 dark:bg-violet-900/50 p-2.5">
                    <Clock className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                  </div>
                </div>
                <p className="text-violet-700 dark:text-violet-400 text-xs mb-1">{t('Attendance Rate')}</p>
                <p className="text-violet-900 dark:text-violet-100 text-2xl font-bold tracking-tight">{stats.attendanceRate}%</p>
                <div className="mt-2 h-1 w-full rounded-full bg-violet-100 dark:bg-violet-900/40">
                  <div className="h-1 rounded-full bg-violet-500 transition-all duration-1000 ease-out" style={{ width: mounted ? `${Math.min(stats.attendanceRate, 100)}%` : '0%' }} />
                </div>
              </CardContent>
            </Card>
          </div>}

          {/* Pending Leaves */}
          {hasPermission(perms, 'manage-leave-applications') && <Link href={route('hr.leave-applications.index')} className={`group col-span-1 ${fadeUp(190)}`}>
            <Card className={`h-full border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer ${
              stats.pendingLeaves > 0
                ? 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30'
                : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900'
            }`}>
              <CardContent className="relative overflow-hidden p-5">
                {/* <span className="pointer-events-none absolute top-3 right-3 w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_12px_4px_rgba(251,191,36,0.8)] animate-ping" style={{ animationDuration: '2.4s', animationDelay: '0.6s' }} /> */}
                <div className="flex items-start justify-between mb-4">
                  <div className={`rounded-xl p-2.5 ${stats.pendingLeaves > 0 ? 'bg-amber-100 dark:bg-amber-900/50' : 'bg-muted'}`}>
                    <Calendar className={`h-5 w-5 ${stats.pendingLeaves > 0 ? 'text-amber-600 dark:text-amber-400 animate-pulse' : 'text-muted-foreground'}`} />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-amber-200 group-hover:text-amber-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all duration-200" />
                </div>
                <p className="text-amber-700 dark:text-amber-400 text-xs mb-1">{t('Pending Leaves')}</p>
                <p className={`text-2xl font-bold tracking-tight ${stats.pendingLeaves > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-slate-700 dark:text-slate-300'}`}>
                  {stats.pendingLeaves.toLocaleString()}
                </p>
                <p className="text-amber-500 text-[11px] mt-1.5">{stats.onLeaveToday} {t('on leave today')}</p>
              </CardContent>
            </Card>
          </Link>}

          {/* Active Jobs */}
          {hasPermission(perms, 'manage-job-postings') && <Link href={route('hr.recruitment.job-postings.index')} className={`group col-span-1 ${fadeUp(220)}`}>
            <Card className="h-full border border-orange-200 dark:border-orange-900/50 shadow-sm bg-orange-50 dark:bg-orange-950/30 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
              <CardContent className="relative overflow-hidden p-5">
                {/* <span className="pointer-events-none absolute top-3 right-3 w-3 h-3 rounded-full bg-orange-400 shadow-[0_0_12px_4px_rgba(251,146,60,0.8)] animate-ping" style={{ animationDuration: '3.2s', animationDelay: '1s' }} /> */}
                <div className="flex items-start justify-between mb-4">
                  <div className="rounded-xl bg-orange-100 dark:bg-orange-900/50 p-2.5">
                    <Briefcase className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-orange-200 group-hover:text-orange-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all duration-200" />
                </div>
                <p className="text-orange-700 dark:text-orange-400 text-xs mb-1">{t('Active Jobs')}</p>
                <p className="text-orange-900 dark:text-orange-100 text-2xl font-bold tracking-tight">{stats.activeJobPostings.toLocaleString()}</p>
                <p className="text-emerald-600 text-[11px] mt-1.5 flex items-center gap-0.5">
                  <TrendingUp className="h-3 w-3" /> {stats.jobPostsThisMonth} {t('this month')}
                </p>
              </CardContent>
            </Card>
          </Link>}

        </div>

        {/* ── Today's Birthdays + Today's Leave ── */}
        <div className={`grid gap-4 lg:grid-cols-2 ${fadeUp(285)}`}>

            {/* Today's Birthdays */}
            <Card className="border border-pink-200 dark:border-pink-900/40 shadow-sm dark:bg-slate-900 overflow-hidden relative">
                {/* Sparkles */}
                <span className="pointer-events-none absolute top-3 left-8 w-1.5 h-1.5 rounded-sm rotate-45 bg-pink-400/60 animate-ping" style={{ animationDuration: '2.4s' }} />
                <span className="pointer-events-none absolute top-6 left-1/4 w-1 h-1 rounded-sm rotate-45 bg-fuchsia-400/50 animate-ping" style={{ animationDuration: '3.1s', animationDelay: '0.6s' }} />
                <span className="pointer-events-none absolute top-2 left-1/2 w-1.5 h-1.5 rounded-sm rotate-45 bg-pink-300/70 animate-ping" style={{ animationDuration: '2.8s', animationDelay: '1.2s' }} />
                <span className="pointer-events-none absolute top-5 right-1/3 w-1 h-1 rounded-sm rotate-45 bg-rose-400/60 animate-ping" style={{ animationDuration: '3.5s', animationDelay: '0.3s' }} />
                <span className="pointer-events-none absolute top-3 right-12 w-1.5 h-1.5 rounded-sm rotate-45 bg-fuchsia-300/60 animate-ping" style={{ animationDuration: '2.2s', animationDelay: '0.9s' }} />
                <span className="pointer-events-none absolute top-7 right-6 w-1 h-1 rounded-sm rotate-45 bg-pink-500/50 animate-ping" style={{ animationDuration: '4s', animationDelay: '1.5s' }} />
                <span className="pointer-events-none absolute top-1 left-3/4 w-2 h-2 rounded-sm rotate-45 bg-pink-200/80 animate-pulse" style={{ animationDuration: '3s', animationDelay: '0.4s' }} />
                <span className="pointer-events-none absolute top-4 left-16 w-1 h-1 rounded-sm rotate-45 bg-rose-300/70 animate-pulse" style={{ animationDuration: '2.6s', animationDelay: '1s' }} />
                <span className="pointer-events-none absolute" style={{ top: '25%', left: '6px', width: '6px', height: '6px', borderRadius: '2px', transform: 'rotate(45deg)', backgroundColor: 'rgb(244 114 182 / 0.4)', animation: 'ping 3.3s cubic-bezier(0,0,0.2,1) infinite', animationDelay: '0.7s' }} />
                <span className="pointer-events-none absolute" style={{ top: '33%', right: '16px', width: '4px', height: '4px', borderRadius: '2px', transform: 'rotate(45deg)', backgroundColor: 'rgb(232 121 249 / 0.5)', animation: 'ping 2.7s cubic-bezier(0,0,0.2,1) infinite', animationDelay: '1.3s' }} />
                <span className="pointer-events-none absolute" style={{ top: '42%', left: '33%', width: '6px', height: '6px', borderRadius: '2px', transform: 'rotate(45deg)', backgroundColor: 'rgb(251 113 133 / 0.4)', animation: 'pulse 3.8s cubic-bezier(0.4,0,0.6,1) infinite', animationDelay: '0.2s' }} />
                <span className="pointer-events-none absolute" style={{ top: '50%', right: '25%', width: '4px', height: '4px', borderRadius: '2px', transform: 'rotate(45deg)', backgroundColor: 'rgb(236 72 153 / 0.4)', animation: 'ping 2.5s cubic-bezier(0,0,0.2,1) infinite', animationDelay: '1.8s' }} />
                <span className="pointer-events-none absolute" style={{ top: '50%', left: '52%', width: '8px', height: '8px', borderRadius: '2px', transform: 'rotate(45deg)', backgroundColor: 'rgb(240 171 252 / 0.3)', animation: 'pulse 4.2s cubic-bezier(0.4,0,0.6,1) infinite', animationDelay: '0.5s' }} />
                <span className="pointer-events-none absolute" style={{ top: '60%', left: '32px', width: '4px', height: '4px', borderRadius: '2px', transform: 'rotate(45deg)', backgroundColor: 'rgb(244 114 182 / 0.5)', animation: 'ping 3s cubic-bezier(0,0,0.2,1) infinite', animationDelay: '2s' }} />
                <span className="pointer-events-none absolute" style={{ top: '62%', right: '40px', width: '6px', height: '6px', borderRadius: '2px', transform: 'rotate(45deg)', backgroundColor: 'rgb(251 113 133 / 0.4)', animation: 'ping 2.9s cubic-bezier(0,0,0.2,1) infinite', animationDelay: '0.8s' }} />
                <span className="pointer-events-none absolute" style={{ bottom: '25%', left: '25%', width: '4px', height: '4px', borderRadius: '2px', transform: 'rotate(45deg)', backgroundColor: 'rgb(232 121 249 / 0.4)', animation: 'ping 3.6s cubic-bezier(0,0,0.2,1) infinite', animationDelay: '1.1s' }} />
                <span className="pointer-events-none absolute" style={{ bottom: '25%', right: '33%', width: '6px', height: '6px', borderRadius: '2px', transform: 'rotate(45deg)', backgroundColor: 'rgb(249 168 212 / 0.5)', animation: 'pulse 2.3s cubic-bezier(0.4,0,0.6,1) infinite', animationDelay: '0.6s' }} />
                <span className="pointer-events-none absolute" style={{ bottom: '32px', left: '52%', width: '4px', height: '4px', borderRadius: '2px', transform: 'rotate(45deg)', backgroundColor: 'rgb(251 113 133 / 0.6)', animation: 'ping 3.2s cubic-bezier(0,0,0.2,1) infinite', animationDelay: '1.4s' }} />
                <span className="pointer-events-none absolute" style={{ bottom: '16px', right: '32px', width: '6px', height: '6px', borderRadius: '2px', transform: 'rotate(45deg)', backgroundColor: 'rgb(244 114 182 / 0.4)', animation: 'ping 2.6s cubic-bezier(0,0,0.2,1) infinite', animationDelay: '0.3s' }} />
                <span className="pointer-events-none absolute" style={{ bottom: '24px', left: '24px', width: '8px', height: '8px', borderRadius: '2px', transform: 'rotate(45deg)', backgroundColor: 'rgb(240 171 252 / 0.3)', animation: 'pulse 4s cubic-bezier(0.4,0,0.6,1) infinite', animationDelay: '1.7s' }} />
                <CardHeader className="pb-3 pt-5 px-5 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold">{t("Today's Birthdays")}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">{t('Celebrate with your team')}</p>
                    </div>
                    <div className="rounded-xl bg-pink-100 dark:bg-pink-900/40 p-2">
                      <PartyPopper className="h-4 w-4 text-pink-600 dark:text-pink-400" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0 max-h-[350px] overflow-auto">
                  {dashboardData.todayBirthdays?.length > 0 ? (
                    <div>
                      {dashboardData.todayBirthdays.map((emp) => (
                        <div key={emp.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/50 dark:hover:bg-slate-800/60 transition-colors duration-150">
                          <div className="shrink-0">
                            {emp.avatar ?
                              <img src={emp.avatar} alt={emp.name} className="h-10 w-10 rounded-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = getImagePath('avatars/avatar.png'); }} />
                              : <UserInitials name={emp?.name || 'E'} />
                            }
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold truncate leading-tight">{emp.name}</p>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{emp.designation}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-40 gap-3">
                      <div className="rounded-full bg-muted p-4 animate-pulse">
                        <PartyPopper className="h-6 w-6 text-muted-foreground/50" />
                      </div>
                      <p className="text-sm text-muted-foreground">{t('No birthdays today')}</p>
                    </div>
                  )}
                </CardContent>
            </Card>

            {/* Today's On Leave */}
            <Card className="border border-amber-200 dark:border-amber-900/40 shadow-sm dark:bg-slate-900 overflow-hidden relative">
                {/* Leaf animations */}
                {/* <span className="pointer-events-none absolute top-2 left-6 w-3 h-5 rounded-full rotate-45 bg-amber-300/40 animate-pulse" style={{ animationDuration: '3s' }} />
                <span className="pointer-events-none absolute top-4 left-1/3 w-2 h-4 rounded-full -rotate-12 bg-green-300/30 animate-pulse" style={{ animationDuration: '4s', animationDelay: '0.8s' }} />
                <span className="pointer-events-none absolute top-3 left-1/2 w-2.5 h-4 rounded-full rotate-12 bg-orange-300/35 animate-pulse" style={{ animationDuration: '3.5s', animationDelay: '0.4s' }} />
                <span className="pointer-events-none absolute top-1 right-1/3 w-2 h-3.5 rounded-full rotate-45 bg-amber-400/35 animate-ping" style={{ animationDuration: '4.5s', animationDelay: '1s' }} />
                <span className="pointer-events-none absolute top-5 right-10 w-3 h-5 rounded-full -rotate-45 bg-green-400/25 animate-pulse" style={{ animationDuration: '5s', animationDelay: '0.3s' }} />
                <span className="pointer-events-none absolute top-2 right-4 w-2 h-3 rounded-full rotate-12 bg-orange-400/30 animate-ping" style={{ animationDuration: '3.8s', animationDelay: '1.5s' }} />
                <span className="pointer-events-none absolute" style={{ top: '28%', left: '12px', width: '10px', height: '16px', borderRadius: '9999px', transform: 'rotate(30deg)', backgroundColor: 'rgb(251 191 36 / 0.3)', animation: 'pulse 4.2s cubic-bezier(0.4,0,0.6,1) infinite', animationDelay: '0.6s' }} />
                <span className="pointer-events-none absolute" style={{ top: '35%', right: '20px', width: '8px', height: '14px', borderRadius: '9999px', transform: 'rotate(-20deg)', backgroundColor: 'rgb(134 239 172 / 0.3)', animation: 'pulse 3.6s cubic-bezier(0.4,0,0.6,1) infinite', animationDelay: '1.2s' }} />
                <span className="pointer-events-none absolute" style={{ top: '45%', left: '40%', width: '10px', height: '18px', borderRadius: '9999px', transform: 'rotate(15deg)', backgroundColor: 'rgb(253 186 116 / 0.35)', animation: 'ping 5s cubic-bezier(0,0,0.2,1) infinite', animationDelay: '0.9s' }} />
                <span className="pointer-events-none absolute" style={{ top: '52%', left: '8px', width: '8px', height: '13px', borderRadius: '9999px', transform: 'rotate(-35deg)', backgroundColor: 'rgb(187 247 208 / 0.4)', animation: 'pulse 4.8s cubic-bezier(0.4,0,0.6,1) infinite', animationDelay: '0.2s' }} />
                <span className="pointer-events-none absolute" style={{ top: '58%', right: '15%', width: '10px', height: '16px', borderRadius: '9999px', transform: 'rotate(40deg)', backgroundColor: 'rgb(251 191 36 / 0.25)', animation: 'pulse 3.2s cubic-bezier(0.4,0,0.6,1) infinite', animationDelay: '1.6s' }} />
                <span className="pointer-events-none absolute" style={{ top: '65%', left: '55%', width: '8px', height: '14px', borderRadius: '9999px', transform: 'rotate(-15deg)', backgroundColor: 'rgb(253 186 116 / 0.3)', animation: 'ping 4.3s cubic-bezier(0,0,0.2,1) infinite', animationDelay: '0.5s' }} />
                <span className="pointer-events-none absolute" style={{ bottom: '30%', left: '20%', width: '10px', height: '16px', borderRadius: '9999px', transform: 'rotate(25deg)', backgroundColor: 'rgb(134 239 172 / 0.25)', animation: 'pulse 5.2s cubic-bezier(0.4,0,0.6,1) infinite', animationDelay: '1.1s' }} />
                <span className="pointer-events-none absolute" style={{ bottom: '20%', right: '30%', width: '8px', height: '13px', borderRadius: '9999px', transform: 'rotate(-40deg)', backgroundColor: 'rgb(251 191 36 / 0.3)', animation: 'pulse 3.9s cubic-bezier(0.4,0,0.6,1) infinite', animationDelay: '0.7s' }} />
                <span className="pointer-events-none absolute" style={{ bottom: '12%', left: '10px', width: '10px', height: '17px', borderRadius: '9999px', transform: 'rotate(20deg)', backgroundColor: 'rgb(253 186 116 / 0.35)', animation: 'ping 4.7s cubic-bezier(0,0,0.2,1) infinite', animationDelay: '1.4s' }} />
                <span className="pointer-events-none absolute" style={{ bottom: '8%', right: '12px', width: '8px', height: '14px', borderRadius: '9999px', transform: 'rotate(-30deg)', backgroundColor: 'rgb(187 247 208 / 0.3)', animation: 'pulse 3.4s cubic-bezier(0.4,0,0.6,1) infinite', animationDelay: '0.4s' }} /> */}
                <CardHeader className="pb-3 pt-5 px-5 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold">{t("Today's Leave")}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">{t('Employees on leave today')}</p>
                    </div>
                    <div className="rounded-xl bg-amber-100 dark:bg-amber-900/40 p-2">
                      <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0 max-h-[350px] overflow-auto">
                  {dashboardData.todayOnLeave?.length > 0 ? (
                    <div>
                      {dashboardData.todayOnLeave.map((emp) => (
                        <div key={emp.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/50 dark:hover:bg-slate-800/60 transition-colors duration-150">
                          <div className="shrink-0">
                            {emp.avatar ?
                              <img src={emp.avatar} alt={emp.name} className="h-10 w-10 rounded-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = getImagePath('avatars/avatar.png'); }} />
                              : <UserInitials name={emp.name} />
                            }
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold truncate leading-tight">{emp.name}</p>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{emp.designation}</p>
                          </div>
                          <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-900/20 dark:text-amber-400 shrink-0">{emp.leaveType}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-40 gap-3">
                      <div className="rounded-full bg-muted p-4 animate-pulse">
                        <Calendar className="h-6 w-6 text-muted-foreground/50" />
                      </div>
                      <p className="text-sm text-muted-foreground">{t('No one on leave today')}</p>
                    </div>
                  )}
                </CardContent>
            </Card>

        </div>

        {/* ── Charts Row 3: Attendance Weekly + Leave Overview ── */}
        <div className={`grid gap-4 lg:grid-cols-2 ${fadeUp(450)}`}>

          {/* Attendance Weekly */}
          {hasPermission(perms, 'manage-attendance-records') && <Card className="border border-border shadow-sm dark:bg-slate-900 overflow-hidden">
            <CardHeader className="pb-3 pt-5 px-5 border-b">
              <div>
                <CardTitle className="text-base font-semibold">{t('Attendance - Last 7 Days')}</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">{t('Daily present / absent / on leave')}</p>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-5">
              {charts.attendanceWeekly.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={charts.attendanceWeekly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} accessibilityLayer={false}>
                    <CartesianGrid strokeDasharray="3 3" stroke={primaryColor} strokeOpacity={0.12} vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'currentColor' }} className="text-muted-foreground" axisLine={{ stroke: primaryColor, strokeOpacity: 0.3 }} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'currentColor' }} className="text-muted-foreground" axisLine={false} tickLine={false} allowDecimals={false} width={28} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${primaryColor}30`, backgroundColor: 'rgba(255,255,255,0.7)', color: primaryColor }} />
                    <Bar dataKey="present" name={t('Present')} stackId="a" fill="#10B981" radius={[0,0,0,0]} maxBarSize={32} isAnimationActive={false} />
                    <Bar dataKey="leave" name={t('On Leave')} stackId="a" fill="#F59E0B" maxBarSize={32} isAnimationActive={false} />
                    <Bar dataKey="absent" name={t('Absent')} stackId="a" fill="#EF4444" radius={[4,4,0,0]} maxBarSize={32} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-[240px] gap-3">
                  <div className="rounded-full bg-muted p-4 animate-pulse"><Clock className="h-6 w-6 text-muted-foreground/50" /></div>
                  <p className="text-sm text-muted-foreground">{t('No attendance data available')}</p>
                </div>
              )}
              <div className="flex items-center gap-4 mt-3 justify-center">
                {[{color:'#10B981',label:t('Present')},{color:'#F59E0B',label:t('On Leave')},{color:'#EF4444',label:t('Absent')}].map(l => (
                  <div key={l.label} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: l.color }} />
                    <span className="text-xs text-muted-foreground">{l.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>}

          {/* Leave Overview by Type */}
          {hasPermission(perms, 'manage-leave-applications') && <Card className="border border-border shadow-sm dark:bg-slate-900 overflow-hidden">
            <CardHeader className="pb-3 pt-5 px-5 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">{t('Leave Overview')}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('Applications this month by status')}</p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-900/20 dark:text-amber-400">
                  {charts.leaveOverview.reduce((s, m) => s + m.value, 0)} {t('total')}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              {charts.leaveOverview.some(l => l.value > 0) ? (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="50%" height={200}>
                    <PieChart>
                      <Pie data={charts.leaveOverview} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={4}>
                        {charts.leaveOverview.map((entry, i) => (
                          <Cell key={i} fill={entry.color} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${primaryColor}30`, backgroundColor: 'rgba(255,255,255,0.7)', color: primaryColor }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-3">
                    {charts.leaveOverview.map((s, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                          <span className="text-xs text-muted-foreground">{t(s.name)}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-bold">{s.value}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {charts.leaveOverview.reduce((sum, l) => sum + l.value, 0) > 0
                              ? `${Math.round((s.value / charts.leaveOverview.reduce((sum, l) => sum + l.value, 0)) * 100)}%`
                              : '0%'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[200px] gap-3">
                  <div className="rounded-full bg-muted p-4 animate-pulse"><Calendar className="h-6 w-6 text-muted-foreground/50" /></div>
                  <p className="text-sm text-muted-foreground">{t('No leave data available')}</p>
                </div>
              )}
            </CardContent>
          </Card>}

        </div>

        {/* ── Recent Activities ── */}
        <div className={`grid gap-4 lg:grid-cols-2 ${fadeUp(300)}`}>

          {/* Recent Leave Applications */}
          {hasPermission(perms, 'manage-leave-applications') && <Card className="border border-amber-100 dark:border-amber-900/40 shadow-sm dark:bg-slate-900 overflow-hidden">
            <CardHeader className="pb-3 pt-5 px-5 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">{t('Recent Leave Applications')}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('Latest leave requests from employees')}</p>
                </div>
                <Link href={route('hr.leave-applications.index')} className="flex items-center gap-1 text-xs text-primary font-medium shrink-0 hover:gap-1.5 transition-all duration-150">
                  {t('View all')} <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {recentActivities.leaves.length > 0 ? (
                <div>
                  {recentActivities.leaves.map((leave: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/50 dark:hover:bg-slate-800/60 transition-colors duration-150">
                      <div className="shrink-0">
                        {leave.employee?.avatar ?
                            <img
                                src={leave.employee?.avatar}
                                alt={leave.employee?.name}
                                className="h-10 w-10 rounded-full object-cover"
                                onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = getImagePath('avatars/avatar.png');
                                }}
                            />
                            :<UserInitials name={leave.employee?.name}/>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate leading-tight">{leave.employee?.name || t('Employee')}</p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {leave.leave_type?.name || t('Leave')} &bull; {leave.start_date ? (window.appSettings?.formatDateTimeSimple(leave.start_date, false) || leave.start_date) : 'N/A'}
                        </p>
                      </div>
                      <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset shrink-0 ${getStatusColor(leave.status)}`}>
                        {t(leave.status.charAt(0).toUpperCase() + leave.status.slice(1))}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-40 gap-3">
                  <div className="rounded-full bg-muted p-4 animate-pulse">
                    <Calendar className="h-6 w-6 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm text-muted-foreground">{t('No recent leave applications')}</p>
                </div>
              )}
            </CardContent>
          </Card>}

          {/* Recent Candidates */}
          {hasPermission(perms, 'manage-candidates') && <Card className="border border-indigo-100 dark:border-indigo-900/40 shadow-sm dark:bg-slate-900 overflow-hidden">
            <CardHeader className="pb-3 pt-5 px-5 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">{t('Recent Candidates')}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('Latest applicants in the pipeline')}</p>
                </div>
                <Link href={route('hr.recruitment.candidates.index')} className="flex items-center gap-1 text-xs text-primary font-medium shrink-0 hover:gap-1.5 transition-all duration-150">
                  {t('View all')} <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {recentActivities.candidates.length > 0 ? (
                <div>
                  {recentActivities.candidates.map((candidate: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/50 dark:hover:bg-slate-800/60 transition-colors duration-150">
                      <div className="shrink-0">
                        <UserInitials name={`${candidate.first_name} ${candidate.last_name}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate leading-tight">{candidate.first_name} {candidate.last_name}</p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {candidate.job?.title || t('Job')} &bull; {candidate.application_date
                            ? (window.appSettings?.formatDateTimeSimple(candidate.application_date, false) || candidate.application_date)
                            : candidate.created_at
                              ? (window.appSettings?.formatDateTimeSimple(candidate.created_at, false) || candidate.created_at)
                              : 'N/A'}
                        </p>
                      </div>
                      <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset shrink-0 ${getStatusColor(candidate.status)}`}>
                        {candidate.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-40 gap-3">
                  <div className="rounded-full bg-muted p-4 animate-pulse">
                    <UserPlus className="h-6 w-6 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm text-muted-foreground">{t('No recent candidates')}</p>
                </div>
              )}
            </CardContent>
          </Card>}

          {/* Recent Announcements */}
          {hasPermission(perms, 'manage-announcements') && <Card className="border border-blue-100 dark:border-blue-900/40 shadow-sm dark:bg-slate-900 overflow-hidden">
            <CardHeader className="pb-3 pt-5 px-5 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">{t('Recent Announcements')}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('Latest company announcements')}</p>
                </div>
                <Link href={route('hr.announcements.index')} className="flex items-center gap-1 text-xs text-primary font-medium shrink-0 hover:gap-1.5 transition-all duration-150">
                  {t('View all')} <ChevronRight className="h-3.5 w-3.5" />
                </Link>
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
                          {announcement.is_high_priority && (
                            <span className="shrink-0 inline-flex items-center rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-700 ring-1 ring-inset ring-red-600/20">{t('Urgent')}</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {announcement.category} &bull; {announcement.created_at ? (window.appSettings?.formatDateTimeSimple(announcement.created_at, false) || announcement.created_at) : 'N/A'}
                        </p>
                      </div>
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
          {hasPermission(perms, 'manage-meetings') && <Card className="border border-violet-100 dark:border-violet-900/40 shadow-sm dark:bg-slate-900 overflow-hidden">
            <CardHeader className="pb-3 pt-5 px-5 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">{t('Upcoming Meetings')}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('Scheduled meetings from today onwards')}</p>
                </div>
                <Link href={route('meetings.meetings.index')} className="flex items-center gap-1 text-xs text-primary font-medium shrink-0 hover:gap-1.5 transition-all duration-150">
                  {t('View all')} <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0 max-h-[320px] overflow-auto">
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
                      <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset shrink-0 ${getStatusColor(meeting.status)}`}>
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

        {/* ── Charts : Hiring Trend ── */}
        <div className={`grid gap-4 lg:grid-cols-1 ${fadeUp(350)}`}>

          {/* Hiring Trend */}
          {hasPermission(perms, 'manage-employees') && <Card className="border border-border shadow-sm dark:bg-slate-900 overflow-hidden">
            <CardHeader className="pb-3 pt-5 px-5 border-b">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <CardTitle className="text-base font-semibold">{t('Hiring Trend')}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('New hires per month')} - {selectedHiringYear}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-600/20 dark:bg-orange-900/20 dark:text-orange-400 dark:ring-orange-500/30">
                    {charts.hiringTrend.reduce((s, m) => s + m.hires, 0)} {t('total')}
                  </span>
                  <Select value={String(selectedHiringYear)} onValueChange={(v) => handleHiringYearChange(Number(v))}>
                    <SelectTrigger className="h-7 w-24 text-xs focus:ring-0 focus:ring-offset-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableYears.map((yr) => (
                        <SelectItem key={yr} value={String(yr)} className="text-xs">{yr}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-5">
              {charts.hiringTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={charts.hiringTrend} margin={{ top: 20, right: 8, left: 0, bottom: 0 }} accessibilityLayer={false}>
                    <CartesianGrid strokeDasharray="3 3" stroke={primaryColor} strokeOpacity={0.15} vertical={false} />
                    <XAxis dataKey="short" tick={{ fontSize: 11, fill: 'currentColor' }} className="text-muted-foreground" axisLine={{ stroke: primaryColor, strokeOpacity: 0.3 }} tickLine={{ stroke: primaryColor, strokeOpacity: 0.2 }} />
                    <YAxis tick={{ fontSize: 11, fill: 'currentColor' }} className="text-muted-foreground" axisLine={{ stroke: primaryColor, strokeOpacity: 0.3 }} tickLine={{ stroke: primaryColor, strokeOpacity: 0.2 }} allowDecimals={false} width={32} />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${primaryColor}30`, backgroundColor: 'rgba(255,255,255,0.7)', color: primaryColor }}
                      formatter={(v: number) => [v, t('Hires')]}
                      labelFormatter={(label, payload) => payload?.[0]?.payload?.month ?? label}
                    />
                    <Bar dataKey="hires" radius={[4, 4, 0, 0]} maxBarSize={30} isAnimationActive={false}>
                      <LabelList dataKey="hires" position="top" style={{ fontSize: 11, fill: primaryColor, fontWeight: 600 }} formatter={(v: number) => v > 0 ? v : ''} />
                      {charts.hiringTrend.map((_, i) => (
                        <Cell key={i} fill={primaryColor} fillOpacity={0.7} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-[300px] gap-3">
                  <div className="rounded-full bg-muted p-4 animate-pulse"><TrendingUp className="h-6 w-6 text-muted-foreground/50" /></div>
                  <p className="text-sm text-muted-foreground">{t('No hiring data available')}</p>
                </div>
              )}
            </CardContent>
          </Card>}

        </div>

        {/* ── Charts : Department Distribution + Candidate Pipeline ── */}
        <div className={`grid gap-4 lg:grid-cols-1 ${fadeUp(400)}`}>
          {/* Payroll Trend */}
          {hasPermission(perms, 'manage-payroll-runs') && <Card className="border border-border shadow-sm dark:bg-slate-900 overflow-hidden">
            <CardHeader className="pb-3 pt-5 px-5 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">{t('Payroll Trend')}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('Monthly net pay')} - {selectedPayrollYear}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium bg-teal-50 text-teal-700 ring-1 ring-inset ring-teal-600/20 dark:bg-teal-900/20 dark:text-teal-400">
                    {formatCurrency(charts.payrollTrend.reduce((s, m) => s + m.netPay, 0))}
                  </span>
                  <Select value={String(selectedPayrollYear)} onValueChange={(v) => handlePayrollYearChange(Number(v))}>
                    <SelectTrigger className="h-7 w-[80px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableYears.map((yr) => (
                        <SelectItem key={yr} value={String(yr)} className="text-xs">{yr}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-5">
              {charts.payrollTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={charts.payrollTrend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} accessibilityLayer={false}>
                    <defs>
                      <linearGradient id="payrollGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={primaryColor} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={primaryColor} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={primaryColor} strokeOpacity={0.12} vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'currentColor' }} className="text-muted-foreground" axisLine={{ stroke: primaryColor, strokeOpacity: 0.3 }} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'currentColor' }} className="text-muted-foreground" axisLine={{ stroke: primaryColor, strokeOpacity: 0.3 }} tickLine={false} tickFormatter={(v) => formatCurrency(v)} width={72} />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${primaryColor}30`, backgroundColor: 'rgba(255,255,255,0.7)', color: primaryColor }}
                      formatter={(v: number) => [formatCurrency(v), t('Net Pay')]}
                    />
                    <Area type="monotone" dataKey="netPay" stroke={primaryColor} strokeWidth={2} fill="url(#payrollGrad)" dot={{ r: 3, fill: primaryColor, strokeWidth: 0 }} activeDot={{ r: 5, fill: primaryColor, strokeWidth: 0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-[240px] gap-3">
                  <div className="rounded-full bg-muted p-4 animate-pulse"><DollarSign className="h-6 w-6 text-muted-foreground/50" /></div>
                  <p className="text-sm text-muted-foreground">{t('No payroll data available')}</p>
                </div>
              )}
            </CardContent>
          </Card>}

        </div>

        {/* ── Charts Row 4: Payroll Trend + Asset Status ── */}
        <div className={`grid gap-4 lg:grid-cols-2 ${fadeUp(500)}`}>

          {/* Asset Status */}
          {hasPermission(perms, 'manage-assets') && <Card className="border border-border shadow-sm dark:bg-slate-900 overflow-hidden">
            <CardHeader className="pb-3 pt-5 px-5 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">{t('Asset Status')}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('Distribution by current status')}</p>
                </div>
                <div className="rounded-xl bg-cyan-100 dark:bg-cyan-900/40 p-2">
                  <Package className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              {charts.assetStatusStats.length > 0 ? (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="50%" height={200}>
                    <PieChart>
                      <Pie data={charts.assetStatusStats} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                        {charts.assetStatusStats.map((entry, i) => (
                          <Cell key={i} fill={entry.color} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${primaryColor}30`, backgroundColor: 'rgba(255,255,255,0.7)', color: primaryColor }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2.5">
                    {charts.assetStatusStats.map((s, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                          <span className="text-xs text-muted-foreground truncate">{s.name}</span>
                        </div>
                        <span className="text-xs font-semibold shrink-0">{s.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[200px] gap-3">
                  <div className="rounded-full bg-muted p-4 animate-pulse"><Package className="h-6 w-6 text-muted-foreground/50" /></div>
                  <p className="text-sm text-muted-foreground">{t('No asset data available')}</p>
                </div>
              )}
            </CardContent>
          </Card>}


          {/* Candidate Pipeline */}
          {hasPermission(perms, 'manage-candidates') && <Card className="border border-border shadow-sm dark:bg-slate-900 overflow-hidden">
            <CardHeader className="pb-3 pt-5 px-5 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">{t('Candidate Pipeline')}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('Candidates by status')}</p>
                </div>
                <div className="rounded-xl bg-blue-100 dark:bg-blue-900/40 p-2">
                  <BarChart3 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              {charts.candidateStatusStats.length > 0 ? (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="50%" height={200}>
                    <PieChart>
                      <Pie data={charts.candidateStatusStats} cx="50%" cy="50%" outerRadius={80} dataKey="value" paddingAngle={3}>
                        {charts.candidateStatusStats.map((entry, i) => (
                          <Cell key={i} fill={entry.color} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${primaryColor}30`, backgroundColor: 'rgba(255,255,255,0.7)', color: primaryColor }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2">
                    {charts.candidateStatusStats.map((s, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                          <span className="text-xs text-muted-foreground truncate">{s.name}</span>
                        </div>
                        <span className="text-xs font-semibold shrink-0">{s.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[200px] gap-3">
                  <div className="rounded-full bg-muted p-4 animate-pulse"><BarChart3 className="h-6 w-6 text-muted-foreground/50" /></div>
                  <p className="text-sm text-muted-foreground">{t('No candidate data available')}</p>
                </div>
              )}
            </CardContent>
          </Card>}

        </div>

      </div>
    </PageTemplate>
  );
}
