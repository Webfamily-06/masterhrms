import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useTenantBranding } from "@/lib/useTenantBranding";
import { normalizeDomain, validateCustomDomain } from "@/lib/domain-normalization";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Globe,
  Plus,
  CheckCircle2,
  Clock,
  XCircle,
  ExternalLink,
  Copy,
  Trash2,
  RefreshCw,
  Star,
  ShieldCheck,
  AlertTriangle,
  Info,
  Server,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export interface RequiredDnsRecord {
  type: "CNAME" | "TXT" | "A";
  host: string;
  value: string;
  ttl: number;
  description: string;
}

export interface CustomDomainItem {
  id: string;
  domain: string;
  subdomain: string | null;
  targetCname: string;
  isPrimary: boolean;
  status: "pending" | "approved" | "rejected";
  sslStatus: "provisioning" | "active" | "failed";
  dnsStatus: "pending" | "verified" | "failed";
  isActive: boolean;
  verificationToken: string;
  verificationMethod: string;
  verifiedAt?: string;
  approvedAt?: string;
  sslIssuedAt?: string;
  lastCheckedAt?: string;
  lastDnsError?: string;
  rejectedReason?: string;
  createdAt: string;
  requiredDns?: {
    cnameRecord: RequiredDnsRecord;
    txtChallengeRecord: RequiredDnsRecord;
    apexARecords: RequiredDnsRecord[];
  };
  customDomainUrl: string;
}

