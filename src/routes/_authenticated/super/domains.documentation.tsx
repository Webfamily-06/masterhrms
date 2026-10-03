import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Globe,
  ShieldCheck,
  CheckCircle2,
  Clock,
  XCircle,
  Copy,
  Check,
  ArrowRight,
  Server,
  Layers,
  Key,
  Lock,
  ExternalLink,
  HelpCircle,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  FileText,
  ChevronRight,
  Database,
  Terminal,
  Cpu,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getPlatformBaseDomain } from "@/lib/platform-domain";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/super/domains/documentation")({
  component: CustomDomainDocumentationPage,
});

export function CustomDomainDocumentationPage() {
  const baseDomain = getPlatformBaseDomain() || "masterhrms.com";
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("architecture");

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <Link to="/super" className="hover:text-foreground transition-colors">
              Super Admin
            </Link>
            <ChevronRight className="size-3" />
            <span>Extensions &amp; Add-ons</span>
            <ChevronRight className="size-3" />
            <span className="text-foreground font-medium">Custom Domain Documentation</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <Globe className="size-6 text-primary" />
            Primary Custom Domain Engineering Guide
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Comprehensive reference architecture, DNS mechanics, approval governance, and security isolation protocols.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/super/domains">
            <Button size="sm" className="gap-1.5 bg-primary text-white hover:bg-primary/90 shadow-xs">
              <Globe className="size-3.5" />
              Manage Custom Domains
            </Button>
          </Link>
        </div>
      </div>

      {/* Navigation Pill Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-border-color pb-2 text-xs">
        {[
          { id: "architecture", label: "1. Core Architecture" },
          { id: "lifecycle", label: "2. 9-Stage Lifecycle" },
          { id: "dns", label: "3. DNS Configuration" },
          { id: "approval", label: "4. Approval Governance" },
          { id: "ssl", label: "5. Automated SSL/TLS" },
          { id: "security", label: "6. Security & Isolation" },
          { id: "troubleshooting", label: "7. Troubleshooting" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === tab.id
                ? "bg-primary text-white shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* SECTION 1: CORE ARCHITECTURE */}
      {activeTab === "architecture" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <Card className="border shadow-xs">
            <CardHeader className="border-b bg-muted/20">
              <div className="flex items-center gap-2">
                <Layers className="size-5 text-primary" />
                <div>
                  <CardTitle className="text-base font-bold">Dual-Host Multi-Tenant Architecture</CardTitle>
                  <CardDescription className="text-xs">
                    How Flow 1 (Subdomains) and Flow 2 (Primary Custom Domains) map identically into the tenant runtime.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/40 dark:bg-blue-950/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 font-mono text-[10px]">
                      FLOW 1 — Default Host
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">Permanent Fallback</span>
                  </div>
                  <h3 className="font-mono text-base font-bold text-blue-900 dark:text-blue-200">
                    https://acme.{baseDomain}
                  </h3>
                  <p className="text-xs text-blue-800/80 dark:text-blue-300/80 leading-relaxed">
                    Auto-provisioned immediately upon tenant registration. Never expires, cannot be overwritten, and always functions as the infallible fail-safe operational URL.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 font-mono text-[10px]">
                      FLOW 2 — Primary Custom Domain
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">Customer Branded</span>
                  </div>
                  <h3 className="font-mono text-base font-bold text-emerald-900 dark:text-emerald-200">
                    https://acme.com
                  </h3>
                  <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80 leading-relaxed">
                    Customer-owned apex or sub-domain verified via DNS CNAME &amp; cryptographic TXT token, approved by Super Admin, with automated SSL provisioning.
                  </p>
                </div>
              </div>

              {/* Equivalence Guarantee Table */}
              <div className="border rounded-xl overflow-hidden divide-y divide-border-color text-xs">
                <div className="p-3 bg-muted/40 font-semibold text-slate-800 dark:text-slate-200">
                  Dual-Host Parity Guarantees (Both URLs Resolve to the EXACT Same State)
                </div>
                {[
                  { property: "Tenant Workspace", guarantee: "Identical Tenant ID resolved via Host header" },
                  { property: "Database & Tables", guarantee: "Zero replication. Both point to the exact same Postgres schemas & row-level data" },
                  { property: "Users & Credentials", guarantee: "Employees login with identical passwords & 2FA on either domain" },
                  { property: "Role & RBAC Matrix", guarantee: "Identical permissions, modules, and administrative capabilities" },
                  { property: "Subscription & Limits", guarantee: "One shared billing subscription; no duplicate license charges" },
                  { property: "Tenant Isolation", guarantee: "Strict isolation enforced; requests from other tenants receive 404 / 403" },
                ].map((row, i) => (
                  <div key={i} className="p-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <span className="font-semibold text-foreground">{row.property}</span>
                    <span className="sm:col-span-2 text-muted-foreground font-mono">{row.guarantee}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* SECTION 2: 9-STAGE LIFECYCLE */}
      {activeTab === "lifecycle" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <Card className="border shadow-xs">
            <CardHeader className="border-b bg-muted/20">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Clock className="size-5 text-primary" />
                The Complete 9-Stage Domain Lifecycle
              </CardTitle>
              <CardDescription className="text-xs">
                Step-by-step state progression from initial tenant request to active primary domain routing.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {[
                  {
                    step: 1,
                    title: "Tenant Requests Domain",
                    actor: "Tenant Admin",
                    state: "pending",
                    desc: "Tenant submits customer hostname (e.g. acme.com) in Workspace Settings. Backend normalizes hostname, strips protocol/port/path, and enforces RFC compliance.",
                  },
                  {
                    step: 2,
                    title: "DNS Instructions Generated",
                    actor: "System Engine",
                    state: "pending",
                    desc: "System assigns platform CNAME target and creates a unique cryptographic TXT verification challenge token stored in database.",
                  },
                  {
                    step: 3,
                    title: "Tenant Configures DNS Records",
                    actor: "Tenant DNS Admin",
                    state: "pending",
                    desc: "Tenant adds CNAME and TXT challenge records at their DNS provider (Cloudflare, AWS Route53, GoDaddy, Namecheap).",
                  },
                  {
                    step: 4,
                    title: "Domain Verification Check",
                    actor: "Tenant Admin / Cron",
                    state: "dns: verified",
                    desc: "Tenant clicks 'Verify DNS'. Platform performs server-side DNS lookup. When TXT or CNAME matches, dnsStatus advances to 'verified'.",
                  },
                  {
                    step: 5,
                    title: "Awaiting Super Admin Approval",
                    actor: "Super Admin",
                    state: "status: pending",
                    desc: "DNS verification alone does NOT activate the domain. Domain request enters the Super Admin approval queue for security audit.",
                  },
                  {
                    step: 6,
                    title: "Super Admin Approves / Rejects",
                    actor: "Super Admin",
                    state: "approved | rejected",
                    desc: "Super Admin reviews tenant reputation, DNS status, and approves with single click. If rejected, reason is recorded and visible to tenant.",
                  },
                  {
                    step: 7,
                    title: "SSL/TLS Certificate Provisioning",
                    actor: "ACME / Certbot",
                    state: "ssl: provisioning -> active",
                    desc: "Platform edge automatically requests Let's Encrypt SSL certificate using SNI challenge. When issued, sslStatus transitions to 'active'.",
                  },
                  {
                    step: 8,
                    title: "Domain Activation & Primary Promotion",
                    actor: "System / Admin",
                    state: "isActive: true",
                    desc: "Domain becomes fully active. If promoted to Primary, incoming traffic and notifications default to the custom domain address.",
                  },
                  {
                    step: 9,
                    title: "Dual-Host Continuous Monitoring",
                    actor: "Background Daemon",
                    state: "monitoring",
                    desc: "Hourly health checks verify DNS and SSL validity. Any revocation or misconfiguration triggers admin alerts while Flow 1 remains healthy.",
                  },
                ].map((item) => (
                  <div
                    key={item.step}
                    className="p-4 rounded-xl border border-border-color bg-card flex flex-col sm:flex-row items-start gap-4 hover:border-primary/40 transition-colors"
                  >
                    <div className="size-8 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center shrink-0">
                      {item.step}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <h4 className="font-bold text-sm text-foreground">{item.title}</h4>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] bg-muted/50 font-mono">
                            {item.actor}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px] font-mono">
                            {item.state}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* SECTION 3: DNS CONFIGURATION */}
      {activeTab === "dns" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <Card className="border shadow-xs">
            <CardHeader className="border-b bg-muted/20">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Server className="size-5 text-primary" />
                Required DNS Record Specifications
              </CardTitle>
              <CardDescription className="text-xs">
                Platform target records that must be published by the customer DNS registrar.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="border rounded-xl overflow-hidden divide-y divide-border-color text-xs bg-card">
                {/* CNAME Record */}
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-blue-600 text-white font-mono text-[10px]">CNAME</Badge>
                      <span className="font-semibold text-foreground">Traffic Routing Record (Required)</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground font-mono">TTL: 300 / Auto</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-muted/30 p-3 rounded-lg border border-border-color font-mono text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase">Host / Name:</span>
                      <span className="font-bold text-foreground">@ (Apex) or subdomain (e.g. app)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase">Target / Value:</span>
                        <span className="font-bold text-primary">{baseDomain}</span>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        onClick={() => copyToClipboard(baseDomain, "cname")}
                      >
                        {copiedKey === "cname" ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                      </Button>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Routes incoming HTTP/HTTPS requests from the customer domain to the platform ingress reverse proxy.
                  </p>
                </div>

                {/* TXT Challenge Record */}
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-purple-600 text-white font-mono text-[10px]">TXT</Badge>
                      <span className="font-semibold text-foreground">Ownership Verification Challenge (Required)</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground font-mono">TTL: 300</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-muted/30 p-3 rounded-lg border border-border-color font-mono text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase">Host / Name:</span>
                      <span className="font-bold text-foreground">_masterhrms-challenge.[domain]</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase">Value / Token:</span>
                        <span className="font-bold text-purple-600 dark:text-purple-400">mhrms-verify-[crypto-token]</span>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        onClick={() => copyToClipboard(`_masterhrms-challenge.${baseDomain}`, "txt")}
                      >
                        {copiedKey === "txt" ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                      </Button>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Cryptographic proof that the tenant admin controls DNS records for the domain, preventing domain hijacking.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* SECTION 4: APPROVAL GOVERNANCE */}
      {activeTab === "approval" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <Card className="border shadow-xs">
            <CardHeader className="border-b bg-muted/20">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <ShieldCheck className="size-5 text-primary" />
                Super Admin Review &amp; Approval Governance
              </CardTitle>
              <CardDescription className="text-xs">
                Platform safeguards preventing unverified domain routing and hostile takeovers.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-300">
                  <AlertTriangle className="size-4 text-amber-600" />
                  <span>Mandatory Human Review Policy</span>
                </div>
                <p className="text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
                  Even after DNS verification passes, custom domains remain in <strong>Pending Approval</strong> until a Super Administrator explicitly reviews the requesting tenant, examines the domain name for brand infringement or offensive content, and triggers the approval API.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-card space-y-2">
                  <div className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="size-4 text-emerald-600" />
                    <span>Approve Workflow</span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    Executing <code>PUT /api/super/domains/:id/approve</code> sets <code>status = &quot;approved&quot;</code>, records <code>approvedAt</code> and <code>approvedBy</code>, and triggers automated SSL certificate provisioning.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-card space-y-2">
                  <div className="flex items-center gap-2 font-bold text-rose-700 dark:text-rose-400">
                    <XCircle className="size-4 text-rose-600" />
                    <span>Reject Workflow</span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    Executing <code>PUT /api/super/domains/:id/reject</code> requires a mandatory rejection reason. The tenant is notified immediately with the explanation so they can rectify the issue.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* SECTION 5: AUTOMATED SSL/TLS */}
      {activeTab === "ssl" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <Card className="border shadow-xs">
            <CardHeader className="border-b bg-muted/20">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Lock className="size-5 text-primary" />
                Automated SSL / TLS Certificate Lifecycle
              </CardTitle>
              <CardDescription className="text-xs">
                End-to-end HTTPS encryption, certificate authority challenges, and automated renewal.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-card space-y-2">
                  <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 font-mono text-[10px]">
                    PROVISIONING
                  </Badge>
                  <h4 className="font-bold text-foreground">ACME Challenge</h4>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    Once approved, the edge proxy communicates with Let&apos;s Encrypt to validate HTTP-01 / TLS-ALPN-01 challenges.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-card space-y-2">
                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-mono text-[10px]">
                    ACTIVE
                  </Badge>
                  <h4 className="font-bold text-foreground">Certificate Bound</h4>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    Certificate is loaded into the TLS cache. High-performance TLS 1.3 / HTTP/2 termination is immediately available.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-card space-y-2">
                  <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-mono text-[10px]">
                    AUTO-RENEWAL
                  </Badge>
                  <h4 className="font-bold text-foreground">30-Day Renewal</h4>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    Certificates automatically renew 30 days prior to expiry with zero tenant intervention or downtime.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* SECTION 6: SECURITY & ISOLATION */}
      {activeTab === "security" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <Card className="border shadow-xs">
            <CardHeader className="border-b bg-muted/20">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <ShieldCheck className="size-5 text-primary" />
                Security Boundaries &amp; Route Isolation
              </CardTitle>
              <CardDescription className="text-xs">
                Zero Super Admin leakage on tenant hosts and mathematical multi-tenant separation.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              <div className="border border-rose-200 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/20 p-4 rounded-xl space-y-2 text-xs">
                <div className="flex items-center gap-2 font-bold text-rose-900 dark:text-rose-300">
                  <XCircle className="size-4 text-rose-600" />
                  <span>The Fundamental Super Admin Security Invariant</span>
                </div>
                <p className="text-rose-800/90 dark:text-rose-300/90 leading-relaxed font-mono">
                  {baseDomain}/Super → ONLY Super Admin Login Console<br />
                  acme.{baseDomain}/Super → STRICT 404 NOT FOUND<br />
                  acme.com/Super → STRICT 404 NOT FOUND
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  On tenant workspace hosts and custom domains, the entire /super tree throws a hard 404 error with zero administrative UI, zero forms, and zero network leakage.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl border bg-card space-y-1.5">
                  <span className="font-bold text-foreground">Tenant Isolation Enforcer</span>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    Requests arriving on <code>acme.com</code> are resolved to Tenant A. If a user presents session tokens or IDs belonging to Tenant B, the request is immediately rejected with 403 Forbidden.
                  </p>
                </div>
                <div className="p-4 rounded-xl border bg-card space-y-1.5">
                  <span className="font-bold text-foreground">Domain Uniqueness Validation</span>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    No two tenants can register the same custom domain. Hostnames are stored in lowercase normalized form with unique index constraints at the database level.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* SECTION 7: TROUBLESHOOTING */}
      {activeTab === "troubleshooting" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <Card className="border shadow-xs">
            <CardHeader className="border-b bg-muted/20">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <HelpCircle className="size-5 text-primary" />
                Diagnostic Troubleshooting &amp; Error Catalog
              </CardTitle>
              <CardDescription className="text-xs">
                Common DNS propagation and verification issues and their immediate remediation steps.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4 text-xs">
                {[
                  {
                    issue: "DNS Verification Times Out / Not Detected",
                    cause: "DNS propagation delay (can take up to 24 hours depending on registrar TTL settings).",
                    fix: "Verify that proxying is disabled during initial check (e.g. Cloudflare DNS-only grey cloud). Use dig or nslookup to confirm TXT challenge record is published publicly.",
                  },
                  {
                    issue: "Domain In 'Pending Approval' for Extended Period",
                    cause: "DNS verification succeeded, but Super Admin has not yet reviewed the domain queue.",
                    fix: "Notify platform administrators. Super Admin accesses /super/domains and clicks 'Approve'.",
                  },
                  {
                    issue: "SSL Certificate Fails to Provision",
                    cause: "CNAME does not resolve to the platform IP, or CAA DNS records block Let's Encrypt.",
                    fix: "Ensure customer CAA records permit 'letsencrypt.org' to issue certificates, and that HTTP port 80 is not blocked.",
                  },
                  {
                    issue: "Tenant Removed Custom Domain Accidental Panic",
                    cause: "Customer worries removing custom domain deleted company employee or payroll data.",
                    fix: "Reassure tenant: deleting a custom domain only detaches the vanity URL. The Flow 1 workspace address (acme.platform.com) and all databases remain 100% intact.",
                  },
                ].map((item, i) => (
                  <div key={i} className="p-4 rounded-xl border border-border-color bg-card space-y-1.5">
                    <div className="flex items-center gap-2 text-foreground font-bold">
                      <AlertTriangle className="size-3.5 text-amber-500" />
                      <span>{item.issue}</span>
                    </div>
                    <p className="text-muted-foreground text-[11px]">
                      <strong className="text-foreground">Root Cause:</strong> {item.cause}
                    </p>
                    <p className="text-emerald-700 dark:text-emerald-400 text-[11px]">
                      <strong className="text-foreground">Remediation:</strong> {item.fix}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
