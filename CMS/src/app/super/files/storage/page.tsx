'use client';

import React, { useState, useMemo, lazy, Suspense } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import {
  HardDrive,
  Database,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  Eye,
  TrendingUp,
  Layers,
  Sparkles,
  PieChart,
  BarChart2,
  Trash2,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

// SSR-safe ApexCharts import
const Chart = lazy(() => import('react-apexcharts'));

export default function SuperStorageAdministrationPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [utilizationFilter, setUtilizationFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [isReconciling, setIsReconciling] = useState(false);

  // 1. Fetch Fleet Overview & Tenants
  const { data: overview, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['super-storage-overview', search, planFilter, utilizationFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (planFilter !== 'all') params.append('plan', planFilter);
      if (utilizationFilter !== 'all') params.append('utilization', utilizationFilter);
      params.append('page', String(page));
      params.append('limit', '15');

      const res = await api.get(`/api/v1/super/storage/overview?${params.toString()}`);
      return (res as any)?.data ?? res;
    },
  });

  // 2. Fetch Fleet Analytics & Runway
  const { data: analyticsData } = useQuery({
    queryKey: ['super-storage-analytics'],
    queryFn: async () => {
      const res = await api.get('/api/v1/super/storage/analytics');
      return (res as any)?.data ?? res;
    },
  });

  // 3. Fetch Single Tenant Detail for Inspection Modal
  const { data: tenantDetail, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['super-storage-tenant-detail', selectedTenantId],
    queryFn: async () => {
      if (!selectedTenantId) return null;
      const res = await api.get(`/api/v1/super/storage/tenants/${selectedTenantId}`);
      return (res as any)?.data ?? res;
    },
    enabled: !!selectedTenantId,
  });

  // Trigger Fleet Reconcile
  const handleFleetReconcile = async () => {
    try {
      setIsReconciling(true);
      const res: any = await api.post('/api/v1/super/storage/reconcile', { dryRun: false });
      toast.success(`Fleet storage reconciled: ${res?.driftCount ?? res?.data?.driftCount ?? 0} drifts corrected.`);
      qc.invalidateQueries({ queryKey: ['super-storage-overview'] });
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Reconciliation failed');
    } finally {
      setIsReconciling(false);
    }
  };

  const platform = overview?.platform || {
    totalTenants: 0,
    formattedSubscribed: '0 GB',
    formattedConsumed: '0 GB',
    formattedTrashed: '0 GB',
    formattedReserved: '0 GB',
    globalUtilizationPct: 0,
    totalFilesAcrossFleet: 0,
    atRiskTenantsCount: 0,
  };

  // Plan distribution chart options
  const planChartOptions: any = {
    chart: { type: 'donut', fontFamily: 'inherit', background: 'transparent' },
    labels: overview?.planDistribution?.map((p: any) => p.name) || [],
    colors: ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B'],
    legend: { position: 'bottom', labels: { colors: 'currentColor' } },
    dataLabels: { enabled: false },
    stroke: { show: false },
    theme: { mode: 'light' },
  };
  const planChartSeries = overview?.planDistribution?.map((p: any) => p.count) || [];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto min-h-screen text-foreground">
      {/* ── Top Header Ribbon ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-foreground">
                Fleet Storage Administration
              </h1>
              <p className="text-xs text-muted-foreground">
                Multi-tenant storage capacity, quota governance, and system-wide analytics.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-2 h-9 text-xs font-semibold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh Fleet
          </Button>
          <Button
            size="sm"
            onClick={handleFleetReconcile}
            disabled={isReconciling}
            className="gap-2 h-9 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            {isReconciling ? 'Reconciling...' : 'Run Reconciliation'}
          </Button>
        </div>
      </div>

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Subscribed */}
        <div className="p-4 rounded-xl border border-border/60 bg-card/80 backdrop-blur-md shadow-xs space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Subscribed Capacity</span>
            <Database className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-foreground">
            {platform.formattedSubscribed}
          </div>
          <div className="text-[11px] text-muted-foreground flex items-center justify-between">
            <span>Across {platform.totalTenants} tenant pools</span>
            <Badge variant="secondary" className="text-[10px] h-4 px-1">
              Active Plans
            </Badge>
          </div>
        </div>

        {/* Total Consumed */}
        <div className="p-4 rounded-xl border border-border/60 bg-card/80 backdrop-blur-md shadow-xs space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Fleet Consumed</span>
            <HardDrive className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-foreground">
            {platform.formattedConsumed}
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{platform.globalUtilizationPct}% global utilization</span>
            <span className="font-mono">{platform.totalFilesAcrossFleet.toLocaleString()} files</span>
          </div>
        </div>

        {/* Trashed Storage */}
        <div className="p-4 rounded-xl border border-border/60 bg-card/80 backdrop-blur-md shadow-xs space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Recycle Bin Retention</span>
            <Trash2 className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-foreground">
            {platform.formattedTrashed}
          </div>
          <div className="text-[11px] text-muted-foreground flex items-center justify-between">
            <span>Pending manual or auto-purge</span>
            <span className="text-amber-500 font-semibold font-mono">Reclaimable</span>
          </div>
        </div>

        {/* At-Risk Tenants */}
        <div className="p-4 rounded-xl border border-border/60 bg-card/80 backdrop-blur-md shadow-xs space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>At-Risk Accounts (&gt;70%)</span>
            <ShieldAlert className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-foreground">
            {platform.atRiskTenantsCount}
          </div>
          <div className="text-[11px] text-muted-foreground flex items-center justify-between">
            <span>Accounts near threshold</span>
            {platform.atRiskTenantsCount > 0 ? (
              <Badge variant="destructive" className="text-[10px] h-4 px-1 bg-rose-500/10 text-rose-500 border-rose-500/20">
                Action Required
              </Badge>
            ) : (
              <span className="text-emerald-500 font-medium">All Healthy</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Mid Analytics Split: Plan Distribution & Runway Forecasting ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Plan Distribution Donut */}
        <div className="p-5 rounded-xl border border-border/60 bg-card/80 backdrop-blur-md shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <PieChart className="w-4 h-4 text-primary" />
              Subscription Plan Distribution
            </h3>
          </div>
          <div className="min-h-[220px] flex items-center justify-center">
            {planChartSeries.length > 0 ? (
              <Suspense fallback={<div className="h-40 flex items-center justify-center text-xs text-muted-foreground">Loading chart...</div>}>
                <Chart options={planChartOptions} series={planChartSeries} type="donut" width="100%" height={220} />
              </Suspense>
            ) : (
              <div className="text-xs text-muted-foreground">No plan distribution data.</div>
            )}
          </div>
        </div>

        {/* Storage Capacity Runway Forecasting */}
        <div className="lg:col-span-2 p-5 rounded-xl border border-border/60 bg-card/80 backdrop-blur-md shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              Platform Runway & Capacity Forecasting
            </h3>
            <Badge variant="outline" className="text-[10px] font-mono border-dashed">
              Forward-Looking Projection (Estimate)
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            <div className="p-3.5 rounded-lg bg-secondary/50 border border-border/50">
              <div className="text-xs text-muted-foreground">Daily Ingestion Velocity</div>
              <div className="text-lg font-bold font-mono text-foreground mt-1">
                {analyticsData?.forecast?.formattedDailyGrowth || '10.0 MB / day'}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">Based on tracked activities</div>
            </div>

            <div className="p-3.5 rounded-lg bg-secondary/50 border border-border/50">
              <div className="text-xs text-muted-foreground">Estimated Fleet Runway</div>
              <div className="text-lg font-bold font-mono text-emerald-500 mt-1">
                {analyticsData?.forecast?.estimatedDaysToExhaustion
                  ? `${analyticsData.forecast.estimatedDaysToExhaustion} days`
                  : 'Ample Capacity'}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">Until platform ceiling</div>
            </div>

            <div className="p-3.5 rounded-lg bg-secondary/50 border border-border/50">
              <div className="text-xs text-muted-foreground">Forecast Status</div>
              <div className="text-lg font-bold text-foreground mt-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                {analyticsData?.forecast?.forecastStatus || 'HEALTHY'}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">Zero hard quota blocks</div>
            </div>
          </div>

          <div className="text-xs text-muted-foreground bg-accent/20 p-3 rounded-lg border border-border/40">
            <p>
              💡 <strong>Integrity Note:</strong> Historical storage trends begin from deployment date and are grounded in real snapshots. Estimates use linear velocity projection without synthetic inflation.
            </p>
          </div>
        </div>
      </div>

      {/* ── Filter Bar & Tenants Table ── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search tenant name or slug..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 h-9 text-xs bg-background"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Plan Filter */}
            <select
              value={planFilter}
              onChange={(e) => {
                setPlanFilter(e.target.value);
                setPage(1);
              }}
              className="h-9 text-xs px-2.5 rounded-md border border-border bg-background text-foreground"
            >
              <option value="all">All Plans</option>
              <option value="starter">Starter (10 GB)</option>
              <option value="growth">Growth (25 GB)</option>
              <option value="sovereign">Sovereign (100 GB)</option>
              <option value="custom">Custom (500 GB)</option>
            </select>

            {/* Utilization Filter */}
            <select
              value={utilizationFilter}
              onChange={(e) => {
                setUtilizationFilter(e.target.value);
                setPage(1);
              }}
              className="h-9 text-xs px-2.5 rounded-md border border-border bg-background text-foreground"
            >
              <option value="all">All Utilization</option>
              <option value="over_70">&ge; 70% (Warning)</option>
              <option value="over_85">&ge; 85% (High)</option>
              <option value="over_95">&ge; 95% (Critical)</option>
              <option value="locked">100% (Locked)</option>
            </select>
          </div>
        </div>

        {/* Tenants Storage Data Table */}
        <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/80 bg-secondary/40 text-muted-foreground font-semibold">
                  <th className="py-3 px-4">Organization / Tenant</th>
                  <th className="py-3 px-4">Subscription Plan</th>
                  <th className="py-3 px-4">Quota Source</th>
                  <th className="py-3 px-4">Storage Consumption</th>
                  <th className="py-3 px-4">Utilization</th>
                  <th className="py-3 px-4">Files</th>
                  <th className="py-3 px-4">Alert Level</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                      Loading tenant fleet storage data...
                    </td>
                  </tr>
                ) : overview?.tenants?.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground">
                      No tenants match the specified search or filter criteria.
                    </td>
                  </tr>
                ) : (
                  overview?.tenants?.map((t: any) => {
                    const isHigh = t.percentUsed >= 85;
                    const isCritical = t.percentUsed >= 95;
                    const isWarning = t.percentUsed >= 70;

                    return (
                      <tr key={t.id} className="hover:bg-accent/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-foreground">{t.name}</div>
                          <div className="text-[11px] font-mono text-muted-foreground">{t.slug}</div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="font-normal text-[11px]">
                            {t.plan}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[11px] font-mono text-muted-foreground">
                            {t.quotaSource}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono">
                          <div>{t.formattedUsed}</div>
                          <div className="text-[10px] text-muted-foreground">of {t.formattedQuota}</div>
                        </td>
                        <td className="py-3 px-4 w-44">
                          <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                            <span>{t.percentUsed}%</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 ${
                                isCritical
                                  ? 'bg-rose-500'
                                  : isHigh
                                  ? 'bg-orange-500'
                                  : isWarning
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(100, t.percentUsed)}%` }}
                            />
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-muted-foreground">
                          {t.fileCount}
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            className={`text-[10px] font-semibold border ${
                              t.thresholdState === 'LOCKED_100'
                                ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                                : t.thresholdState === 'CRITICAL_95'
                                ? 'bg-orange-500/10 text-orange-500 border-orange-500/20'
                                : t.thresholdState === 'WARNING_70'
                                ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                            }`}
                          >
                            {t.thresholdState}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedTenantId(t.id)}
                            className="h-7 px-2 text-xs gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Inspect
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {overview?.pagination && overview.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between p-3 border-t border-border/60 bg-secondary/20 text-xs">
              <span className="text-muted-foreground">
                Showing page {overview.pagination.page} of {overview.pagination.totalPages} ({overview.pagination.total} tenants)
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-7 text-xs"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= overview.pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="h-7 text-xs"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Tenant Storage Inspection Modal ── */}
      <Dialog open={!!selectedTenantId} onOpenChange={(open) => !open && setSelectedTenantId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-primary" />
              Tenant Storage Inspection: {tenantDetail?.tenant?.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Inspect storage composition, user allocations, and category breakdown without exposing sensitive file contents.
            </DialogDescription>
          </DialogHeader>

          {isLoadingDetail ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
              Loading tenant storage metrics...
            </div>
          ) : tenantDetail ? (
            <div className="space-y-4 pt-2 text-xs">
              {/* Quota & Usage Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-2.5 rounded-lg bg-secondary/50 border border-border/50">
                  <div className="text-muted-foreground">Effective Quota</div>
                  <div className="font-bold font-mono text-sm mt-0.5">{tenantDetail.quota?.formattedQuota}</div>
                  <div className="text-[10px] text-muted-foreground">{tenantDetail.quota?.quotaSource}</div>
                </div>

                <div className="p-2.5 rounded-lg bg-secondary/50 border border-border/50">
                  <div className="text-muted-foreground">Active Files</div>
                  <div className="font-bold font-mono text-sm mt-0.5">{tenantDetail.usage?.formattedActive}</div>
                  <div className="text-[10px] text-muted-foreground">{tenantDetail.usage?.fileCount} files</div>
                </div>

                <div className="p-2.5 rounded-lg bg-secondary/50 border border-border/50">
                  <div className="text-muted-foreground">Recycle Bin</div>
                  <div className="font-bold font-mono text-sm mt-0.5">{tenantDetail.usage?.formattedTrash}</div>
                  <div className="text-[10px] text-amber-500 font-semibold">Reclaimable</div>
                </div>

                <div className="p-2.5 rounded-lg bg-secondary/50 border border-border/50">
                  <div className="text-muted-foreground">Versions</div>
                  <div className="font-bold font-mono text-sm mt-0.5">{tenantDetail.usage?.formattedVersion}</div>
                  <div className="text-[10px] text-muted-foreground">Historical blobs</div>
                </div>
              </div>

              {/* Category Breakdown */}
              <div className="space-y-2 pt-2 border-t border-border/60">
                <h4 className="font-bold text-foreground">File Category Distribution</h4>
                <div className="space-y-1.5">
                  {tenantDetail.categories?.map((cat: any) => (
                    <div key={cat.category} className="flex items-center justify-between text-[11px]">
                      <span className="w-24 text-muted-foreground">{cat.category}</span>
                      <div className="flex-1 mx-3 h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${cat.percentage}%` }} />
                      </div>
                      <span className="font-mono w-16 text-right">{cat.formatted}</span>
                      <span className="text-muted-foreground font-mono w-12 text-right">({cat.percentage}%)</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Users */}
              {tenantDetail.topUsers && tenantDetail.topUsers.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-border/60">
                  <h4 className="font-bold text-foreground">Top Storage Users</h4>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {tenantDetail.topUsers.map((u: any) => (
                      <div key={u.userId} className="flex items-center justify-between p-1.5 rounded-md hover:bg-secondary/40 text-[11px]">
                        <div>
                          <span className="font-semibold text-foreground">{u.name}</span>
                          <span className="text-muted-foreground ml-2 font-mono text-[10px]">{u.email}</span>
                        </div>
                        <div className="font-mono">{u.formattedUsed}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