export function CustomDomainSettings() {
  const queryClient = useQueryClient();
  const { branding } = useTenantBranding();

  const [rawInput, setRawInput] = useState("");
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<CustomDomainItem | null>(null);

  // Normalized preview
  const normalizedPreview = normalizeDomain(rawInput);
  const validationPreview = rawInput.trim()
    ? validateCustomDomain(rawInput, branding.baseDomain || "localhost")
    : null;

  // 1. Fetch Tenant Custom Domains
  const {
    data: domainData,
    isLoading,
    refetch,
  } = useQuery<{
    success: boolean;
    tenantId: string;
    defaultWorkspaceUrl: string | null;
    domains: CustomDomainItem[];
  }>({
    queryKey: ["tenant-custom-domains"],
    queryFn: async () => {
      const res = await api.get("/api/workspace/custom-domain");
      return res?.data || res || { success: true, domains: [] };
    },
  });

  const domains = domainData?.domains || [];
  const primaryDomain = domains.find((d) => d.isPrimary) || domains.find((d) => d.status === "approved" && d.dnsStatus === "verified");

  // 2. Request Domain Mutation
  const requestMutation = useMutation({
    mutationFn: async (domain: string) => {
      return api.post("/api/workspace/custom-domain", { domain });
    },
    onSuccess: (data: any) => {
      toast.success(data?.message || "Custom domain requested successfully!");
      setIsRequestModalOpen(false);
      setRawInput("");
      queryClient.invalidateQueries({ queryKey: ["tenant-custom-domains"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to register custom domain");
    },
  });

  // 3. Verify DNS Mutation
  const verifyMutation = useMutation({
    mutationFn: async (domainId: string) => {
      return api.post(`/api/workspace/custom-domain/${domainId}/verify`, {});
    },
    onSuccess: (data: any) => {
      if (data?.verified) {
        toast.success(data?.message || "DNS verified successfully!");
      } else {
        toast.warning(data?.message || "DNS verification pending. Please allow time for DNS propagation.");
      }
      queryClient.invalidateQueries({ queryKey: ["tenant-custom-domains"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "DNS verification check failed");
    },
  });

  // 4. Set Primary Mutation
  const setPrimaryMutation = useMutation({
    mutationFn: async (domainId: string) => {
      return api.put(`/api/workspace/custom-domain/${domainId}/primary`, {});
    },
    onSuccess: (data: any) => {
      toast.success(data?.message || "Primary domain updated!");
      queryClient.invalidateQueries({ queryKey: ["tenant-custom-domains"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update primary domain");
    },
  });

  // 5. Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (domainId: string) => {
      return api.delete(`/api/workspace/custom-domain/${domainId}`);
    },
    onSuccess: (data: any) => {
      toast.success(data?.message || "Custom domain removed successfully.");
      setDeleteCandidate(null);
      queryClient.invalidateQueries({ queryKey: ["tenant-custom-domains"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to remove custom domain");
    },
  });

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const handleRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validationPreview?.valid || !validationPreview?.normalized) {
      toast.error(validationPreview?.message || "Please enter a valid domain name");
      return;
    }
    requestMutation.mutate(validationPreview.normalized);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header card with action */}
      <Card className="border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Globe className="size-4 text-primary" /> Primary Custom Domain (Flow 2)
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Connect your company&apos;s own branded domain (e.g. <span className="font-mono text-foreground font-semibold">acme.com</span> or <span className="font-mono text-foreground font-semibold">app.acme.com</span>) to this workspace.
            </p>
          </div>

          <Button
            size="sm"
            onClick={() => setIsRequestModalOpen(true)}
            className="text-xs h-8 gap-1.5 bg-primary hover:bg-primary/90 text-white cursor-pointer self-start sm:self-auto"
          >
            <Plus className="size-3.5" /> Connect Custom Domain
          </Button>
        </div>

        {/* Workspace URL Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 space-y-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
              Default Flow 1 Workspace (Permanent Fallback)
            </span>
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold text-foreground truncate">
                https://{branding.slug || "workspace"}.{branding.baseDomain || "localhost"}
              </span>
              <Button
                size="icon"
                variant="ghost"
                className="size-6 text-muted-foreground hover:text-foreground shrink-0"
                onClick={() => handleCopy(`https://${branding.slug || "workspace"}.${branding.baseDomain || "localhost"}`, "Default Workspace URL")}
              >
                <Copy className="size-3" />
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">Always active and unaffected by custom domain configuration.</p>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 space-y-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
              Primary Custom Domain (Flow 2)
            </span>
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold text-foreground truncate">
                {primaryDomain ? `https://${primaryDomain.domain}` : "Not Connected"}
              </span>
              {primaryDomain && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-6 text-muted-foreground hover:text-foreground shrink-0"
                  onClick={() => handleCopy(`https://${primaryDomain.domain}`, "Primary Domain URL")}
                >
                  <Copy className="size-3" />
                </Button>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground">
              {primaryDomain ? "Serving live white-label traffic." : "Connect an apex or branded subdomain below."}
            </p>
          </div>
        </div>

        {/* Safety & Dual-Host Architecture Notice */}
        <div className="rounded-xl p-3.5 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 space-y-1 text-xs">
          <div className="flex items-center gap-2 font-bold text-emerald-900 dark:text-emerald-300">
            <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
            <span>Dual-Host Access Architecture</span>
          </div>
          <p className="text-emerald-800/80 dark:text-emerald-300/80 leading-relaxed text-[11px]">
            Both URLs resolve to the <strong>exact same workspace, database, employees, and permissions</strong>. Connecting a custom domain creates a dedicated entry point without disrupting existing bookmarks or workflows.
          </p>
        </div>
      </Card>

      {/* Loading state */}
      {isLoading && (
        <Card className="p-8 text-center text-xs text-muted-foreground border border-slate-200 dark:border-slate-800">
          <RefreshCw className="size-6 animate-spin mx-auto mb-2 text-primary" />
          Loading custom domains...
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && domains.length === 0 && (
        <Card className="p-10 text-center text-xs border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 rounded-xl space-y-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <Globe className="size-6" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h4 className="font-semibold text-sm text-foreground">No Custom Domain Configured</h4>
            <p className="text-muted-foreground text-[11px]">
              You can connect a custom domain like <span className="font-mono font-medium">app.yourcompany.com</span> so team members access the workspace on your own URL.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setIsRequestModalOpen(true)}
            className="text-xs h-8 gap-1.5 bg-primary hover:bg-primary/90 text-white cursor-pointer mt-2"
          >
            <Plus className="size-3.5" /> Connect Your Domain
          </Button>
        </Card>
      )}

      {/* Domains List */}
      {!isLoading && domains.length > 0 && (
        <div className="space-y-4">
          {domains.map((item) => {
            const isApproved = item.status === "approved";
            const isVerified = item.dnsStatus === "verified";
            const isLive = isApproved && isVerified;

            return (
              <Card
                key={item.id}
                className="border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-sm"
              >
                {/* Domain Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-color">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-base font-bold text-foreground">
                        {item.domain}
                      </span>
                      {item.isPrimary && (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 text-[10px] gap-1">
                          <Star className="size-3 fill-amber-500 text-amber-500" /> Primary Domain
                        </Badge>
                      )}
                      {isLive ? (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 text-[10px] gap-1">
                          <CheckCircle2 className="size-3 text-emerald-600" /> Active & Live
                        </Badge>
                      ) : item.status === "pending" ? (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 text-[10px] gap-1">
                          <Clock className="size-3 text-amber-600" /> Pending Approval / DNS
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-400 text-[10px] gap-1">
                          <XCircle className="size-3 text-rose-600" /> Rejected
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                      <span>
                        SSL:{" "}
                        <strong className={item.sslStatus === "active" ? "text-emerald-600" : "text-amber-600"}>
                          {item.sslStatus}
                        </strong>
                      </span>
                      <span>•</span>
                      <span>
                        DNS:{" "}
                        <strong className={item.dnsStatus === "verified" ? "text-emerald-600" : item.dnsStatus === "failed" ? "text-rose-600" : "text-amber-600"}>
                          {item.dnsStatus}
                        </strong>
                      </span>
                      <span>•</span>
                      <span>Added: {new Date(item.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={verifyMutation.isPending}
                      onClick={() => verifyMutation.mutate(item.id)}
                      className="text-xs h-8 gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className={`size-3.5 ${verifyMutation.isPending ? "animate-spin" : ""}`} />
                      Verify DNS
                    </Button>

                    {isLive && !item.isPrimary && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={setPrimaryMutation.isPending}
                        onClick={() => setPrimaryMutation.mutate(item.id)}
                        className="text-xs h-8 gap-1.5 cursor-pointer"
                      >
                        <Star className="size-3.5" /> Make Primary
                      </Button>
                    )}

                    {isLive && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(`https://${item.domain}`, "_blank")}
                        className="text-xs h-8 gap-1.5 cursor-pointer"
                      >
                        <ExternalLink className="size-3.5" /> Visit
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDeleteCandidate(item)}
                      className="text-xs h-8 gap-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                    >
                      <Trash2 className="size-3.5" /> Remove
                    </Button>
                  </div>
                </div>

                {/* Pending Approval Notice */}
                {item.dnsStatus === "verified" && item.status === "pending" && (
                  <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-xl text-xs space-y-1">
                    <div className="font-semibold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                      <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                      <span>DNS verification successful. Your domain is waiting for platform approval.</span>
                    </div>
                    <p className="text-[11px] text-blue-800/80 dark:text-blue-300/80 leading-relaxed">
                      Your DNS records have been verified. The platform security team has been notified and is reviewing your request. Once approved, SSL will provision automatically and your domain will become active.
                    </p>
                  </div>
                )}

                {/* Rejection notice if any */}
                {item.status === "rejected" && (
                  <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs text-rose-800 dark:text-rose-300 space-y-1">
                    <div className="font-semibold flex items-center gap-1.5 text-rose-900 dark:text-rose-200">
                      <AlertTriangle className="size-4 text-rose-600" />
                      <span>Domain Request Rejected by Platform Administrator</span>
                    </div>
                    {item.rejectedReason && (
                      <p className="text-[11px] text-rose-700/90 dark:text-rose-300/90">
                        Reason: {item.rejectedReason}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      You may remove this request and submit a new domain or correct any DNS issues.
                    </p>
                  </div>
                )}

                {/* DNS Configuration Guide Table */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Server className="size-3.5 text-primary" /> Required DNS Configuration
                    </h5>
                    <span className="text-[11px] text-muted-foreground">
                      Configure these records at your DNS registrar (Cloudflare, GoDaddy, Namecheap, etc.)
                    </span>
                  </div>

                  <div className="border border-border-color rounded-xl overflow-hidden divide-y divide-border-color text-xs bg-slate-50/50 dark:bg-slate-900/30">
                    {/* CNAME Record */}
                    <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="font-mono text-[10px] px-1.5 py-0">
                            CNAME
                          </Badge>
                          <span className="font-mono font-semibold text-foreground">
                            {item.subdomain || "@"}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Points your custom hostname to the platform routing edge.
                        </p>
                      </div>

                      <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                        <span className="font-mono text-[11px] text-slate-800 dark:text-slate-200">
                          {item.targetCname}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-6 text-muted-foreground hover:text-foreground cursor-pointer"
                          onClick={() => handleCopy(item.targetCname, "CNAME Target")}
                        >
                          <Copy className="size-3" />
                        </Button>
                      </div>
                    </div>

                    {/* TXT Challenge Record */}
                    {item.verificationToken && (
                      <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="font-mono text-[10px] px-1.5 py-0">
                              TXT
                            </Badge>
                            <span className="font-mono font-semibold text-foreground">
                              _masterhrms-challenge.{item.domain}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            Cryptographic verification challenge proving domain control.
                          </p>
                        </div>

                        <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                          <span className="font-mono text-[11px] text-slate-800 dark:text-slate-200 max-w-[200px] truncate" title={item.verificationToken}>
                            {item.verificationToken}
                          </span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-6 text-muted-foreground hover:text-foreground cursor-pointer"
                            onClick={() => handleCopy(item.verificationToken, "TXT Verification Challenge")}
                          >
                            <Copy className="size-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {item.lastDnsError && (
                    <div className="text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                      <AlertTriangle className="size-3" />
                      Last DNS check note: {item.lastDnsError}
                    </div>
                  )}

                  {/* Lifecycle Audit Trail */}
                  <div className="pt-3 border-t border-border-color space-y-2">
                    <h6 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Clock className="size-3 text-primary" /> Lifecycle Audit Trail
                    </h6>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                      <div className="p-2.5 rounded-lg bg-muted/40 border border-border-color space-y-0.5">
                        <span className="text-muted-foreground block text-[10px]">1. Requested:</span>
                        <span className="font-semibold text-foreground">
                          {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "—"}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-muted/40 border border-border-color space-y-0.5">
                        <span className="text-muted-foreground block text-[10px]">2. DNS Verified:</span>
                        <span className={`font-semibold ${item.dnsStatus === "verified" ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                          {item.verifiedAt ? new Date(item.verifiedAt).toLocaleDateString() : item.dnsStatus === "verified" ? "Verified" : "Pending"}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-muted/40 border border-border-color space-y-0.5">
                        <span className="text-muted-foreground block text-[10px]">3. Approval:</span>
                        <span className={`font-semibold ${item.status === "approved" ? "text-emerald-600 dark:text-emerald-400" : item.status === "rejected" ? "text-rose-600 dark:text-rose-400" : "text-amber-600 dark:text-amber-400"}`}>
                          {item.approvedAt ? new Date(item.approvedAt).toLocaleDateString() : item.status === "rejected" ? "Rejected" : "In Review"}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-muted/40 border border-border-color space-y-0.5">
                        <span className="text-muted-foreground block text-[10px]">4. SSL Status:</span>
                        <span className={`font-semibold ${item.sslStatus === "active" ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                          {item.sslIssuedAt ? new Date(item.sslIssuedAt).toLocaleDateString() : item.sslStatus}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Connect Domain Modal */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md w-full overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border-color">
              <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
                <Globe className="size-4 text-primary" /> Connect Custom Domain
              </h4>
              <button
                type="button"
                onClick={() => setIsRequestModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRequestSubmit} className="p-5 space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Custom Domain Hostname
                </label>
                <Input
                  placeholder="e.g. app.mycompany.com or hr.brand.org"
                  value={rawInput}
                  onChange={(e) => setRawInput(e.target.value)}
                  className="font-mono text-xs h-9"
                  autoFocus
                />
                <p className="text-[11px] text-muted-foreground">
                  Enter your subdomain or domain name. Protocols and trailing slashes will be automatically normalized.
                </p>
              </div>

              {/* Dynamic Real-time Normalization Feedback */}
              {rawInput.trim() && (
                <div
                  className={`p-3 rounded-lg border text-[11px] space-y-1 ${
                    validationPreview?.valid
                      ? "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700"
                      : "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300"
                  }`}
                >
                  <div className="flex items-center justify-between font-mono">
                    <span className="text-muted-foreground">Normalized:</span>
                    <span className="font-bold text-foreground">
                      {normalizedPreview || "—"}
                    </span>
                  </div>
                  {!validationPreview?.valid && (
                    <div className="text-rose-600 dark:text-rose-400 font-medium">
                      ✕ {validationPreview?.message}
                    </div>
                  )}
                  {validationPreview?.valid && (
                    <div className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                      <CheckCircle2 className="size-3" /> Valid domain format
                    </div>
                  )}
                </div>
              )}

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-color">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsRequestModalOpen(false)}
                  className="text-xs h-8 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={requestMutation.isPending || !validationPreview?.valid}
                  className="text-xs h-8 gap-1.5 bg-primary hover:bg-primary/90 text-white cursor-pointer"
                >
                  {requestMutation.isPending ? (
                    <RefreshCw className="size-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="size-3.5" />
                  )}
                  Submit Domain Request
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-sm w-full p-5 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="size-6" />
            </div>
            <h4 className="font-semibold text-base text-foreground">Remove Custom Domain?</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to remove{" "}
              <strong className="text-foreground">{deleteCandidate.domain}</strong>? The domain will no longer route to your workspace. Your default workspace address will remain active.
            </p>
            <div className="flex items-center justify-center gap-2 pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteCandidate(null)}
                className="text-xs h-8 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteCandidate.id)}
                className="text-xs h-8 gap-1.5 cursor-pointer bg-rose-600 hover:bg-rose-700 text-white"
              >
                {deleteMutation.isPending && <RefreshCw className="size-3 animate-spin" />}
                Confirm Remove
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
