"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Loader2, RefreshCw, Save } from "lucide-react";

interface ReferralSettings {
  enabled: boolean;
  commissionPercent: number;
  minimumPayout: number;
  currency: string;
  guidelines: string;
  autoApproveThreshold: number;
}

interface ReferredTenantRecord {
  id: string;
  referrerTenantId: string;
  referrerTenantName: string;
  referrerTenantSlug: string;
  referredTenantId: string;
  referredTenantName: string;
  referredTenantSlug: string;
  referredEmail?: string;
  planName: string;
  planAmount: number;
  commissionEarned: number;
  currency: string;
  status: "registered" | "active" | "churned";
  convertedAt: string;
}

interface PayoutRequest {
  id: string;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  amount: number;
  currency: string;
  payoutMethod: "bank_transfer" | "upi" | "paypal";
  payoutDetails: {
    accountHolder?: string;
    accountNumber?: string;
    ifscCode?: string;
    bankName?: string;
    upiId?: string;
    paypalEmail?: string;
  };
  status: "pending" | "approved" | "rejected";
  requestedAt: string;
  processedAt?: string;
  processedBy?: string;
  referenceNote?: string;
  rejectionReason?: string;
}

interface ReferralOverview {
  settings: ReferralSettings;
  stats: {
    totalCommissionEarned: number;
    totalPaidOut: number;
    pendingPayoutAmount: number;
    pendingPayoutRequestsCount: number;
    totalReferredTenantsCount: number;
    activeReferredTenantsCount: number;
  };
  referredTenants: ReferredTenantRecord[];
  payoutRequests: PayoutRequest[];
}

const DEFAULT_SETTINGS: ReferralSettings = {
  enabled: true,
  commissionPercent: 15,
  minimumPayout: 1000,
  currency: "INR",
  guidelines: "",
  autoApproveThreshold: 5000,
};

function formatCurrency(amount: number, currency = "INR"): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  try {
    return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
      style: "currency",
      currency: currency || "INR",
      maximumFractionDigits: 2,
    }).format(safe);
  } catch {
    return `₹${safe.toLocaleString("en-IN")}`;
  }
}

function formatDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatPayoutMethodLabel(method: PayoutRequest["payoutMethod"]): string {
  switch (method) {
    case "bank_transfer":
      return "Bank Transfer";
    case "upi":
      return "UPI";
    case "paypal":
      return "PayPal";
    default:
      return method;
  }
}

