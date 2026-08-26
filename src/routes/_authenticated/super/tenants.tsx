import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, setToken } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import {
  Building2,
  Users,
  Search,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Loader2,
  CheckCircle2,
  Globe,
  Calendar,
  ExternalLink,
  Layers,
  LogIn,
  ShieldCheck,
  Zap,
  ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/super/tenants")({
  component: TenantsAdminStudio,
});

type TenantRow = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  created_at: string;
  employee_count?: number;
};

function TenantsAdminStudio() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [loggingInTenantId, setLoggingInTenantId] = useState<string | null>(null);
  const [editingTenant, setEditingTenant] = useState<{
    id?: string;
    name: string;
    slug: string;
    logo_url: string;
  } | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const {
    data: tenants = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["super-tenants"],
    queryFn: async () => {
      try {
        const data = await api.get("/super/tenants");
        if (!Array.isArray(data)) return [];
        return data.map((t: any) => ({
          id: t.id,
          name: t.name,
          slug: t.slug,
          logo_url: t.logoUrl || t.logo_url || null,
          created_at: t.createdAt || t.created_at,
          employee_count: t._count?.employees || 0,
        })) as TenantRow[];
      } catch {
        return [];
      }
    },
  });

  const filteredTenants = useMemo(() => {
    if (!tenants) return [];
    return tenants.filter(
      (t) =>
        !searchQuery ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.slug.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [tenants, searchQuery]);

  // One-Click Direct Impersonation Login Mutation (No Password Needed)
  const loginAsTenantAdmin = useMutation({
    mutationFn: async (tenant: TenantRow) => {
      setLoggingInTenantId(tenant.id);
      const res = await api.post(`/super/impersonate/${tenant.id}`);
      if (res.token) {
        setToken(res.token);
        qc.invalidateQueries({ queryKey: ["current-session-user"] });
        qc.invalidateQueries({ queryKey: ["current-profile"] });
        qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
        return { res, tenant };
      }
      throw new Error("Failed to receive authentication token");
    },
    onSuccess: ({ tenant }) => {
      toast.success(`⚡ Authenticated! Entering "${tenant.name}" organization as Administrator...`);
      navigate({ to: "/dashboard" });
    },
    onError: (e: Error) => {
      toast.error(e.message || "Failed to switch into tenant organization");
      setLoggingInTenantId(null);
    },
  });

  const upsertTenant = useMutation({
    mutationFn: async (t: { id?: string; name: string; slug: string; logo_url?: string }) => {
      if (!t.name || !t.slug) throw new Error("Name and slug are required");

      if (t.id) {
        await api.put(`/super/tenants/${t.id}`, { name: t.name, slug: t.slug, logoUrl: t.logo_url || null });
      } else {
        await api.post("/super/tenants", { name: t.name, slug: t.slug, logoUrl: t.logo_url || null });
      }
    },
    onSuccess: () => {
      toast.success("Tenant workspace saved");
      qc.invalidateQueries({ queryKey: ["super-tenants"] });
      setIsDialogOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteTenant = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/super/tenants/${id}`);
    },
    onSuccess: () => {
      toast.success("Tenant deleted");
      qc.invalidateQueries({ queryKey: ["super-tenants"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openNew() {
    setEditingTenant({ name: "", slug: "", logo_url: "" });
    setIsDialogOpen(true);
  }

  function openEdit(t: TenantRow) {
    setEditingTenant({ id: t.id, name: t.name, slug: t.slug, logo_url: t.logo_url ?? "" });
    setIsDialogOpen(true);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Tenants & Workspaces</h1>
            <Badge variant="secondary" className="gap-1 text-xs">
              <Building2 className="size-3 text-primary" /> Multi-Tenant Architecture
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Provision company organizations and directly enter any tenant admin portal with 1-click passwordless impersonation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="size-4" /> Refresh
          </Button>
          <Button size="sm" onClick={openNew} className="gap-2 bg-primary text-primary-foreground font-semibold shadow-xs">
            <Plus className="size-4" /> Provision New Workspace
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Card className="p-5 shadow-xs border bg-card">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                Total Workspaces
              </div>
              <div className="text-3xl font-extrabold mt-1">{tenants?.length ?? 0}</div>
            </div>
            <div className="size-12 rounded-xl bg-primary/10 grid place-items-center">
              <Building2 className="size-6 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="p-5 shadow-xs border bg-card">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                Managed Employees
              </div>
              <div className="text-3xl font-extrabold mt-1">
                {tenants?.reduce((acc, t) => acc + (t.employee_count ?? 0), 0) ?? 0}
              </div>
            </div>
            <div className="size-12 rounded-xl bg-emerald-500/10 grid place-items-center">
              <Users className="size-6 text-emerald-600" />
            </div>
          </div>
        </Card>

        <Card className="p-5 shadow-xs border bg-card">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                Direct Impersonation
              </div>
              <div className="text-xl font-bold mt-1 text-emerald-600 flex items-center gap-1.5">
                <ShieldCheck className="size-5" /> 1-Click Access Active
              </div>
            </div>
            <div className="size-12 rounded-xl bg-blue-500/10 grid place-items-center">
              <Zap className="size-6 text-blue-500" />
            </div>
          </div>
        </Card>
      </div>

      {/* Search Bar */}
      <Card className="p-4 shadow-xs border">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search tenant by company name or slug..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
      </Card>

      {/* Tenants Cards Grid */}
      {isLoading ? (
        <div className="py-20 grid place-items-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : filteredTenants.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          No tenant workspaces found matching "{searchQuery}".
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredTenants.map((t) => {
            const isLoggingIn = loginAsTenantAdmin.isPending && loggingInTenantId === t.id;

            return (
              <Card
                key={t.id}
                className="hover:border-primary/50 transition-all shadow-md border flex flex-col justify-between overflow-hidden group bg-card"
              >
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="size-12 rounded-xl border bg-primary/10 text-primary font-black grid place-items-center text-lg overflow-hidden shrink-0 shadow-inner">
                      {t.logo_url ? (
                        <img src={t.logo_url} alt={t.name} className="w-full h-full object-cover" />
                      ) : (
                        t.name[0]?.toUpperCase()
                      )}
                    </div>

                    <Badge variant="outline" className="font-mono text-[10px] bg-secondary/50">
                      ID: {t.id.slice(0, 8)}...
                    </Badge>
                  </div>

                  <div>
                    <h3 className="font-bold text-base line-clamp-1 group-hover:text-primary transition-colors">
                      {t.name}
                    </h3>
                    <div className="text-xs text-muted-foreground font-mono mt-0.5 flex items-center gap-1.5">
                      <span className="inline-block size-1.5 rounded-full bg-emerald-500" />
                      <span>slug: {t.slug}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-3">
                    <span className="flex items-center gap-1 font-medium">
                      <Users className="size-3.5 text-primary" /> {t.employee_count} Employees
                    </span>
                    <span className="flex items-center gap-1 font-mono text-[11px]">
                      <Calendar className="size-3" /> {new Date(t.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  {/* PROMINENT DIRECT ADMIN LOGIN BUTTON (NO PASSWORD NEEDED) */}
                  <Button
                    onClick={() => loginAsTenantAdmin.mutate(t)}
                    disabled={isLoggingIn}
                    className="w-full bg-gradient-to-r from-purple-600 via-indigo-600 to-primary hover:from-purple-700 hover:to-primary/90 text-white font-bold text-xs h-9 shadow-md shadow-indigo-500/20 gap-2 transition-all"
                  >
                    {isLoggingIn ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" />
                        <span>Entering Workspace...</span>
                      </>
                    ) : (
                      <>
                        <LogIn className="size-3.5" />
                        <span>Enter Workspace as Admin (No Password)</span>
                      </>
                    )}
                  </Button>
                </CardContent>

                <div className="px-5 py-2.5 border-t flex items-center justify-between gap-2 bg-secondary/20 rounded-b-xl text-xs">
                  <span className="text-[11px] text-muted-foreground font-mono truncate">
                    /{t.slug}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEdit(t)}
                      className="h-7 px-2 text-xs gap-1"
                    >
                      <Pencil className="size-3" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (confirm(`Delete tenant workspace "${t.name}"?`)) deleteTenant.mutate(t.id);
                      }}
                      className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* CREATE & EDIT TENANT MODAL */}
      {editingTenant && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="size-5 text-primary" />
                {editingTenant.id
                  ? `Edit Tenant — ${editingTenant.name}`
                  : "Provision New Workspace"}
              </DialogTitle>
              <DialogDescription>
                Set company organization name and tenant domain slug.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Company / Organization Name *</Label>
                <Input
                  value={editingTenant.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    const autoSlug = name
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, "-")
                      .replace(/^-|-$/g, "");
                    setEditingTenant({
                      ...editingTenant,
                      name,
                      slug: editingTenant.slug || autoSlug,
                    });
                  }}
                  placeholder="e.g. Acme Corp"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tenant Domain Slug *</Label>
                <Input
                  value={editingTenant.slug}
                  onChange={(e) => setEditingTenant({ ...editingTenant, slug: e.target.value })}
                  placeholder="e.g. acme-corp"
                  className="font-mono text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Company Logo Image URL</Label>
                <Input
                  value={editingTenant.logo_url}
                  onChange={(e) => setEditingTenant({ ...editingTenant, logo_url: e.target.value })}
                  placeholder="https://.../logo.png"
                  className="font-mono text-xs"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => upsertTenant.mutate(editingTenant)}
                disabled={upsertTenant.isPending}
                className="gap-2"
              >
                {upsertTenant.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="size-4" />
                )}
                Save Workspace
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
