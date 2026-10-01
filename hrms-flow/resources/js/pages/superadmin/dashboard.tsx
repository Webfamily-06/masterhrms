import React, { useState, useEffect } from 'react';
import { PageTemplate } from '@/components/page-template';
import {
  RefreshCw, Building2, CreditCard, DollarSign, TrendingUp,
  Users, AlertCircle, Tag, ArrowUpRight,
  ChevronRight, Settings, Gift,
  Currency,
  Banknote
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import { router, Link, usePage } from '@inertiajs/react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AreaChart, Area, BarChart, Bar, LabelList, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import UserInitials from '@/components/user-initials';

interface SuperAdminDashboardData {
  stats: {
    totalCompanies: number;
    totalActivePlanCompanies: number;
    totalUsers: number;
    totalRevenue: number;
    activePlans: number;
    pendingRequests: number;
    monthlyGrowth: number;
    activeCoupons: number;
  };
  recentActivity: Array<{
    id: number;
    name: string;
    email: string;
    registered_at: string;
    status: string;
    avatar?: string;
  }>;
  monthlyRevenue: Array<{ month: string; short: string; revenue: number }>;
  revenueYear: number;
  availableYears: number[];
  monthlyCompanies: Array<{ month: string; short: string; count: number }>;
  companiesYear: number;
  topPlans: Array<{
    name: string;
    subscribers: number;
    revenue: number;
  }>;
}

export default function SuperAdminDashboard({ dashboardData }: { dashboardData: SuperAdminDashboardData }) {
  const { t } = useTranslation();
  const { auth } = usePage().props as any;
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(() => dashboardData?.revenueYear ?? new Date().getFullYear());
  const [selectedCompaniesYear, setSelectedCompaniesYear] = useState<number>(() => dashboardData?.companiesYear ?? new Date().getFullYear());
  const [primaryColor, setPrimaryColor] = useState('#3b82f6');

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

  const pageActions = [
    {
      label: t('Refresh'),
      icon: <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />,
      variant: 'outline' as const,
      onClick: handleRefresh,
    },
  ];

  const stats = dashboardData?.stats || {
    totalCompanies: 0, totalUsers: 0, totalRevenue: 0,
    activePlans: 0, pendingRequests: 0, monthlyGrowth: 0, activeCoupons: 0,
  };

  const recentActivity = dashboardData?.recentActivity || [];
  const topPlans = dashboardData?.topPlans || [];
  const monthlyRevenue = dashboardData?.monthlyRevenue || [];
  const availableYears = dashboardData?.availableYears || [new Date().getFullYear()];
  const monthlyCompanies = dashboardData?.monthlyCompanies || [];
  const availableCompanyYears = dashboardData?.availableCompanyYears || [new Date().getFullYear()];
  const maxRevenue = topPlans.length > 0 ? Math.max(...topPlans.map(p => p.revenue)) : 1;

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    router.reload({ data: { revenueYear: year, companiesYear: selectedCompaniesYear }, only: ['dashboardData'], preserveState: true });
  };

  const handleCompaniesYearChange = (year: number) => {
    setSelectedCompaniesYear(year);
    router.reload({ data: { revenueYear: selectedYear, companiesYear: year }, only: ['dashboardData'], preserveState: true });
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return t('Good morning');
    if (h < 17) return t('Good afternoon');
    return t('Good evening');
  };

  const formatCurrency = (val: number) =>
    window.appSettings?.formatCurrency(val) ?? `$${val.toLocaleString()}`;

  const fadeUp = (delay = 0) =>
    `transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`
    + (delay ? ` delay-${delay}` : '');

  return (
    <PageTemplate
      title={t('Dashboard')}
      url="/dashboard"
      actions={pageActions}
      description={t('System overview — companies, revenue, plans and recent activity.')}
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
              <h2 className="text-white text-xl sm:text-2xl font-bold truncate group-hover:text-primary transition-colors duration-300">
                {auth?.user?.name ?? 'Super Admin'}
              </h2>
              <span className="animate-hand-wave text-2xl sm:text-3xl select-none">👋</span>
            </div>
            <p className="text-slate-400 text-xs mt-1 hidden sm:block group-hover:text-slate-300 transition-colors duration-300">
              {t("Here's what's happening across your platform today.")}
            </p>
            <div className="flex items-center gap-3 mt-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-primary/70 rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1.2s' }} />
                <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '150ms', animationDuration: '1.2s' }} />
                <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '300ms', animationDuration: '1.2s' }} />
              </div>
              <span className="text-primary font-semibold text-sm group-hover:scale-105 transition-transform duration-200">
                {stats.totalActivePlanCompanies.toLocaleString()} {t('active plan companies')}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <div className="rounded-xl bg-white/10 px-4 py-2.5 text-center min-w-[80px] hover:bg-white/15 hover:scale-105 transition-all duration-300">
              <p className="text-white text-lg font-bold leading-tight">{stats.totalCompanies}</p>
              <p className="text-slate-400 text-[11px]">{t('Companies')}</p>
            </div>
            <div className="rounded-xl bg-white/10 px-4 py-2.5 text-center min-w-[80px] hover:bg-white/15 hover:scale-105 transition-all duration-300">
              <p className="text-emerald-400 text-lg font-bold leading-tight">{stats.monthlyGrowth}%</p>
              <p className="text-slate-400 text-[11px]">{t('Growth')}</p>
            </div>
            <div className="w-px h-10 bg-white/10 hidden sm:block" />
            {[
              { icon: Tag, label: t('Coupons'), href: route('coupons.index'), color: 'text-rose-300 hover:text-rose-200', bg: 'hover:bg-rose-400/10' },
              { icon: Gift, label: t('Referral'), href: route('referral.index'), color: 'text-violet-300 hover:text-violet-200', bg: 'hover:bg-violet-400/10' },
              { icon: Settings, label: t('Settings'), href: route('settings'), color: 'text-slate-300 hover:text-slate-200', bg: 'hover:bg-white/10' },
            ].map(({ icon: Icon, label, href, color, bg }) => (
              <Link key={label} href={href} className={`flex flex-col items-center gap-1 rounded-xl px-3 py-2 transition-all duration-200 ${bg} group/qa`}>
                <Icon className={`h-5 w-5 transition-all duration-200 ${color} group-hover/qa:-translate-y-0.5`} />
                <span className="text-slate-400 text-[10px] group-hover/qa:text-slate-300 transition-colors duration-200">{label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* ── KPI Row ── */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">

          {/* Revenue */}
          <Link href={route('plan-orders.index')} className={`group ${fadeUp(100)}`}>
            <Card className="h-full border border-emerald-300 dark:border-emerald-800 shadow-sm bg-emerald-50 dark:bg-emerald-950/40 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
              <CardContent className="relative overflow-hidden p-5">
                <span className="pointer-events-none absolute -top-3 right-4 w-10 h-10 rounded-full bg-emerald-300/40 dark:bg-emerald-500/10 animate-ping" style={{ animationDuration: '6s' }} />
                <span className="pointer-events-none absolute top-1 right-1 w-14 h-14 rounded-full bg-emerald-200/30 dark:bg-emerald-600/10 animate-pulse" style={{ animationDuration: '7s' }} />
                <span className="pointer-events-none absolute bottom-1 right-8 w-7 h-7 rounded-full bg-emerald-400/30 dark:bg-emerald-400/10 animate-ping" style={{ animationDuration: '5s', animationDelay: '2s' }} />
                <div className="flex items-start justify-between mb-4">
                  <div className="rounded-xl bg-emerald-100 dark:bg-emerald-900/60 p-2.5">
                    <Banknote className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-emerald-300 group-hover:text-emerald-600 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all duration-200" />
                </div>
                <p className="text-emerald-700 dark:text-emerald-400 text-xs mb-1">{t('Total Revenue')}</p>
                <p className="text-emerald-900 dark:text-emerald-100 text-2xl font-bold tracking-tight font-mono">{formatCurrency(stats.totalRevenue)}</p>
                <p className="text-emerald-600 dark:text-emerald-500 text-[11px] mt-1.5">{t('from approved orders')}</p>
              </CardContent>
            </Card>
          </Link>

          {/* Total Companies */}
          <Link href={route('companies.index')} className={`group ${fadeUp(150)}`}>
            <Card className="h-full border border-blue-200 dark:border-blue-900/50 shadow-sm bg-blue-50 dark:bg-blue-950/30 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer dark:bg-slate-900">
              <CardContent className="relative overflow-hidden p-5">
                <span className="pointer-events-none absolute -top-3 right-4 w-10 h-10 rounded-full bg-blue-300/40 dark:bg-blue-500/10 animate-ping" style={{ animationDuration: '7s' }} />
                <span className="pointer-events-none absolute top-1 right-1 w-14 h-14 rounded-full bg-blue-200/30 dark:bg-blue-600/10 animate-pulse" style={{ animationDuration: '8s' }} />
                <span className="pointer-events-none absolute bottom-1 right-8 w-7 h-7 rounded-full bg-blue-400/30 dark:bg-blue-400/10 animate-ping" style={{ animationDuration: '6s', animationDelay: '1.5s' }} />
                <div className="flex items-start justify-between mb-4">
                  <div className="rounded-xl bg-blue-100 dark:bg-blue-900/50 p-2.5">
                    <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-blue-200 group-hover:text-blue-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all duration-200" />
                </div>
                <p className="text-blue-700 dark:text-blue-400 text-xs mb-1">{t('Total Companies')}</p>
                <p className="text-blue-900 dark:text-blue-100 text-2xl font-bold tracking-tight">{stats.totalCompanies.toLocaleString()}</p>
                <p className="text-emerald-600 text-[11px] mt-1.5 flex items-center gap-0.5">
                  <TrendingUp className="h-3 w-3" /> {stats.monthlyGrowth}% {t('this month')}
                </p>
              </CardContent>
            </Card>
          </Link>

          {/* Active Plans */}
          <Link href={route('plans.index')} className={`group ${fadeUp(200)}`}>
            <Card className="h-full border border-violet-200 dark:border-violet-900/50 shadow-sm bg-violet-50 dark:bg-violet-950/30 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
              <CardContent className="relative overflow-hidden p-5">
                <span className="pointer-events-none absolute -top-3 right-4 w-10 h-10 rounded-full bg-violet-300/40 dark:bg-violet-500/10 animate-ping" style={{ animationDuration: '8s' }} />
                <span className="pointer-events-none absolute top-1 right-1 w-14 h-14 rounded-full bg-violet-200/30 dark:bg-violet-600/10 animate-pulse" style={{ animationDuration: '6s' }} />
                <span className="pointer-events-none absolute bottom-1 right-8 w-7 h-7 rounded-full bg-violet-400/30 dark:bg-violet-400/10 animate-ping" style={{ animationDuration: '5s', animationDelay: '2.5s' }} />
                <div className="flex items-start justify-between mb-4">
                  <div className="rounded-xl bg-violet-100 dark:bg-violet-900/50 p-2.5">
                    <CreditCard className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-violet-200 group-hover:text-violet-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all duration-200" />
                </div>
                <p className="text-violet-700 dark:text-violet-400 text-xs mb-1">{t('Active Plans')}</p>
                <p className="text-violet-900 dark:text-violet-100 text-2xl font-bold tracking-tight">{stats.activePlans.toLocaleString()}</p>
                <p className="text-violet-500 dark:text-violet-400 text-[11px] mt-1.5">{t('subscription plans')}</p>
              </CardContent>
            </Card>
          </Link>

          {/* Total Users */}
          <div className={`group ${fadeUp(300)}`}>
            <Card className="h-full border border-indigo-200 dark:border-indigo-900/50 shadow-sm bg-indigo-50 dark:bg-indigo-950/30 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
              <CardContent className="relative overflow-hidden p-5">
                <span className="pointer-events-none absolute -top-3 right-4 w-10 h-10 rounded-full bg-indigo-300/40 dark:bg-indigo-500/10 animate-ping" style={{ animationDuration: '7s' }} />
                <span className="pointer-events-none absolute top-1 right-1 w-14 h-14 rounded-full bg-indigo-200/30 dark:bg-indigo-600/10 animate-pulse" style={{ animationDuration: '8s' }} />
                <span className="pointer-events-none absolute bottom-1 right-8 w-7 h-7 rounded-full bg-indigo-400/30 dark:bg-indigo-400/10 animate-ping" style={{ animationDuration: '6s', animationDelay: '1s' }} />
                <div className="flex items-start justify-between mb-4">
                  <div className="rounded-xl bg-indigo-100 dark:bg-indigo-900/50 p-2.5">
                    <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                </div>
                <p className="text-indigo-700 dark:text-indigo-400 text-xs mb-1">{t('Total Users')}</p>
                <p className="text-indigo-900 dark:text-indigo-100 text-2xl font-bold tracking-tight">{stats.totalUsers.toLocaleString()}</p>
                <p className="text-indigo-500 dark:text-indigo-400 text-[11px] mt-1.5">{t('registered users')}</p>
              </CardContent>
            </Card>
          </div>

          {/* Pending Requests */}
          <Link href={route('plan-requests.index')} className={`group ${fadeUp(250)}`}>
            <Card className={`h-full border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer ${
              stats.pendingRequests > 0
                ? 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30'
                : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900'
            }`}>
              <CardContent className="relative overflow-hidden p-5">
                <span className="pointer-events-none absolute -top-3 right-4 w-10 h-10 rounded-full bg-amber-300/40 dark:bg-amber-500/10 animate-ping" style={{ animationDuration: '7s' }} />
                <span className="pointer-events-none absolute top-1 right-1 w-14 h-14 rounded-full bg-amber-200/30 dark:bg-amber-600/10 animate-pulse" style={{ animationDuration: '9s' }} />
                <span className="pointer-events-none absolute bottom-1 right-8 w-7 h-7 rounded-full bg-amber-400/30 dark:bg-amber-400/10 animate-ping" style={{ animationDuration: '6s', animationDelay: '3s' }} />
                <div className="flex items-start justify-between mb-4">
                  <div className={`rounded-xl p-2.5 ${stats.pendingRequests > 0 ? 'bg-amber-100 dark:bg-amber-900/50' : 'bg-muted'}`}>
                    <AlertCircle className={`h-5 w-5 ${stats.pendingRequests > 0 ? 'text-amber-600 dark:text-amber-400 animate-pulse' : 'text-muted-foreground'}`} />
                  </div>
                  {stats.pendingRequests > 0 && (
                    <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20 animate-bounce">
                      {t('Action needed')}
                    </span>
                  )}
                </div>
                <p className="text-amber-700 dark:text-amber-400 text-xs mb-1">{t('Pending Requests')}</p>
                <p className={`text-2xl font-bold tracking-tight ${stats.pendingRequests > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-slate-700 dark:text-slate-300'}`}>
                  {stats.pendingRequests.toLocaleString()}
                </p>
                <p className="text-amber-500 dark:text-amber-500 text-[11px] mt-1.5">{t('awaiting approval')}</p>
              </CardContent>
            </Card>
          </Link>

        </div>

        {/* ── Main Content ── */}
        <div className={`grid gap-4 lg:grid-cols-5 ${fadeUp(300)}`}>

          {/* Recently Registered Companies */}
          <Card className="lg:col-span-3 border border-blue-100 dark:border-blue-900/40 shadow-sm dark:bg-slate-900 overflow-hidden">
            <CardHeader className="pb-3 pt-5 px-5 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">{t('Recently Registered Companies')}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('Latest companies that joined the platform')}</p>
                </div>
                <Link href={route('companies.index')} className="flex items-center gap-1 text-xs text-primary font-medium shrink-0 hover:gap-1.5 transition-all duration-150">
                  {t('View all')} <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {recentActivity.length > 0 ? (
                <div>
                  {recentActivity.map((company, i) => (
                    <div
                      key={company.id}
                      className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/50 dark:hover:bg-slate-800/60 transition-colors duration-150 group/row"
                      style={{ animationDelay: `${i * 60}ms` }}
                    >
                      <div className="relative w-9 h-9 shrink-0">
                        {company.avatar ? (
                          <img
                            src={company.avatar}
                            alt={company.name}
                            className="w-9 h-9 rounded-full object-cover shadow-sm group-hover/row:scale-105 transition-transform duration-150"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }}
                          />
                        ) : <UserInitials name={company?.name} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate leading-tight">{company.name}</p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{company.email}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20">
                          {t('Active')}
                        </span>
                        <span className="text-[11px] text-muted-foreground">{company.registered_at}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-40 gap-3">
                  <div className="rounded-full bg-muted p-4 animate-pulse">
                    <Building2 className="h-6 w-6 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm text-muted-foreground">{t('No companies registered yet')}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Plans */}
          <Card className="lg:col-span-2 border border-violet-100 dark:border-violet-900/40 shadow-sm dark:bg-slate-900 overflow-hidden">
            <CardHeader className="pb-3 pt-5 px-5 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">{t('Top Plans')}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('By revenue generated')}</p>
                </div>
                <Link href={route('plans.index')} className="flex items-center gap-1 text-xs text-primary font-medium shrink-0 hover:gap-1.5 transition-all duration-150">
                  {t('View all')} <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {topPlans.length > 0 ? (
                <div>
                  {topPlans.map((plan, index) => {
                    const barPct = maxRevenue > 0 ? Math.round((plan.revenue / maxRevenue) * 100) : 0;
                    return (
                      <div key={plan.name} className="flex items-center gap-3 px-5 py-4 hover:bg-muted/50 dark:hover:bg-slate-800/60 transition-colors duration-150 group/plan">
                        <UserInitials name={`${index+1}`}/>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <p className="text-sm font-semibold truncate">{plan.name}</p>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-muted dark:bg-slate-700 overflow-hidden">
                            <div
                              className={`h-1.5 rounded-full bg-primary transition-all duration-1000 ease-out`}
                              style={{ width: mounted ? `${barPct}%` : '0%' }}
                            />
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-1">
                            {plan.subscribers} {t('subscribers')}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold font-mono">{formatCurrency(plan.revenue)}</p>
                          <p className="text-[11px] text-muted-foreground">{t('revenue')}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-40 gap-3">
                  <div className="rounded-full bg-muted p-4 animate-pulse">
                    <CreditCard className="h-6 w-6 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm text-muted-foreground">{t('No plan data available')}</p>
                </div>
              )}
            </CardContent>
          </Card>

        </div>

        {/* ── Monthly Companies Chart ── */}
        <div className={fadeUp(375)}>
          <Card className="border border-border shadow-sm dark:bg-slate-900 overflow-hidden">
            <CardHeader className="pb-3 pt-5 px-5 border-b">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <CardTitle className="text-base font-semibold">{t('New Companies Registered')}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('Companies joined per month')} — {selectedCompaniesYear}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-900/20 dark:text-emerald-400 dark:ring-emerald-500/30">
                    {monthlyCompanies.reduce((s, m) => s + m.count, 0)} {t('total')}
                  </span>
                  <Select value={String(selectedCompaniesYear)} onValueChange={(v) => handleCompaniesYearChange(Number(v))}>
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
              {monthlyCompanies.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyCompanies} margin={{ top: 20, right: 8, left: 0, bottom: 0 }} accessibilityLayer={false}>
                    <CartesianGrid strokeDasharray="3 3" stroke={primaryColor} strokeOpacity={0.3} vertical={false} />
                    <XAxis
                      dataKey="short"
                      tick={{ fontSize: 11, fill: 'currentColor' }}
                      className="text-muted-foreground"
                      axisLine={{ stroke: primaryColor }}
                      tickLine={{ stroke: primaryColor }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: 'currentColor' }}
                      className="text-muted-foreground"
                      axisLine={{ stroke: primaryColor }}
                      tickLine={{ stroke: primaryColor }}
                      allowDecimals={false}
                      width={36}
                    />
                    <Tooltip
                      contentStyle={{
                        fontSize: 12,
                        borderRadius: 8,
                        border: `1px solid ${primaryColor}30`,
                        backgroundColor: "rgba(255, 255, 255, 0.7)",
                        color: primaryColor,
                      }}
                      formatter={(value: number) => [value, t('Companies')]}
                      labelFormatter={(label, payload) => payload?.[0]?.payload?.month ?? label}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={30} isAnimationActive={false}>
                      <LabelList dataKey="count" position="top" style={{ fontSize: 11, fill: primaryColor, fontWeight: 600 }} formatter={(v: number) => v > 0 ? v : ''} />
                      {monthlyCompanies.map((_, i) => (
                        <Cell key={i} fill={primaryColor} fillOpacity={0.7} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-40 gap-3">
                  <div className="rounded-full bg-muted p-4 animate-pulse">
                    <Building2 className="h-6 w-6 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm text-muted-foreground">{t('No company data available')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Monthly Revenue Chart ── */}
        <div className={fadeUp(350)}>
          <Card className="border border-border shadow-sm dark:bg-slate-900 overflow-hidden">
            <CardHeader className="pb-3 pt-5 px-5 border-b">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <CardTitle className="text-base font-semibold">{t('Monthly Revenue')}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('Approved plan orders')} — {selectedYear}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium font-mono bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20 dark:bg-green-900/20 dark:text-green-400 dark:ring-green-500/30">
                    {formatCurrency(monthlyRevenue.reduce((s, m) => s + m.revenue, 0))}
                  </span>
                  <Select value={String(selectedYear)} onValueChange={(v) => handleYearChange(Number(v))}>
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
              {monthlyRevenue.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={monthlyRevenue} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} accessibilityLayer={false}>
                    <defs>
                      <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={primaryColor} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={primaryColor} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={primaryColor} strokeOpacity={0.3} vertical={false} />
                    <XAxis
                      dataKey="short"
                      tick={{ fontSize: 11, fill: 'currentColor' }}
                      className="text-muted-foreground"
                      axisLine={{ stroke: primaryColor }}
                      tickLine={{ stroke: primaryColor }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: 'currentColor' }}
                      className="text-muted-foreground"
                      axisLine={{ stroke: primaryColor }}
                      tickLine={{ stroke: primaryColor }}
                      tickFormatter={(v) => formatCurrency(v)}
                      width={72}
                    />
                    <Tooltip
                      contentStyle={{
                        fontSize: 12,
                        borderRadius: 8,
                        border: `1px solid ${primaryColor}30`,
                        background: 'hsl(var(--popover))',
                        color: 'hsl(var(--popover-foreground))',
                      }}
                      formatter={(value: number) => [formatCurrency(value), t('Revenue')]}
                      labelFormatter={(label, payload) => payload?.[0]?.payload?.month ?? label}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke={primaryColor}
                      strokeWidth={2}
                      fill="url(#revenueGrad)"
                      dot={{ r: 3, fill: primaryColor, strokeWidth: 0 }}
                      activeDot={{ r: 5, fill: primaryColor, strokeWidth: 0 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-40 gap-3">
                  <div className="rounded-full bg-muted p-4 animate-pulse">
                    <DollarSign className="h-6 w-6 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm text-muted-foreground">{t('No revenue data available')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>

    </PageTemplate>
  );
}
