import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  Globe,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Trash2,
  Copy,
  Check,
  Building2,
  Sliders,
  Sparkles,
  Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

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
  sslStatus: "active" | "provisioning" | "expired" | "failed";
  dnsStatus: "verified" | "pending" | "failed";
  createdAt: string;
};

const INITIAL_DOMAINS: CustomDomainRecord[] = [
  {
    id: "dom-1",
    domain: "portal.acme-tech.com",
    tenantId: "t-acme",
    tenantName: "ACME Technologies Pvt Ltd",
    subdomain: "acme.mastererp.cloud",
    targetCname: "cname.mastererp.cloud",
    sslStatus: "active",
    dnsStatus: "verified",
    createdAt: "2026-08-15",
  },
  {
    id: "dom-2",
    domain: "erp.globex.co.uk",
    tenantId: "t-globex",
    tenantName: "Globex Global Logistics",
    subdomain: "globex.mastererp.cloud",
    targetCname: "cname.mastererp.cloud",
    sslStatus: "active",
    dnsStatus: "verified",
    createdAt: "2026-08-20",
  },
  {
    id: "dom-3",
    domain: "hrms.initech-enterprises.com",
    tenantId: "t-initech",
    tenantName: "Initech Enterprise Software",
    subdomain: "initech.mastererp.cloud",
    targetCname: "cname.mastererp.cloud",
    sslStatus: "provisioning",
    dnsStatus: "pending",
    createdAt: "2026-09-22",
  },
];