function formatPayoutDetailsSummary(req: PayoutRequest): string {
  const d = req.payoutDetails || {};
  if (req.payoutMethod === "upi") {
    return d.upiId ? `UPI: ${d.upiId}` : "UPI details not provided";
  }
  if (req.payoutMethod === "paypal") {
    return d.paypalEmail ? `PayPal: ${d.paypalEmail}` : "PayPal email not provided";
  }
  const parts = [
    d.bankName,
    d.accountNumber ? `A/C ••••${d.accountNumber.slice(-4)}` : null,
    d.ifscCode ? `IFSC ${d.ifscCode}` : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "Bank details not provided";
}

export default function SuperReferralsPage() {
  const qc = useQueryClient();

  const [settingsDraft, setSettingsDraft] = useState<ReferralSettings>(DEFAULT_SETTINGS);
  const [settingsDirty, setSettingsDirty] = useState(false);

  const [payoutStatusFilter, setPayoutStatusFilter] = useState<string>("all");
  const [referralSearch, setReferralSearch] = useState("");
  const [referralStatusFilter, setReferralStatusFilter] = useState<string>("all");

  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    mode: "approve" | "reject";
    request: PayoutRequest | null;
    inputValue: string;
  }>({
    open: false,
    mode: "approve",
    request: null,
    inputValue: "",
  });

  const {
    data: overview,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery<ReferralOverview>({
    queryKey: ["super-referral-overview"],
    queryFn: async () => {
      const res = await api.get("/super/referral");
      return (res?.data || res || {}) as ReferralOverview;
    },
  });

  useEffect(() => {
    if (overview?.settings && !settingsDirty) {
      setSettingsDraft({ ...DEFAULT_SETTINGS, ...overview.settings });
    }
  }, [overview?.settings, settingsDirty]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (body: ReferralSettings) => {
      const res = await api.put("/super/referral/settings", body);
      return res?.data || res || {};
    },
    onSuccess: () => {
      toast.success("Referral program settings updated.");
      setSettingsDirty(false);
      qc.invalidateQueries({ queryKey: ["super-referral-overview"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update referral settings.");
    },
  });

  const approvePayoutMutation = useMutation({
    mutationFn: async (payload: { id: string; notes: string }) => {
      const res = await api.post(
        `/super/referral/payout-requests/${encodeURIComponent(payload.id)}/approve`,
        { notes: payload.notes.trim() || undefined }
      );
      return res?.data || res || {};
    },
    onSuccess: () => {
      toast.success("Payout request approved.");
      setActionDialog({ open: false, mode: "approve", request: null, inputValue: "" });
      qc.invalidateQueries({ queryKey: ["super-referral-overview"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to approve payout request.");
    },
  });

  const rejectPayoutMutation = useMutation({
    mutationFn: async (payload: { id: string; reason: string }) => {
      const res = await api.post(
        `/super/referral/payout-requests/${encodeURIComponent(payload.id)}/reject`,
        { reason: payload.reason.trim() }
      );
      return res?.data || res || {};
    },
    onSuccess: () => {
      toast.success("Payout request rejected.");
      setActionDialog({ open: false, mode: "reject", request: null, inputValue: "" });
      qc.invalidateQueries({ queryKey: ["super-referral-overview"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to reject payout request.");
    },
  });

  const stats = overview?.stats;
  const currency = settingsDraft.currency || overview?.settings?.currency || "INR";

  const filteredPayouts = useMemo(() => {
    const list = overview?.payoutRequests || [];
    return list.filter((p) => (payoutStatusFilter === "all" ? true : p.status === payoutStatusFilter));
  }, [overview?.payoutRequests, payoutStatusFilter]);

  const filteredReferrals = useMemo(() => {
    const list = overview?.referredTenants || [];
    const q = referralSearch.trim().toLowerCase();
    return list.filter((r) => {
      if (referralStatusFilter !== "all" && r.status !== referralStatusFilter) return false;
      if (
        q &&
        !`${r.referrerTenantName} ${r.referredTenantName} ${r.referredEmail || ""} ${r.planName}`
          .toLowerCase()
          .includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [overview?.referredTenants, referralSearch, referralStatusFilter]);

  function handleSaveSettings() {
    if (settingsDraft.commissionPercent < 1 || settingsDraft.commissionPercent > 100) {
      toast.error("Commission percentage must be between 1% and 100%.");
      return;
    }
    if (settingsDraft.minimumPayout < 0) {
      toast.error("Minimum payout cannot be negative.");
      return;
    }
    updateSettingsMutation.mutate(settingsDraft);
  }

  function handleConfirmPayoutAction() {
    const req = actionDialog.request;
    if (!req) return;
    if (actionDialog.mode === "approve") {
      approvePayoutMutation.mutate({ id: req.id, notes: actionDialog.inputValue });
    } else {
      if (!actionDialog.inputValue.trim()) {
        toast.error("Please provide a rejection reason.");
        return;
      }
      rejectPayoutMutation.mutate({ id: req.id, reason: actionDialog.inputValue });
    }
  }

  return (
    <div className="w-full min-w-0 space-y-5">
      <PageHeader
        title="Referral Program & Payouts"
        description="Configure partner referral commission rules, track referred workspaces, and approve or reject payout disbursements."
        icon={<i className="ph-duotone ph-gift text-2xl" />}
        badge={
          <Badge variant={settingsDraft.enabled ? "success" : "secondary"} className="text-xs">
            {settingsDraft.enabled ? "Program Active" : "Program Paused"}
          </Badge>
        }
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-1.5"
          >
            <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      {error && (
        <Card className="p-4 border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs flex items-center justify-between gap-3">
          <span>Failed to load referral program data.</span>
          <Button variant="outline" size="xs" onClick={() => refetch()}>
            Retry
          </Button>
        </Card>
      )}

      {/* ─── KPI Row ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Commission Earned"
          value={formatCurrency(stats?.totalCommissionEarned ?? 0, currency)}
          isLoading={isLoading}
          variant="primary"
          icon={<i className="ph ph-coins text-lg" />}
        />
        <StatCard
          title="Total Paid Out"
          value={formatCurrency(stats?.totalPaidOut ?? 0, currency)}
          isLoading={isLoading}
          variant="success"
          icon={<i className="ph ph-check-circle text-lg" />}
        />
        <StatCard
          title="Pending Payouts"
          value={formatCurrency(stats?.pendingPayoutAmount ?? 0, currency)}
          description={`${stats?.pendingPayoutRequestsCount ?? 0} pending request(s)`}
          isLoading={isLoading}
          variant="warning"
          icon={<i className="ph ph-hourglass-medium text-lg" />}
        />
        <StatCard
          title="Referred Workspaces"
          value={stats?.totalReferredTenantsCount ?? 0}
          description={`${stats?.activeReferredTenantsCount ?? 0} active paid`}
          isLoading={isLoading}
          variant="info"
          icon={<i className="ph ph-buildings text-lg" />}
        />
      </div>

      {/* ─── Tabs: Payout Requests / Referred Tenants / Settings ──────────── */}
      <Tabs defaultValue="payouts" className="space-y-5">
        <TabsList>
          <TabsTrigger value="payouts" className="gap-2">
            <i className="ph ph-wallet text-sm" />
            Payout Requests
            {(stats?.pendingPayoutRequestsCount ?? 0) > 0 && (
              <Badge variant="warning" className="ml-1 text-[10px] px-1.5 py-0">
                {stats?.pendingPayoutRequestsCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="referrals" className="gap-2">
            <i className="ph ph-users-three text-sm" />
            Referred Tenants ({overview?.referredTenants?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <i className="ph ph-sliders-horizontal text-sm" />
            Program Settings
            {settingsDirty && (
              <Badge variant="warning" className="ml-1 text-[10px] px-1.5 py-0">
                Unsaved
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ─── TAB 1: PAYOUT REQUESTS ─────────────────────────────────────── */}
        <TabsContent value="payouts">
          <Card className="border border-border/80 rounded-xl bg-card p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-foreground">Payout Approval Queue</h2>
                <p className="text-xs text-muted-foreground">
                  Review partner payout details and record UTR / transaction references upon approval.
                </p>
              </div>
              <Select value={payoutStatusFilter} onValueChange={setPayoutStatusFilter}>
                <SelectTrigger className="h-9 w-[150px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="py-16 grid place-items-center">
                <Loader2 className="size-7 animate-spin text-primary" />
              </div>
            ) : filteredPayouts.length === 0 ? (
              <div className="py-14 text-center space-y-1.5">
                <i className="ph ph-wallet text-3xl text-muted-foreground/60 block mx-auto" />
                <p className="text-sm font-semibold text-foreground">No payout requests</p>
                <p className="text-xs text-muted-foreground">
                  Payout requests submitted by referring tenants will appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-border/80 rounded-lg">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border/80">
                      <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3 font-semibold">
                        Workspace
                      </th>
                      <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3 font-semibold">
                        Amount
                      </th>
                      <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3 font-semibold">
                        Payout Method &amp; Details
                      </th>
                      <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3 font-semibold">
                        Status
                      </th>
                      <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3 font-semibold">
                        Requested
                      </th>
                      <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3 font-semibold text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 text-xs">
                    {filteredPayouts.map((req) => (
                      <tr key={req.id} className="hover:bg-muted/40 transition-colors">
                        <td className="p-3">
                          <p className="font-semibold text-foreground">{req.tenantName}</p>
                          <p className="text-[11px] text-muted-foreground">{req.tenantSlug}</p>
                        </td>
                        <td className="p-3 font-bold text-foreground whitespace-nowrap">
                          {formatCurrency(req.amount, req.currency)}
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-[10px] mb-1">
                            {formatPayoutMethodLabel(req.payoutMethod)}
                          </Badge>
                          <p className="text-[11px] text-muted-foreground">
                            {formatPayoutDetailsSummary(req)}
                          </p>
                          {req.referenceNote && (
                            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                              Ref: {req.referenceNote}
                            </p>
                          )}
                          {req.rejectionReason && (
                            <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-0.5">
                              Reason: {req.rejectionReason}
                            </p>
                          )}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <Badge
                            variant={
                              req.status === "approved"
                                ? "success"
                                : req.status === "rejected"
                                ? "destructive"
                                : "warning"
                            }
                            className="capitalize text-[11px]"
                          >
                            {req.status}
                          </Badge>
                        </td>
                        <td className="p-3 whitespace-nowrap text-muted-foreground text-[11px]">
                          <div>{formatDate(req.requestedAt)}</div>
                          {req.processedAt && (
                            <div className="text-[10px]">Processed: {formatDate(req.processedAt)}</div>
                          )}
                        </td>
                        <td className="p-3 whitespace-nowrap text-right">
                          {req.status === "pending" ? (
                            <div className="inline-flex items-center gap-1.5">
                              <Button
                                variant="success"
                                size="xs"
                                onClick={() =>
                                  setActionDialog({
                                    open: true,
                                    mode: "approve",
                                    request: req,
                                    inputValue: "",
                                  })
                                }
                              >
                                Approve
                              </Button>
                              <Button
                                variant="destructive"
                                size="xs"
                                onClick={() =>
                                  setActionDialog({
                                    open: true,
                                    mode: "reject",
                                    request: req,
                                    inputValue: "",
                                  })
                                }
                              >
                                Reject
                              </Button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">Processed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ─── TAB 2: REFERRED TENANTS ────────────────────────────────────── */}
        <TabsContent value="referrals">
          <Card className="border border-border/80 rounded-xl bg-card p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <i className="ph ph-magnifying-glass text-sm text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={referralSearch}
                  onChange={(e) => setReferralSearch(e.target.value)}
                  placeholder="Search referrer, referred company, or plan..."
                  className="pl-9 h-9 text-xs"
                />
              </div>

              <Select value={referralStatusFilter} onValueChange={setReferralStatusFilter}>
                <SelectTrigger className="h-9 w-[150px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="registered">Registered</SelectItem>
                  <SelectItem value="churned">Churned</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="py-16 grid place-items-center">
                <Loader2 className="size-7 animate-spin text-primary" />
              </div>
            ) : filteredReferrals.length === 0 ? (
              <div className="py-14 text-center space-y-1.5">
                <i className="ph ph-users-three text-3xl text-muted-foreground/60 block mx-auto" />
                <p className="text-sm font-semibold text-foreground">No referred tenants recorded</p>
                <p className="text-xs text-muted-foreground">
                  Converted tenant referrals and their earned commissions will be listed here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-border/80 rounded-lg">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border/80">
                      <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3 font-semibold">
                        Referrer Workspace
                      </th>
                      <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3 font-semibold">
                        Referred Workspace
                      </th>
                      <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3 font-semibold">
                        Plan &amp; Value
                      </th>
                      <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3 font-semibold">
                        Commission Earned
                      </th>
                      <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3 font-semibold">
                        Status
                      </th>
                      <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3 font-semibold">
                        Converted
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 text-xs">
                    {filteredReferrals.map((rec) => (
                      <tr key={rec.id} className="hover:bg-muted/40 transition-colors">
                        <td className="p-3">
                          <p className="font-semibold text-foreground">{rec.referrerTenantName}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {rec.referrerTenantSlug}
                          </p>
                        </td>
                        <td className="p-3">
                          <p className="font-semibold text-foreground">{rec.referredTenantName}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {rec.referredEmail || rec.referredTenantSlug}
                          </p>
                        </td>
                        <td className="p-3">
                          <p className="font-medium text-foreground">{rec.planName}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {formatCurrency(rec.planAmount, rec.currency)}
                          </p>
                        </td>
                        <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          {formatCurrency(rec.commissionEarned, rec.currency)}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <Badge
                            variant={
                              rec.status === "active"
                                ? "success"
                                : rec.status === "churned"
                                ? "destructive"
                                : "info"
                            }
                            className="capitalize text-[11px]"
                          >
                            {rec.status}
                          </Badge>
                        </td>
                        <td className="p-3 whitespace-nowrap text-muted-foreground text-[11px]">
                          {formatDate(rec.convertedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ─── TAB 3: PROGRAM SETTINGS ────────────────────────────────────── */}
        <TabsContent value="settings">
          <Card className="border border-border/80 rounded-xl bg-card p-6 shadow-xs space-y-6 max-w-3xl">
            <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-4">
              <div>
                <h2 className="text-base font-semibold text-foreground">Referral Program Configuration</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Control referral eligibility, recurring commission rate, payout minimums, and partner guidelines.
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                <Label htmlFor="referral-enabled" className="text-xs font-semibold">
                  Enabled
                </Label>
                <Switch
                  id="referral-enabled"
                  checked={settingsDraft.enabled}
                  onCheckedChange={(checked) => {
                    setSettingsDraft((p) => ({ ...p, enabled: checked }));
                    setSettingsDirty(true);
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Commission Rate (%)</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  step={0.5}
                  value={settingsDraft.commissionPercent}
                  onChange={(e) => {
                    setSettingsDraft((p) => ({
                      ...p,
                      commissionPercent: Number(e.target.value) || 0,
                    }));
                    setSettingsDirty(true);
                  }}
                />
                <p className="text-[11px] text-muted-foreground">
                  Percentage earned on referred workspace subscription payments (1–100%).
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Currency</Label>
                <Select
                  value={settingsDraft.currency}
                  onValueChange={(v) => {
                    setSettingsDraft((p) => ({ ...p, currency: v }));
                    setSettingsDirty(true);
                  }}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INR">INR (₹)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Minimum Payout Threshold</Label>
                <Input
                  type="number"
                  min={0}
                  step={100}
                  value={settingsDraft.minimumPayout}
                  onChange={(e) => {
                    setSettingsDraft((p) => ({
                      ...p,
                      minimumPayout: Number(e.target.value) || 0,
                    }));
                    setSettingsDirty(true);
                  }}
                />
                <p className="text-[11px] text-muted-foreground">
                  Minimum accrued balance required before a tenant can request a payout.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Auto-Approve Threshold</Label>
                <Input
                  type="number"
                  min={0}
                  step={100}
                  value={settingsDraft.autoApproveThreshold}
                  onChange={(e) => {
                    setSettingsDraft((p) => ({
                      ...p,
                      autoApproveThreshold: Number(e.target.value) || 0,
                    }));
                    setSettingsDirty(true);
                  }}
                />
                <p className="text-[11px] text-muted-foreground">
                  Requests above this amount require manual Super Admin verification.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Program Guidelines</Label>
              <Textarea
                rows={4}
                value={settingsDraft.guidelines}
                onChange={(e) => {
                  setSettingsDraft((p) => ({ ...p, guidelines: e.target.value }));
                  setSettingsDirty(true);
                }}
                placeholder="Explain referral terms, payout cadence, and eligibility criteria shown to workspaces..."
                className="text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
              {settingsDirty && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSettingsDraft({ ...DEFAULT_SETTINGS, ...(overview?.settings || {}) });
                    setSettingsDirty(false);
                  }}
                >
                  Reset
                </Button>
              )}
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveSettings}
                disabled={updateSettingsMutation.isPending || !settingsDirty}
                className="gap-1.5"
              >
                {updateSettingsMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                Save Settings
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── Approve / Reject Payout Confirmation Dialog ──────────────────── */}
      <ConfirmationDialog
        open={actionDialog.open}
        onOpenChange={(open) => setActionDialog((p) => ({ ...p, open }))}
        variant={actionDialog.mode === "reject" ? "destructive" : "default"}
        icon={
          actionDialog.mode === "approve" ? (
            <i className="ph ph-check-circle text-xl" />
          ) : (
            <i className="ph ph-x-circle text-xl" />
          )
        }
        title={
          actionDialog.mode === "approve"
            ? `Approve payout of ${formatCurrency(
                actionDialog.request?.amount ?? 0,
                actionDialog.request?.currency
              )}?`
            : `Reject payout request from ${actionDialog.request?.tenantName || "tenant"}?`
        }
        description={
          actionDialog.request
            ? `${actionDialog.request.tenantName} · ${formatPayoutMethodLabel(
                actionDialog.request.payoutMethod
              )} (${formatPayoutDetailsSummary(actionDialog.request)})`
            : ""
        }
        confirmLabel={actionDialog.mode === "approve" ? "Approve Payout" : "Reject Payout"}
        isLoading={approvePayoutMutation.isPending || rejectPayoutMutation.isPending}
        onConfirm={handleConfirmPayoutAction}
      >
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">
            {actionDialog.mode === "approve"
              ? "Disbursement / UTR Reference Note (optional)"
              : "Rejection Reason (required)"}
          </Label>
          <Textarea
            rows={2}
            value={actionDialog.inputValue}
            onChange={(e) => setActionDialog((p) => ({ ...p, inputValue: e.target.value }))}
            placeholder={
              actionDialog.mode === "approve"
                ? "e.g., UTR-NEFT-9481940182"
                : "Explain why this payout request was rejected..."
            }
            className="text-xs"
          />
        </div>
      </ConfirmationDialog>
    </div>
  );
}
