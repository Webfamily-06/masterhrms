'use client';

import { useState, useMemo } from "react";
import { Link, Outlet, useRouterState } from "@/src/lib/router-compat";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  Globe,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  Trash2,
  FileSpreadsheet,
  FileText,
  X,
  Loader2,
  ShieldCheck,
  Check,
  AlertTriangle,
  RefreshCw,
  Copy,
  Star,
  Server,
  Layers,
  ChevronRight,
  ShieldAlert,
  Shield,
  Lock,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

export type CustomDomainRecord = {
  id: string;
  domain: string;
  tenantId: string;
  tenantName: string;
  subdomain: string;
  targetCname: string;
  isPrimary?: boolean;
  planName?: string;
  planType?: string;
  price?: string;
  status: "approved" | "pending" | "rejected";
  sslStatus?: "active" | "provisioning" | "failed";
  dnsStatus?: "verified" | "pending" | "failed";
  verificationToken?: string;
  verificationMethod?: string;
  verifiedAt?: string | null;
  approvedAt?: string | null;
  approvedBy?: string | null;
  rejectedReason?: string | null;
  sslIssuedAt?: string | null;
  lastCheckedAt?: string | null;
  lastDnsError?: string | null;
  createdAt: string;
  customDomainUrl?: string;
};

export default function SuperDomainsPage() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const isDocumentationRoute = pathname.includes("/documentation");

  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dnsFilter, setDnsFilter] = useState("all");
  const [sslFilter, setSslFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Dialogs & Confirmations
  const [detailDomain, setDetailDomain] = useState<CustomDomainRecord | null>(null);
  const [deleteDomain, setDeleteDomain] = useState<CustomDomainRecord | null>(null);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [targetRejectDomains, setTargetRejectDomains] = useState<CustomDomainRecord[]>([]);
  const [bulkApproveOpen, setBulkApproveOpen] = useState(false);

  // 1. Fetch live domains from existing Flow 2 API
  const { data: domains = [], isLoading, refetch } = useQuery<CustomDomainRecord[]>({
    queryKey: ["super-custom-domains"],
    enabled: !isDocumentationRoute,
    queryFn: async () => {
      const res = await api.get("/super/domains");
      const list = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
      return list.map((d: any) => ({
        id: String(d.id),
        domain: d.domain,
        tenantId: d.tenantId,
        tenantName: d.tenantName || d.tenant?.name || "Workspace",
        subdomain: d.subdomain || "tenant.masterhrms.com",
        targetCname: d.targetCname || "cname.masterhrms.com",
        isPrimary: Boolean(d.isPrimary),
        planName: d.planName || "Standard",
        planType: d.planType || "Monthly",
        price: d.price || "0",
        status: d.status || "pending",
        sslStatus: d.sslStatus || "provisioning",
        dnsStatus: d.dnsStatus || "pending",
        verificationToken: d.verificationToken || "",
        verificationMethod: d.verificationMethod || "TXT",
        verifiedAt: d.verifiedAt || null,
        approvedAt: d.approvedAt || null,
        approvedBy: d.approvedBy || null,
        rejectedReason: d.rejectedReason || null,
        sslIssuedAt: d.sslIssuedAt || null,
        lastCheckedAt: d.lastCheckedAt || null,
        lastDnsError: d.lastDnsError || null,
        createdAt: d.createdAt || new Date().toISOString().split("T")[0],
        customDomainUrl: d.customDomainUrl || `https://${d.domain}`,
      }));
    },
  });

  // Dynamic Summary Metrics
  const summaryMetrics = useMemo(() => {
    const total = domains.length;
    const pendingApproval = domains.filter((d) => d.status === "pending" && d.dnsStatus === "verified").length;
    const awaitingDns = domains.filter((d) => d.dnsStatus === "pending" && d.status === "pending").length;
    const active = domains.filter((d) => d.status === "approved").length;
    const sslProvisioning = domains.filter((d) => d.sslStatus === "provisioning").length;
    const rejected = domains.filter((d) => d.status === "rejected").length;
    return { total, pendingApproval, awaitingDns, active, sslProvisioning, rejected };
  }, [domains]);

  // 2. Single-record mutations
  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.put(`/super/domains/${id}/approve`, {});
    },
    onSuccess: (data: any, id: string) => {
      toast.success(data?.message || "Custom domain approved successfully. SSL provisioning initiated.");
      queryClient.invalidateQueries({ queryKey: ["super-custom-domains"] });
      setSelectedIds((prev) => prev.filter((item) => item !== id));
      if (detailDomain?.id === id) {
        setDetailDomain((prev) => (prev ? { ...prev, status: "approved", approvedAt: new Date().toISOString() } : null));
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to approve custom domain");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ ids, reason }: { ids: string[]; reason: string }) => {
      const results = await Promise.allSettled(
        ids.map((id) => api.put(`/super/domains/${id}/reject`, { reason })),
      );
      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.length - succeeded;
      if (succeeded === 0) {
        const firstErr = results.find((r): r is PromiseRejectedResult => r.status === "rejected");
        throw new Error(firstErr?.reason?.message || "Failed to reject custom domain(s)");
      }
      return { succeeded, failed, ids, reason };
    },
    onSuccess: ({ succeeded, failed, ids, reason }) => {
      if (ids.length === 1) {
        toast.success("Custom domain rejected");
      } else if (failed > 0) {
        toast.warning(`Rejected ${succeeded} domain(s); ${failed} failed.`);
      } else {
        toast.success(`Rejected ${succeeded} custom domain(s).`);
      }
      queryClient.invalidateQueries({ queryKey: ["super-custom-domains"] });
      setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
      setIsRejectModalOpen(false);
      setRejectReason("");
      setTargetRejectDomains([]);
      if (detailDomain && ids.includes(detailDomain.id)) {
        setDetailDomain((prev) => (prev ? { ...prev, status: "rejected", rejectedReason: reason } : null));
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to reject domain");
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.post(`/super/domains/${id}/verify`, {});
    },
    onSuccess: (data: any) => {
      if (data?.verified) {
        toast.success(data?.message || "DNS verification succeeded.");
      } else {
        toast.warning(data?.message || "DNS check incomplete: records not yet detected.");
      }
      queryClient.invalidateQueries({ queryKey: ["super-custom-domains"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "DNS verification check failed");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/super/domains/${id}`);
    },
    onSuccess: (data: any, id: string) => {
      toast.success(data?.message || "Custom domain removed successfully.");
      setSelectedIds((prev) => prev.filter((item) => item !== id));
      setDeleteDomain(null);
      if (detailDomain?.id === id) {
        setDetailDomain(null);
      }
      queryClient.invalidateQueries({ queryKey: ["super-custom-domains"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to remove custom domain");
    },
  });

  // 3. Bulk mutations
  const bulkVerifyMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.allSettled(
        ids.map((id) => api.post(`/super/domains/${id}/verify`, {})),
      );
      let verified = 0;
      let incomplete = 0;
      let failed = 0;
      for (const r of results) {
        if (r.status === "fulfilled") {
          if (r.value?.verified) verified += 1;
          else incomplete += 1;
        } else {
          failed += 1;
        }
      }
      return { verified, incomplete, failed, total: ids.length };
    },
    onSuccess: ({ verified, incomplete, failed }) => {
      if (failed > 0) {
        toast.warning(`DNS check finished: ${verified} verified, ${incomplete} pending, ${failed} failed.`);
      } else if (incomplete > 0) {
        toast.info(`DNS check finished: ${verified} verified, ${incomplete} awaiting propagation.`);
      } else {
        toast.success(`DNS verified for all ${verified} selected domain(s).`);
      }
      queryClient.invalidateQueries({ queryKey: ["super-custom-domains"] });
      setSelectedIds([]);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Bulk DNS verification failed");
    },
  });

  const bulkApproveMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.allSettled(
        ids.map((id) => api.put(`/super/domains/${id}/approve`, {})),
      );
      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.length - succeeded;
      if (succeeded === 0) {
        const firstErr = results.find((r): r is PromiseRejectedResult => r.status === "rejected");
        throw new Error(firstErr?.reason?.message || "Bulk approval failed");
      }
      return { succeeded, failed };
    },
    onSuccess: ({ succeeded, failed }) => {
      if (failed > 0) {
        toast.warning(`Approved ${succeeded} domain(s); ${failed} could not be approved.`);
      } else {
        toast.success(`Approved ${succeeded} custom domain(s). SSL provisioning initiated.`);
      }
      setBulkApproveOpen(false);
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ["super-custom-domains"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to bulk approve domains");
    },
  });

  // Filtered & Sorted domains
  const filteredDomains = useMemo(() => {
    return domains
      .filter((d) => {
        const matchesSearch =
          searchTerm.trim() === "" ||
          d.domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
          d.tenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          d.subdomain.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus =
          statusFilter === "all"
            ? true
            : statusFilter === "pending_approval"
            ? d.status === "pending" && d.dnsStatus === "verified"
            : statusFilter === "awaiting_dns"
            ? d.status === "pending" && d.dnsStatus === "pending"
            : d.status === statusFilter;

        const matchesDns = dnsFilter === "all" ? true : d.dnsStatus === dnsFilter;
        const matchesSsl = sslFilter === "all" ? true : d.sslStatus === sslFilter;

        return matchesSearch && matchesStatus && matchesDns && matchesSsl;
      })
      .sort((a, b) => {
        if (sortBy === "domain_asc") return a.domain.localeCompare(b.domain);
        if (sortBy === "tenant_asc") return a.tenantName.localeCompare(b.tenantName);
        if (sortBy === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [domains, searchTerm, statusFilter, dnsFilter, sslFilter, sortBy]);

  const selectedDomains = useMemo(
    () => domains.filter((d) => selectedIds.includes(d.id)),
    [domains, selectedIds],
  );
  const pendingSelectedDomains = useMemo(
    () => selectedDomains.filter((d) => d.status === "pending"),
    [selectedDomains],
  );

  // Early route hand-off AFTER all React hooks have run
  if (isDocumentationRoute) {
    return <Outlet />;
  }

  // Copy helper
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredDomains.length && filteredDomains.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredDomains.map((d) => d.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  // Export CSV
  const exportCSV = () => {
    const escapeCell = (val: unknown) => `"${String(val ?? "").replace(/"/g, '""')}"`;
    const headers = [
      "Domain",
      "Tenant Name",
      "Status",
      "DNS Status",
      "SSL Status",
      "Is Primary",
      "Requested At",
      "Approved At",
      "Target CNAME",
    ];
    const rows = filteredDomains.map((d) => [
      escapeCell(d.domain),
      escapeCell(d.tenantName),
      escapeCell(d.status),
      escapeCell(d.dnsStatus),
      escapeCell(d.sslStatus),
      escapeCell(d.isPrimary ? "Yes" : "No"),
      escapeCell(d.createdAt),
      escapeCell(d.approvedAt || "—"),
      escapeCell(d.targetCname),
    ]);
    const csvContent = [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `custom_domains_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Domain catalog exported to CSV");
  };

  const isBulkBusy =
    bulkVerifyMutation.isPending || bulkApproveMutation.isPending || rejectMutation.isPending;

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Custom Domains"
        description="Review, verify DNS, audit SSL issuance, and govern Flow 2 Primary Custom Domains across all tenant workspaces."
        icon={Globe}
        breadcrumbs={[
          { label: "Super Admin", href: "/super" },
          { label: "Extensions & Add-ons" },
          { label: "Custom Domains" },
        ]}
        actions={
          <>
            <Link to="/super/domains/documentation">
              <Button size="sm" variant="outline" className="text-xs h-8 gap-1.5 shadow-2xs">
                <FileText className="size-3.5 text-indigo-500" />
                <span>Documentation</span>
              </Button>
            </Link>

            <Button
              size="sm"
              variant="outline"
              onClick={() => refetch()}
              disabled={isLoading}
              className="text-xs h-8 gap-1.5 shadow-2xs"
              title="Refetch domain catalog records from database"
            >
              <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span>Refresh Data</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={exportCSV}
              disabled={filteredDomains.length === 0}
              className="text-xs h-8 gap-1.5 shadow-2xs"
            >
              <FileSpreadsheet className="size-3.5 text-emerald-600" />
              <span>Export CSV</span>
            </Button>
          </>
        }
      />

      {/* Architecture Context Banner */}
      <div className="rounded-xl p-4 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/40 text-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
            <Layers className="size-5" />
          </div>
          <div className="space-y-0.5">
            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs">
              Dual-Host Multi-Tenant Isolation
            </h4>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              Flow 1 (<code>{`{slug}.masterhrms.com`}</code>) remains the permanent fail-safe address. Flow 2 (<code>{`acme.com`}</code>) provides a customer-branded vanity entry point with identical database, users, and RBAC matrix.
            </p>
          </div>
        </div>
        <Link to="/super/domains/documentation" className="shrink-0">
          <Button size="sm" variant="ghost" className="text-xs h-7 gap-1 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100/50">
            Architecture Specs <ChevronRight className="size-3" />
          </Button>
        </Link>
      </div>

      {/* Dynamic Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="p-3.5 border border-border/80 rounded-xl shadow-xs bg-card space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
            Total Domains
          </span>
          <div className="flex items-center justify-between">
            <span className="text-xl font-black text-foreground">{summaryMetrics.total}</span>
            <Globe className="size-4 text-slate-400" />
          </div>
          <p className="text-[10px] text-muted-foreground">All registered records</p>
        </Card>

        <Card className="p-3.5 border border-blue-200/60 dark:border-blue-900/40 rounded-xl shadow-xs bg-blue-50/20 dark:bg-card space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 block">
            Pending Approval
          </span>
          <div className="flex items-center justify-between">
            <span className="text-xl font-black text-blue-600 dark:text-blue-400">{summaryMetrics.pendingApproval}</span>
            <ShieldCheck className="size-4 text-blue-500" />
          </div>
          <p className="text-[10px] text-blue-600/80 dark:text-blue-400/80">DNS verified, awaiting review</p>
        </Card>

        <Card className="p-3.5 border border-border/80 rounded-xl shadow-xs bg-card space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 block">
            Awaiting DNS
          </span>
          <div className="flex items-center justify-between">
            <span className="text-xl font-black text-amber-600 dark:text-amber-400">{summaryMetrics.awaitingDns}</span>
            <Clock className="size-4 text-amber-500" />
          </div>
          <p className="text-[10px] text-muted-foreground">Pending registrar setup</p>
        </Card>

        <Card className="p-3.5 border border-emerald-200/60 dark:border-emerald-900/40 rounded-xl shadow-xs bg-emerald-50/20 dark:bg-card space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 block">
            Active Domains
          </span>
          <div className="flex items-center justify-between">
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">{summaryMetrics.active}</span>
            <CheckCircle2 className="size-4 text-emerald-500" />
          </div>
          <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80">Approved &amp; serving</p>
        </Card>

        <Card className="p-3.5 border border-border/80 rounded-xl shadow-xs bg-card space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 block">
            SSL Provisioning
          </span>
          <div className="flex items-center justify-between">
            <span className="text-xl font-black text-purple-600 dark:text-purple-400">{summaryMetrics.sslProvisioning}</span>
            <Server className="size-4 text-purple-500" />
          </div>
          <p className="text-[10px] text-muted-foreground">ACME cert challenges</p>
        </Card>

        <Card className="p-3.5 border border-border/80 rounded-xl shadow-xs bg-card space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300 block">
            Rejected
          </span>
          <div className="flex items-center justify-between">
            <span className="text-xl font-black text-rose-600 dark:text-rose-400">{summaryMetrics.rejected}</span>
            <XCircle className="size-4 text-rose-500" />
          </div>
          <p className="text-[10px] text-muted-foreground">Declined by admin</p>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="border border-border/80 rounded-xl shadow-xs overflow-hidden">
        {/* Filter Controls Bar */}
        <div className="p-4 border-b bg-muted/15 space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search domain, tenant, or slug..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-8 text-xs bg-background"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 text-xs px-2.5 w-auto min-w-[135px] bg-background border rounded-lg shadow-2xs gap-2">
                  <div className="flex items-center gap-1.5 truncate">
                    <Shield className="size-3.5 text-muted-foreground shrink-0" />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent align="end" className="text-xs">
                  <SelectItem value="all">Status: All</SelectItem>
                  <SelectItem value="pending_approval">Pending Approval</SelectItem>
                  <SelectItem value="awaiting_dns">Awaiting DNS</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>

              <Select value={dnsFilter} onValueChange={setDnsFilter}>
                <SelectTrigger className="h-8 text-xs px-2.5 w-auto min-w-[125px] bg-background border rounded-lg shadow-2xs gap-2">
                  <div className="flex items-center gap-1.5 truncate">
                    <CheckCircle2 className="size-3.5 text-muted-foreground shrink-0" />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent align="end" className="text-xs">
                  <SelectItem value="all">DNS: All</SelectItem>
                  <SelectItem value="verified">DNS Verified</SelectItem>
                  <SelectItem value="pending">DNS Pending</SelectItem>
                  <SelectItem value="failed">DNS Failed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sslFilter} onValueChange={setSslFilter}>
                <SelectTrigger className="h-8 text-xs px-2.5 w-auto min-w-[120px] bg-background border rounded-lg shadow-2xs gap-2">
                  <div className="flex items-center gap-1.5 truncate">
                    <Lock className="size-3.5 text-muted-foreground shrink-0" />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent align="end" className="text-xs">
                  <SelectItem value="all">SSL: All</SelectItem>
                  <SelectItem value="active">SSL Active</SelectItem>
                  <SelectItem value="provisioning">SSL Provisioning</SelectItem>
                  <SelectItem value="failed">SSL Failed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-8 text-xs px-2.5 w-auto min-w-[135px] bg-background border rounded-lg shadow-2xs gap-2">
                  <div className="flex items-center gap-1.5 truncate">
                    <SlidersHorizontal className="size-3.5 text-muted-foreground shrink-0" />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent align="end" className="text-xs">
                  <SelectItem value="recent">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="domain_asc">Domain A-Z</SelectItem>
                  <SelectItem value="tenant_asc">Tenant A-Z</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Contextual Bulk Actions Toolbar */}
          {selectedIds.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-xs">
              <div className="flex items-center gap-2">
                <Badge variant="soft" className="font-bold">
                  {selectedIds.length} selected
                </Badge>
                <span className="text-muted-foreground">
                  {pendingSelectedDomains.length} pending review
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1.5"
                  disabled={isBulkBusy}
                  onClick={() => bulkVerifyMutation.mutate(selectedIds)}
                >
                  {bulkVerifyMutation.isPending ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <RefreshCw className="size-3 text-blue-600" />
                  )}
                  Verify DNS ({selectedIds.length})
                </Button>

                <Button
                  size="sm"
                  variant="success"
                  className="h-7 text-xs gap-1.5"
                  disabled={isBulkBusy || pendingSelectedDomains.length === 0}
                  onClick={() => setBulkApproveOpen(true)}
                >
                  <Check className="size-3" />
                  Approve ({pendingSelectedDomains.length})
                </Button>

                <Button
                  size="sm"
                  variant="destructive"
                  className="h-7 text-xs gap-1.5"
                  disabled={isBulkBusy || pendingSelectedDomains.length === 0}
                  onClick={() => {
                    setTargetRejectDomains(pendingSelectedDomains);
                    setIsRejectModalOpen(true);
                  }}
                >
                  <X className="size-3" />
                  Reject ({pendingSelectedDomains.length})
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-muted-foreground"
                  disabled={isBulkBusy}
                  onClick={() => setSelectedIds([])}
                >
                  Clear
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="py-16 text-center text-xs text-muted-foreground space-y-2">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
            <p>Loading custom domains catalog from database...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredDomains.length === 0 && (
          <div className="text-center py-16 px-4 space-y-3">
            <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <Globe className="w-7 h-7" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h4 className="text-base font-semibold text-foreground">
                {searchTerm || statusFilter !== "all" || dnsFilter !== "all" || sslFilter !== "all"
                  ? "No matching custom domains found"
                  : "No primary custom domains have been requested yet"}
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {searchTerm || statusFilter !== "all" || dnsFilter !== "all" || sslFilter !== "all"
                  ? "Try resetting your search query or filters to see all domain requests."
                  : "Tenants can request a primary custom domain (Flow 2) directly from their workspace settings. Once requested, domains will appear here for DNS verification audit, Super Admin approval, and automated SSL provisioning."}
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <Link to="/super/domains/documentation">
                <Button variant="outline" size="sm" className="text-xs h-8 gap-1.5 shadow-2xs">
                  <FileText className="size-3.5" /> View Custom Domain Documentation
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Real Domains Table */}
        {!isLoading && filteredDomains.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-muted/50 border-b text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="p-3 w-10">
                    <input
                      type="checkbox"
                      aria-label="Select all domains"
                      checked={selectedIds.length === filteredDomains.length && filteredDomains.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300 text-primary focus:ring-primary/20 h-3.5 w-3.5 cursor-pointer"
                    />
                  </th>
                  <th className="p-3">Primary Domain</th>
                  <th className="p-3">Tenant / Company</th>
                  <th className="p-3">Approval Status</th>
                  <th className="p-3">DNS Verification</th>
                  <th className="p-3">SSL / TLS</th>
                  <th className="p-3">Requested</th>
                  <th className="p-3">Verified / Approved</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {filteredDomains.map((d) => {
                  const isApproved = d.status === "approved";
                  const isPending = d.status === "pending";
                  const tenantInitials = (d.tenantName || "WS")
                    .split(/\s+/)
                    .map((p) => p[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase();

                  return (
                    <tr key={d.id} className="hover:bg-muted/40 transition-colors">
                      <td className="p-3">
                        <input
                          type="checkbox"
                          aria-label={`Select ${d.domain}`}
                          checked={selectedIds.includes(d.id)}
                          onChange={() => toggleSelect(d.id)}
                          className="rounded border-slate-300 text-primary focus:ring-primary/20 h-3.5 w-3.5 cursor-pointer"
                        />
                      </td>

                      {/* Domain URL & Primary Badge */}
                      <td className="p-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setDetailDomain(d)}
                            className="font-mono font-bold text-foreground hover:text-primary transition-colors text-left cursor-pointer"
                          >
                            {d.domain}
                          </button>
                          {d.isPrimary && (
                            <Badge variant="warning" className="text-[10px] gap-0.5 py-0">
                              <Star className="size-2.5 fill-amber-500 text-amber-500" /> Primary
                            </Badge>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono block">
                          CNAME → {d.targetCname}
                        </span>
                      </td>

                      {/* Tenant with Initials */}
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          <div className="size-7 rounded-full border border-primary/20 bg-primary/10 text-primary font-bold text-[10px] flex items-center justify-center shrink-0">
                            {tenantInitials}
                          </div>
                          <div>
                            <span className="font-semibold text-foreground block">{d.tenantName}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">{d.subdomain}</span>
                          </div>
                        </div>
                      </td>

                      {/* Approval Status */}
                      <td className="p-3">
                        {isApproved ? (
                          <Badge variant="success" className="text-[10px] gap-1">
                            <Check className="size-3" /> Approved
                          </Badge>
                        ) : isPending ? (
                          <Badge variant="warning" className="text-[10px] gap-1">
                            <Clock className="size-3" /> Pending Review
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/20 text-[10px] gap-1">
                            <X className="size-3" /> Rejected
                          </Badge>
                        )}
                      </td>

                      {/* DNS Verification */}
                      <td className="p-3">
                        {d.dnsStatus === "verified" ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="size-3.5" /> Verified
                          </span>
                        ) : d.dnsStatus === "failed" ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-rose-600 dark:text-rose-400">
                            <XCircle className="size-3.5" /> Failed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
                            <Clock className="size-3.5" /> Pending Check
                          </span>
                        )}
                      </td>

                      {/* SSL Status */}
                      <td className="p-3">
                        {d.sslStatus === "active" ? (
                          <Badge variant="success" className="text-[10px]">
                            Active (TLS 1.3)
                          </Badge>
                        ) : d.sslStatus === "failed" ? (
                          <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/20 text-[10px]">
                            Failed
                          </Badge>
                        ) : (
                          <Badge variant="warning" className="text-[10px]">
                            Provisioning
                          </Badge>
                        )}
                      </td>

                      {/* Requested At */}
                      <td className="p-3 text-muted-foreground whitespace-nowrap">
                        {d.createdAt}
                      </td>

                      {/* Verified / Approved At */}
                      <td className="p-3 text-muted-foreground whitespace-nowrap">
                        {d.approvedAt ? new Date(d.approvedAt).toLocaleDateString() : d.verifiedAt ? new Date(d.verifiedAt).toLocaleDateString() : "—"}
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-right">
                        <div className="inline-flex items-center gap-1 justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            title="Verify DNS in Real-Time"
                            onClick={() => verifyMutation.mutate(d.id)}
                            disabled={verifyMutation.isPending}
                            className="size-7 text-muted-foreground hover:text-blue-600 hover:bg-blue-500/10"
                          >
                            <RefreshCw className={`size-3.5 ${verifyMutation.isPending && verifyMutation.variables === d.id ? "animate-spin text-blue-600" : ""}`} />
                          </Button>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            title="View DNS & Details"
                            onClick={() => setDetailDomain(d)}
                            className="size-7 text-muted-foreground hover:text-primary"
                          >
                            <Eye className="size-3.5" />
                          </Button>

                          {isPending && (
                            <>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                title="Approve Domain"
                                onClick={() => approveMutation.mutate(d.id)}
                                disabled={approveMutation.isPending}
                                className="size-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                              >
                                <Check className="size-3.5" />
                              </Button>

                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                title="Reject Domain"
                                onClick={() => {
                                  setTargetRejectDomains([d]);
                                  setIsRejectModalOpen(true);
                                }}
                                className="size-7 text-rose-600 hover:text-rose-700 hover:bg-rose-500/10"
                              >
                                <X className="size-3.5" />
                              </Button>
                            </>
                          )}

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            title="Delete Domain"
                            onClick={() => setDeleteDomain(d)}
                            className="size-7 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* DETAIL DIALOG (Radix Dialog) */}
      <Dialog open={!!detailDomain} onOpenChange={(open) => !open && setDetailDomain(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
          {detailDomain && (
            <>
              <DialogHeader className="px-5 py-4 border-b border-border/70">
                <DialogTitle className="flex items-center gap-2 text-base font-bold">
                  <Globe className="size-5 text-primary" />
                  <span>Custom Domain Details</span>
                </DialogTitle>
                <DialogDescription className="text-xs font-mono">
                  {detailDomain.domain}
                </DialogDescription>
              </DialogHeader>

              <div className="p-5 space-y-4 overflow-y-auto text-xs flex-1">
                {/* Status and Tenant Header Banner */}
                <div className="p-3.5 rounded-xl bg-muted/40 border border-border/70 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Tenant Workspace</span>
                    <span className="font-bold text-foreground text-sm">{detailDomain.tenantName}</span>
                    <span className="text-muted-foreground font-mono block text-[11px]">{detailDomain.subdomain}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Governance</span>
                    {detailDomain.status === "approved" ? (
                      <Badge variant="success" className="text-[10px] gap-1">
                        <Check className="size-3" /> Approved
                      </Badge>
                    ) : detailDomain.status === "pending" ? (
                      <Badge variant="warning" className="text-[10px] gap-1">
                        <Clock className="size-3" /> Pending Review
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/20 text-[10px] gap-1">
                        <X className="size-3" /> Rejected
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Rejection alert if applicable */}
                {detailDomain.status === "rejected" && (
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <ShieldAlert className="size-4 text-rose-600" />
                      <span>Domain Request Rejected</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      Reason: {detailDomain.rejectedReason || "No specific reason provided."}
                    </p>
                  </div>
                )}

                {/* Status Matrix */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg border bg-card space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">DNS Status</span>
                    <span className={`font-semibold ${detailDomain.dnsStatus === "verified" ? "text-emerald-600" : "text-amber-600"}`}>
                      {detailDomain.dnsStatus === "verified" ? "Verified" : "Pending Verification"}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg border bg-card space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">SSL Status</span>
                    <span className={`font-semibold ${detailDomain.sslStatus === "active" ? "text-emerald-600" : "text-amber-600"}`}>
                      {detailDomain.sslStatus === "active" ? "Active (TLS 1.3)" : detailDomain.sslStatus || "Provisioning"}
                    </span>
                  </div>
                </div>

                {/* DNS Instructions Table */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground uppercase tracking-wider text-[10px]">
                      Required DNS Configuration
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-[10px] h-6 gap-1"
                      onClick={() => verifyMutation.mutate(detailDomain.id)}
                      disabled={verifyMutation.isPending}
                    >
                      <RefreshCw className={`size-3 ${verifyMutation.isPending ? "animate-spin" : ""}`} /> Verify Now
                    </Button>
                  </div>

                  <div className="border rounded-xl divide-y text-[11px] font-mono bg-muted/20">
                    <div className="p-2.5 flex items-center justify-between gap-2">
                      <div>
                        <Badge className="bg-blue-600 text-white text-[9px] mr-1.5 font-sans">CNAME</Badge>
                        <span className="text-muted-foreground">Host: @ → Target: </span>
                        <span className="font-bold text-foreground">{detailDomain.targetCname}</span>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-6 text-muted-foreground hover:text-foreground"
                        onClick={() => handleCopy(detailDomain.targetCname, "cname")}
                      >
                        {copiedKey === "cname" ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                      </Button>
                    </div>

                    {detailDomain.verificationToken && (
                      <div className="p-2.5 flex items-center justify-between gap-2">
                        <div className="truncate">
                          <Badge className="bg-purple-600 text-white text-[9px] mr-1.5 font-sans">TXT</Badge>
                          <span className="text-muted-foreground">Challenge: </span>
                          <span className="font-bold text-purple-600 dark:text-purple-400">{detailDomain.verificationToken}</span>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-6 text-muted-foreground hover:text-foreground shrink-0"
                          onClick={() => handleCopy(detailDomain.verificationToken || "", "txt")}
                        >
                          {copiedKey === "txt" ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Audit Timeline */}
                <div className="space-y-2 pt-2 border-t">
                  <span className="font-bold text-foreground uppercase tracking-wider text-[10px] flex items-center gap-1">
                    <Clock className="size-3 text-primary" /> Lifecycle Audit Trail
                  </span>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-[11px]">
                      <span className="text-muted-foreground">1. Requested At:</span>
                      <span className="font-semibold text-foreground">{detailDomain.createdAt}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-[11px]">
                      <span className="text-muted-foreground">2. DNS Verified At:</span>
                      <span className="font-semibold text-foreground">
                        {detailDomain.verifiedAt ? new Date(detailDomain.verifiedAt).toLocaleString() : "Pending"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-[11px]">
                      <span className="text-muted-foreground">3. Super Admin Review:</span>
                      <span className="font-semibold text-foreground">
                        {detailDomain.approvedAt
                          ? `Approved at ${new Date(detailDomain.approvedAt).toLocaleString()}`
                          : detailDomain.status === "rejected"
                          ? "Rejected"
                          : "In Queue"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-[11px]">
                      <span className="text-muted-foreground">4. SSL Certificate:</span>
                      <span className="font-semibold text-foreground">
                        {detailDomain.sslIssuedAt ? `Issued at ${new Date(detailDomain.sslIssuedAt).toLocaleString()}` : detailDomain.sslStatus}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter className="px-5 py-3.5 border-t border-border/70 bg-muted/10 flex-row items-center justify-between sm:justify-between gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-8 text-rose-600 hover:text-rose-700 hover:bg-rose-500/10"
                  onClick={() => setDeleteDomain(detailDomain)}
                >
                  <Trash2 className="size-3.5 mr-1" /> Delete
                </Button>

                <div className="flex items-center gap-2">
                  {detailDomain.status === "pending" && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-8 text-rose-600 hover:bg-rose-500/10"
                        onClick={() => {
                          setTargetRejectDomains([detailDomain]);
                          setIsRejectModalOpen(true);
                        }}
                      >
                        <X className="size-3.5 mr-1" /> Reject Request
                      </Button>
                      <Button
                        size="sm"
                        variant="success"
                        className="text-xs h-8"
                        disabled={approveMutation.isPending}
                        onClick={() => approveMutation.mutate(detailDomain.id)}
                      >
                        {approveMutation.isPending ? <Loader2 className="size-3.5 animate-spin mr-1" /> : <Check className="size-3.5 mr-1" />}
                        Approve &amp; Activate
                      </Button>
                    </>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-8"
                    onClick={() => setDetailDomain(null)}
                  >
                    Close
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* REJECT DIALOG (Single or Bulk) */}
      <Dialog
        open={isRejectModalOpen && targetRejectDomains.length > 0}
        onOpenChange={(open) => {
          if (!open) {
            setIsRejectModalOpen(false);
            setRejectReason("");
            setTargetRejectDomains([]);
          }
        }}
      >
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-rose-600">
              <AlertTriangle className="size-5" />
              {targetRejectDomains.length === 1
                ? "Reject Custom Domain Request"
                : `Reject ${targetRejectDomains.length} Custom Domain Requests`}
            </DialogTitle>
            <DialogDescription className="text-xs leading-relaxed">
              {targetRejectDomains.length === 1 ? (
                <>
                  State the reason for rejecting{" "}
                  <strong className="text-foreground font-mono">{targetRejectDomains[0]?.domain}</strong>. The tenant admin will see this reason in their workspace settings.
                </>
              ) : (
                <>
                  State the rejection reason to apply to all{" "}
                  <strong className="text-foreground">{targetRejectDomains.length}</strong> selected pending domains.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {targetRejectDomains.length > 1 && (
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 rounded-lg bg-muted/30 border">
              {targetRejectDomains.map((d) => (
                <Badge key={d.id} variant="outline" className="font-mono text-[10px]">
                  {d.domain}
                </Badge>
              ))}
            </div>
          )}

          <Textarea
            placeholder="e.g. Hostname does not match corporate registration, CNAME proxying misconfigured..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
            className="text-xs"
            autoFocus
          />

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8"
              onClick={() => {
                setIsRejectModalOpen(false);
                setRejectReason("");
                setTargetRejectDomains([]);
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="text-xs h-8"
              disabled={rejectMutation.isPending || !rejectReason.trim()}
              onClick={() =>
                rejectMutation.mutate({
                  ids: targetRejectDomains.map((d) => d.id),
                  reason: rejectReason.trim(),
                })
              }
            >
              {rejectMutation.isPending && <Loader2 className="size-3 animate-spin mr-1" />}
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* BULK APPROVE CONFIRMATION DIALOG */}
      <ConfirmationDialog
        open={bulkApproveOpen}
        onOpenChange={setBulkApproveOpen}
        variant="default"
        icon={<ShieldCheck className="size-5" />}
        title={`Approve ${pendingSelectedDomains.length} Custom Domain(s)?`}
        description="Selected pending domains will be approved and SSL certificate provisioning will be initiated for each workspace."
        confirmLabel={`Approve ${pendingSelectedDomains.length} Domain(s)`}
        isLoading={bulkApproveMutation.isPending}
        onConfirm={() => bulkApproveMutation.mutate(pendingSelectedDomains.map((d) => d.id))}
      >
        <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
          {pendingSelectedDomains.map((d) => (
            <Badge key={d.id} variant="outline" className="font-mono text-[10px]">
              {d.domain}
            </Badge>
          ))}
        </div>
      </ConfirmationDialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <ConfirmationDialog
        open={!!deleteDomain}
        onOpenChange={(open) => !open && setDeleteDomain(null)}
        variant="destructive"
        title="Remove Custom Domain?"
        description={
          deleteDomain ? (
            <>
              Are you sure you want to remove{" "}
              <strong className="text-foreground font-mono">{deleteDomain.domain}</strong>? Vanity routing will be detached while the tenant&apos;s default Flow 1 workspace remains active.
            </>
          ) : undefined
        }
        confirmLabel="Confirm Removal"
        isLoading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteDomain) deleteMutation.mutate(deleteDomain.id);
        }}
      />
    </div>
  );
}
