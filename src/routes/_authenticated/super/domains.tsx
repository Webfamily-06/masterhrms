import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  Globe,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  Trash2,
  Calendar,
  FileSpreadsheet,
  FileText,
  ChevronDown,
  ChevronsUp,
  X,
  ExternalLink,
  Loader2,
  ShieldCheck,
  Check,
  AlertTriangle,
  RefreshCw,
  Copy,
  Star,
  Server,
  Layers,
  Info,
  ChevronRight,
  ShieldAlert,
  Shield,
  Lock,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/super/domains")({
  component: SuperDomainsPage,
});

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

const COMPANY_AVATARS = [
  "/ui-assets/company/company-01.svg",
  "/ui-assets/company/company-02.svg",
  "/ui-assets/company/company-03.svg",
  "/ui-assets/company/company-04.svg",
  "/ui-assets/company/company-05.svg",
  "/ui-assets/company/company-06.svg",
  "/ui-assets/company/company-07.svg",
  "/ui-assets/company/company-08.svg",
  "/ui-assets/company/company-09.svg",
  "/ui-assets/company/company-10.svg",
];

export default function SuperDomainsPage() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  if (pathname.includes("/documentation")) {
    return <Outlet />;
  }

  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dnsFilter, setDnsFilter] = useState("all");
  const [sslFilter, setSslFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Modals / Drawers
  const [detailDomain, setDetailDomain] = useState<CustomDomainRecord | null>(null);
  const [deleteDomain, setDeleteDomain] = useState<CustomDomainRecord | null>(null);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [targetRejectDomain, setTargetRejectDomain] = useState<CustomDomainRecord | null>(null);

  // 1. Fetch live domains from existing Flow 2 API
  const { data: domains = [], isLoading, refetch } = useQuery<CustomDomainRecord[]>({
    queryKey: ["super-custom-domains"],
    queryFn: async () => {
      const res = await api.get("/api/super/domains");
      const list = Array.isArray(res) ? res : res?.data || [];
      return list.map((d: any) => ({
        id: String(d.id),
        domain: d.domain,
        tenantId: d.tenantId,
        tenantName: d.tenantName || d.tenant?.name || "Workspace",
        subdomain: d.subdomain || "tenant.masterhrms.com",
        targetCname: d.targetCname || "cname.masterhrms.com",
        isPrimary: Boolean(d.isPrimary),
        planName: d.planName || "Advanced",
        planType: d.planType || "Monthly",
        price: d.price || "200",
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

  // 2. Mutations using real existing backend APIs
  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.put(`/api/super/domains/${id}/approve`, {});
    },
    onSuccess: (data: any) => {
      toast.success(data?.message || "Custom domain approved successfully. SSL provisioning initiated.");
      queryClient.invalidateQueries({ queryKey: ["super-custom-domains"] });
      if (detailDomain) {
        setDetailDomain((prev) => (prev ? { ...prev, status: "approved", approvedAt: new Date().toISOString() } : null));
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to approve custom domain");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      return api.put(`/api/super/domains/${id}/reject`, { reason });
    },
    onSuccess: (data: any) => {
      toast.success(data?.message || "Custom domain rejected");
      queryClient.invalidateQueries({ queryKey: ["super-custom-domains"] });
      setIsRejectModalOpen(false);
      setRejectReason("");
      setTargetRejectDomain(null);
      if (detailDomain) {
        setDetailDomain((prev) => (prev ? { ...prev, status: "rejected", rejectedReason: rejectReason } : null));
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to reject domain");
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.post(`/api/super/domains/${id}/verify`, {});
    },
    onSuccess: (data: any) => {
      if (data?.verified) {
        toast.success(data?.message || "DNS verification verified successfully!");
      } else {
        toast.warning(data?.message || "DNS check incomplete: DNS records not yet detected.");
      }
      queryClient.invalidateQueries({ queryKey: ["super-custom-domains"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "DNS verification check failed");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/api/super/domains/${id}`);
    },
    onSuccess: (data: any) => {
      toast.success(data?.message || "Custom domain removed successfully.");
      setDeleteDomain(null);
      if (detailDomain?.id === deleteDomain?.id) {
        setDetailDomain(null);
      }
      queryClient.invalidateQueries({ queryKey: ["super-custom-domains"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to remove custom domain");
    },
  });

  // Copy helper
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedKey(null), 2000);
  };

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

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredDomains.length) {
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
      `"${d.domain}"`,
      `"${d.tenantName}"`,
      `"${d.status}"`,
      `"${d.dnsStatus}"`,
      `"${d.sslStatus}"`,
      `"${d.isPrimary ? "Yes" : "No"}"`,
      `"${d.createdAt}"`,
      `"${d.approvedAt || "—"}"`,
      `"${d.targetCname}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `custom_domains_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Domain catalog exported to CSV");
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Breadcrumb Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <Link to="/super" className="hover:text-foreground transition-colors">
              Super Admin
            </Link>
            <ChevronRight className="size-3" />
            <span>Extensions &amp; Add-ons</span>
            <ChevronRight className="size-3" />
            <span className="text-foreground font-medium">Custom Domains</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <Globe className="size-6 text-primary" />
            Custom Domains
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Review, verify DNS, audit SSL issuance, and govern Flow 2 Primary Custom Domains across all tenant workspaces.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
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
        </div>
      </div>

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
        <Card className="p-3.5 border shadow-2xs bg-card space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
            Total Domains
          </span>
          <div className="flex items-center justify-between">
            <span className="text-xl font-black text-foreground">{summaryMetrics.total}</span>
            <Globe className="size-4 text-slate-400" />
          </div>
          <p className="text-[10px] text-muted-foreground">All registered records</p>
        </Card>

        <Card className="p-3.5 border shadow-2xs bg-card space-y-1 border-blue-200/60 dark:border-blue-900/40 bg-blue-50/20">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 block">
            Pending Approval
          </span>
          <div className="flex items-center justify-between">
            <span className="text-xl font-black text-blue-600 dark:text-blue-400">{summaryMetrics.pendingApproval}</span>
            <ShieldCheck className="size-4 text-blue-500" />
          </div>
          <p className="text-[10px] text-blue-600/80 dark:text-blue-400/80">DNS verified, awaiting review</p>
        </Card>

        <Card className="p-3.5 border shadow-2xs bg-card space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 block">
            Awaiting DNS
          </span>
          <div className="flex items-center justify-between">
            <span className="text-xl font-black text-amber-600 dark:text-amber-400">{summaryMetrics.awaitingDns}</span>
            <Clock className="size-4 text-amber-500" />
          </div>
          <p className="text-[10px] text-muted-foreground">Pending registrar setup</p>
        </Card>

        <Card className="p-3.5 border shadow-2xs bg-card space-y-1 border-emerald-200/60 dark:border-emerald-900/40 bg-emerald-50/20">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 block">
            Active Domains
          </span>
          <div className="flex items-center justify-between">
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">{summaryMetrics.active}</span>
            <CheckCircle2 className="size-4 text-emerald-500" />
          </div>
          <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80">Approved &amp; serving</p>
        </Card>

        <Card className="p-3.5 border shadow-2xs bg-card space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 block">
            SSL Provisioning
          </span>
          <div className="flex items-center justify-between">
            <span className="text-xl font-black text-purple-600 dark:text-purple-400">{summaryMetrics.sslProvisioning}</span>
            <Server className="size-4 text-purple-500" />
          </div>
          <p className="text-[10px] text-muted-foreground">ACME cert challenges</p>
        </Card>

        <Card className="p-3.5 border shadow-2xs bg-card space-y-1">
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
      <Card className="border shadow-xs overflow-hidden">
        {/* Filter Controls Bar */}
        <div className="p-4 border-b bg-muted/15 space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search domain, tenant, or slug..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-background border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Status Filter */}
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

              {/* DNS Filter */}
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

              {/* SSL Filter */}
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

              {/* Sort By */}
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
              <h4 className="text-base font-semibold text-slate-800 dark:text-slate-100">
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
                <tr className="bg-muted/40 border-b text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === filteredDomains.length && filteredDomains.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300 text-primary focus:ring-primary/20 h-3.5 w-3.5 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-4">Primary Domain</th>
                  <th className="py-3 px-4">Tenant / Company</th>
                  <th className="py-3 px-4">Approval Status</th>
                  <th className="py-3 px-4">DNS Verification</th>
                  <th className="py-3 px-4">SSL / TLS</th>
                  <th className="py-3 px-4">Requested</th>
                  <th className="py-3 px-4">Verified / Approved</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-color">
                {filteredDomains.map((d, idx) => {
                  const avatarSrc = COMPANY_AVATARS[idx % COMPANY_AVATARS.length];
                  const isApproved = d.status === "approved";
                  const isPending = d.status === "pending";
                  const isRejected = d.status === "rejected";

                  return (
                    <tr key={d.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(d.id)}
                          onChange={() => toggleSelect(d.id)}
                          className="rounded border-slate-300 text-primary focus:ring-primary/20 h-3.5 w-3.5 cursor-pointer"
                        />
                      </td>

                      {/* Domain URL & Primary Badge */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            onClick={() => setDetailDomain(d)}
                            className="font-mono font-bold text-foreground hover:text-primary transition-colors text-left"
                          >
                            {d.domain}
                          </button>
                          {d.isPrimary && (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 text-[10px] gap-0.5">
                              <Star className="size-2.5 fill-amber-500 text-amber-500" /> Primary
                            </Badge>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono block">
                          CNAME → {d.targetCname}
                        </span>
                      </td>

                      {/* Tenant with Avatar */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="size-7 rounded-full border p-0.5 bg-background flex items-center justify-center shrink-0">
                            <img src={avatarSrc} alt={d.tenantName} className="size-full object-contain rounded-full" />
                          </div>
                          <div>
                            <span className="font-semibold text-foreground block">{d.tenantName}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">{d.subdomain}</span>
                          </div>
                        </div>
                      </td>

                      {/* Approval Status */}
                      <td className="py-3 px-4">
                        {isApproved ? (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 text-[10px] gap-1">
                            <Check className="size-3 text-emerald-600" /> Approved
                          </Badge>
                        ) : isPending ? (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 text-[10px] gap-1">
                            <Clock className="size-3 text-amber-600" /> Pending Review
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-400 text-[10px] gap-1">
                            <X className="size-3 text-rose-600" /> Rejected
                          </Badge>
                        )}
                      </td>

                      {/* DNS Verification */}
                      <td className="py-3 px-4">
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
                      <td className="py-3 px-4">
                        {d.sslStatus === "active" ? (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 text-[10px]">
                            Active (TLS 1.3)
                          </Badge>
                        ) : d.sslStatus === "failed" ? (
                          <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 text-[10px]">
                            Failed
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 text-[10px]">
                            Provisioning
                          </Badge>
                        )}
                      </td>

                      {/* Requested At */}
                      <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                        {d.createdAt}
                      </td>

                      {/* Verified / Approved At */}
                      <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                        {d.approvedAt ? new Date(d.approvedAt).toLocaleDateString() : d.verifiedAt ? new Date(d.verifiedAt).toLocaleDateString() : "—"}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1 justify-end">
                          <button
                            title="Verify DNS in Real-Time"
                            onClick={() => verifyMutation.mutate(d.id)}
                            disabled={verifyMutation.isPending}
                            className="p-1.5 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-md transition-colors"
                          >
                            <RefreshCw className={`size-3.5 ${verifyMutation.isPending && (verifyMutation.variables as string) === d.id ? "animate-spin text-blue-600" : ""}`} />
                          </button>

                          <button
                            title="View DNS & Details"
                            onClick={() => setDetailDomain(d)}
                            className="p-1.5 text-muted-foreground hover:text-primary hover:bg-muted rounded-md transition-colors"
                          >
                            <Eye className="size-3.5" />
                          </button>

                          {isPending && (
                            <>
                              <button
                                title="Approve Domain"
                                onClick={() => approveMutation.mutate(d.id)}
                                disabled={approveMutation.isPending}
                                className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-md transition-colors"
                              >
                                <Check className="size-3.5" />
                              </button>

                              <button
                                title="Reject Domain"
                                onClick={() => {
                                  setTargetRejectDomain(d);
                                  setIsRejectModalOpen(true);
                                }}
                                className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-md transition-colors"
                              >
                                <X className="size-3.5" />
                              </button>
                            </>
                          )}

                          <button
                            title="Delete Domain"
                            onClick={() => setDeleteDomain(d)}
                            className="p-1.5 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-md transition-colors"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
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

      {/* DETAIL MODAL / DRAWER */}
      {detailDomain && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-xl w-full overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border-color">
              <div className="flex items-center gap-2">
                <Globe className="size-5 text-primary" />
                <div>
                  <h4 className="font-semibold text-sm text-foreground">Custom Domain Details</h4>
                  <p className="text-[11px] text-muted-foreground font-mono">{detailDomain.domain}</p>
                </div>
              </div>
              <button
                onClick={() => setDetailDomain(null)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-5 space-y-4 overflow-y-auto text-xs">
              {/* Status and Tenant Header Banner */}
              <div className="p-3.5 rounded-xl bg-muted/40 border border-border-color flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Tenant Workspace</span>
                  <span className="font-bold text-foreground text-sm">{detailDomain.tenantName}</span>
                  <span className="text-muted-foreground font-mono block text-[11px]">{detailDomain.subdomain}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Governance</span>
                  {detailDomain.status === "approved" ? (
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 text-[10px] gap-1">
                      <Check className="size-3" /> Approved
                    </Badge>
                  ) : detailDomain.status === "pending" ? (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 text-[10px] gap-1">
                      <Clock className="size-3" /> Pending Review
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 text-[10px] gap-1">
                      <X className="size-3" /> Rejected
                    </Badge>
                  )}
                </div>
              </div>

              {/* Rejection alert if applicable */}
              {detailDomain.status === "rejected" && (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 space-y-1">
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
                    {detailDomain.dnsStatus === "verified" ? "✓ Verified" : "⏳ Pending Verification"}
                  </span>
                </div>
                <div className="p-3 rounded-lg border bg-card space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">SSL Status</span>
                  <span className={`font-semibold ${detailDomain.sslStatus === "active" ? "text-emerald-600" : "text-amber-600"}`}>
                    {detailDomain.sslStatus === "active" ? "✓ Active (TLS 1.3)" : detailDomain.sslStatus || "Provisioning"}
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
                  {/* CNAME */}
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

                  {/* TXT Challenge */}
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
                      {detailDomain.approvedAt ? `Approved at ${new Date(detailDomain.approvedAt).toLocaleString()}` : detailDomain.status === "rejected" ? "Rejected" : "In Queue"}
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

            {/* Modal Footer Actions */}
            <div className="p-4 border-t border-border-color flex items-center justify-between gap-2 bg-muted/10">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                onClick={() => {
                  setDeleteDomain(detailDomain);
                }}
              >
                <Trash2 className="size-3.5 mr-1" /> Delete
              </Button>

              <div className="flex items-center gap-2">
                {detailDomain.status === "pending" && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-8 text-rose-600 hover:bg-rose-50"
                      onClick={() => {
                        setTargetRejectDomain(detailDomain);
                        setIsRejectModalOpen(true);
                      }}
                    >
                      <X className="size-3.5 mr-1" /> Reject Request
                    </Button>
                    <Button
                      size="sm"
                      className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
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
            </div>
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      {isRejectModalOpen && targetRejectDomain && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center gap-2.5 text-rose-600">
              <AlertTriangle className="size-5" />
              <h4 className="font-bold text-base text-foreground">Reject Custom Domain Request</h4>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Please state the reason for rejecting <strong className="text-foreground">{targetRejectDomain.domain}</strong>. The tenant admin will see this reason in their workspace settings.
            </p>
            <textarea
              placeholder="e.g. Hostname does not match corporate registration, CNAME proxying misconfigured, or offensive wording..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="w-full p-2.5 text-xs bg-muted/30 border rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
              autoFocus
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8"
                onClick={() => {
                  setIsRejectModalOpen(false);
                  setRejectReason("");
                  setTargetRejectDomain(null);
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="text-xs h-8 bg-rose-600 hover:bg-rose-700"
                disabled={rejectMutation.isPending || !rejectReason.trim()}
                onClick={() =>
                  rejectMutation.mutate({
                    id: targetRejectDomain.id,
                    reason: rejectReason.trim(),
                  })
                }
              >
                {rejectMutation.isPending && <Loader2 className="size-3 animate-spin mr-1" />}
                Confirm Rejection
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteDomain && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-sm w-full p-5 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="size-6" />
            </div>
            <h4 className="font-semibold text-base text-foreground">Remove Custom Domain?</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to remove <strong className="text-foreground">{deleteDomain.domain}</strong>? The vanity routing will be detached. The tenant&apos;s default Flow 1 workspace will remain completely active.
            </p>
            <div className="flex items-center justify-center gap-2 pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteDomain(null)}
                className="text-xs h-8"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteDomain.id)}
                className="text-xs h-8 bg-rose-600 hover:bg-rose-700"
              >
                {deleteMutation.isPending && <Loader2 className="size-3 animate-spin mr-1" />}
                Confirm Removal
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
