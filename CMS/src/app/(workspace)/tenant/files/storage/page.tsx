'use client';

import React, { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { getSocketClient } from '@/lib/socket';
import { toast } from 'sonner';
import {
  HardDrive,
  Database,
  Trash2,
  RefreshCw,
  TrendingUp,
  PieChart,
  Users,
  Folder,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  Layers,
  ArrowUpRight,
  ShieldAlert,
  Edit2,
  ExternalLink,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

// SSR-safe ApexCharts import
const Chart = lazy(() => import('react-apexcharts'));
import RetentionTab from './RetentionTab';

export default function TenantStorageAdministrationPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'teams' | 'governance' | 'analytics' | 'reconcile' | 'activity' | 'retention'>('overview');
  const [isReconciling, setIsReconciling] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [overrideQuotaGb, setOverrideQuotaGb] = useState('10');
  const [isSavingQuota, setIsSavingQuota] = useState(false);
  const [editingTeam, setEditingTeam] = useState<any | null>(null);
  const [teamQuotaGb, setTeamQuotaGb] = useState('10');
  const [isSavingTeamQuota, setIsSavingTeamQuota] = useState(false);
  const [editingDept, setEditingDept] = useState<any | null>(null);
  const [deptQuotaGb, setDeptQuotaGb] = useState('20');
  const [isSavingDeptQuota, setIsSavingDeptQuota] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [analyticsLookback, setAnalyticsLookback] = useState<7 | 30 | 90>(30);
  // Check URL search params for initial tab
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const tab = urlParams.get('tab');
      if (
        tab &&
        ['overview', 'users', 'teams', 'governance', 'analytics', 'reconcile', 'activity', 'retention'].includes(tab)
      ) {
        setActiveTab(tab as any);
      }
    }
  }, []);


  // Real-time Socket.IO Sync State
  const [socketConnected, setSocketConnected] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date>(new Date());

  // Connect to Socket.IO and listen for tenant storage & file events
  useEffect(() => {
    let socket: any;
    try {
      socket = getSocketClient();
      if (socket.connected) {
        setSocketConnected(true);
      }
      const onConnect = () => setSocketConnected(true);
      const onDisconnect = () => setSocketConnected(false);

      const handleTenantStorageUpdate = () => {
        setLastSyncedAt(new Date());
        qc.invalidateQueries({ queryKey: ['tenant-storage-summary'] });
        qc.invalidateQueries({ queryKey: ['tenant-storage-activity'] });
        qc.invalidateQueries({ queryKey: ['tenant-storage-governance'] });
        qc.invalidateQueries({ queryKey: ['tenant-storage-analytics'] });
        qc.invalidateQueries({ queryKey: ['tenant-storage-reconcile-audit'] });
      };

      socket.on('connect', onConnect);
      socket.on('disconnect', onDisconnect);
      socket.on('storage:tenant:update', handleTenantStorageUpdate);
      socket.on('storage:quota_updated', handleTenantStorageUpdate);
      socket.on('storage.usage.updated', handleTenantStorageUpdate);
      socket.on('storage:alert', handleTenantStorageUpdate);
      socket.on('file:uploaded', handleTenantStorageUpdate);
      socket.on('file:trashed', handleTenantStorageUpdate);
      socket.on('file:restored', handleTenantStorageUpdate);
      socket.on('file:deleted', handleTenantStorageUpdate);
      socket.on('quota:warning', handleTenantStorageUpdate);
      socket.on('quota:critical', handleTenantStorageUpdate);
      socket.on('quota:locked', handleTenantStorageUpdate);
      socket.on('quota:updated', handleTenantStorageUpdate);

      return () => {
        socket.off('connect', onConnect);
        socket.off('disconnect', onDisconnect);
        socket.off('storage:tenant:update', handleTenantStorageUpdate);
        socket.off('storage:quota_updated', handleTenantStorageUpdate);
        socket.off('storage.usage.updated', handleTenantStorageUpdate);
        socket.off('storage:alert', handleTenantStorageUpdate);
        socket.off('file:uploaded', handleTenantStorageUpdate);
        socket.off('file:trashed', handleTenantStorageUpdate);
        socket.off('file:restored', handleTenantStorageUpdate);
        socket.off('file:deleted', handleTenantStorageUpdate);
        socket.off('quota:warning', handleTenantStorageUpdate);
        socket.off('quota:critical', handleTenantStorageUpdate);
        socket.off('quota:locked', handleTenantStorageUpdate);
        socket.off('quota:updated', handleTenantStorageUpdate);
      };
    } catch (e) {
      console.warn('[TenantStorage] Socket error:', e);
    }
  }, [qc]);

  // 1. Fetch Tenant Storage Summary
  const { data: summary, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['tenant-storage-summary'],
    queryFn: async () => {
      const res = await api.get('/api/v1/tenant/storage/summary');
      return (res as any)?.data ?? res;
    },
  });

  // 2. Fetch Growth & Capacity Forecast Analytics
  const { data: analytics, isFetching: isAnalyticsFetching, refetch: refetchAnalytics } = useQuery({
    queryKey: ['tenant-storage-analytics', analyticsLookback],
    queryFn: async () => {
      const res = await api.get(`/api/v1/tenant/storage/analytics?lookbackDays=${analyticsLookback}`);
      return (res as any)?.data ?? res;
    },
  });

  // 3. Fetch Reconciliation Audit
  const { data: reconciliationAudit, refetch: refetchAudit, isFetching: isAuditing } = useQuery({
    queryKey: ['tenant-storage-reconcile-audit'],
    queryFn: async () => {
      const res = await api.post('/api/v1/tenant/storage/reconcile', { dryRun: true });
      return (res as any)?.data ?? res;
    },
  });

  // Execute Repair
  const handleExecuteRepair = async () => {
    try {
      setIsReconciling(true);
      const res: any = await api.post('/api/v1/tenant/storage/reconcile', { dryRun: false });
      if (res?.repaired || res?.data?.repaired) {
        toast.success('Storage counters reconciled successfully to match physical source records.');
      } else {
        toast.info('Storage counters are already in sync.');
      }
      refetch();
      refetchAudit();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to reconcile storage');
    } finally {
      setIsReconciling(false);
    }
  };

  // 4. Fetch Quota Governance Summary
  const { data: governanceData, refetch: refetchGovernance } = useQuery({
    queryKey: ['tenant-storage-governance'],
    queryFn: async () => {
      const res = await api.get('/api/v1/tenant/storage/quotas');
      return (res as any)?.data ?? res;
    },
  });

  // 5. Fetch Storage Activity Timeline
  const { data: activityData, isLoading: isActivityLoading, refetch: refetchActivity } = useQuery({
    queryKey: ['tenant-storage-activity'],
    queryFn: async () => {
      const res = await api.get('/api/v1/tenant/storage/activity?limit=50');
      return (res as any)?.data ?? res;
    },
  });
  const activities = Array.isArray(activityData) ? activityData : (activityData?.activities || activityData?.data || []);

  // Save Team Quota
  const handleSaveTeamQuota = async () => {
    if (!editingTeam) return;
    try {
      setIsSavingTeamQuota(true);
      const bytes = BigInt(Math.round(parseFloat(teamQuotaGb) * 1024 * 1024 * 1024));
      await api.put(`/api/v1/tenant/storage/quotas/teams/${editingTeam.id}`, {
        quotaBytes: bytes.toString(),
      });
      toast.success(`Team storage quota updated for ${editingTeam.name}.`);
      setEditingTeam(null);
      refetch();
      refetchGovernance();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err.message || 'Failed to update team quota');
    } finally {
      setIsSavingTeamQuota(false);
    }
  };

  // Save Department Quota
  const handleSaveDeptQuota = async () => {
    if (!editingDept) return;
    try {
      setIsSavingDeptQuota(true);
      const bytes = BigInt(Math.round(parseFloat(deptQuotaGb) * 1024 * 1024 * 1024));
      await api.put(`/api/v1/tenant/storage/quotas/departments/${editingDept.id}`, {
        quotaBytes: bytes.toString(),
      });
      toast.success(`Department storage quota updated for ${editingDept.name}.`);
      setEditingDept(null);
      refetch();
      refetchGovernance();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err.message || 'Failed to update department quota');
    } finally {
      setIsSavingDeptQuota(false);
    }
  };
  const handleSaveUserQuota = async () => {
    if (!editingUser) return;
    try {
      setIsSavingQuota(true);
      const bytes = BigInt(Math.round(parseFloat(overrideQuotaGb) * 1024 * 1024 * 1024));
      await api.put(`/api/v1/tenant/storage/quotas/users/${editingUser.userId}`, {
        quotaBytes: bytes.toString(),
      });
      toast.success(`Storage quota updated for ${editingUser.name}.`);
      setEditingUser(null);
      refetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to update user quota');
    } finally {
      setIsSavingQuota(false);
    }
  };

  const usage = summary?.usage || {
    activeBytes: 0,
    formattedActive: '0 B',
    trashBytes: 0,
    formattedTrash: '0 B',
    versionBytes: 0,
    formattedVersion: '0 B',
    reservedBytes: 0,
    formattedReserved: '0 B',
    totalBillableBytes: 0,
    formattedTotalBillable: '0 B',
    availableBytes: 0,
    formattedAvailable: '0 B',
    percentUsed: 0,
    thresholdState: 'NORMAL',
    fileCount: 0,
    folderCount: 0,
  };

  const quota = summary?.quota || {
    quotaBytes: 0,
    formattedQuota: '10 GB',
    quotaSource: 'PLAN',
  };

  const isWarning = usage.percentUsed >= 70;
  const isHigh = usage.percentUsed >= 85;
  const isCritical = usage.percentUsed >= 95;
  const isLocked = usage.percentUsed >= 100;

  // Filtered Users
  const filteredUsers = useMemo(() => {
    if (!summary?.topUsers) return [];
    if (!userSearch) return summary.topUsers;
    const q = userSearch.toLowerCase();
    return summary.topUsers.filter(
      (u: any) => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
    );
  }, [summary?.topUsers, userSearch]);

  // Category Donut Chart
  const categoryChartOptions: any = {
    chart: { type: 'donut', fontFamily: 'inherit', background: 'transparent' },
    labels: summary?.categories?.map((c: any) => c.category) || [],
    colors: ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6366F1', '#94A3B8'],
    legend: { position: 'bottom', labels: { colors: 'currentColor' } },
    dataLabels: { enabled: false },
    stroke: { show: false },
    theme: { mode: 'light' },
  };
  const categoryChartSeries = summary?.categories?.map((c: any) => c.bytes) || [];

  return (
    <div className="p-6 space-y-6 max-w-[1500px] mx-auto min-h-screen text-foreground">
      {/* ── Top Header Ribbon ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-foreground">
                Organization Storage Administration
              </h1>
              <Badge variant="outline" className="text-xs font-mono">
                {summary?.tenant?.planName || 'Plan'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Monitor cloud storage consumption, manage user allocations, and audit data retention.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Real-time Storage Sync Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-card border border-border/60 shadow-2xs">
            <span className={`w-2 h-2 rounded-full ${socketConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
            <span className="text-foreground">
              {socketConnected ? "Live Storage Sync" : "Reconnecting..."}
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">
              {lastSyncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => { refetch(); refetchActivity(); refetchGovernance(); }}
            disabled={isFetching}
            className="gap-2 h-9 text-xs font-semibold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveTab('reconcile')}
            className="gap-2 h-9 text-xs font-semibold"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Integrity Audit
          </Button>
        </div>
      </div>

      {/* ── Threshold Warning Banner (If Warning, High, Critical or Locked) ── */}
      {isWarning && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs ${
            isLocked
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
              : isCritical
              ? 'bg-orange-500/10 border-orange-500/30 text-orange-600 dark:text-orange-400'
              : isHigh
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
              : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-700 dark:text-yellow-400'
          }`}
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <div>
              <span className="font-bold">
                {isLocked
                  ? 'Storage Quota Reached (100%): File uploads and new versions are currently frozen.'
                  : isCritical
                  ? 'Critical Storage Warning (&ge; 95%): Approaching plan ceiling.'
                  : isHigh
                  ? 'High Storage Consumption (&ge; 85%): Please review heavy files.'
                  : 'Storage Notice (&ge; 70%): Approaching capacity limit.'}
              </span>
              <p className="text-[11px] opacity-90 mt-0.5">
                Emptying your Recycle Bin or upgrading your subscription plan will reclaim storage capacity immediately.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 h-8 text-xs font-semibold bg-background"
            onClick={() => setActiveTab('reconcile')}
          >
            Manage Storage
          </Button>
        </div>
      )}

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Effective Quota Limit */}
        <div className="p-4 rounded-xl border border-border/60 bg-card/80 backdrop-blur-md shadow-xs space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Allocated Plan Quota</span>
            <Database className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-foreground font-mono">
            {quota.formattedQuota}
          </div>
          <div className="text-[11px] text-muted-foreground flex items-center justify-between">
            <span>Source: {quota.quotaSource}</span>
            <Badge variant="secondary" className="text-[10px] h-4 px-1">
              {summary?.tenant?.planName || 'Plan'}
            </Badge>
          </div>
        </div>

        {/* Active Used Storage */}
        <div className="p-4 rounded-xl border border-border/60 bg-card/80 backdrop-blur-md shadow-xs space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Active Files In Use</span>
            <HardDrive className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-foreground font-mono">
            {usage.formattedActive}
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{usage.percentUsed}% of total quota</span>
            <span className="font-mono">{usage.fileCount} files</span>
          </div>
        </div>

        {/* Recycle Bin Reclaimable */}
        <div className="p-4 rounded-xl border border-border/60 bg-card/80 backdrop-blur-md shadow-xs space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Recycle Bin Retention</span>
            <Trash2 className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-foreground font-mono">
            {usage.formattedTrash}
          </div>
          <div className="text-[11px] text-muted-foreground flex items-center justify-between">
            <span>Soft-deleted files</span>
            <span className="text-amber-500 font-semibold font-mono">Reclaimable</span>
          </div>
        </div>

        {/* Available Runway */}
        <div className="p-4 rounded-xl border border-border/60 bg-card/80 backdrop-blur-md shadow-xs space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Available Runway</span>
            <TrendingUp className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-foreground font-mono">
            {usage.formattedAvailable}
          </div>
          <div className="text-[11px] text-muted-foreground flex items-center justify-between">
            <span>Remaining buffer</span>
            <Badge
              className={`text-[10px] h-4 px-1 font-semibold border ${
                isLocked
                  ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                  : isWarning
                  ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                  : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
              }`}
            >
              {usage.thresholdState}
            </Badge>
          </div>
        </div>
      </div>

      {/* ── Navigation Tabs ── */}
      <div className="flex items-center gap-1 border-b border-border/60 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-2.5 px-4 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'overview'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <PieChart className="w-4 h-4" />
          Storage Overview
        </button>
        <button
          onClick={() => setActiveTab('retention')}
          className={`py-2.5 px-4 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'retention'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          Retention & Legal Holds
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`py-2.5 px-4 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'users'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="w-4 h-4" />
          User Quotas & Leaderboard
        </button>
        <button
          onClick={() => setActiveTab('teams')}
          className={`py-2.5 px-4 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'teams'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Folder className="w-4 h-4" />
          Team Folders Pool
        </button>
        <button
          onClick={() => setActiveTab('governance')}
          className={`py-2.5 px-4 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'governance'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Layers className="w-4 h-4" />
          Quota Governance
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`py-2.5 px-4 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'analytics'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Growth & Forecasting
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={`py-2.5 px-4 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'activity'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Clock className="w-4 h-4" />
          Storage Activity
        </button>
        <button
          onClick={() => setActiveTab('reconcile')}
          className={`py-2.5 px-4 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'reconcile'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Integrity & Self-Healing
        </button>
      </div>

      {/* ── Tab Content 1: Overview ── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Storage Composition Progress */}
          <div className="lg:col-span-2 p-5 rounded-xl border border-border/60 bg-card/80 backdrop-blur-md shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              Multi-Dimensional Storage Composition
            </h3>

            {/* Visual Segmented Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span>
                  <strong>{usage.formattedActive}</strong> used of <strong>{quota.formattedQuota}</strong>
                </span>
                <span className="font-bold">{usage.percentUsed}%</span>
              </div>
              <div className="w-full h-3 rounded-full bg-secondary overflow-hidden flex">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${Math.min(100, usage.percentUsed)}%` }}
                  title={`Active Files: ${usage.formattedActive}`}
                />
              </div>
            </div>

            {/* Segment Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-3 rounded-lg bg-secondary/40 border border-border/40">
                <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  Active Files
                </div>
                <div className="text-sm font-bold font-mono text-foreground mt-1">{usage.formattedActive}</div>
                <div className="text-[10px] text-muted-foreground">{usage.fileCount} items</div>
              </div>

              <div className="p-3 rounded-lg bg-secondary/40 border border-border/40">
                <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Recycle Bin
                </div>
                <div className="text-sm font-bold font-mono text-foreground mt-1">{usage.formattedTrash}</div>
                <div className="text-[10px] text-amber-500 font-medium">Reclaimable</div>
              </div>

              <div className="p-3 rounded-lg bg-secondary/40 border border-border/40">
                <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  File Versions
                </div>
                <div className="text-sm font-bold font-mono text-foreground mt-1">{usage.formattedVersion}</div>
                <div className="text-[10px] text-muted-foreground">Historical blobs</div>
              </div>

              <div className="p-3 rounded-lg bg-secondary/40 border border-border/40">
                <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                  In-Flight Uploads
                </div>
                <div className="text-sm font-bold font-mono text-foreground mt-1">{usage.formattedReserved}</div>
                <div className="text-[10px] text-muted-foreground">Reserved buffer</div>
              </div>
            </div>

            {/* Quick Storage Guidance */}
            <div className="p-3.5 rounded-lg bg-accent/20 border border-border/50 text-xs text-muted-foreground space-y-1">
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                Storage Optimization Guidance
              </div>
              <p>
                Files moved to the Recycle Bin remain safely recoverable for 30 days. To free up storage immediately, you can permanently empty the Recycle Bin from the File Explorer.
              </p>
            </div>
          </div>

          {/* Category Distribution Donut */}
          <div className="p-5 rounded-xl border border-border/60 bg-card/80 backdrop-blur-md shadow-xs space-y-3">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <PieChart className="w-4 h-4 text-primary" />
              File Category Distribution
            </h3>
            <div className="min-h-[220px] flex items-center justify-center">
              {categoryChartSeries.length > 0 && categoryChartSeries.some((b: number) => b > 0) ? (
                <Suspense fallback={<div className="h-40 flex items-center justify-center text-xs text-muted-foreground">Loading chart...</div>}>
                  <Chart options={categoryChartOptions} series={categoryChartSeries} type="donut" width="100%" height={220} />
                </Suspense>
              ) : (
                <div className="text-xs text-muted-foreground text-center py-12">
                  No categorical file data available.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Tab Content 2: Users Leaderboard & Overrides ── */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Input
                placeholder="Search employees or email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="h-9 text-xs bg-background"
              />
            </div>
            <div className="text-xs text-muted-foreground">
              Default personal quota: <strong>5.0 GB</strong> per employee
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/80 bg-secondary/40 text-muted-foreground font-semibold">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Storage Used</th>
                  <th className="py-3 px-4">Allocated Quota</th>
                  <th className="py-3 px-4 w-40">Utilization</th>
                  <th className="py-3 px-4">Files</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-muted-foreground">
                      No users match the search filter.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u: any) => (
                    <tr key={u.userId} className="hover:bg-accent/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-foreground">{u.name}</div>
                        <div className="text-[11px] font-mono text-muted-foreground">{u.email}</div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{u.department}</td>
                      <td className="py-3 px-4 font-mono font-semibold">{u.formattedUsed}</td>
                      <td className="py-3 px-4 font-mono text-muted-foreground">{u.formattedQuota}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                          <span>{u.percentUsed}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
                          <div
                            className={`h-full ${
                              u.percentUsed >= 90
                                ? 'bg-rose-500'
                                : u.percentUsed >= 75
                                ? 'bg-amber-500'
                                : 'bg-primary'
                            }`}
                            style={{ width: `${Math.min(100, u.percentUsed)}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-muted-foreground">{u.fileCount}</td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingUser(u);
                            setOverrideQuotaGb((u.quotaBytes / (1024 * 1024 * 1024)).toFixed(0));
                          }}
                          className="h-7 px-2 text-xs gap-1"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Edit Quota
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Tab Content 3: Team Folders ── */}
      {activeTab === 'teams' && (
        <div className="space-y-4">
          <div className="text-xs text-muted-foreground">
            Collaborative team folders consume from the organization storage pool. Team quotas represent soft limits.
          </div>

          <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/80 bg-secondary/40 text-muted-foreground font-semibold">
                  <th className="py-3 px-4">Team Shared Workspace</th>
                  <th className="py-3 px-4">Team Members</th>
                  <th className="py-3 px-4">Storage Consumed</th>
                  <th className="py-3 px-4">Team Quota Limit</th>
                  <th className="py-3 px-4 w-40">Utilization</th>
                  <th className="py-3 px-4">Files</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {!summary?.teams || summary.teams.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-muted-foreground">
                      No team shared folders have been configured yet.
                    </td>
                  </tr>
                ) : (
                  summary.teams.map((tm: any) => (
                    <tr key={tm.id} className="hover:bg-accent/30 transition-colors">
                      <td className="py-3 px-4 font-semibold text-foreground flex items-center gap-2">
                        <Folder className="w-4 h-4 text-amber-500 fill-amber-500/20" />
                        {tm.name}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{tm.memberCount} members</td>
                      <td className="py-3 px-4 font-mono font-semibold">{tm.formattedUsed}</td>
                      <td className="py-3 px-4 font-mono text-muted-foreground">{tm.formattedQuota}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                          <span>{tm.percentUsed}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${Math.min(100, tm.percentUsed)}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-muted-foreground">{tm.fileCount}</td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingTeam(tm);
                            setTeamQuotaGb((tm.quotaBytes / (1024 * 1024 * 1024)).toFixed(0));
                          }}
                          className="h-7 px-2 text-xs gap-1"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Edit Quota
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Tab Content: Quota Governance & Hierarchy ── */}
      {activeTab === 'governance' && (
        <div className="space-y-6">
          {/* Governance Hierarchy Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-border/60 bg-card shadow-xs space-y-2">
              <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
                <span>Tenant Plan Quota</span>
                <Database className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-2xl font-bold font-mono text-foreground">
                {governanceData?.tenant?.formattedQuota || quota.formattedQuota}
              </div>
              <div className="text-[11px] text-muted-foreground flex items-center justify-between">
                <span>Platform Ceiling: {governanceData?.platformCeiling?.formattedLimit || '1.0 TB'}</span>
                <Badge variant="outline" className="text-[10px]">Tier 2</Badge>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-border/60 bg-card shadow-xs space-y-2">
              <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
                <span>Department Allocations</span>
                <Layers className="w-4 h-4 text-purple-500" />
              </div>
              <div className="text-2xl font-bold font-mono text-foreground">
                {governanceData?.departmentAllocationsTotal?.formattedTotal || '0 B'}
              </div>
              <div className="text-[11px] text-muted-foreground flex items-center justify-between">
                <span>{governanceData?.departmentAllocationsTotal?.oversubscriptionPercent || 0}% of tenant pool</span>
                <Badge variant="outline" className="text-[10px]">Tier 3</Badge>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-border/60 bg-card shadow-xs space-y-2">
              <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
                <span>Team Folder Allocations</span>
                <Folder className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-bold font-mono text-foreground">
                {governanceData?.teamAllocationsTotal?.formattedTotal || '0 B'}
              </div>
              <div className="text-[11px] text-muted-foreground flex items-center justify-between">
                <span>{governanceData?.teamAllocationsTotal?.oversubscriptionPercent || 0}% of tenant pool</span>
                <Badge variant="outline" className="text-[10px]">Tier 4</Badge>
              </div>
            </div>
          </div>

          {/* Department Quota Allocations Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-500" />
                  Department Quotas (Policy Allocation)
                </h3>
                <p className="text-xs text-muted-foreground">
                  Department allocations constrain collective usage of department members. Sum must not exceed workspace capacity.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border/80 bg-secondary/40 text-muted-foreground font-semibold">
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Members</th>
                    <th className="py-3 px-4">Allocated Quota</th>
                    <th className="py-3 px-4">Consumed Storage</th>
                    <th className="py-3 px-4 w-36">Utilization</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {!governanceData?.departments || governanceData.departments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-muted-foreground">
                        No departments found.
                      </td>
                    </tr>
                  ) : (
                    governanceData.departments.map((dept: any) => (
                      <tr key={dept.id} className="hover:bg-accent/30 transition-colors">
                        <td className="py-3 px-4 font-semibold text-foreground">{dept.name}</td>
                        <td className="py-3 px-4 font-mono text-muted-foreground">{dept.code || '-'}</td>
                        <td className="py-3 px-4 text-muted-foreground">{dept.employeeCount || 0} employees</td>
                        <td className="py-3 px-4 font-mono font-semibold">{dept.formattedQuota}</td>
                        <td className="py-3 px-4 font-mono">{dept.formattedUsed}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                            <span>{dept.percentUsed}%</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
                            <div
                              className="h-full bg-blue-500"
                              style={{ width: `${Math.min(100, dept.percentUsed)}%` }}
                            />
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingDept(dept);
                              setDeptQuotaGb((dept.quotaBytes / (1024 * 1024 * 1024)).toFixed(0));
                            }}
                            className="h-7 px-2 text-xs gap-1"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            Configure
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Team Quota Allocations Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Folder className="w-4 h-4 text-amber-500 fill-amber-500/20" />
                  Team Folder Quotas (Workspace Allocation)
                </h3>
                <p className="text-xs text-muted-foreground">
                  Shared team folder ceilings. Uploads in team folders charge the team quota and workspace pool, not the uploader's personal quota.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border/80 bg-secondary/40 text-muted-foreground font-semibold">
                    <th className="py-3 px-4">Team Workspace</th>
                    <th className="py-3 px-4">Members</th>
                    <th className="py-3 px-4">Allocated Quota</th>
                    <th className="py-3 px-4">Consumed Storage</th>
                    <th className="py-3 px-4 w-36">Utilization</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {!governanceData?.teams || governanceData.teams.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">
                        No team shared folders found.
                      </td>
                    </tr>
                  ) : (
                    governanceData.teams.map((tm: any) => (
                      <tr key={tm.id} className="hover:bg-accent/30 transition-colors">
                        <td className="py-3 px-4 font-semibold text-foreground flex items-center gap-2">
                          <Folder className="w-4 h-4 text-amber-500 fill-amber-500/20" />
                          {tm.name}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">{tm.memberCount} members</td>
                        <td className="py-3 px-4 font-mono font-semibold">{tm.formattedQuota}</td>
                        <td className="py-3 px-4 font-mono">{tm.formattedUsed}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                            <span>{tm.percentUsed}%</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
                            <div
                              className="h-full bg-amber-500"
                              style={{ width: `${Math.min(100, tm.percentUsed)}%` }}
                            />
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingTeam(tm);
                              setTeamQuotaGb((tm.quotaBytes / (1024 * 1024 * 1024)).toFixed(0));
                            }}
                            className="h-7 px-2 text-xs gap-1"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            Configure
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab Content 4: Growth & Runway Forecasting ── */}
      {activeTab === 'analytics' && (() => {
        const forecast = analytics?.forecast || analytics?.growth?.forecast;
        const growthHistory = analytics?.growth?.history || [];
        const projections = analytics?.growth?.projections || [];
        const hasSufficientHistory = analytics?.growth?.hasSufficientHistory ?? (growthHistory.length >= 2);
        const isInsufficientData = !hasSufficientHistory || forecast?.confidence === 'INSUFFICIENT_DATA';

        return (
          <div className="space-y-5">
            {/* Toolbar: Title, Info, and Lookback Window Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-border/60 bg-card shadow-xs">
              <div>
                <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  Capacity Runway & Linear Regression Forecast
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Tenant-isolated least-squares regression model evaluating daily consumption trajectory against plan quota.
                </p>
              </div>

              <div className="flex items-center gap-1.5 self-start sm:self-auto bg-secondary/50 p-1 rounded-lg border border-border/50 text-xs">
                <span className="text-[11px] text-muted-foreground px-2 font-medium">Window:</span>
                {([7, 30, 90] as const).map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setAnalyticsLookback(days)}
                    className={`px-2.5 py-1 rounded-md font-mono text-xs transition-colors cursor-pointer ${
                      analyticsLookback === days
                        ? 'bg-background text-foreground font-semibold shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {days}d
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => refetchAnalytics()}
                  disabled={isAnalyticsFetching}
                  className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors ml-1"
                  title="Refresh Forecast"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isAnalyticsFetching ? 'animate-spin text-primary' : ''}`} />
                </button>
              </div>
            </div>

            {/* Insufficient Data State Banner */}
            {isInsufficientData && (
              <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 dark:bg-amber-500/5 text-amber-700 dark:text-amber-300 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <span className="font-bold block text-sm">Historical Trend Data Gathering in Progress</span>
                  <p className="text-muted-foreground">
                    Authoritative least-squares linear forecasting requires at least 2 snapshot days. MasterHRMS captures persistent daily storage snapshots automatically at midnight (00:00 UTC).
                  </p>
                  <div className="flex items-center gap-3 pt-1 text-[11px] font-mono">
                    <span>Recorded Snapshots: {growthHistory.length}</span>
                    <span>•</span>
                    <span>Confidence: INSUFFICIENT_DATA</span>
                    <span>•</span>
                    <span>Live Quota Enforcement: ACTIVE</span>
                  </div>
                </div>
              </div>
            )}

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl border border-border/60 bg-card shadow-xs space-y-1">
                <div className="text-xs text-muted-foreground flex items-center justify-between">
                  <span>Daily Consumption Velocity</span>
                  <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
                </div>
                <div className="text-xl font-bold font-mono text-foreground mt-1">
                  {forecast?.formattedDailyGrowth || (isInsufficientData ? '0 B / day' : '—')}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {isInsufficientData ? 'Baseline established' : `Slope: ${forecast?.regressionSlope ? (forecast.regressionSlope > 0 ? '+' : '') + Math.round(forecast.regressionSlope / 1024) + ' KB/day' : 'Stable'}`}
                </div>
              </div>

              <div className="p-4 rounded-xl border border-border/60 bg-card shadow-xs space-y-1">
                <div className="text-xs text-muted-foreground flex items-center justify-between">
                  <span>30-Day Forward Ingestion</span>
                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                </div>
                <div className="text-xl font-bold font-mono text-foreground mt-1">
                  {forecast?.formattedProjected30Days || forecast?.formattedCurrentUsage || '0 B'}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Current: {summary?.usage?.formattedActive || forecast?.formattedCurrentUsage || '0 B'}
                </div>
              </div>

              <div className="p-4 rounded-xl border border-border/60 bg-card shadow-xs space-y-1">
                <div className="text-xs text-muted-foreground flex items-center justify-between">
                  <span>Projected Quota Runway</span>
                  <HardDrive className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <div className={`text-xl font-bold font-mono mt-1 ${
                  forecast?.thresholdState === 'LOCKED' || forecast?.forecastStatus === 'EXCEEDED'
                    ? 'text-rose-500'
                    : forecast?.projectedDaysRemaining && forecast.projectedDaysRemaining < 30
                    ? 'text-amber-500'
                    : 'text-emerald-500'
                }`}>
                  {forecast?.thresholdState === 'LOCKED' || forecast?.forecastStatus === 'EXCEEDED'
                    ? 'Quota Exceeded'
                    : forecast?.projectedDaysRemaining !== null && forecast?.projectedDaysRemaining !== undefined
                    ? `${forecast.projectedDaysRemaining} days`
                    : isInsufficientData
                    ? 'Gathering History'
                    : 'Runway > 10 yrs'}
                </div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {forecast?.projectedExhaustionDate
                    ? `Exhaustion on: ${forecast.projectedExhaustionDate}`
                    : 'No near-term exhaustion'}
                </div>
              </div>

              <div className="p-4 rounded-xl border border-border/60 bg-card shadow-xs space-y-1">
                <div className="text-xs text-muted-foreground flex items-center justify-between">
                  <span>Forecast Reliability</span>
                  <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="text-base font-bold text-foreground mt-1 flex items-center gap-2">
                  <Badge
                    className={`font-mono text-[10px] ${
                      forecast?.confidence === 'HIGH'
                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                        : forecast?.confidence === 'MEDIUM'
                        ? 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                        : forecast?.confidence === 'LOW'
                        ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                        : 'bg-secondary text-muted-foreground border-border'
                    }`}
                  >
                    {forecast?.confidence || 'INSUFFICIENT_DATA'}
                  </Badge>
                  <span className="text-xs font-semibold text-muted-foreground">
                    {forecast?.forecastStatus || 'NORMAL'}
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Sample: {growthHistory.length} daily snapshots
                </div>
              </div>
            </div>

            {/* Visual Runway Progress Bar */}
            <div className="p-5 rounded-xl border border-border/60 bg-card shadow-xs space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">Capacity Headroom & 30-Day Projection</span>
                <span className="font-mono text-muted-foreground">
                  Quota: {summary?.quota?.formattedQuota || forecast?.formattedQuota || '10.0 GB'}
                </span>
              </div>

              <div className="h-3 w-full bg-secondary rounded-full overflow-hidden flex">
                <div
                  className="bg-emerald-500 transition-all duration-300"
                  style={{
                    width: `${Math.min(100, Math.max(1, (summary?.usage?.activeBytes || forecast?.currentUsageBytes || 0) / Math.max(1, (summary?.quota?.quotaBytes || forecast?.quotaBytes || 1)) * 100))}%`,
                  }}
                  title="Current Active Storage"
                />
                <div
                  className="bg-blue-400/70 border-l border-blue-600/30 transition-all duration-300"
                  style={{
                    width: `${Math.min(100, Math.max(0, ((forecast?.projectedUsage30DaysBytes || 0) - (forecast?.currentUsageBytes || 0)) / Math.max(1, (summary?.quota?.quotaBytes || forecast?.quotaBytes || 1)) * 100))}%`,
                  }}
                  title="Projected 30-Day Net Growth"
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span>Current Active: {summary?.usage?.formattedActive || forecast?.formattedCurrentUsage || '0 B'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                    <span>30-Day Ingestion: {forecast?.formattedProjected30Days || '0 B'}</span>
                  </div>
                </div>
                <span className="font-mono">
                  Available: {summary?.usage?.formattedAvailable || forecast?.formattedAvailable || '0 B'}
                </span>
              </div>
            </div>

            {/* Authoritative Snapshots & Projections Table */}
            <div className="p-5 rounded-xl border border-border/60 bg-card shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                    <Database className="w-4 h-4 text-primary" />
                    Authoritative Storage Snapshots & Forward Projections
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Immutable historical storage records captured daily at 00:00 UTC alongside mathematical forward extrapolations.
                  </p>
                </div>
                <Badge variant="outline" className="font-mono text-[10px]">
                  {growthHistory.length} Observed + {projections.length} Projected
                </Badge>
              </div>

              <div className="border border-border/60 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-secondary/40 font-semibold text-muted-foreground border-b border-border/60 font-mono">
                    <tr>
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5">Type</th>
                      <th className="p-2.5">Active Files</th>
                      <th className="p-2.5">Recycle Bin</th>
                      <th className="p-2.5">Versions</th>
                      <th className="p-2.5">Total Billable</th>
                      <th className="p-2.5">Files Count</th>
                      <th className="p-2.5 text-right">Net Growth</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 font-mono">
                    {/* Historical snapshots */}
                    {growthHistory.map((point: any) => (
                      <tr key={point.date} className="hover:bg-secondary/20 transition-colors">
                        <td className="p-2.5 font-semibold text-foreground">{point.date}</td>
                        <td className="p-2.5">
                          <Badge variant="outline" className="text-[10px] bg-secondary/30">
                            Observed
                          </Badge>
                        </td>
                        <td className="p-2.5">{point.formattedUsed}</td>
                        <td className="p-2.5 text-muted-foreground">{point.formattedTrash}</td>
                        <td className="p-2.5 text-muted-foreground">{point.formattedVersion}</td>
                        <td className="p-2.5 font-bold text-foreground">{point.formattedBillable}</td>
                        <td className="p-2.5">{point.fileCount}</td>
                        <td className={`p-2.5 text-right font-bold ${
                          point.netGrowthBytes > 0
                            ? 'text-emerald-500'
                            : point.netGrowthBytes < 0
                            ? 'text-blue-500'
                            : 'text-muted-foreground'
                        }`}>
                          {point.netGrowthBytes > 0 ? '+' : ''}{point.netGrowthBytes ? (Math.round(point.netGrowthBytes / 1024) + ' KB') : '0 B'}
                        </td>
                      </tr>
                    ))}

                    {/* Forward Projections */}
                    {projections.map((proj: any) => (
                      <tr key={proj.date} className="hover:bg-primary/5 transition-colors bg-secondary/10">
                        <td className="p-2.5 font-semibold text-primary">{proj.date}</td>
                        <td className="p-2.5">
                          <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20">
                            Projected
                          </Badge>
                        </td>
                        <td className="p-2.5 text-primary">{proj.formattedUsed}</td>
                        <td className="p-2.5 text-muted-foreground">{proj.formattedTrash}</td>
                        <td className="p-2.5 text-muted-foreground">{proj.formattedVersion}</td>
                        <td className="p-2.5 font-bold text-primary">{proj.formattedBillable}</td>
                        <td className="p-2.5">{proj.fileCount}</td>
                        <td className="p-2.5 text-right font-bold text-primary">
                          +{Math.round(proj.netGrowthBytes / 1024)} KB
                        </td>
                      </tr>
                    ))}

                    {growthHistory.length === 0 && projections.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-6 text-center text-muted-foreground">
                          No snapshot history recorded yet. The daily storage snapshot daemon runs every night at 00:00 UTC.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Tab Content 5: Reconciliation & Self-Healing ── */}
      {activeTab === 'reconcile' && (
        <div className="p-5 rounded-xl border border-border/60 bg-card shadow-xs space-y-4 max-w-3xl">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              Storage Accounting Reconciliation & Self-Healing
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchAudit()}
              disabled={isAuditing}
              className="h-8 text-xs gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAuditing ? 'animate-spin' : ''}`} />
              Re-Audit
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Compares fast-path materialized usage counters against authoritative database records and cleans expired upload sessions.
          </p>

          {reconciliationAudit?.before && (
            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-lg bg-secondary/50 border border-border/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">Reconciliation Status</span>
                  <Badge
                    className={`font-mono text-[10px] ${
                      reconciliationAudit.before.hasDrift
                        ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                        : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                    }`}
                  >
                    {reconciliationAudit.before.reconciliationStatus}
                  </Badge>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Audited At: {new Date(reconciliationAudit.before.auditedAt).toLocaleString()}
                </div>
              </div>

              {/* Drift Table */}
              <div className="border border-border/60 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-secondary/40 font-semibold text-muted-foreground border-b border-border/60">
                    <tr>
                      <th className="p-2.5">Counter</th>
                      <th className="p-2.5">Materialized Value</th>
                      <th className="p-2.5">Live Database Sum</th>
                      <th className="p-2.5 text-right">Drift</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 font-mono">
                    <tr>
                      <td className="p-2.5 font-sans">Active Bytes</td>
                      <td className="p-2.5">{reconciliationAudit.before.counters.usedBytes} B</td>
                      <td className="p-2.5">{reconciliationAudit.before.live.usedBytes} B</td>
                      <td className={`p-2.5 text-right font-bold ${reconciliationAudit.before.drift.usedBytes !== 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                        {reconciliationAudit.before.drift.usedBytes} B
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-sans">Recycle Bin Bytes</td>
                      <td className="p-2.5">{reconciliationAudit.before.counters.trashBytes} B</td>
                      <td className="p-2.5">{reconciliationAudit.before.live.trashBytes} B</td>
                      <td className="p-2.5 text-right font-bold text-emerald-500">
                        {reconciliationAudit.before.drift.trashBytes} B
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-sans">Active Files</td>
                      <td className="p-2.5">{reconciliationAudit.before.counters.fileCount}</td>
                      <td className="p-2.5">{reconciliationAudit.before.live.fileCount}</td>
                      <td className={`p-2.5 text-right font-bold ${reconciliationAudit.before.drift.fileCount !== 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                        {reconciliationAudit.before.drift.fileCount}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  onClick={handleExecuteRepair}
                  disabled={isReconciling}
                  className="gap-2 text-xs h-9 bg-primary text-primary-foreground font-semibold"
                >
                  <ShieldCheck className="w-4 h-4" />
                  {isReconciling ? 'Executing Repair...' : 'Execute Transactional Repair'}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab Content 7: Storage Activity Timeline ── */}
      {/* ── Tab Content 8: Retention & Legal Holds ── */}
      {activeTab === 'retention' && <RetentionTab />}

      {activeTab === 'activity' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Storage Audit & Activity Timeline
              </h3>
              <p className="text-xs text-muted-foreground">
                Chronological immutable record of file modifications, uploads, restorations, deletions, and ACL adjustments.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchActivity()}
              disabled={isActivityLoading}
              className="h-8 text-xs gap-1.5 shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isActivityLoading ? 'animate-spin text-primary' : ''}`} />
              Refresh Activity
            </Button>
          </div>

          <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/80 bg-secondary/40 text-muted-foreground font-semibold">
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">File Name / Identifier</th>
                  <th className="py-3 px-4">File Size</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Event Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {activities.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-muted-foreground">
                      <Clock className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                      <p className="font-medium text-foreground">No storage activities recorded yet.</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Actions like uploading or modifying files will log here automatically.
                      </p>
                    </td>
                  </tr>
                ) : (
                  activities.map((act: any) => (
                    <tr key={act.id} className="hover:bg-accent/30 transition-colors">
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                          {act.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-foreground">
                        {act.fileName || act.fileId}
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-muted-foreground">
                        {act.formattedSize || (act.fileSize ? `${Math.round(act.fileSize / 1024)} KB` : '—')}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground">
                        {act.actorId ? act.actorId.slice(0, 8) + '...' : 'System'}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                        {new Date(act.createdAt).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── User Quota Edit Modal ── */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-primary" />
              Adjust Employee Quota: {editingUser?.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure a custom storage allocation override for this employee.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Storage Allocation (Gigabytes)</label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={overrideQuotaGb}
                  onChange={(e) => setOverrideQuotaGb(e.target.value)}
                  className="font-mono text-sm h-9"
                />
                <span className="font-semibold text-muted-foreground">GB</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Default system allocation is 5.0 GB per user.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditingUser(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveUserQuota}
              disabled={isSavingQuota}
              className="bg-primary text-primary-foreground"
            >
              {isSavingQuota ? 'Saving...' : 'Save Allocation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Edit Team Folder Quota Allocation ── */}
      <Dialog open={!!editingTeam} onOpenChange={(open) => !open && setEditingTeam(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Folder className="w-4 h-4 text-amber-500 fill-amber-500/20" />
              Adjust Team Folder Quota: {editingTeam?.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure maximum storage capacity for this team shared workspace. Parent oversubscription checks apply.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Team Quota Allocation (Gigabytes)</label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="1"
                  max="500"
                  value={teamQuotaGb}
                  onChange={(e) => setTeamQuotaGb(e.target.value)}
                  className="font-mono text-sm h-9"
                />
                <span className="font-semibold text-muted-foreground">GB</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Sum of all team allocations cannot exceed the total organization storage limit ({quota.formattedQuota}).
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditingTeam(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveTeamQuota}
              disabled={isSavingTeamQuota}
              className="bg-primary text-primary-foreground"
            >
              {isSavingTeamQuota ? 'Saving...' : 'Save Team Allocation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Edit Department Quota Allocation ── */}
      <Dialog open={!!editingDept} onOpenChange={(open) => !open && setEditingDept(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-500" />
              Adjust Department Quota: {editingDept?.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure maximum collective storage for this department. Parent oversubscription checks apply.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Department Quota Allocation (Gigabytes)</label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="1"
                  max="500"
                  value={deptQuotaGb}
                  onChange={(e) => setDeptQuotaGb(e.target.value)}
                  className="font-mono text-sm h-9"
                />
                <span className="font-semibold text-muted-foreground">GB</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Sum of all department allocations cannot exceed the total organization storage limit ({quota.formattedQuota}).
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditingDept(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveDeptQuota}
              disabled={isSavingDeptQuota}
              className="bg-primary text-primary-foreground"
            >
              {isSavingDeptQuota ? 'Saving...' : 'Save Dept Allocation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
