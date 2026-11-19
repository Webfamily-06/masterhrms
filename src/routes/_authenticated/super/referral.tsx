import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav";
import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Users,
  IndianRupee,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  RefreshCw,
  Loader2,
  Sliders,
  Building2,
  ArrowUpRight,
  ShieldCheck,
  CreditCard,
  Banknote,
  Send,
  AlertCircle,
  FileText,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/super/referral")({
  component: SuperReferralPage,
  head: () => ({ meta: [{ title: "Referral & Affiliate Program — Super Admin Console" }] }),
});

export interface ReferralSettings {
  enabled: boolean;
  commissionPercent: number;
  minimumPayout: number;
  currency: string;
  guidelines: string;
  autoApproveThreshold: number;
}

export interface ReferredTenantRecord {
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

export interface PayoutRequest {
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

export interface ReferralOverviewResponse {
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

function SuperReferralPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("payouts");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Dialog states for Approve/Reject
  const [selectedPayout, setSelectedPayout] = useState<PayoutRequest | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [actionNote, setActionNote] = useState("");

  // Settings form state
  const [settingsForm, setSettingsForm] = useState<ReferralSettings | null>(null);

  const { data, isLoading, isError, refetch, isFetching } = useQuery<ReferralOverviewResponse>({
    queryKey: ["super-referral-overview"],
    queryFn: async (): Promise<ReferralOverviewResponse> => {
      const res = await api.get("/api/super/referral");
      return res.data;
    },
  });

  // Sync settings when data arrives
  useEffect(() => {
    if (data?.settings && !settingsForm) {
      setSettingsForm(data.settings);
    }
  }, [data?.settings, settingsForm]);

  const currentSettings = settingsForm || data?.settings || {
    enabled: true,
    commissionPercent: 15,
    minimumPayout: 1000,
    currency: "INR",
    guidelines: "",
    autoApproveThreshold: 5000,
  };

