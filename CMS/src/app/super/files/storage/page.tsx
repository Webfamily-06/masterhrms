'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  HardDrive,
  Database,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Search,
  Eye,
  TrendingUp,
  PieChart,
  Trash2,
  ShieldCheck,
  Camera,
  Sliders,
  Activity,
  CloudUpload,
  Play,
  Loader2,
  CalendarClock,
  Layers,
  Gauge,
} from 'lucide-react';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

const BYTES_PER_GB = 1024 * 1024 * 1024;

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export default function SuperStorageAdministrationPage() {
  const qc = useQueryClient();

  // Tabs & Filters
  const [activeTab, setActiveTab] = useState('fleet');
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [utilizationFilter, setUtilizationFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [lookbackDays, setLookbackDays] = useState<number>(30);
  const [retentionPage, setRetentionPage] = useState(1);

  // Per-tenant Dialogs
  const [inspectTenantId, setInspectTenantId] = useState<string | null>(null);
  const [forecastTenant, setForecastTenant] = useState<{ id: string; name: string } | null>(null);
  const [forecastLookback, setForecastLookback] = useState<number>(30);
  const [quotaTenant, setQuotaTenant] = useState<{ id: string; name: string } | null>(null);
  const [quotaInputGb, setQuotaInputGb] = useState<string>('');

  // Retention Execution Controls
  const [retentionTenantId, setRetentionTenantId] = useState<string>('');
  const [retentionDryRun, setRetentionDryRun] = useState<boolean>(true);
  const [confirmAction, setConfirmAction] = useState<
    | null
    | { type: 'reconcile' }
    | { type: 'retention_execute' }
    | { type: 'retention_sweep' }
    | { type: 'migrate_local' }
  >(null);

  // Migration Controls
  const [migrationBatchSize, setMigrationBatchSize] = useState<string>('50');
  const [migrationTenantId, setMigrationTenantId] = useState<string>('all');

  // 1. Fleet Overview & Tenants (/super/storage/overview)
  const {
    data: overview,
    isLoading,
    isFetching,
    refetch: refetchOverview,
  } = useQuery({
    queryKey: ['super-storage-overview', search, planFilter, utilizationFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (planFilter !== 'all') params.append('plan', planFilter);
      if (utilizationFilter !== 'all') params.append('utilization', utilizationFilter);
      params.append('page', String(page));
      params.append('limit', '15');

      const res = await api.get(`/super/storage/overview?${params.toString()}`);
      return res?.data || res || {};
    },
  });

  // 2. Fleet Forecast (/super/storage/analytics/fleet)
  const { data: fleetForecast, refetch: refetchFleetForecast } = useQuery({
    queryKey: ['super-storage-analytics-fleet', lookbackDays],
    queryFn: async () => {
      const res = await api.get(`/super/storage/analytics/fleet?lookbackDays=${lookbackDays}`);
      return res?.data || res || {};
    },
  });

  // 3. Fleet Growth History (/super/storage/analytics/growth)
  const {
    data: fleetGrowth,
    isLoading: isLoadingGrowth,
    refetch: refetchFleetGrowth,
  } = useQuery({
    queryKey: ['super-storage-analytics-growth', lookbackDays],
    queryFn: async () => {
      const res = await api.get(`/super/storage/analytics/growth?lookbackDays=${lookbackDays}`);
      return res?.data || res || {};
    },
  });

  // 4. Exhaustion Watchlist (/super/storage/analytics/watchlist)
  const {
    data: watchlistData,
    isLoading: isLoadingWatchlist,
    refetch: refetchWatchlist,
  } = useQuery({
    queryKey: ['super-storage-analytics-watchlist'],
    queryFn: async () => {
      const res = await api.get('/super/storage/analytics/watchlist?limit=25');
      const unwrapped = res?.data || res || {};
      return Array.isArray(unwrapped.watchlist) ? unwrapped.watchlist : [];
    },
  });

  // 5. Storage Anomalies (/super/storage/analytics/anomalies)
  const {
    data: anomaliesData,
    isLoading: isLoadingAnomalies,
    refetch: refetchAnomalies,
  } = useQuery({
    queryKey: ['super-storage-analytics-anomalies'],
    queryFn: async () => {
      const res = await api.get('/super/storage/analytics/anomalies?limit=25');
      const unwrapped = res?.data || res || {};
      return Array.isArray(unwrapped.anomalies) ? unwrapped.anomalies : [];
    },
  });

  // 6. Retention Fleet Summary & History (/super/storage/retention/fleet & /history)
  const { data: retentionFleet, refetch: refetchRetentionFleet } = useQuery({
    queryKey: ['super-storage-retention-fleet'],
    queryFn: async () => {
      const res = await api.get('/super/storage/retention/fleet');
      return res?.data || res || {};
    },
    enabled: activeTab === 'retention',
  });

  const {
    data: retentionHistory,
    isLoading: isLoadingRetentionHistory,
    refetch: refetchRetentionHistory,
  } = useQuery({
    queryKey: ['super-storage-retention-history', retentionPage],
    queryFn: async () => {
      const res = await api.get(`/super/storage/retention/history?page=${retentionPage}&limit=15`);
      return res?.data || res || {};
    },
    enabled: activeTab === 'retention',
  });

  // 7. Local-to-Object Migration Status (/super/storage/migrate-local/status)
  const {
    data: migrationStatusRes,
    isLoading: isLoadingMigration,
    refetch: refetchMigrationStatus,
  } = useQuery({
    queryKey: ['super-storage-migrate-local-status'],
    queryFn: async () => {
      const res = await api.get('/super/storage/migrate-local/status');
      const unwrapped = res?.data || res || {};
      return unwrapped.telemetry || unwrapped;
    },
    enabled: activeTab === 'migration',
    refetchInterval: (query) => (query.state.data?.isRunning ? 3000 : false),
  });

  // 8. Single Tenant Detail (/super/storage/tenants/:id)
  const { data: tenantDetail, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['super-storage-tenant-detail', inspectTenantId],
    queryFn: async () => {
      if (!inspectTenantId) return null;
      const res = await api.get(`/super/storage/tenants/${inspectTenantId}`);
      return res?.data || res || null;
    },
    enabled: Boolean(inspectTenantId),
  });

  // 9. Single Tenant Forecast (/super/storage/analytics/tenants/:id/forecast)
  const { data: tenantForecastData, isLoading: isLoadingTenantForecast } = useQuery({
    queryKey: ['super-storage-tenant-forecast', forecastTenant?.id, forecastLookback],
    queryFn: async () => {
      if (!forecastTenant?.id) return null;
      const res = await api.get(
        `/super/storage/analytics/tenants/${forecastTenant.id}/forecast?lookbackDays=${forecastLookback}`,
      );
      return res?.data || res || null;
    },
    enabled: Boolean(forecastTenant?.id),
  });

  // 10. Single Tenant Quota Governance (/super/storage/tenants/:id/quota)
  const { data: tenantQuotaData, isLoading: isLoadingTenantQuota } = useQuery({
    queryKey: ['super-storage-tenant-quota', quotaTenant?.id],
    queryFn: async () => {
      if (!quotaTenant?.id) return null;
      const res = await api.get(`/super/storage/tenants/${quotaTenant.id}/quota`);
      return res?.data || res || null;
    },
    enabled: Boolean(quotaTenant?.id),
  });

  useEffect(() => {
    const currentBytes = Number(tenantQuotaData?.tenant?.quotaBytes || 0);
    if (currentBytes > 0) {
      setQuotaInputGb(String(Number((currentBytes / BYTES_PER_GB).toFixed(2))));
    } else if (quotaTenant) {
      setQuotaInputGb('25');
    }
  }, [tenantQuotaData, quotaTenant]);

  // Mutations
  const reconcileMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/super/storage/reconcile', { dryRun: false });
      return res?.data || res || {};
    },
    onSuccess: (res: any) => {
      toast.success(`Fleet storage reconciled: ${res?.driftCount ?? 0} drifts corrected.`);
      setConfirmAction(null);
      qc.invalidateQueries({ queryKey: ['super-storage-overview'] });
    },
    onError: (err: any) => toast.error(err?.message || 'Reconciliation failed.'),
  });

  const captureSnapshotsMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/super/storage/snapshots/capture', {});
      return res?.data || res || {};
    },
    onSuccess: (res: any) => {
      toast.success(
        `Captured ${res?.tenantSnapshots ?? 0} tenant snapshots${res?.fleetSnapshot ? ' + fleet snapshot' : ''}.`,
      );
      qc.invalidateQueries({ queryKey: ['super-storage-analytics-fleet'] });
      qc.invalidateQueries({ queryKey: ['super-storage-analytics-growth'] });
      qc.invalidateQueries({ queryKey: ['super-storage-analytics-watchlist'] });
      qc.invalidateQueries({ queryKey: ['super-storage-analytics-anomalies'] });
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to capture storage snapshots.'),
  });

  const updateQuotaMutation = useMutation({
    mutationFn: async ({ tenantId, quotaBytes }: { tenantId: string; quotaBytes: number }) => {
      const res = await api.put(`/super/storage/tenants/${tenantId}/quota`, { quotaBytes });
      return res?.data || res || {};
    },
    onSuccess: (res: any) => {
      toast.success(`Tenant quota updated to ${res?.quota?.formattedQuota || 'new limit'}.`);
      qc.invalidateQueries({ queryKey: ['super-storage-overview'] });
      qc.invalidateQueries({ queryKey: ['super-storage-tenant-quota', quotaTenant?.id] });
      qc.invalidateQueries({ queryKey: ['super-storage-analytics-fleet'] });
      qc.invalidateQueries({ queryKey: ['super-storage-analytics-watchlist'] });
      setQuotaTenant(null);
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to update tenant quota.'),
  });

  const executeRetentionMutation = useMutation({
    mutationFn: async ({ tenantId, isDryRun }: { tenantId: string; isDryRun: boolean }) => {
      const res = await api.post('/super/storage/retention/execute', { tenantId, isDryRun });
      return res?.data || res || {};
    },
    onSuccess: () => {
      toast.success(
        retentionDryRun ? 'Retention dry-run evaluation completed.' : 'Retention cleanup executed for tenant.',
      );
      setConfirmAction(null);
      refetchRetentionFleet();
      refetchRetentionHistory();
      refetchOverview();
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to execute retention job.'),
  });

  const sweepRetentionMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/super/storage/retention/sweep', {});
      return res?.data || res || {};
    },
    onSuccess: (res: any) => {
      toast.success(
        `Fleet sweep finished: ${res?.tenantsProcessed ?? 0} evaluated, ${res?.jobsExecuted ?? 0} executed, ${res?.previewsGenerated ?? 0} previews.`,
      );
      setConfirmAction(null);
      refetchRetentionFleet();
      refetchRetentionHistory();
      refetchOverview();
    },
    onError: (err: any) => toast.error(err?.message || 'Fleet retention sweep failed.'),
  });

  const migrateLocalMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/super/storage/migrate-local', {
        batchSize: Math.max(1, Number(migrationBatchSize) || 50),
        tenantId: migrationTenantId !== 'all' ? migrationTenantId : undefined,
      });
      return res?.data || res || {};
    },
    onSuccess: () => {
      toast.success('Local-to-object storage migration batch triggered.');
      setConfirmAction(null);
      refetchMigrationStatus();
    },
    onError: (err: any) => toast.error(err?.message || 'Migration trigger failed.'),
  });

  const platform = overview?.platform || {
    totalTenants: 0,
    formattedSubscribed: '0 B',
    formattedConsumed: '0 B',
    formattedTrashed: '0 B',
    formattedReserved: '0 B',
    globalUtilizationPct: 0,
    totalFilesAcrossFleet: 0,
    atRiskTenantsCount: 0,
  };

  const tenantsList: any[] = Array.isArray(overview?.tenants) ? overview.tenants : [];
  const watchlist: any[] = Array.isArray(watchlistData) ? watchlistData : [];
  const anomalies: any[] = Array.isArray(anomaliesData) ? anomaliesData : [];
  const retentionJobs: any[] = Array.isArray(retentionHistory?.jobs) ? retentionHistory.jobs : [];

  // Plan distribution donut chart
  const planChartOptions: any = {
    chart: { type: 'donut', fontFamily: 'inherit', background: 'transparent' },
    labels: overview?.planDistribution?.map((p: any) => p.name) || [],
    colors: ['#0d6efd', '#16a34a', '#7c3aed', '#f59e0b'],
    legend: { position: 'bottom' },
    dataLabels: { enabled: false },
    stroke: { show: false },
  };
  const planChartSeries: number[] = overview?.planDistribution?.map((p: any) => p.count) || [];

  // Helper to build Growth ApexChart config
  const buildGrowthChart = (growthObj: any) => {
    const history: any[] = Array.isArray(growthObj?.history) ? growthObj.history : [];
    const projections: any[] = Array.isArray(growthObj?.projections) ? growthObj.projections : [];
    const combined = [...history, ...projections];
    if (combined.length === 0) return null;

    const toMb = (b: number) => Number(((Number(b) || 0) / (1024 * 1024)).toFixed(2));
    const categories = combined.map((pt) => pt.date);
    const actual = combined.map((pt) => (pt.isProjected ? null : toMb(pt.usedBytes)));
    const projected = combined.map((pt, idx) => {
      if (pt.isProjected) return toMb(pt.usedBytes);
      if (idx === history.length - 1 && projections.length > 0) return toMb(pt.usedBytes);
      return null;
    });

    const options: any = {
      chart: { type: 'area' as const, toolbar: { show: false }, fontFamily: 'inherit', background: 'transparent' },
      stroke: { curve: 'smooth' as const, width: [2.5, 2], dashArray: [0, 5] },
      colors: ['#0d6efd', '#16a34a'],
      fill: { type: 'gradient', gradient: { opacityFrom: 0.25, opacityTo: 0.02 } },
      xaxis: { categories, labels: { style: { fontSize: '10px' } } },
      yaxis: { labels: { formatter: (v: number) => (v == null ? '' : `${v.toFixed(1)} MB`) } },
      dataLabels: { enabled: false },
      legend: { position: 'top' as const },
    };

    return {
      options,
      series: [
        { name: 'Recorded Usage (MB)', data: actual },
        { name: 'Projected Usage (MB)', data: projected },
      ],
    };
  };

  const fleetGrowthChart = useMemo(() => buildGrowthChart(fleetGrowth), [fleetGrowth]);
  const tenantGrowthChart = useMemo(
    () => buildGrowthChart(tenantForecastData?.history),
    [tenantForecastData],
  );

  const handleRefreshAll = () => {
    refetchOverview();
    refetchFleetForecast();
    refetchFleetGrowth();
    refetchWatchlist();
    refetchAnomalies();
    if (activeTab === 'retention') {
      refetchRetentionFleet();
      refetchRetentionHistory();
    }
    if (activeTab === 'migration') {
      refetchMigrationStatus();
    }
  };

  const handleSaveQuota = () => {
    if (!quotaTenant) return;
    const gb = parseFloat(quotaInputGb);
    if (!Number.isFinite(gb) || gb <= 0) {
      toast.error('Enter a valid positive storage quota in GB.');
      return;
    }
    updateQuotaMutation.mutate({
      tenantId: quotaTenant.id,
      quotaBytes: Math.round(gb * BYTES_PER_GB),
    });
  };

  return (
    <div className="w-full min-w-0 space-y-5">
      <PageHeader
        title="Fleet Storage Governance"
        description="Multi-tenant storage capacity, quota overrides, capacity forecasting, anomaly watchlist, retention sweeps, and local-to-object migration."
        icon={HardDrive}
        badge={
          <Badge variant="soft">
            {platform.totalTenants} Tenant Pools
          </Badge>
        }
        actions={
          <>
            <Button variant="outline" size="sm" onClick={handleRefreshAll} disabled={isFetching}>
              <RefreshCw className={`size-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => captureSnapshotsMutation.mutate()}
              disabled={captureSnapshotsMutation.isPending}
            >
              {captureSnapshotsMutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Camera className="size-3.5" />
              )}
              Capture Snapshots
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setConfirmAction({ type: 'reconcile' })}
              disabled={reconcileMutation.isPending}
            >
              <ShieldCheck className="size-3.5" />
              Reconcile Fleet
            </Button>
          </>
        }
      />

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Subscribed Capacity"
          value={platform.formattedSubscribed}
          description={`Across ${platform.totalTenants} tenant pools`}
          icon={Database}
          variant="primary"
          isLoading={isLoading}
        />
        <StatCard
          label="Fleet Consumed"
          value={platform.formattedConsumed}
          description={`${platform.globalUtilizationPct}% utilization | ${Number(platform.totalFilesAcrossFleet || 0).toLocaleString()} files`}
          icon={HardDrive}
          variant="success"
          isLoading={isLoading}
        />
        <StatCard
          label="Recycle Bin Retention"
          value={platform.formattedTrashed}
          description="Reclaimable via retention cleanup"
          icon={Trash2}
          variant="warning"
          isLoading={isLoading}
        />
        <StatCard
          label="At-Risk Accounts (>=70%)"
          value={platform.atRiskTenantsCount}
          description={`${anomalies.length} anomalies | ${watchlist.length} watchlist`}
          icon={ShieldAlert}
          variant={platform.atRiskTenantsCount > 0 ? 'rose' : 'success'}
          isLoading={isLoading}
        />
      </div>

      {/* Main Governance Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/60 p-1 rounded-lg border border-border/60 flex flex-wrap gap-1 h-auto">
          <TabsTrigger value="fleet" className="text-xs gap-1.5 py-1.5">
            <HardDrive className="size-3.5" />
            Fleet &amp; Quotas
          </TabsTrigger>
          <TabsTrigger value="forecasting" className="text-xs gap-1.5 py-1.5">
            <TrendingUp className="size-3.5" />
            Growth &amp; Watchlist
            {watchlist.length > 0 && (
              <Badge variant="warning" className="text-[10px] px-1.5 py-0 ml-1">
                {watchlist.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="anomalies" className="text-xs gap-1.5 py-1.5">
            <AlertTriangle className="size-3.5" />
            Anomalies
            {anomalies.length > 0 && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0 ml-1">
                {anomalies.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="retention" className="text-xs gap-1.5 py-1.5">
            <CalendarClock className="size-3.5" />
            Retention Governance
          </TabsTrigger>
          <TabsTrigger value="migration" className="text-xs gap-1.5 py-1.5">
            <CloudUpload className="size-3.5" />
            Local-to-Object Migration
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: FLEET OVERVIEW & TENANTS QUOTA TABLE */}
        <TabsContent value="fleet" className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Plan Distribution Donut */}
            <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <PieChart className="size-4 text-primary" />
                  Subscription Plan Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="min-h-[220px] flex items-center justify-center">
                {planChartSeries.length > 0 ? (
                  <Suspense fallback={<div className="text-xs text-muted-foreground">Loading chart...</div>}>
                    <Chart options={planChartOptions} series={planChartSeries} type="donut" width="100%" height={220} />
                  </Suspense>
                ) : (
                  <div className="text-xs text-muted-foreground">No plan distribution data available.</div>
                )}
              </CardContent>
            </Card>

            {/* Fleet Forecast Summary */}
            <Card className="border border-border/80 rounded-xl bg-card shadow-xs lg:col-span-2">
              <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <TrendingUp className="size-4 text-emerald-600" />
                    Platform Runway &amp; Linear Regression Forecast
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Live output from `/super/storage/analytics/fleet` ({lookbackDays}-day lookback).
                  </CardDescription>
                </div>
                <Badge variant="outline"className="text-[10px]">
                  Confidence: {fleetForecast?.confidence || 'INSUFFICIENT_DATA'}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-lg bg-muted/40 border border-border/60">
                    <div className="text-[11px] text-muted-foreground">Daily Ingestion Velocity</div>
                    <div className="text-base font-bold text-foreground mt-1">
                      {fleetForecast?.formattedDailyGrowth || '0 B / day'}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {fleetForecast?.dataPoints ?? 0} snapshot data points
                    </div>
                  </div>
                  <div className="p-3.5 rounded-lg bg-muted/40 border border-border/60">
                    <div className="text-[11px] text-muted-foreground">Projected Runway</div>
                    <div className="text-base font-bold text-emerald-600 mt-1">
                      {fleetForecast?.projectedDaysRemaining != null
                        ? `${fleetForecast.projectedDaysRemaining} days`
                        : 'Stable / Ample'}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      30d est: {fleetForecast?.formattedProjected30Days || '0 B'}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-lg bg-muted/40 border border-border/60">
                    <div className="text-[11px] text-muted-foreground">Forecast Status</div>
                    <div className="text-sm font-bold text-foreground mt-1 flex items-center gap-1.5">
                      <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                      <span className="truncate">{fleetForecast?.forecastStatus || 'INSUFFICIENT_DATA'}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      Available: {fleetForecast?.formattedAvailable || '0 B'}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg border border-border/60">
                  Historical trends are derived exclusively from real storage snapshots. Click &ldquo;Capture Snapshots&rdquo; above to record today&apos;s fleet and tenant usage points.
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search tenant name or slug..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <Select
                value={planFilter}
                onValueChange={(val) => {
                  setPlanFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 text-xs w-40">
                  <SelectValue placeholder="All Plans" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plans</SelectItem>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="growth">Growth</SelectItem>
                  <SelectItem value="sovereign">Sovereign</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={utilizationFilter}
                onValueChange={(val) => {
                  setUtilizationFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 text-xs w-44">
                  <SelectValue placeholder="All Utilization" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Utilization</SelectItem>
                  <SelectItem value="over_70">&gt;= 70% (Warning)</SelectItem>
                  <SelectItem value="over_85">&gt;= 85% (High)</SelectItem>
                  <SelectItem value="over_95">&gt;= 95% (Critical)</SelectItem>
                  <SelectItem value="locked">100% (Locked)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tenants Table */}
          <Card className="border border-border/80 rounded-xl bg-card shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border/80">
                    <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3 pl-4">
                      Organization
                    </th>
                    <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                      Plan / Quota Source
                    </th>
                    <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                      Consumption
                    </th>
                    <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                      Utilization
                    </th>
                    <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                      Files
                    </th>
                    <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                      Threshold
                    </th>
                    <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3 pr-4 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-muted-foreground">
                        <Loader2 className="size-5 animate-spin mx-auto mb-2 text-primary" />
                        Loading tenant fleet storage data...
                      </td>
                    </tr>
                  ) : tenantsList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-muted-foreground">
                        No tenants match the selected filter criteria.
                      </td>
                    </tr>
                  ) : (
                    tenantsList.map((t: any) => {
                      const pct = Number(t.percentUsed || 0);
                      return (
                        <tr key={t.id} className="hover:bg-muted/40 transition-colors">
                          <td className="p-3 pl-4">
                            <div className="font-semibold text-foreground">{t.name}</div>
                            <div className="text-[11px] text-muted-foreground">{t.slug}</div>
                          </td>
                          <td className="p-3">
                            <Badge variant="outline" className="text-[10px]">
                              {t.plan}
                            </Badge>
                            <div className="text-[10px] tabular-nums text-muted-foreground mt-0.5">{t.quotaSource}</div>
                          </td>
                          <td className="p-3 tabular-nums">
                            <div className="font-medium text-foreground">{t.formattedUsed}</div>
                            <div className="text-[10px] text-muted-foreground">of {t.formattedQuota}</div>
                          </td>
                          <td className="p-3 w-40">
                            <div className="flex items-center justify-between text-[11px] tabular-nums mb-1">
                              <span>{pct}%</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className={`h-full transition-all ${
                                  pct >= 95
                                    ? 'bg-rose-600'
                                    : pct >= 85
                                    ? 'bg-amber-500'
                                    : pct >= 70
                                    ? 'bg-amber-400'
                                    : 'bg-emerald-600'
                                }`}
                                style={{ width: `${Math.min(100, pct)}%` }}
                              />
                            </div>
                          </td>
                          <td className="p-3 tabular-nums text-muted-foreground">
                            {Number(t.fileCount || 0).toLocaleString()}
                          </td>
                          <td className="p-3">
                            <Badge
                              variant={
                                t.thresholdState?.includes('LOCKED')
                                  ? 'destructive'
                                  : t.thresholdState?.includes('CRITICAL') || t.thresholdState?.includes('WARNING')
                                  ? 'warning'
                                  : 'success'
                              }
                              className="text-[10px]"
                            >
                              {t.thresholdState}
                            </Badge>
                          </td>
                          <td className="p-3 pr-4 text-right">
                            <div className="inline-flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="xs"
                                onClick={() => setInspectTenantId(t.id)}
                                title="Inspect storage breakdown"
                              >
                                <Eye className="size-3" />
                                Inspect
                              </Button>
                              <Button
                                variant="outline"
                                size="xs"
                                onClick={() => setQuotaTenant({ id: t.id, name: t.name })}
                                title="Edit tenant storage quota override"
                              >
                                <Sliders className="size-3" />
                                Quota
                              </Button>
                              <Button
                                variant="soft"
                                size="xs"
                                onClick={() => setForecastTenant({ id: t.id, name: t.name })}
                                title="Inspect tenant capacity forecast"
                              >
                                <TrendingUp className="size-3" />
                                Forecast
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {overview?.pagination && overview.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between p-3 border-t border-border/60 bg-muted/20 text-xs">
                <span className="text-muted-foreground">
                  Page {overview.pagination.page} of {overview.pagination.totalPages} ({overview.pagination.total} tenants)
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="xs"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="xs"
                    disabled={page >= overview.pagination.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* TAB 2: FLEET GROWTH CHART & EXHAUSTION WATCHLIST */}
        <TabsContent value="forecasting" className="space-y-5">
          <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
              <div>
                <CardTitle className="text-base font-semibold">Fleet Storage Growth &amp; Projection</CardTitle>
                <CardDescription className="text-xs">
                  Net growth ({lookbackDays}d):{' '}
                  <strong className="text-foreground">
                    {fleetGrowth?.summary?.formattedNetPeriodGrowth || '0 B'}
                  </strong>{' '}
                  | Reclaimed:{' '}
                  <strong className="text-emerald-600">
                    {fleetGrowth?.summary?.formattedReclaimedPeriod || '0 B'}
                  </strong>
                </CardDescription>
              </div>
              <div className="flex items-center gap-1">
                {[7, 30, 90].map((d) => (
                  <Button
                    key={d}
                    size="xs"
                    variant={lookbackDays === d ? 'primary' : 'outline'}
                    onClick={() => setLookbackDays(d)}
                  >
                    {d}d
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingGrowth ? (
                <div className="h-64 flex items-center justify-center text-xs text-muted-foreground gap-2">
                  <Loader2 className="size-4 animate-spin text-primary" />
                  Loading growth history...
                </div>
              ) : !fleetGrowthChart ? (
                <div className="h-56 flex flex-col items-center justify-center text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg p-6">
                  <TrendingUp className="size-8 text-muted-foreground/40 mb-2" />
                  <p className="font-medium text-foreground">Insufficient snapshot history</p>
                  <p className="mt-1">Capture daily snapshots to render historical and projected storage growth.</p>
                </div>
              ) : (
                <Suspense fallback={<div className="h-64 flex items-center justify-center text-xs text-muted-foreground">Loading chart...</div>}>
                  <Chart
                    options={fleetGrowthChart.options}
                    series={fleetGrowthChart.series}
                    type="area"
                    height={280}
                    width="100%"
                  />
                </Suspense>
              )}
            </CardContent>
          </Card>

          <Card className="border border-border/80 rounded-xl bg-card shadow-xs overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Gauge className="size-4 text-amber-600" />
                Quota Exhaustion Watchlist
              </CardTitle>
              <CardDescription className="text-xs">
                Tenants trending toward storage capacity limits (`/super/storage/analytics/watchlist`).
              </CardDescription>
            </CardHeader>
            <div className="overflow-x-auto border-t border-border/60">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border/80">
                    <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3 pl-4">
                      Tenant
                    </th>
                    <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                      Usage / Quota
                    </th>
                    <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                      Daily Growth
                    </th>
                    <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                      Est. Days Remaining
                    </th>
                    <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                      Status
                    </th>
                    <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3 pr-4 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {isLoadingWatchlist ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-muted-foreground">
                        Loading watchlist...
                      </td>
                    </tr>
                  ) : watchlist.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-muted-foreground">
                        No tenants are currently approaching storage quota exhaustion.
                      </td>
                    </tr>
                  ) : (
                    watchlist.map((w: any) => (
                      <tr key={w.tenantId} className="hover:bg-muted/40 transition-colors">
                        <td className="p-3 pl-4">
                          <div className="font-semibold text-foreground">{w.name}</div>
                          <div className="text-[11px] text-muted-foreground">{w.plan}</div>
                        </td>
                        <td className="p-3 tabular-nums">
                          {w.formattedCurrentUsage} / {w.formattedQuota} ({w.utilizationPercent}%)
                        </td>
                        <td className="p-3 tabular-nums">{w.formattedDailyGrowth}</td>
                        <td className="p-3 tabular-nums font-semibold">
                          {w.projectedDaysRemaining != null ? `${w.projectedDaysRemaining} days` : '—'}
                          {w.projectedExhaustionDate && (
                            <div className="text-[10px] text-muted-foreground font-normal">
                              Est. {w.projectedExhaustionDate}
                            </div>
                          )}
                        </td>
                        <td className="p-3">
                          <Badge
                            variant={
                              w.thresholdState === 'LOCKED' || w.forecastStatus === 'EXCEEDED'
                                ? 'destructive'
                                : 'warning'
                            }
                            className="text-[10px]"
                          >
                            {w.forecastStatus}
                          </Badge>
                        </td>
                        <td className="p-3 pr-4 text-right">
                          <div className="inline-flex items-center gap-1">
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => setQuotaTenant({ id: w.tenantId, name: w.name })}
                            >
                              Adjust Quota
                            </Button>
                            <Button
                              size="xs"
                              variant="soft"
                              onClick={() => setForecastTenant({ id: w.tenantId, name: w.name })}
                            >
                              Forecast
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* TAB 3: STORAGE ANOMALIES */}
        <TabsContent value="anomalies" className="space-y-4">
          <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <AlertTriangle className="size-4 text-rose-600" />
                Detected Storage Anomalies
              </CardTitle>
              <CardDescription className="text-xs">
                Automated anomaly detection across upload spikes, recycle bin bloat, version accumulation, and stalled reservations (`/super/storage/analytics/anomalies`).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoadingAnomalies ? (
                <div className="py-10 text-center text-xs text-muted-foreground">
                  <Loader2 className="size-5 animate-spin mx-auto mb-2 text-primary" />
                  Scanning fleet storage anomalies...
                </div>
              ) : anomalies.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  <CheckCircle2 className="size-8 text-emerald-600/60 mx-auto mb-2" />
                  <p className="font-medium text-foreground">No storage anomalies detected</p>
                  <p className="mt-1">All tenant pools are operating within normal ingestion and trash thresholds.</p>
                </div>
              ) : (
                anomalies.map((item: any) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl border border-border/80 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant={
                            item.severity === 'CRITICAL'
                              ? 'destructive'
                              : item.severity === 'WARNING'
                              ? 'warning'
                              : 'info'
                          }
                          className="text-[10px]"
                        >
                          {item.severity}
                        </Badge>
                        <Badge variant="outline"className="text-[10px]">
                          {item.type}
                        </Badge>
                        <span className="font-semibold text-xs text-foreground">{item.tenantName}</span>
                      </div>
                      <p className="text-xs font-medium text-foreground">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.message}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="secondary"className="tabular-nums text-xs">
                        {item.metricFormatted}
                      </Badge>
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => setInspectTenantId(item.tenantId)}
                      >
                        Inspect
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: RETENTION GOVERNANCE */}
        <TabsContent value="retention" className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Active Policies"
              value={retentionFleet?.activePolicies ?? 0}
              description={`${retentionFleet?.dryRunPolicies ?? 0} in dry-run preview mode`}
              icon={ShieldCheck}
              variant="primary"
            />
            <StatCard
              label="Total Reclaimed"
              value={retentionFleet?.formattedTotalReclaimed || '0 B'}
              description={`${Number(retentionFleet?.totalReclaimedFiles || 0).toLocaleString()} files purged`}
              icon={Trash2}
              variant="success"
            />
            <StatCard
              label="Active Legal Holds"
              value={retentionFleet?.activeHoldsCount ?? 0}
              description="Protected from automated purge"
              icon={ShieldAlert}
              variant="warning"
            />
            <StatCard
              label="Total Policies Configured"
              value={retentionFleet?.totalPolicies ?? 0}
              description={`Across ${retentionFleet?.totalTenants ?? platform.totalTenants} tenants`}
              icon={Layers}
              variant="info"
            />
          </div>

          {/* Retention Controls */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Execute Single-Tenant Retention</CardTitle>
                <CardDescription className="text-xs">
                  Trigger retention cleanup or dry-run evaluation for a specific tenant (`/super/storage/retention/execute`).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="space-y-1.5">
                  <Label>Select Tenant</Label>
                  <Select value={retentionTenantId} onValueChange={setRetentionTenantId}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Choose a tenant workspace..." />
                    </SelectTrigger>
                    <SelectContent>
                      {tenantsList.map((t: any) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name} ({t.formattedUsed})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={retentionDryRun}
                    onChange={(e) => setRetentionDryRun(e.target.checked)}
                    className="rounded border-border h-4 w-4 text-primary"
                  />
                  <span className="font-medium text-foreground">
                    Dry-run mode (evaluate candidates without deleting blobs)
                  </span>
                </label>

                <Button
                  size="sm"
                  variant={retentionDryRun ? 'outline' : 'destructive'}
                  disabled={!retentionTenantId || executeRetentionMutation.isPending}
                  onClick={() => setConfirmAction({ type: 'retention_execute' })}
                >
                  <Play className="size-3.5" />
                  {retentionDryRun ? 'Run Tenant Dry-Run' : 'Execute Live Tenant Purge'}
                </Button>
              </CardContent>
            </Card>

            <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Fleet-Wide Scheduled Retention Sweep</CardTitle>
                <CardDescription className="text-xs">
                  Evaluate all tenants with enabled retention policies, respecting dry-run flags and legal holds (`/super/storage/retention/sweep`).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <Alert variant="ghost-warning" icon={<AlertTriangle className="size-4" />}>
                  <span className="text-xs">
                    Tenants configured for live retention will purge expired trash and versions beyond their policy retention window. Legal holds are always respected.
                  </span>
                </Alert>
                <Button
                  size="sm"
                  variant="warning"
                  disabled={sweepRetentionMutation.isPending}
                  onClick={() => setConfirmAction({ type: 'retention_sweep' })}
                >
                  {sweepRetentionMutation.isPending ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <CalendarClock className="size-3.5" />
                  )}
                  Run Fleet Retention Sweep
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Retention Job History Table */}
          <Card className="border border-border/80 rounded-xl bg-card shadow-xs overflow-hidden">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Retention Execution History</CardTitle>
                <CardDescription className="text-xs">
                  Audited retention jobs from `/super/storage/retention/history`.
                </CardDescription>
              </div>
              <Button size="xs" variant="outline" onClick={() => refetchRetentionHistory()}>
                <RefreshCw className="size-3" />
                Refresh
              </Button>
            </CardHeader>
            <div className="overflow-x-auto border-t border-border/60">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border/80">
                    <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3 pl-4">
                      Job ID / Tenant
                    </th>
                    <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                      Mode
                    </th>
                    <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                      Status
                    </th>
                    <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3">
                      Reclaimed
                    </th>
                    <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold p-3 pr-4">
                      Executed At
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {isLoadingRetentionHistory ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-muted-foreground">
                        Loading retention history...
                      </td>
                    </tr>
                  ) : retentionJobs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-muted-foreground">
                        No retention jobs have been executed yet.
                      </td>
                    </tr>
                  ) : (
                    retentionJobs.map((j: any) => (
                      <tr key={j.id} className="hover:bg-muted/40 transition-colors">
                        <td className="p-3 pl-4 tabular-nums">
                          <div className="font-semibold text-foreground">{j.id.slice(0, 12)}...</div>
                          <div className="text-[10px] text-muted-foreground">Tenant: {j.tenantId}</div>
                        </td>
                        <td className="p-3">
                          <Badge variant={j.isDryRun ? 'info' : 'warning'} className="text-[10px]">
                            {j.isDryRun ? 'DRY RUN' : 'LIVE PURGE'}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <Badge
                            variant={
                              j.status === 'COMPLETED'
                                ? 'success'
                                : j.status === 'FAILED'
                                ? 'destructive'
                                : 'secondary'
                            }
                            className="text-[10px]"
                          >
                            {j.status}
                          </Badge>
                        </td>
                        <td className="p-3 tabular-nums">
                          {j.formattedDeletedBytes || formatBytes(j.deletedBytes || 0)} ({j.deletedCount ?? 0} files)
                        </td>
                        <td className="p-3 pr-4 text-muted-foreground">
                          {j.createdAt ? new Date(j.createdAt).toLocaleString() : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {retentionHistory?.pagination && retentionHistory.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between p-3 border-t border-border/60 bg-muted/20 text-xs">
                <span className="text-muted-foreground">
                  Page {retentionHistory.pagination.page} of {retentionHistory.pagination.totalPages}
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    size="xs"
                    variant="outline"
                    disabled={retentionPage <= 1}
                    onClick={() => setRetentionPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    size="xs"
                    variant="outline"
                    disabled={retentionPage >= retentionHistory.pagination.totalPages}
                    onClick={() => setRetentionPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* TAB 5: LOCAL-TO-OBJECT STORAGE MIGRATION */}
        <TabsContent value="migration" className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <CloudUpload className="size-4 text-primary" />
                  Trigger Local-to-Object Migration
                </CardTitle>
                <CardDescription className="text-xs">
                  Resumable SHA-256 verified batch migration from legacy local disk to configured object storage (`/super/storage/migrate-local`).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <Label>Batch Size (files per run)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={500}
                    value={migrationBatchSize}
                    onChange={(e) => setMigrationBatchSize(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Tenant Scope</Label>
                  <Select value={migrationTenantId} onValueChange={setMigrationTenantId}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tenants (Fleet-wide)</SelectItem>
                      {tenantsList.map((t: any) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full"
                  disabled={migrateLocalMutation.isPending || migrationStatusRes?.isRunning}
                  onClick={() => setConfirmAction({ type: 'migrate_local' })}
                >
                  {migrateLocalMutation.isPending || migrationStatusRes?.isRunning ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <CloudUpload className="size-3.5" />
                  )}
                  {migrationStatusRes?.isRunning ? 'Migration Running...' : 'Start / Resume Migration Batch'}
                </Button>
              </CardContent>
            </Card>

            <Card className="border border-border/80 rounded-xl bg-card shadow-xs lg:col-span-2">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Activity className="size-4 text-emerald-600" />
                    Live Migration Telemetry
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Job: {migrationStatusRes?.jobId || 'idle'}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={migrationStatusRes?.isRunning ? 'info' : 'secondary'}>
                    {migrationStatusRes?.isRunning ? 'RUNNING' : 'IDLE'}
                  </Badge>
                  <Button size="xs" variant="outline" onClick={() => refetchMigrationStatus()}>
                    <RefreshCw className={`size-3 ${isLoadingMigration ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-muted/40 border border-border/60">
                    <div className="text-[11px] text-muted-foreground">Candidate Local Files</div>
                    <div className="text-lg font-bold tabular-nums">{migrationStatusRes?.totalFiles ?? 0}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/40 border border-border/60">
                    <div className="text-[11px] text-muted-foreground">Processed</div>
                    <div className="text-lg font-bold tabular-nums">{migrationStatusRes?.processedCount ?? 0}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/40 border border-border/60">
                    <div className="text-[11px] text-muted-foreground">Migrated</div>
                    <div className="text-lg font-bold tabular-nums text-emerald-600">
                      {migrationStatusRes?.migratedCount ?? 0}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/40 border border-border/60">
                    <div className="text-[11px] text-muted-foreground">Skipped</div>
                    <div className="text-lg font-bold tabular-nums text-amber-600">
                      {migrationStatusRes?.skippedCount ?? 0}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/40 border border-border/60">
                    <div className="text-[11px] text-muted-foreground">Failed</div>
                    <div className="text-lg font-bold tabular-nums text-rose-600">
                      {migrationStatusRes?.failedCount ?? 0}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/40 border border-border/60">
                    <div className="text-[11px] text-muted-foreground">Migrated Volume</div>
                    <div className="text-lg font-bold tabular-nums">
                      {formatBytes(migrationStatusRes?.migratedBytes || 0)}
                    </div>
                  </div>
                </div>

                {Array.isArray(migrationStatusRes?.lastErrors) && migrationStatusRes.lastErrors.length > 0 && (
                  <div className="space-y-1.5">
                    <Label className="text-rose-600">Recent Migration Errors</Label>
                    <div className="max-h-36 overflow-y-auto space-y-1 p-2.5 rounded-lg border border-rose-500/30 bg-rose-500/5 text-[11px]">
                      {migrationStatusRes.lastErrors.map((err: any, i: number) => (
                        <div key={i}>
                          [{err.fileId}]: {err.error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── DIALOG 1: TENANT STORAGE INSPECTION ── */}
      <Dialog open={Boolean(inspectTenantId)} onOpenChange={(open) => !open && setInspectTenantId(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <HardDrive className="size-5 text-primary" />
              Tenant Storage Inspection: {tenantDetail?.tenant?.name || 'Loading...'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Metadata-only storage composition, file category breakdown, and top consumers.
            </DialogDescription>
          </DialogHeader>

          {isLoadingDetail ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              <Loader2 className="size-5 animate-spin mx-auto mb-2 text-primary" />
              Loading tenant storage breakdown...
            </div>
          ) : tenantDetail ? (
            <div className="space-y-4 pt-2 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60">
                  <div className="text-muted-foreground">Effective Quota</div>
                  <div className="font-bold tabular-nums text-sm mt-0.5">{tenantDetail.quota?.formattedQuota}</div>
                  <div className="text-[10px] text-muted-foreground">{tenantDetail.quota?.quotaSource}</div>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60">
                  <div className="text-muted-foreground">Active Files</div>
                  <div className="font-bold tabular-nums text-sm mt-0.5">{tenantDetail.usage?.formattedActive}</div>
                  <div className="text-[10px] text-muted-foreground">{tenantDetail.usage?.fileCount} files</div>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60">
                  <div className="text-muted-foreground">Recycle Bin</div>
                  <div className="font-bold tabular-nums text-sm mt-0.5">{tenantDetail.usage?.formattedTrash}</div>
                  <div className="text-[10px] text-amber-600 font-semibold">Reclaimable</div>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60">
                  <div className="text-muted-foreground">Versions</div>
                  <div className="font-bold tabular-nums text-sm mt-0.5">{tenantDetail.usage?.formattedVersion}</div>
                  <div className="text-[10px] text-muted-foreground">Historical blobs</div>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-border/60">
                <h4 className="font-semibold text-foreground">File Category Distribution</h4>
                <div className="space-y-1.5">
                  {(tenantDetail.categories || []).map((cat: any) => (
                    <div key={cat.category} className="flex items-center justify-between text-[11px]">
                      <span className="w-24 text-muted-foreground">{cat.category}</span>
                      <div className="flex-1 mx-3 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${cat.percentage}%` }} />
                      </div>
                      <span className="tabular-nums w-16 text-right">{cat.formatted}</span>
                      <span className="text-muted-foreground tabular-nums w-12 text-right">({cat.percentage}%)</span>
                    </div>
                  ))}
                </div>
              </div>

              {tenantDetail.topUsers?.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-border/60">
                  <h4 className="font-semibold text-foreground">Top Storage Users</h4>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {tenantDetail.topUsers.map((u: any) => (
                      <div
                        key={u.userId}
                        className="flex items-center justify-between p-1.5 rounded-md hover:bg-muted/40 text-[11px]"
                      >
                        <div>
                          <span className="font-semibold text-foreground">{u.name}</span>
                          <span className="text-muted-foreground ml-2 text-[10px]">{u.email}</span>
                        </div>
                        <div>{u.formattedUsed}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}

          <DialogFooter>
            {tenantDetail?.tenant?.id && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const id = tenantDetail.tenant.id;
                  const name = tenantDetail.tenant.name;
                  setInspectTenantId(null);
                  setQuotaTenant({ id, name });
                }}
              >
                <Sliders className="size-3.5" />
                Edit Quota
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setInspectTenantId(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── DIALOG 2: PER-TENANT QUOTA EDITOR (GET/PUT /super/storage/tenants/:id/quota) ── */}
      <Dialog open={Boolean(quotaTenant)} onOpenChange={(open) => !open && setQuotaTenant(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Sliders className="size-5 text-primary" />
              Quota Governance: {quotaTenant?.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Inspect hierarchical quota allocations and apply a Super Admin storage quota override.
            </DialogDescription>
          </DialogHeader>

          {isLoadingTenantQuota ? (
            <div className="py-10 text-center text-xs text-muted-foreground">
              <Loader2 className="size-5 animate-spin mx-auto mb-2 text-primary" />
              Loading tenant quota governance...
            </div>
          ) : tenantQuotaData ? (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 rounded-lg bg-muted/40 border border-border/60">
                  <div className="text-[11px] text-muted-foreground">Current Quota</div>
                  <div className="tabular-nums font-bold text-sm">{tenantQuotaData.tenant?.formattedQuota}</div>
                  <div className="text-[10px] text-muted-foreground">
                    Source: {tenantQuotaData.tenant?.source} ({tenantQuotaData.tenant?.planName})
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-muted/40 border border-border/60">
                  <div className="text-[11px] text-muted-foreground">Used / Available</div>
                  <div className="tabular-nums font-bold text-sm">
                    {tenantQuotaData.tenant?.formattedUsed} / {tenantQuotaData.tenant?.formattedAvailable}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Lifecycle: {tenantQuotaData.lifecycleState} ({tenantQuotaData.effectiveUtilizationPct}%)
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-muted/20 border border-border/60 space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Platform Hard Ceiling</span>
                  <span className="tabular-nums font-medium">
                    {tenantQuotaData.platform?.formattedCeiling || tenantQuotaData.platformCeiling?.formattedLimit || '1 TB'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Department Allocations</span>
                  <span className="tabular-nums">
                    {tenantQuotaData.allocations?.departments?.formattedAllocatedTotal || '0 B'} (
                    {tenantQuotaData.allocations?.departments?.departmentCount ?? 0} depts)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">User Overrides Active</span>
                  <span className="tabular-nums">
                    {tenantQuotaData.allocations?.usersWithOverridesCount ?? 0}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-border/60">
                <Label>New Quota Override (GB)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    step="0.5"
                    value={quotaInputGb}
                    onChange={(e) => setQuotaInputGb(e.target.value)}
                    placeholder="e.g. 50"
                    className="tabular-nums"
                  />
                  <span className="text-muted-foreground shrink-0">GB</span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[10, 25, 50, 100, 250, 500].map((preset) => (
                    <Button
                      key={preset}
                      type="button"
                      size="xs"
                      variant="outline"
                      onClick={() => setQuotaInputGb(String(preset))}
                    >
                      {preset} GB
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setQuotaTenant(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveQuota}
              disabled={updateQuotaMutation.isPending || isLoadingTenantQuota}
            >
              {updateQuotaMutation.isPending && <Loader2 className="size-3.5 animate-spin" />}
              Apply Quota Override
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── DIALOG 3: PER-TENANT FORECAST (/super/storage/analytics/tenants/:id/forecast) ── */}
      <Dialog open={Boolean(forecastTenant)} onOpenChange={(open) => !open && setForecastTenant(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-2 pr-6 text-base">
              <span className="flex items-center gap-2">
                <TrendingUp className="size-5 text-emerald-600" />
                Tenant Capacity Forecast: {forecastTenant?.name}
              </span>
              <div className="flex items-center gap-1">
                {[7, 30, 90].map((d) => (
                  <Button
                    key={d}
                    size="xs"
                    variant={forecastLookback === d ? 'primary' : 'outline'}
                    onClick={() => setForecastLookback(d)}
                  >
                    {d}d
                  </Button>
                ))}
              </div>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Tenant-specific regression velocity, 30-day projection, and historical growth chart.
            </DialogDescription>
          </DialogHeader>

          {isLoadingTenantForecast ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              <Loader2 className="size-5 animate-spin mx-auto mb-2 text-primary" />
              Calculating tenant storage forecast...
            </div>
          ) : tenantForecastData?.forecast ? (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60">
                  <div className="text-muted-foreground">Current Usage</div>
                  <div className="tabular-nums font-bold text-sm">
                    {tenantForecastData.forecast.formattedCurrentUsage}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    of {tenantForecastData.forecast.formattedQuota} ({tenantForecastData.forecast.utilizationPercent}%)
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60">
                  <div className="text-muted-foreground">Daily Velocity</div>
                  <div className="font-bold text-sm">
                    {tenantForecastData.forecast.formattedDailyGrowth}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {tenantForecastData.forecast.dataPoints} snapshots
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60">
                  <div className="text-muted-foreground">30d Projection</div>
                  <div className="font-bold text-sm">
                    {tenantForecastData.forecast.formattedProjected30Days}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Confidence: {tenantForecastData.forecast.confidence}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60">
                  <div className="text-muted-foreground">Days Remaining</div>
                  <div className="font-bold text-sm">
                    {tenantForecastData.forecast.projectedDaysRemaining != null
                      ? `${tenantForecastData.forecast.projectedDaysRemaining}d`
                      : 'Stable'}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {tenantForecastData.forecast.forecastStatus}
                  </div>
                </div>
              </div>

              {tenantGrowthChart ? (
                <Suspense fallback={<div className="h-56 flex items-center justify-center text-muted-foreground">Rendering chart...</div>}>
                  <Chart
                    options={tenantGrowthChart.options}
                    series={tenantGrowthChart.series}
                    type="area"
                    height={230}
                    width="100%"
                  />
                </Suspense>
              ) : (
                <div className="py-10 text-center text-muted-foreground border border-dashed border-border rounded-lg">
                  Not enough daily snapshots recorded for this tenant yet.
                </div>
              )}
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setForecastTenant(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── CONFIRMATION DIALOGS FOR DESTRUCTIVE / FLEET ACTIONS ── */}
      <ConfirmationDialog
        open={confirmAction?.type === 'reconcile'}
        onOpenChange={(open) => !open && !reconcileMutation.isPending && setConfirmAction(null)}
        title="Run Fleet-Wide Storage Reconciliation?"
        description="Scans tenant file tables against tracked storage usage ledgers and repairs quota drift counters across the fleet."
        confirmLabel="Run Reconciliation"
        variant="default"
        icon={<ShieldCheck className="size-5" />}
        isLoading={reconcileMutation.isPending}
        onConfirm={() => reconcileMutation.mutate()}
      />

      <ConfirmationDialog
        open={confirmAction?.type === 'retention_execute'}
        onOpenChange={(open) => !open && !executeRetentionMutation.isPending && setConfirmAction(null)}
        title={retentionDryRun ? 'Run Tenant Retention Dry-Run?' : 'Execute Live Tenant Retention Purge?'}
        description={
          retentionDryRun
            ? 'Evaluates eligible expired recycle-bin items and versions without deleting any files.'
            : 'Permanently purges eligible expired files and versions for the selected tenant (legal holds are preserved). This cannot be undone.'
        }
        confirmLabel={retentionDryRun ? 'Run Dry-Run' : 'Execute Live Purge'}
        variant={retentionDryRun ? 'default' : 'destructive'}
        isLoading={executeRetentionMutation.isPending}
        onConfirm={() => {
          if (retentionTenantId) {
            executeRetentionMutation.mutate({ tenantId: retentionTenantId, isDryRun: retentionDryRun });
          }
        }}
      />

      <ConfirmationDialog
        open={confirmAction?.type === 'retention_sweep'}
        onOpenChange={(open) => !open && !sweepRetentionMutation.isPending && setConfirmAction(null)}
        title="Run Fleet-Wide Retention Sweep?"
        description="Processes every tenant with an enabled retention policy. Tenants in live mode will permanently purge expired assets while dry-run tenants generate previews."
        confirmLabel="Run Fleet Sweep"
        variant="destructive"
        isLoading={sweepRetentionMutation.isPending}
        onConfirm={() => sweepRetentionMutation.mutate()}
      />

      <ConfirmationDialog
        open={confirmAction?.type === 'migrate_local'}
        onOpenChange={(open) => !open && !migrateLocalMutation.isPending && setConfirmAction(null)}
        title="Start Local-to-Object Storage Migration Batch?"
        description={`Uploads up to ${Math.max(1, Number(migrationBatchSize) || 50)} local disk files to configured object storage with SHA-256 verification.`}
        confirmLabel="Start Migration"
        variant="default"
        icon={<CloudUpload className="size-5" />}
        isLoading={migrateLocalMutation.isPending}
        onConfirm={() => migrateLocalMutation.mutate()}
      />
    </div>
  );
}