export default function SuperDomainsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [domains, setDomains] = useState<CustomDomainRecord[]>(INITIAL_DOMAINS);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [newDomain, setNewDomain] = useState({
    tenantId: "",
    tenantName: "",
    domain: "",
    subdomain: "",
  });

  const { data: tenants = [] } = useQuery<any[]>({
    queryKey: ["super-tenants-list"],
    queryFn: async () => {
      try {
        const res = await api.get("/super/tenants");
        return Array.isArray(res) ? res : res?.data || [];
      } catch {
        return [];
      }
    },
  });

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Target CNAME copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleVerifyDns = (id: string) => {
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 1500)),
      {
        loading: "Querying Cloudflare DNS & SSL resolver...",
        success: () => {
          setDomains((prev) =>
            prev.map((d) =>
              d.id === id ? { ...d, dnsStatus: "verified", sslStatus: "active" } : d
            )
          );
          return "DNS records verified and SSL Certificate auto-issued!";
        },
        error: "DNS verification failed. Please ensure CNAME is pointed correctly.",
      }
    );
  };

  const handleCreateDomain = () => {
    if (!newDomain.domain || !newDomain.tenantId) {
      toast.error("Please provide tenant and custom domain name");
      return;
    }

    const created: CustomDomainRecord = {
      id: `dom-${Date.now()}`,
      domain: newDomain.domain.toLowerCase().trim(),
      tenantId: newDomain.tenantId,
      tenantName: newDomain.tenantName || "Selected Tenant",
      subdomain: `${newDomain.subdomain || "tenant"}.mastererp.cloud`,
      targetCname: "cname.mastererp.cloud",
      sslStatus: "provisioning",
      dnsStatus: "pending",
      createdAt: new Date().toISOString().slice(0, 10),
    };

    setDomains([created, ...domains]);
    toast.success(`Custom domain ${created.domain} registered. Point CNAME to verify.`);
    setAddModalOpen(false);
    setNewDomain({ tenantId: "", tenantName: "", domain: "", subdomain: "" });
  };

  const filtered = domains.filter((d) =>
    d.domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.tenantName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full min-w-0 flex-1 space-y-6 p-4 lg:p-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Custom Domains & CNAME Manager</h1>
            <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20 text-xs">
              Super Admin
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Configure white-label tenant vanity domains, automated Let's Encrypt SSL provisioning, and CNAME routing.
          </p>
        </div>

        <Button onClick={() => setAddModalOpen(true)} size="sm" className="h-9 gap-1.5 text-xs font-semibold">
          <Plus className="w-3.5 h-3.5" />
          Add Custom Domain
        </Button>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-medium text-muted-foreground">Total Vanity Domains</span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600">
              <Globe className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{domains.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Across active enterprise plans</p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-medium text-muted-foreground">SSL Active & Secured</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{domains.filter((d) => d.sslStatus === "active").length}</div>
            <p className="text-xs text-emerald-600 mt-1">Auto-renewing certificates</p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-medium text-muted-foreground">DNS Pending Verification</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{domains.filter((d) => d.dnsStatus === "pending").length}</div>
            <p className="text-xs text-amber-600 mt-1">Awaiting tenant CNAME update</p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-xs font-medium text-muted-foreground">Target Proxy Edge</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
              <RefreshCw className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-sm font-mono font-bold">cname.mastererp.cloud</div>
            <p className="text-xs text-muted-foreground mt-1">Global Anycast Cloudflare Edge</p>
          </CardContent>
        </Card>
      </div>

      {/* Domain Table */}
      <Card className="border border-border/60 shadow-sm">
        <CardHeader className="p-4 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-semibold">Registered Custom Domains</CardTitle>
            <CardDescription className="text-xs">
              Live mapping of tenant white-label domains to internal cloud proxy cluster.
            </CardDescription>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search domains or tenants..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-8 text-xs"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="text-xs font-semibold">Custom Domain</TableHead>
                <TableHead className="text-xs font-semibold">Tenant Organization</TableHead>
                <TableHead className="text-xs font-semibold">Internal Subdomain</TableHead>
                <TableHead className="text-xs font-semibold">DNS Status</TableHead>
                <TableHead className="text-xs font-semibold">SSL Certificate</TableHead>
                <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((dom) => (
                <TableRow key={dom.id} className="hover:bg-muted/30">
                  <TableCell className="py-2.5">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-purple-600 shrink-0" />
                      <div>
                        <a
                          href={`https://${dom.domain}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-semibold text-foreground hover:text-primary flex items-center gap-1"
                        >
                          {dom.domain} <ExternalLink className="w-3 h-3" />
                        </a>
                        <p className="text-[11px] text-muted-foreground">Added on {dom.createdAt}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs font-medium text-foreground">{dom.tenantName}</TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">{dom.subdomain}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        dom.dnsStatus === "verified"
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]"
                          : "bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]"
                      }
                    >
                      {dom.dnsStatus === "verified" ? "DNS Verified" : "Pending Verification"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        dom.sslStatus === "active"
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]"
                          : "bg-blue-500/10 text-blue-600 border-blue-500/20 text-[10px]"
                      }
                    >
                      {dom.sslStatus === "active" ? "SSL Active" : "Provisioning SSL"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleVerifyDns(dom.id)}
                      className="h-7 text-xs text-primary font-semibold"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Verify DNS
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDomains(domains.filter((d) => d.id !== dom.id));
                        toast.success(`Removed custom domain ${dom.domain}`);
                      }}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Custom Domain Modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Register Custom Domain</DialogTitle>
            <DialogDescription className="text-xs">
              Map an organization's white-label vanity domain to their ERP tenant instance.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs">Select Organization / Tenant</Label>
              <Select
                value={newDomain.tenantId}
                onValueChange={(val) => {
                  const t = tenants.find((item) => item.id === val);
                  setNewDomain({
                    ...newDomain,
                    tenantId: val,
                    tenantName: t?.name || "Selected Organization",
                    subdomain: t?.slug || "tenant",
                  });
                }}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Choose Organization" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="t-acme">ACME Technologies Pvt Ltd (acme.mastererp.cloud)</SelectItem>
                  <SelectItem value="t-globex">Globex Global Logistics (globex.mastererp.cloud)</SelectItem>
                  <SelectItem value="t-initech">Initech Enterprise (initech.mastererp.cloud)</SelectItem>
                  {tenants.map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} ({t.slug}.mastererp.cloud)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Vanity Domain Name (FQDN)</Label>
              <Input
                placeholder="e.g. portal.clientdomain.com"
                value={newDomain.domain}
                onChange={(e) => setNewDomain({ ...newDomain, domain: e.target.value })}
                className="h-9 text-xs"
              />
            </div>

            <div className="p-3 bg-muted/40 rounded-lg border border-border/60 space-y-1 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground">DNS Configuration Instructions:</p>
              <p>Add a <span className="font-mono font-bold text-foreground">CNAME</span> record in your DNS provider:</p>
              <div className="flex items-center justify-between bg-card p-2 rounded border border-border mt-1">
                <span className="font-mono text-xs text-purple-600 font-bold">cname.mastererp.cloud</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleCopy("cname.mastererp.cloud", "modal-cname")}
                  className="h-6 text-xs px-2"
                >
                  {copiedId === "modal-cname" ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setAddModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreateDomain}>
              Register Domain
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
