import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Puzzle,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  PlusCircle,
  Trash2,
  ShieldAlert,
  Info,
  Building2,
  Sparkles,
  ExternalLink,
  Layers,
  Settings,
  Plug,
} from "lucide-react";

export interface ManageTenantAddonsDialogProps {
  tenant: {
    id: string;
    name: string;
    slug: string;
    plan?: string;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManageTenantAddonsDialog({
  tenant,
  open,
  onOpenChange,
}: ManageTenantAddonsDialogProps) {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"catalog" | "integrations">("catalog");
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<"all" | "assigned" | "unassigned">("all");

  // Assignment & Revocation Action States
  const [assignTargetSlug, setAssignTargetSlug] = useState<string | null>(null);
  const [assignReason, setAssignReason] = useState("Administrative grant by Super Admin");
  const [revokeTarget, setRevokeTarget] = useState<{ slug: string; name: string } | null>(null);
  const [revokeReason, setRevokeReason] = useState("Revoked by Super Admin");
  const [detailsAddon, setDetailsAddon] = useState<any | null>(null);

  // 1. Query Tenant Add-ons & Catalog
  const {
    data: tenantData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["super-tenant-addons", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return null;
      return await api.get<{
        tenant: {
          id: string;
          name: string;
          slug: string;
          plan: string;
          subscriptionPlan: string;
          status: string;
        };
        catalogAddons: Array<{
          id: string;
          slug: string;
          name: string;
          category: string;
          tagline: string | null;
          description: string | null;
          status: string;
          priceMonthly: number;
          icon: string | null;
          developer: string | null;
          version: string | null;
          features: string[];
          createdAt: string;
        }>;
        assignments: Array<{
          id: string;
          addonSlug: string;
          name: string;
          category: string;
          icon: string | null;
          status: string;
          plan: string;
          source: "MANUAL_ASSIGNMENT" | "PURCHASED" | "PLAN_INCLUDED";
          isManual: boolean;
          canRevoke: boolean;
          assignedBy: string | null;
          assignedAt: string;
          trialEndsAt: string | null;
          renewsAt: string | null;
          createdAt: string;
          updatedAt: string;
        }>;
      }>(`/super/tenants/${tenant.id}/addons`);
    },
    enabled: Boolean(open && tenant?.id),
    staleTime: 30 * 1000,
  });

  // 2. Query Integrations Readiness Status
  const {
    data: integrationsData,
    isLoading: isIntegrationsLoading,
    refetch: refetchIntegrations,
  } = useQuery({
    queryKey: ["super-tenant-integrations", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return null;
      return await api.get<{
        tenantId: string;
        integrations: Array<{
          slug: string;
          name: string;
          category: string;
          readinessStatus:
            | "IMPLEMENTED_UNCONFIGURED"
            | "IMPLEMENTED_AND_CONFIGURED"
            | "PARTIALLY_IMPLEMENTED"
            | "CATALOG_ONLY";
          isAssigned: boolean;
          isConfigured: boolean;
          statusMessage: string;
          configurationSummary: Record<string, any>;
        }>;
      }>(`/super/tenants/${tenant.id}/addons/integrations-status`);
    },
    enabled: Boolean(open && tenant?.id && activeTab === "integrations"),
    staleTime: 30 * 1000,
  });

  // 3. Assign Mutation
  const assignMutation = useMutation({
    mutationFn: async ({ slug, reason }: { slug: string; reason: string }) => {
      if (!tenant?.id) throw new Error("No tenant selected");
      return await api.post(`/super/tenants/${tenant.id}/addons/${slug}/assign`, {
        reason,
        plan: "manual_assignment",
      });
    },
    onSuccess: (data: any) => {
      toast.success(data?.message || "Add-on successfully assigned!");
      setAssignTargetSlug(null);
      setAssignReason("Administrative grant by Super Admin");
      qc.invalidateQueries({ queryKey: ["super-tenant-addons", tenant?.id] });
      qc.invalidateQueries({ queryKey: ["super-tenant-integrations", tenant?.id] });
      qc.invalidateQueries({ queryKey: ["commerce-catalog"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to assign add-on.");
    },
  });

  // 4. Revoke Mutation
  const revokeMutation = useMutation({
    mutationFn: async ({ slug, reason }: { slug: string; reason: string }) => {
      if (!tenant?.id) throw new Error("No tenant selected");
      return await api.post(`/super/tenants/${tenant.id}/addons/${slug}/revoke`, {
        reason,
      });
    },
    onSuccess: (data: any) => {
      toast.success(data?.message || "Add-on assignment revoked!");
      setRevokeTarget(null);
      setRevokeReason("Revoked by Super Admin");
      qc.invalidateQueries({ queryKey: ["super-tenant-addons", tenant?.id] });
      qc.invalidateQueries({ queryKey: ["super-tenant-integrations", tenant?.id] });
      qc.invalidateQueries({ queryKey: ["commerce-catalog"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to revoke add-on.");
    },
  });

  const catalogAddons = tenantData?.catalogAddons || [];
  const assignments = tenantData?.assignments || [];

  const assignmentMap = useMemo(() => {
    const map = new Map<string, (typeof assignments)[0]>();
    assignments.forEach((a) => {
      if (a.status === "active") {
        map.set(a.addonSlug, a);
      }
    });
    return map;
  }, [assignments]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    catalogAddons.forEach((a) => {
      if (a.category) set.add(a.category);
    });
    return ["All", ...Array.from(set).sort()];
  }, [catalogAddons]);

  const filteredCatalog = useMemo(() => {
    const q = search.trim().toLowerCase();
    return catalogAddons.filter((a) => {
      const isAssigned = assignmentMap.has(a.slug);
      if (selectedStatusFilter === "assigned" && !isAssigned) return false;
      if (selectedStatusFilter === "unassigned" && isAssigned) return false;
      if (selectedCategory !== "All" && a.category !== selectedCategory) return false;
      if (!q) return true;
      return (
        a.name.toLowerCase().includes(q) ||
        a.slug.toLowerCase().includes(q) ||
        (a.tagline || "").toLowerCase().includes(q) ||
        (a.category || "").toLowerCase().includes(q)
      );
    });
  }, [catalogAddons, assignmentMap, search, selectedCategory, selectedStatusFilter]);

  if (!tenant) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
          {/* Header */}
          <DialogHeader className="p-6 pb-4 border-b bg-muted/20">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <Puzzle className="size-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-bold flex items-center gap-2">
                      Manage Add-ons & Integrations
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                      Assign catalog add-ons, inspect operational readiness, and control workspace entitlements.
                    </DialogDescription>
                  </div>
                </div>
              </div>

              {/* Workspace Badge Info */}
              <div className="text-right shrink-0">
                <div className="text-xs font-semibold text-foreground flex items-center gap-1 justify-end">
                  <Building2 className="size-3.5 text-muted-foreground" />
                  {tenantData?.tenant.name || tenant.name}
                </div>
                <div className="flex items-center gap-1.5 mt-1 justify-end">
                  <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">
                    ID: {tenant.id.slice(0, 8)}...
                  </Badge>
                  <Badge className="text-[10px] bg-primary/15 text-primary border-primary/20 px-1.5 py-0 font-medium">
                    Plan: {tenantData?.tenant.subscriptionPlan || tenant.plan || "Standard"}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Top Navigation Tabs */}
            <div className="pt-3">
              <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as any)}
                className="w-full"
              >
                <TabsList className="grid w-full max-w-xs grid-cols-2 h-8 text-xs">
                  <TabsTrigger value="catalog" className="text-xs flex items-center gap-1.5">
                    <Layers className="size-3.5" />
                    Catalog Add-ons ({catalogAddons.length})
                  </TabsTrigger>
                  <TabsTrigger value="integrations" className="text-xs flex items-center gap-1.5">
                    <Plug className="size-3.5" />
                    Integrations Setup
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </DialogHeader>

          {/* Body Content */}
          <div className="flex-1 overflow-hidden flex flex-col p-6 pt-4">
            {activeTab === "catalog" ? (
              <div className="flex flex-col h-full gap-4">
                {/* Search & Filters */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                    <div className="relative w-full max-w-sm">
                      <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Search add-on name or slug..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-8 h-8 text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                    {/* Status Filter */}
                    <div className="flex rounded-md border p-0.5 bg-muted/30 text-xs shrink-0">
                      <button
                        type="button"
                        onClick={() => setSelectedStatusFilter("all")}
                        className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                          selectedStatusFilter === "all"
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedStatusFilter("assigned")}
                        className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                          selectedStatusFilter === "assigned"
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Assigned ({assignmentMap.size})
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedStatusFilter("unassigned")}
                        className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                          selectedStatusFilter === "unassigned"
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Available
                      </button>
                    </div>

                    {/* Category Filter */}
                    <div className="flex items-center gap-1 shrink-0 overflow-x-auto">
                      {categories.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setSelectedCategory(cat)}
                          className={`px-2 py-1 rounded text-[11px] font-medium transition-colors border ${
                            selectedCategory === cat
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background text-muted-foreground border-border hover:bg-muted"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => refetch()}
                      className="size-8 p-0 shrink-0"
                      title="Refresh add-ons"
                    >
                      <RefreshCw className="size-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Catalog List */}
                <div className="flex-1 overflow-hidden border rounded-lg bg-card">
                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-64 gap-2 text-muted-foreground">
                      <Loader2 className="size-6 animate-spin text-primary" />
                      <span className="text-xs">Loading workspace add-on catalog...</span>
                    </div>
                  ) : isError ? (
                    <div className="flex flex-col items-center justify-center h-64 gap-2 text-destructive">
                      <AlertCircle className="size-6" />
                      <span className="text-xs font-medium">
                        {(error as any)?.message || "Failed to load add-ons"}
                      </span>
                      <Button variant="outline" size="sm" onClick={() => refetch()} className="text-xs mt-2">
                        Try Again
                      </Button>
                    </div>
                  ) : filteredCatalog.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 gap-1 text-muted-foreground">
                      <Puzzle className="size-8 stroke-1 text-muted-foreground/60 mb-1" />
                      <p className="text-sm font-medium text-foreground">No add-ons match your criteria</p>
                      <p className="text-xs text-muted-foreground">Try clearing search or filters</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[420px] p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {filteredCatalog.map((addon) => {
                          const activeAssignment = assignmentMap.get(addon.slug);
                          const isAssigned = Boolean(activeAssignment);
                          const isArchived = addon.status === "archived";
                          const isDraft = addon.status === "draft";

                          return (
                            <div
                              key={addon.id}
                              className={`p-3.5 rounded-lg border transition-all flex flex-col justify-between ${
                                isAssigned
                                  ? "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800"
                                  : isArchived
                                  ? "bg-muted/40 border-muted opacity-60"
                                  : "bg-background border-border hover:border-primary/40 shadow-sm"
                              }`}
                            >
                              <div>
                                <div className="flex items-start justify-between gap-2 mb-1.5">
                                  <div className="flex items-center gap-2">
                                    <div className="size-8 rounded-md bg-muted flex items-center justify-center font-bold text-xs text-primary shrink-0 border">
                                      {addon.icon && addon.icon.startsWith("/") ? (
                                        <img
                                          src={addon.icon}
                                          alt=""
                                          className="size-5 object-contain"
                                          onError={(e) => {
                                            (e.currentTarget as HTMLElement).style.display = "none";
                                          }}
                                        />
                                      ) : (
                                        <Puzzle className="size-4" />
                                      )}
                                    </div>
                                    <div>
                                      <h4 className="text-xs font-bold text-foreground leading-tight line-clamp-1">
                                        {addon.name}
                                      </h4>
                                      <span className="text-[10px] font-mono text-muted-foreground block">
                                        {addon.slug}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Status Badges */}
                                  <div className="flex items-center gap-1 shrink-0">
                                    {isAssigned ? (
                                      <Badge
                                        variant="default"
                                        className="text-[10px] px-1.5 py-0 bg-emerald-600 hover:bg-emerald-600 flex items-center gap-1 font-medium"
                                      >
                                        <CheckCircle2 className="size-2.5" />
                                        {activeAssignment?.source === "MANUAL_ASSIGNMENT"
                                          ? "Manual Grant"
                                          : activeAssignment?.source === "PURCHASED"
                                          ? "Purchased"
                                          : "Plan Included"}
                                      </Badge>
                                    ) : isArchived ? (
                                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                        Archived
                                      </Badge>
                                    ) : isDraft ? (
                                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-amber-600 border-amber-300">
                                        Unpublished
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                                        Available
                                      </Badge>
                                    )}
                                  </div>
                                </div>

                                <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1">
                                  {addon.tagline || addon.description || "No description provided."}
                                </p>

                                <div className="flex items-center gap-2 mt-2 pt-2 border-t text-[10px] text-muted-foreground">
                                  <span className="font-medium bg-muted px-1.5 py-0.5 rounded">
                                    {addon.category}
                                  </span>
                                  {addon.version && <span>v{addon.version}</span>}
                                  {activeAssignment?.assignedAt && (
                                    <span className="ml-auto text-[10px]">
                                      Assigned: {new Date(activeAssignment.assignedAt).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Card Actions */}
                              <div className="flex items-center justify-between gap-2 mt-3 pt-2">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDetailsAddon(addon)}
                                  className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                                >
                                  <Info className="size-3 mr-1" />
                                  Details
                                </Button>

                                <div className="flex items-center gap-1.5">
                                  {isAssigned ? (
                                    <Button
                                      type="button"
                                      variant="destructive"
                                      size="sm"
                                      disabled={!activeAssignment?.canRevoke || revokeMutation.isPending}
                                      onClick={() =>
                                        setRevokeTarget({
                                          slug: addon.slug,
                                          name: addon.name,
                                        })
                                      }
                                      className="h-7 px-2.5 text-[11px] font-medium"
                                      title={
                                        activeAssignment?.canRevoke
                                          ? "Revoke administrative assignment"
                                          : "Purchased or plan-included entitlements cannot be manually revoked"
                                      }
                                    >
                                      <Trash2 className="size-3 mr-1" />
                                      Revoke
                                    </Button>
                                  ) : (
                                    <Button
                                      type="button"
                                      variant="default"
                                      size="sm"
                                      disabled={isArchived || assignMutation.isPending}
                                      onClick={() => setAssignTargetSlug(addon.slug)}
                                      className="h-7 px-2.5 text-[11px] font-medium bg-primary"
                                    >
                                      <PlusCircle className="size-3 mr-1" />
                                      Assign to Workspace
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              </div>
            ) : (
              /* Integrations Setup Tab */
              <div className="flex flex-col h-full gap-3 overflow-hidden">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-foreground">
                      Operational Integration Readiness & Tenant Configuration
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      Inspection status of the 6 core integrations for {tenantData?.tenant.name || tenant.name}. Secrets remain server-side only.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetchIntegrations()}
                    className="h-7 text-xs flex items-center gap-1.5"
                  >
                    <RefreshCw className="size-3" />
                    Re-check Status
                  </Button>
                </div>

                <div className="flex-1 overflow-hidden border rounded-lg bg-card">
                  {isIntegrationsLoading ? (
                    <div className="flex flex-col items-center justify-center h-64 gap-2 text-muted-foreground">
                      <Loader2 className="size-6 animate-spin text-primary" />
                      <span className="text-xs">Inspecting integration readiness...</span>
                    </div>
                  ) : (
                    <ScrollArea className="h-[430px] p-4">
                      <div className="space-y-3">
                        {integrationsData?.integrations.map((integ) => {
                          const isAssigned = integ.isAssigned;
                          const isConfigured = integ.isConfigured;

                          return (
                            <div
                              key={integ.slug}
                              className="p-4 rounded-lg border bg-background flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                            >
                              <div className="space-y-1.5 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="text-xs font-bold text-foreground">
                                    {integ.name}
                                  </h4>
                                  <span className="text-[10px] font-mono text-muted-foreground">
                                    ({integ.slug})
                                  </span>

                                  {/* Readiness Badge */}
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] px-1.5 py-0 font-medium ${
                                      integ.readinessStatus === "IMPLEMENTED_AND_CONFIGURED"
                                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-300"
                                        : integ.readinessStatus === "PARTIALLY_IMPLEMENTED"
                                        ? "bg-blue-500/10 text-blue-600 border-blue-300"
                                        : "bg-amber-500/10 text-amber-600 border-amber-300"
                                    }`}
                                  >
                                    {integ.readinessStatus}
                                  </Badge>

                                  {/* Assigned Badge */}
                                  <Badge
                                    variant="secondary"
                                    className={`text-[10px] px-1.5 py-0 ${
                                      isAssigned
                                        ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200"
                                        : "text-muted-foreground"
                                    }`}
                                  >
                                    {isAssigned ? "Assigned to Tenant" : "Unassigned"}
                                  </Badge>
                                </div>

                                <p className="text-[11px] text-muted-foreground">
                                  {integ.statusMessage}
                                </p>

                                {/* Safe Metadata Summary */}
                                <div className="flex items-center gap-3 text-[10px] text-muted-foreground pt-1">
                                  <span className="font-mono bg-muted/60 px-1.5 py-0.5 rounded">
                                    Credentials: {isConfigured ? "Present (Encrypted)" : "Not Configured"}
                                  </span>
                                  {integ.configurationSummary && (
                                    <span>
                                      {Object.entries(integ.configurationSummary)
                                        .map(([k, v]) => `${k}: ${v}`)
                                        .join(" • ")}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Direct Assignment Action */}
                              <div className="shrink-0 flex items-center gap-2">
                                {isAssigned ? (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={revokeMutation.isPending}
                                    onClick={() =>
                                      setRevokeTarget({
                                        slug: integ.slug,
                                        name: integ.name,
                                      })
                                    }
                                    className="h-7 text-xs text-destructive hover:bg-destructive/10"
                                  >
                                    Revoke Assignment
                                  </Button>
                                ) : (
                                  <Button
                                    type="button"
                                    variant="default"
                                    size="sm"
                                    disabled={assignMutation.isPending}
                                    onClick={() => setAssignTargetSlug(integ.slug)}
                                    className="h-7 text-xs bg-primary"
                                  >
                                    <PlusCircle className="size-3 mr-1" />
                                    Assign Integration
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <DialogFooter className="p-4 border-t bg-muted/10 flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">
              All administrative assignment and revocation actions are written to persistent audit logs.
            </span>
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="text-xs">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Assign Confirmation Modal ── */}
      <Dialog
        open={Boolean(assignTargetSlug)}
        onOpenChange={(op) => !op && setAssignTargetSlug(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              Confirm Add-on Assignment
            </DialogTitle>
            <DialogDescription className="text-xs">
              Assign <strong>{assignTargetSlug}</strong> to workspace{" "}
              <strong>{tenant.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="p-3 bg-muted/40 rounded border space-y-1">
              <span className="font-semibold text-foreground">Assignment Details:</span>
              <p className="text-muted-foreground text-[11px]">
                This will grant active entitlement to the workspace immediately. The tenant
                will see the add-on active on their marketplace.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Administrative Reason (Audit Log):</Label>
              <Input
                value={assignReason}
                onChange={(e) => setAssignReason(e.target.value)}
                placeholder="Reason for granting add-on..."
                className="text-xs h-8"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAssignTargetSlug(null)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={assignMutation.isPending}
              onClick={() => {
                if (assignTargetSlug) {
                  assignMutation.mutate({
                    slug: assignTargetSlug,
                    reason: assignReason,
                  });
                }
              }}
              className="text-xs bg-primary"
            >
              {assignMutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin mr-1.5" />
              ) : (
                <CheckCircle2 className="size-3.5 mr-1.5" />
              )}
              Confirm Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Revoke Confirmation Modal ── */}
      <Dialog
        open={Boolean(revokeTarget)}
        onOpenChange={(op) => !op && setRevokeTarget(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-destructive">
              <ShieldAlert className="size-4" />
              Confirm Add-on Revocation
            </DialogTitle>
            <DialogDescription className="text-xs">
              Are you sure you want to revoke <strong>{revokeTarget?.name}</strong> from{" "}
              <strong>{tenant.name}</strong>?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded text-destructive text-[11px] space-y-1">
              <p className="font-bold flex items-center gap-1">
                <AlertCircle className="size-3.5" />
                Revocation Impact Notice
              </p>
              <p>
                The workspace will immediately lose access to this add-on's features and
                protected APIs. Existing commercial order history and data records will be
                preserved.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Reason for Revocation (Audit Log):</Label>
              <Input
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                placeholder="Reason for revoking..."
                className="text-xs h-8"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRevokeTarget(null)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={revokeMutation.isPending}
              onClick={() => {
                if (revokeTarget) {
                  revokeMutation.mutate({
                    slug: revokeTarget.slug,
                    reason: revokeReason,
                  });
                }
              }}
              className="text-xs"
            >
              {revokeMutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin mr-1.5" />
              ) : (
                <Trash2 className="size-3.5 mr-1.5" />
              )}
              Revoke Add-on
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add-on Details Modal ── */}
      <Dialog
        open={Boolean(detailsAddon)}
        onOpenChange={(op) => !op && setDetailsAddon(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Info className="size-4 text-primary" />
              {detailsAddon?.name}
            </DialogTitle>
            <DialogDescription className="text-xs font-mono">
              Slug: {detailsAddon?.slug} • Category: {detailsAddon?.category}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            {detailsAddon?.tagline && (
              <div>
                <span className="font-semibold text-foreground">Tagline:</span>
                <p className="text-muted-foreground mt-0.5">{detailsAddon.tagline}</p>
              </div>
            )}

            <div>
              <span className="font-semibold text-foreground">Description:</span>
              <p className="text-muted-foreground mt-0.5 whitespace-pre-line">
                {detailsAddon?.description || "No full description provided."}
              </p>
            </div>

            {Array.isArray(detailsAddon?.features) && detailsAddon.features.length > 0 && (
              <div>
                <span className="font-semibold text-foreground">Included Features:</span>
                <ul className="list-disc list-inside space-y-0.5 text-muted-foreground mt-1">
                  {detailsAddon.features.map((f: string, i: number) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-2 border-t text-[11px] text-muted-foreground">
              <div>
                <span className="font-semibold text-foreground block">Developer:</span>
                {detailsAddon?.developer || "Master HRMS"}
              </div>
              <div>
                <span className="font-semibold text-foreground block">Version:</span>
                v{detailsAddon?.version || "1.0.0"}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDetailsAddon(null)}
              className="text-xs w-full"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