  // Mutation: Save Settings
  const saveSettingsMutation = useMutation({
    mutationFn: async (updated: Partial<ReferralSettings>) => {
      const res = await api.put("/api/super/referral/settings", updated);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Referral program settings updated successfully.");
      queryClient.invalidateQueries({ queryKey: ["super-referral-overview"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to update settings.");
    },
  });

  // Mutation: Approve Payout
  const approvePayoutMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const res = await api.post(`/api/super/referral/payout-requests/${id}/approve`, { notes });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Payout request approved successfully.");
      setSelectedPayout(null);
      setActionType(null);
      setActionNote("");
      queryClient.invalidateQueries({ queryKey: ["super-referral-overview"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to approve payout.");
    },
  });

  // Mutation: Reject Payout
  const rejectPayoutMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await api.post(`/api/super/referral/payout-requests/${id}/reject`, { reason });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Payout request marked as rejected.");
      setSelectedPayout(null);
      setActionType(null);
      setActionNote("");
      queryClient.invalidateQueries({ queryKey: ["super-referral-overview"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to reject payout.");
    },
  });

  // Filtered Payout Requests
  const filteredPayouts = useMemo(() => {
    if (!data?.payoutRequests) return [];
    return data.payoutRequests.filter((p: PayoutRequest) => {
      const matchesSearch =
        p.tenantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.tenantSlug.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.payoutDetails.accountHolder && p.payoutDetails.accountHolder.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.payoutDetails.upiId && p.payoutDetails.upiId.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === "all" || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [data?.payoutRequests, searchQuery, statusFilter]);

  // Filtered Referred Tenants
  const filteredReferredTenants = useMemo(() => {
    if (!data?.referredTenants) return [];
    return data.referredTenants.filter((r: ReferredTenantRecord) => {
      return (
        r.referrerTenantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.referredTenantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.planName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.referredEmail && r.referredEmail.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    });
  }, [data?.referredTenants, searchQuery]);

  const handleOpenActionModal = (payout: PayoutRequest, type: "approve" | "reject") => {
    setSelectedPayout(payout);
    setActionType(type);
    setActionNote("");
  };

  const handleConfirmAction = () => {
    if (!selectedPayout || !actionType) return;
    if (actionType === "approve") {
      approvePayoutMutation.mutate({ id: selectedPayout.id, notes: actionNote });
    } else {
      if (!actionNote.trim()) {
        toast.error("Please provide a reason for rejection.");
        return;
      }
      rejectPayoutMutation.mutate({ id: selectedPayout.id, reason: actionNote });
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    saveSettingsMutation.mutate(currentSettings);
  };

  return (
    <div className="space-y-6 p-6">
      <BreadcrumbNav
        items={[
          { label: "Super Admin", href: "/super" },
          { label: "Referral & Affiliate Program" },
        ]}
      />

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Referral & Affiliate Program
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Super-Admin control center for multi-tenant affiliate commissions, tenant invitations, and payout disbursements.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading referral overview & transactions...</p>
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3 bg-red-50 dark:bg-red-950/20 rounded-lg p-6 border border-red-200 dark:border-red-900">
          <AlertCircle className="h-10 w-10 text-red-500" />
          <h3 className="font-semibold text-red-700 dark:text-red-400">Failed to load referral data</h3>
          <p className="text-sm text-red-600 dark:text-red-300 max-w-md">
            An error occurred while fetching the referral system state.
          </p>
          <Button variant="outline" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Try Again
          </Button>
        </div>
      ) : (
        <>
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Total Commissions Earned
                </CardTitle>
                <div className="h-8 w-8 rounded-full bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  ₹{(data?.stats.totalCommissionEarned || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3 text-emerald-500" />
                  Generated by referred tenant upgrades
                </p>
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Total Paid Out
                </CardTitle>
                <div className="h-8 w-8 rounded-full bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600">
                  <Banknote className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  ₹{(data?.stats.totalPaidOut || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-blue-500" />
                  Disbursed affiliate payouts
                </p>
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Pending Payout Requests
                </CardTitle>
                <div className="h-8 w-8 rounded-full bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600">
                  <Clock className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {data?.stats.pendingPayoutRequestsCount || 0}{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    (₹{(data?.stats.pendingPayoutAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })})
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Awaiting review and bank release
                </p>
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Referred Tenants
                </CardTitle>
                <div className="h-8 w-8 rounded-full bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600">
                  <Building2 className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {data?.stats.totalReferredTenantsCount || 0}{" "}
                  <span className="text-sm font-normal text-muted-foreground">Conversions</span>
                </div>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                  {data?.stats.activeReferredTenantsCount || 0} currently active subscriptions
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Navigation Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <TabsList className="bg-slate-100 dark:bg-slate-800 p-1">
                <TabsTrigger value="payouts" className="gap-2">
                  <CreditCard className="h-4 w-4" />
                  Payout Requests
                  {Boolean(data?.stats.pendingPayoutRequestsCount) ? (
                    <Badge variant="destructive" className="ml-1 px-1.5 py-0.2 text-[10px]">
                      {data?.stats.pendingPayoutRequestsCount}
                    </Badge>
                  ) : null}
                </TabsTrigger>
                <TabsTrigger value="referrals" className="gap-2">
                  <Building2 className="h-4 w-4" />
                  Referred Companies ({data?.referredTenants.length || 0})
                </TabsTrigger>
                <TabsTrigger value="settings" className="gap-2">
                  <Sliders className="h-4 w-4" />
                  Commission Rules & Settings
                </TabsTrigger>
              </TabsList>

              {activeTab !== "settings" && (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={
                        activeTab === "payouts"
                          ? "Search company, UPI or holder..."
                          : "Search referred company..."
                      }
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 h-9 text-xs"
                    />
                  </div>
                  {activeTab === "payouts" && (
                    <div className="flex items-center gap-1 bg-muted p-1 rounded-md text-xs">
                      {["all", "pending", "approved", "rejected"].map((st) => (
                        <button
                          key={st}
                          onClick={() => setStatusFilter(st)}
                          className={`px-2.5 py-1 rounded text-xs font-medium capitalize transition-colors ${
                            statusFilter === st
                              ? "bg-background text-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* TAB 1: Payout Requests Queue */}
            <TabsContent value="payouts" className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">Affiliate Commission Payout Queue</CardTitle>
                  <CardDescription className="text-xs">
                    Review and verify commission withdrawal requests submitted by tenant workspaces.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {filteredPayouts.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground text-sm space-y-1">
                      <CreditCard className="h-8 w-8 mx-auto text-slate-400 opacity-60 mb-2" />
                      <p className="font-medium">No payout requests found</p>
                      <p className="text-xs text-slate-400">
                        {statusFilter !== "all"
                          ? `No requests matching status "${statusFilter}".`
                          : "When tenants request commission withdrawals, they will appear here."}
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 dark:bg-slate-900 border-y text-slate-500 uppercase tracking-wider font-semibold">
                          <tr>
                            <th className="py-3 px-4">Company Workspace</th>
                            <th className="py-3 px-4">Amount</th>
                            <th className="py-3 px-4">Payout Method</th>
                            <th className="py-3 px-4">Account / Destination</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4">Requested Date</th>
                            <th className="py-3 px-4 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {filteredPayouts.map((req: PayoutRequest) => (
                            <tr
                              key={req.id}
                              className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors"
                            >
                              <td className="py-3.5 px-4 font-medium">
                                <div className="text-slate-900 dark:text-slate-100 font-semibold">
                                  {req.tenantName}
                                </div>
                                <div className="text-[11px] text-muted-foreground font-mono">
                                  {req.tenantSlug}
                                </div>
                              </td>
                              <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                                ₹{req.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-3.5 px-4">
                                <Badge variant="outline" className="text-[11px] uppercase tracking-wide">
                                  {req.payoutMethod === "bank_transfer"
                                    ? "Bank Transfer"
                                    : req.payoutMethod === "upi"
                                    ? "UPI"
                                    : "PayPal"}
                                </Badge>
                              </td>
                              <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                                {req.payoutMethod === "bank_transfer" ? (
                                  <div>
                                    <div className="font-medium text-slate-800 dark:text-slate-200">
                                      {req.payoutDetails.bankName || "Bank Account"}
                                    </div>
                                    <div className="text-[11px] text-muted-foreground font-mono">
                                      A/C: {req.payoutDetails.accountNumber} | IFSC: {req.payoutDetails.ifscCode}
                                    </div>
                                    <div className="text-[10px] text-slate-400">
                                      Holder: {req.payoutDetails.accountHolder}
                                    </div>
                                  </div>
                                ) : req.payoutMethod === "upi" ? (
                                  <div>
                                    <div className="font-mono font-medium text-indigo-600 dark:text-indigo-400">
                                      {req.payoutDetails.upiId}
                                    </div>
                                    <div className="text-[10px] text-slate-400">
                                      Holder: {req.payoutDetails.accountHolder}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="font-mono text-slate-700 dark:text-slate-300">
                                    {req.payoutDetails.paypalEmail}
                                  </div>
                                )}
                              </td>
                              <td className="py-3.5 px-4">
                                {req.status === "pending" ? (
                                  <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 hover:bg-amber-100 border-amber-300">
                                    Pending Review
                                  </Badge>
                                ) : req.status === "approved" ? (
                                  <div>
                                    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 hover:bg-emerald-100 border-emerald-300">
                                      Approved
                                    </Badge>
                                    {req.referenceNote && (
                                      <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[150px]">
                                        {req.referenceNote}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div>
                                    <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 hover:bg-rose-100 border-rose-300">
                                      Rejected
                                    </Badge>
                                    {req.rejectionReason && (
                                      <div className="text-[10px] text-rose-500 mt-0.5 truncate max-w-[150px]">
                                        {req.rejectionReason}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-muted-foreground whitespace-nowrap">
                                {new Date(req.requestedAt).toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                {req.status === "pending" ? (
                                  <div className="flex items-center justify-end gap-1.5">
                                    <Button
                                      size="sm"
                                      variant="default"
                                      className="h-7 text-xs px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                                      onClick={() => handleOpenActionModal(req, "approve")}
                                    >
                                      <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-xs px-2.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-1 border-rose-200"
                                      onClick={() => handleOpenActionModal(req, "reject")}
                                    >
                                      <XCircle className="h-3.5 w-3.5" /> Reject
                                    </Button>
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-slate-400 italic">Completed</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 2: Referred Tenants Directory */}
            <TabsContent value="referrals" className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">Referred Tenants Directory</CardTitle>
                  <CardDescription className="text-xs">
                    Comprehensive log of all tenant registrations acquired via affiliate referral links.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {filteredReferredTenants.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground text-sm space-y-1">
                      <Building2 className="h-8 w-8 mx-auto text-slate-400 opacity-60 mb-2" />
                      <p className="font-medium">No referred companies found</p>
                      <p className="text-xs text-slate-400">
                        When tenants share their referral links, invited organizations will be logged here.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 dark:bg-slate-900 border-y text-slate-500 uppercase tracking-wider font-semibold">
                          <tr>
                            <th className="py-3 px-4">Referrer Workspace</th>
                            <th className="py-3 px-4">Referred Workspace</th>
                            <th className="py-3 px-4">Subscribed Plan</th>
                            <th className="py-3 px-4">Plan Price</th>
                            <th className="py-3 px-4">Commission Generated</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4">Conversion Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {filteredReferredTenants.map((item: ReferredTenantRecord) => (
                            <tr
                              key={item.id}
                              className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors"
                            >
                              <td className="py-3.5 px-4 font-medium">
                                <div className="text-slate-900 dark:text-slate-100 font-semibold">
                                  {item.referrerTenantName}
                                </div>
                                <div className="text-[11px] text-muted-foreground font-mono">
                                  {item.referrerTenantSlug}
                                </div>
                              </td>
                              <td className="py-3.5 px-4 font-medium">
                                <div className="text-slate-900 dark:text-slate-100 font-semibold flex items-center gap-1.5">
                                  {item.referredTenantName}
                                  <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                                </div>
                                <div className="text-[11px] text-muted-foreground">
                                  {item.referredEmail || `${item.referredTenantSlug}.com`}
                                </div>
                              </td>
                              <td className="py-3.5 px-4">
                                <Badge variant="secondary" className="font-medium">
                                  {item.planName}
                                </Badge>
                              </td>
                              <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                                ₹{item.planAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-3.5 px-4 font-bold text-emerald-600 dark:text-emerald-400">
                                +₹{item.commissionEarned.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-3.5 px-4">
                                <Badge
                                  className={
                                    item.status === "active"
                                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300"
                                      : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300"
                                  }
                                >
                                  {item.status === "active" ? "Active Subscription" : item.status}
                                </Badge>
                              </td>
                              <td className="py-3.5 px-4 text-muted-foreground whitespace-nowrap">
                                {new Date(item.convertedAt).toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 3: Commission Settings & Terms */}
            <TabsContent value="settings" className="space-y-4">
              <form onSubmit={handleSaveSettings}>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">Affiliate Commission & Payout Rules</CardTitle>
                    <CardDescription className="text-xs">
                      Configure the platform-wide referral commission percentages, payout minimums, and affiliate guidelines.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Program Toggle */}
                    <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-semibold">Enable Referral & Affiliate Program</Label>
                        <p className="text-xs text-muted-foreground">
                          When active, existing tenant workspaces can access their unique referral link and earn commissions.
                        </p>
                      </div>
                      <Switch
                        checked={currentSettings.enabled}
                        onCheckedChange={(val) =>
                          setSettingsForm((prev) => ({
                            ...(prev || currentSettings),
                            enabled: val,
                          }))
                        }
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Commission % */}
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold">Commission Percentage (%) *</Label>
                        <div className="relative">
                          <Input
                            type="number"
                            min="1"
                            max="100"
                            value={currentSettings.commissionPercent}
                            onChange={(e) =>
                              setSettingsForm((prev) => ({
                                ...(prev || currentSettings),
                                commissionPercent: Number(e.target.value),
                              }))
                            }
                            required
                            className="pr-8"
                          />
                          <span className="absolute right-3 top-2.5 text-xs text-muted-foreground font-semibold">
                            %
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Percentage awarded to the referring tenant upon paid subscription conversion.
                        </p>
                      </div>

                      {/* Minimum Payout Threshold */}
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold">Minimum Payout Threshold (₹) *</Label>
                        <div className="relative">
                          <Input
                            type="number"
                            min="0"
                            step="100"
                            value={currentSettings.minimumPayout}
                            onChange={(e) =>
                              setSettingsForm((prev) => ({
                                ...(prev || currentSettings),
                                minimumPayout: Number(e.target.value),
                              }))
                            }
                            required
                            className="pr-12"
                          />
                          <span className="absolute right-3 top-2.5 text-xs text-muted-foreground font-semibold">
                            INR
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Tenants must accumulate at least this balance before requesting a payout withdrawal.
                        </p>
                      </div>
                    </div>

                    {/* Program Guidelines */}
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Terms & Affiliate Guidelines</Label>
                      <Textarea
                        rows={4}
                        value={currentSettings.guidelines}
                        onChange={(e) =>
                          setSettingsForm((prev) => ({
                            ...(prev || currentSettings),
                            guidelines: e.target.value,
                          }))
                        }
                        placeholder="Explain the affiliate policy, cookie window duration, and payment schedules..."
                        className="text-xs"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Displayed to tenant administrators in their workspace billing & referral tabs.
                      </p>
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button
                        type="submit"
                        disabled={saveSettingsMutation.isPending}
                        className="gap-2 text-xs"
                      >
                        {saveSettingsMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" /> Saving Changes...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4" /> Save Commission Rules
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </form>
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Confirmation Dialog: Approve or Reject Payout */}
      <Dialog
        open={Boolean(selectedPayout && actionType)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedPayout(null);
            setActionType(null);
            setActionNote("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === "approve" ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  Approve Commission Payout
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-rose-500" />
                  Reject Commission Payout
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {actionType === "approve"
                ? `Confirm bank disbursement of ₹${selectedPayout?.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })} to ${selectedPayout?.tenantName}.`
                : `Reject the payout request of ₹${selectedPayout?.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })} for ${selectedPayout?.tenantName}.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded border text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Company:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {selectedPayout?.tenantName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Requested Amount:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  ₹{selectedPayout?.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payout Method:</span>
                <span className="uppercase font-mono">{selectedPayout?.payoutMethod}</span>
              </div>
              {selectedPayout?.payoutMethod === "upi" ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">UPI VPA:</span>
                  <span className="font-mono text-indigo-600 dark:text-indigo-400">
                    {selectedPayout.payoutDetails.upiId}
                  </span>
                </div>
              ) : selectedPayout?.payoutMethod === "bank_transfer" ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Account #:</span>
                    <span className="font-mono">{selectedPayout.payoutDetails.accountNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">IFSC Code:</span>
                    <span className="font-mono">{selectedPayout.payoutDetails.ifscCode}</span>
                  </div>
                </>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                {actionType === "approve"
                  ? "Bank UTR / Transaction Reference (Optional)"
                  : "Reason for Rejection *"}
              </Label>
              <Input
                placeholder={
                  actionType === "approve"
                    ? "e.g. UTR-HDFC-94819401"
                    : "e.g. Invalid IFSC code, please update bank details"
                }
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedPayout(null);
                setActionType(null);
                setActionNote("");
              }}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant={actionType === "approve" ? "default" : "destructive"}
              onClick={handleConfirmAction}
              disabled={approvePayoutMutation.isPending || rejectPayoutMutation.isPending}
              className={`text-xs gap-1.5 ${actionType === "approve" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
            >
              {(approvePayoutMutation.isPending || rejectPayoutMutation.isPending) && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              )}
              {actionType === "approve" ? "Confirm & Mark Disbursed" : "Reject Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
