'use client';

import { useState, useMemo } from "react";
import { Link } from "@/src/lib/router-compat";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  ShieldCheck,
  Users,
  Search,
  CheckCircle2,
  RefreshCw,
  Plus,
  Loader2,
  Shield,
  Pencil,
  Trash2,
  Sliders,
  ArrowUpRight,
  Lock,
  Grid3x3,
  Check,
  Minus,
} from "lucide-react";

export type PermissionCategory =
  | "HR Core"
  | "Business Modules"
  | "CMS & Web"
  | "Marketplace"
  | "Tenants"
  | "Security & Admin"
  | "Developer";

export type FeaturePermission = {
  id: string;
  name: string;
  category: PermissionCategory;
  description: string;
};

/**
 * Single canonical source of truth for all platform & workspace RBAC permissions.
 * Both AVAILABLE_FEATURES and SYSTEM_PERMISSIONS derive directly from this registry.
 */
const PLATFORM_PERMISSIONS: readonly FeaturePermission[] = [
  // HR Core
  {
    id: "hr:employees",
    name: "Employees & Directory",
    category: "HR Core",
    description: "Manage employee profiles, org charts, and master directory",
  },
  {
    id: "hr:payroll",
    name: "Payroll & Salaries",
    category: "HR Core",
    description: "Run pay runs, statutory filings, and payslips",
  },
  {
    id: "hr:attendance",
    name: "Attendance & Shifts",
    category: "HR Core",
    description: "Manage attendance logs, shift rosters, and time tracking",
  },
  {
    id: "hr:leave",
    name: "Leave Requests",
    category: "HR Core",
    description: "Submit, review, and approve employee leave requests",
  },

  // Business Modules
  {
    id: "pos:checkout",
    name: "POS Checkout",
    category: "Business Modules",
    description: "Operate point-of-sale checkout terminals and transactions",
  },
  {
    id: "pos:reports",
    name: "POS Financial Reports",
    category: "Business Modules",
    description: "View point-of-sale revenue summaries and ledger exports",
  },
  {
    id: "crm:leads",
    name: "CRM Pipeline & Deals",
    category: "Business Modules",
    description: "Manage sales pipelines, leads, and deal stages",
  },
  {
    id: "invoices:manage",
    name: "Invoices & Billing",
    category: "Business Modules",
    description: "Generate, send, and reconcile customer invoices",
  },

  // CMS & Web
  {
    id: "cms:read",
    name: "View CMS Pages",
    category: "CMS & Web",
    description: "View public marketing, blog, and legal pages",
  },
  {
    id: "cms:write",
    name: "Edit CMS Pages & Hero",
    category: "CMS & Web",
    description: "Modify page content, hero sections, and SEO metadata",
  },
  {
    id: "cms:publish",
    name: "Publish / Unpublish Pages",
    category: "CMS & Web",
    description: "Toggle live publishing status of website pages",
  },

  // Marketplace
  {
    id: "marketplace:read",
    name: "Browse Addons Marketplace",
    category: "Marketplace",
    description: "View extensions and installed workspace addons",
  },
  {
    id: "marketplace:manage",
    name: "Manage Addon Extensions",
    category: "Marketplace",
    description: "Create, edit, price, and archive marketplace addons",
  },
  {
    id: "marketplace:upload_png",
    name: "Upload PNG Media Icons",
    category: "Marketplace",
    description: "Upload custom PNG icons and extension screenshots",
  },

  // Tenants
  {
    id: "tenants:read",
    name: "View Workspaces & Tenants",
    category: "Tenants",
    description: "List company workspaces and seat utilization quotas",
  },
  {
    id: "tenants:manage",
    name: "Provision & Manage Tenants",
    category: "Tenants",
    description: "Create, configure domain slugs, and govern tenant accounts",
  },
  {
    id: "super:tenants",
    name: "Multi-Tenant Workspaces",
    category: "Tenants",
    description: "Full platform-level tenant lifecycle orchestration",
  },

  // Security & Admin
  {
    id: "roles:read",
    name: "View System User Roles",
    category: "Security & Admin",
    description: "Inspect role definitions and assigned permission matrices",
  },
  {
    id: "roles:manage",
    name: "Manage Roles & Permissions",
    category: "Security & Admin",
    description: "Create custom roles and modify blueprint permissions",
  },
  {
    id: "super:plans",
    name: "Monetization & Plans",
    category: "Security & Admin",
    description: "Manage subscription tiers, coupons, and pricing",
  },
  {
    id: "super:settings",
    name: "System Config & SMTP",
    category: "Security & Admin",
    description: "Configure platform settings, mail transport, and branding",
  },
  {
    id: "super:roles",
    name: "Roles & RBAC Matrix",
    category: "Security & Admin",
    description: "Govern root security role definitions across the platform",
  },

  // Developer
  {
    id: "dev:og_preview",
    name: "Open Graph Data Tools",
    category: "Developer",
    description: "Use OG metadata fetcher and social preview studio",
  },
  {
    id: "dev:api_docs",
    name: "API Documentation Access",
    category: "Developer",
    description: "Access developer REST API reference and webhook tools",
  },
] as const;

const AVAILABLE_FEATURES: FeaturePermission[] = [...PLATFORM_PERMISSIONS];

const SYSTEM_PERMISSIONS = PLATFORM_PERMISSIONS.map((p) => ({
  id: p.id,
  label: p.name,
  module: p.category,
}));

const PERMISSION_MAP = new Map<string, FeaturePermission>(
  PLATFORM_PERMISSIONS.map((p) => [p.id, p]),
);

const PERMISSION_CATEGORIES: PermissionCategory[] = Array.from(
  new Set(PLATFORM_PERMISSIONS.map((p) => p.category)),
);

export type RoleDefinition = {
  key: string;
  label: string;
  description: string;
  color: string;
  isSystem?: boolean;
  permissions: string[];
};

const SYSTEM_ROLE_KEYS = ["super_admin", "hr_admin", "manager", "employee"] as const;

const DEFAULT_ROLES: RoleDefinition[] = [
  {
    key: "super_admin",
    label: "Super Admin",
    description: "Ultimate platform administrator. Full access to all tenants, modules, and configurations.",
    color: "bg-red-600 text-white",
    isSystem: true,
    permissions: SYSTEM_PERMISSIONS.map((p) => p.id),
  },
  {
    key: "hr_admin",
    label: "HR Admin",
    description: "Manages company employees, payroll, attendance rosters, and leave approvals.",
    color: "bg-blue-600 text-white",
    isSystem: true,
    permissions: ["hr:employees", "hr:payroll", "hr:attendance", "hr:leave"],
  },
  {
    key: "manager",
    label: "Workspace Manager",
    description: "Manages team members, attendance approvals, and shift rosters.",
    color: "bg-purple-600 text-white",
    isSystem: true,
    permissions: ["hr:employees", "hr:attendance", "hr:leave"],
  },
  {
    key: "employee",
    label: "Employee",
    description: "Standard self-service employee portal access.",
    color: "bg-secondary text-foreground",
    isSystem: true,
    permissions: ["hr:attendance", "hr:leave"],
  },
];

function RolesAdminStudio() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"roles_crud" | "permission_matrix">("roles_crud");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Role Dialog & Delete Confirmation States
  const [editingRole, setEditingRole] = useState<RoleDefinition | null>(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<RoleDefinition | null>(null);

  // Fetch stored role definitions from CMS config
  const {
    data: storedRoleDefs,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["custom-role-definitions"],
    queryFn: async () => {
      try {
        const res = await api.get("/cms/pages/system-role-definitions");
        const page = res?.data || res || {};
        if (page?.content && Array.isArray((page.content as any).roles)) {
          return (page.content as any).roles as RoleDefinition[];
        }
        return DEFAULT_ROLES;
      } catch {
        return DEFAULT_ROLES;
      }
    },
  });

  const rolesList = storedRoleDefs ?? DEFAULT_ROLES;

  // Mutation to persist role definitions
  const saveRoleDefsMutation = useMutation({
    mutationFn: async (updatedRoles: RoleDefinition[]) => {
      await api.put("/cms/pages/system-role-definitions", {
        title: "System Role Definitions",
        meta_description: "Role permissions matrix configuration",
        content: { roles: updatedRoles },
        published: true,
      });
    },
    onSuccess: () => {
      toast.success("Role definitions saved to system");
      setRoleToDelete(null);
      qc.invalidateQueries({ queryKey: ["custom-role-definitions"] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed to save role definitions"),
  });

  const filteredRoles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rolesList;
    return rolesList.filter(
      (r) =>
        r.label.toLowerCase().includes(q) ||
        r.key.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q),
    );
  }, [rolesList, searchQuery]);

  const filteredPermissions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return AVAILABLE_FEATURES.filter((feat) => {
      const matchesCat = categoryFilter === "all" || feat.category === categoryFilter;
      const matchesQ =
        !q ||
        feat.id.toLowerCase().includes(q) ||
        feat.name.toLowerCase().includes(q) ||
        feat.description.toLowerCase().includes(q);
      return matchesCat && matchesQ;
    });
  }, [categoryFilter, searchQuery]);

  const systemRoleCount = useMemo(
    () => rolesList.filter((r) => r.isSystem || (SYSTEM_ROLE_KEYS as readonly string[]).includes(r.key)).length,
    [rolesList],
  );
  const customRoleCount = rolesList.length - systemRoleCount;

  function openCreateRole() {
    setEditingRole({
      key: "",
      label: "",
      description: "",
      color: "bg-indigo-600 text-white",
      isSystem: false,
      permissions: ["cms:read", "marketplace:read"],
    });
    setIsRoleModalOpen(true);
  }

  function openEditRole(role: RoleDefinition) {
    setEditingRole({ ...role, permissions: [...role.permissions] });
    setIsRoleModalOpen(true);
  }

  function saveRole(updatedRole: RoleDefinition) {
    if (!updatedRole.key.trim() || !updatedRole.label.trim()) {
      toast.error("Role key and label are required");
      return;
    }

    const key = updatedRole.key.toLowerCase().replace(/[^a-z0-9_]+/g, "_");
    const existingIndex = rolesList.findIndex((r) => r.key === key);

    let updatedList: RoleDefinition[];
    if (existingIndex >= 0) {
      updatedList = rolesList.map((r, i) => (i === existingIndex ? { ...updatedRole, key } : r));
    } else {
      updatedList = [...rolesList, { ...updatedRole, key }];
    }

    saveRoleDefsMutation.mutate(updatedList);
    setIsRoleModalOpen(false);
  }

  function confirmDeleteRole(role: RoleDefinition) {
    if ((SYSTEM_ROLE_KEYS as readonly string[]).includes(role.key) || role.isSystem) {
      toast.error("Cannot delete core system role");
      return;
    }
    const updatedList = rolesList.filter((r) => r.key !== role.key);
    saveRoleDefsMutation.mutate(updatedList);
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Roles & RBAC Matrix"
        description="Configure system-level administrator role blueprints and synchronize enterprise feature permission matrices."
        icon={ShieldCheck}
        badge={
          <Badge variant="purple" className="gap-1 text-xs">
            <ShieldCheck className="size-3" /> Root Security Engine
          </Badge>
        }
        breadcrumbs={[
          { label: "Super Admin", href: "/super" },
          { label: "Core Orchestration" },
          { label: "Roles & RBAC Matrix" },
        ]}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading} className="gap-1.5 text-xs h-8">
              <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Link to="/super/users">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
                <Users className="size-3.5 text-primary" />
                Manage Platform Users
                <ArrowUpRight className="size-3.5" />
              </Button>
            </Link>
            <Button size="sm" onClick={openCreateRole} className="gap-1.5 text-xs h-8">
              <Plus className="size-3.5" /> Create Role Blueprint
            </Button>
          </>
        }
      />

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Role Blueprints"
          value={rolesList.length}
          description="Active system & custom templates"
          icon={Shield}
          variant="primary"
          isLoading={isLoading}
        />
        <StatCard
          title="System Preset Roles"
          value={systemRoleCount}
          description="Protected core RBAC tiers"
          icon={Lock}
          variant="purple"
          isLoading={isLoading}
        />
        <StatCard
          title="Custom Roles"
          value={customRoleCount}
          description="Platform-defined custom blueprints"
          icon={Sliders}
          variant="info"
          isLoading={isLoading}
        />
        <StatCard
          title="Permission Keys"
          value={AVAILABLE_FEATURES.length}
          description={`Across ${PERMISSION_CATEGORIES.length} capability modules`}
          icon={Grid3x3}
          variant="success"
        />
      </div>

      {/* Multi-Tenant SaaS Boundary & User Directory Link Notice */}
      <Card className="p-4 border border-purple-500/25 bg-purple-500/5 rounded-xl shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="size-9 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck className="size-5" />
            </div>
            <div className="space-y-1 text-xs">
              <div className="font-bold text-foreground flex items-center gap-2 flex-wrap">
                <span>Role Governance &amp; User Account Separation</span>
                <Badge variant="purple" className="text-[10px] font-mono">
                  Global RBAC Standard
                </Badge>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                This console manages platform role blueprints and permission keys. To provision accounts, assign roles to individual users, inspect login history, or reset 2FA locks, use the dedicated <strong className="text-foreground">Platform Users</strong> directory.
              </p>
            </div>
          </div>

          <Link to="/super/users" className="shrink-0">
            <Button size="sm" variant="secondary" className="gap-1.5 text-xs h-8">
              <Users className="size-3.5" />
              Open Platform Users
              <ArrowUpRight className="size-3.5" />
            </Button>
          </Link>
        </div>
      </Card>

      {/* Main Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "roles_crud" | "permission_matrix")} className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <TabsList className="flex flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="roles_crud" className="gap-2 text-xs">
              <Shield className="size-3.5" /> Role Blueprints ({rolesList.length})
            </TabsTrigger>
            <TabsTrigger value="permission_matrix" className="gap-2 text-xs">
              <Grid3x3 className="size-3.5" /> Permission Matrix ({AVAILABLE_FEATURES.length})
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                placeholder={activeTab === "roles_crud" ? "Search roles..." : "Search permission keys..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs bg-background"
              />
            </div>

            {activeTab === "permission_matrix" && (
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-8 w-[170px] text-xs bg-background">
                  <SelectValue placeholder="All Modules" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modules</SelectItem>
                  {PERMISSION_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* TAB 1: ROLE DEFINITIONS & FEATURE PERMISSIONS CRUD */}
        <TabsContent value="roles_crud" className="space-y-4 pt-4">
          {isLoading ? (
            <div className="py-16 grid place-items-center border border-border/80 rounded-xl bg-card">
              <Loader2 className="size-8 animate-spin text-primary" />
            </div>
          ) : filteredRoles.length === 0 ? (
            <Card className="p-12 text-center border border-border/80 rounded-xl space-y-2">
              <Shield className="size-10 mx-auto text-muted-foreground/40" />
              <p className="text-sm font-semibold text-foreground">No matching role blueprints</p>
              <p className="text-xs text-muted-foreground">Try clearing your search query or create a new role blueprint.</p>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredRoles.map((role) => {
                const isProtected =
                  Boolean(role.isSystem) || (SYSTEM_ROLE_KEYS as readonly string[]).includes(role.key);

                return (
                  <Card
                    key={role.key}
                    className="hover:border-primary/50 transition-all shadow-xs border border-border/80 rounded-xl flex flex-col justify-between"
                  >
                    <CardHeader className="p-5 pb-3 border-b space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <Badge className={`text-xs px-2.5 py-0.5 font-bold ${role.color}`}>
                          {role.label}
                        </Badge>
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {role.key}
                        </Badge>
                      </div>
                      <CardTitle className="text-sm font-semibold leading-tight pt-1">
                        {role.description || "No description provided."}
                      </CardTitle>
                    </CardHeader>

                    <CardContent className="p-5 space-y-4 flex-1">
                      <div className="space-y-2">
                        <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                          <span>Assigned Permissions</span>
                          <span>
                            {role.permissions.length} / {AVAILABLE_FEATURES.length}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1 max-h-[140px] overflow-y-auto pr-1">
                          {role.permissions.length === 0 ? (
                            <span className="text-xs text-muted-foreground italic">
                              No permissions selected
                            </span>
                          ) : (
                            role.permissions.map((permId) => {
                              const feat = PERMISSION_MAP.get(permId);
                              return (
                                <Badge
                                  key={permId}
                                  variant="secondary"
                                  className="text-[10px] py-0 px-1.5"
                                  title={feat?.description || permId}
                                >
                                  {feat?.name ?? permId}
                                </Badge>
                              );
                            })
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-3">
                        <span className="font-mono text-[11px]">
                          {Math.round((role.permissions.length / Math.max(1, AVAILABLE_FEATURES.length)) * 100)}% coverage
                        </span>
                        {isProtected ? (
                          <Badge variant="outline" className="text-[10px]">
                            System Preset
                          </Badge>
                        ) : (
                          <Badge variant="soft" className="text-[10px]">
                            Custom Blueprint
                          </Badge>
                        )}
                      </div>
                    </CardContent>

                    <div className="px-5 pb-4 border-t pt-3 flex items-center justify-end gap-2 bg-muted/20 rounded-b-xl">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditRole(role)}
                        className="gap-1.5 text-xs h-8"
                      >
                        <Pencil className="size-3.5" /> Edit Role
                      </Button>
                      {!isProtected && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setRoleToDelete(role)}
                          className="text-rose-600 hover:bg-rose-500/10 h-8 px-2.5"
                          title={`Delete ${role.label}`}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB 2: SYNCHRONIZED PERMISSION MATRIX */}
        <TabsContent value="permission_matrix" className="pt-4">
          <Card className="border border-border/80 rounded-xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-muted/50 border-b text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="p-3 min-w-[240px]">Permission Capability</th>
                    <th className="p-3">Module</th>
                    {rolesList.map((role) => (
                      <th key={role.key} className="p-3 text-center whitespace-nowrap">
                        <Badge className={`text-[10px] font-bold ${role.color}`}>
                          {role.label}
                        </Badge>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {filteredPermissions.map((perm) => (
                    <tr key={perm.id} className="hover:bg-muted/40 transition-colors">
                      <td className="p-3">
                        <div className="font-semibold text-foreground">{perm.name}</div>
                        <div className="text-[11px] text-muted-foreground">{perm.description}</div>
                        <code className="text-[10px] font-mono text-muted-foreground/80">{perm.id}</code>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {perm.category}
                        </Badge>
                      </td>
                      {rolesList.map((role) => {
                        const granted = role.permissions.includes(perm.id);
                        return (
                          <td key={`${role.key}-${perm.id}`} className="p-3 text-center">
                            {granted ? (
                              <span
                                className="inline-flex items-center justify-center size-6 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                                title={`${role.label} has ${perm.id}`}
                              >
                                <Check className="size-3.5" />
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center justify-center size-6 rounded-full bg-muted/50 text-muted-foreground/50"
                                title={`${role.label} does not have ${perm.id}`}
                              >
                                <Minus className="size-3" />
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* CREATE & EDIT ROLE DIALOG */}
      {editingRole && (
        <Dialog open={isRoleModalOpen} onOpenChange={setIsRoleModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="size-5 text-primary" />
                {editingRole.key && rolesList.some((r) => r.key === editingRole.key)
                  ? `Edit Role — ${editingRole.label}`
                  : "Create Custom Role Blueprint"}
              </DialogTitle>
              <DialogDescription>
                Define role key identifier, badge label, description, and feature permissions from the unified platform registry.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Role Name / Label *</Label>
                  <Input
                    value={editingRole.label}
                    onChange={(e) => {
                      const label = e.target.value;
                      const autoKey = label.toLowerCase().replace(/[^a-z0-9_]+/g, "_");
                      setEditingRole({
                        ...editingRole,
                        label,
                        key: editingRole.isSystem ? editingRole.key : editingRole.key || autoKey,
                      });
                    }}
                    placeholder="e.g. Content Editor"
                    className="text-xs h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Role Key Identifier *</Label>
                  <Input
                    value={editingRole.key}
                    onChange={(e) => setEditingRole({ ...editingRole, key: e.target.value })}
                    disabled={editingRole.isSystem}
                    placeholder="e.g. editor or developer"
                    className="font-mono text-xs h-9"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Role Description</Label>
                <Textarea
                  value={editingRole.description}
                  onChange={(e) => setEditingRole({ ...editingRole, description: e.target.value })}
                  rows={2}
                  placeholder="Describe access responsibilities..."
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Badge Color Accent</Label>
                <Select
                  value={editingRole.color}
                  onValueChange={(val) => setEditingRole({ ...editingRole, color: val })}
                >
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bg-red-600 text-white">Red (Root / Super Admin)</SelectItem>
                    <SelectItem value="bg-amber-500 text-white">Amber / Gold</SelectItem>
                    <SelectItem value="bg-emerald-600 text-white">Emerald Green (System Admin)</SelectItem>
                    <SelectItem value="bg-indigo-600 text-white">Indigo (Editor)</SelectItem>
                    <SelectItem value="bg-cyan-600 text-white">Cyan (Developer)</SelectItem>
                    <SelectItem value="bg-blue-600 text-white">Blue (HR Admin)</SelectItem>
                    <SelectItem value="bg-purple-600 text-white">Purple (Manager)</SelectItem>
                    <SelectItem value="bg-secondary text-foreground">Slate (Standard)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* UNIFIED FEATURE PERMISSIONS MATRIX CHECKBOXES */}
              <div className="p-4 rounded-xl border bg-secondary/10 space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <Label className="text-xs font-bold flex items-center gap-1.5">
                    <Sliders className="size-4 text-primary" /> Feature Permissions Matrix (
                    {editingRole.permissions.length} / {AVAILABLE_FEATURES.length} selected)
                  </Label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setEditingRole({
                          ...editingRole,
                          permissions: AVAILABLE_FEATURES.map((f) => f.id),
                        })
                      }
                      className="text-[11px] text-primary hover:underline cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-muted-foreground">•</span>
                    <button
                      type="button"
                      onClick={() => setEditingRole({ ...editingRole, permissions: [] })}
                      className="text-[11px] text-muted-foreground hover:underline cursor-pointer"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {PERMISSION_CATEGORIES.map((category) => {
                    const catPerms = AVAILABLE_FEATURES.filter((f) => f.category === category);
                    return (
                      <div key={category} className="space-y-2">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          {category}
                        </div>
                        <div className="grid gap-2.5 sm:grid-cols-2">
                          {catPerms.map((feat) => {
                            const isChecked = editingRole.permissions.includes(feat.id);
                            return (
                              <div
                                key={feat.id}
                                onClick={() => {
                                  const updated = isChecked
                                    ? editingRole.permissions.filter((p) => p !== feat.id)
                                    : [...editingRole.permissions, feat.id];
                                  setEditingRole({ ...editingRole, permissions: updated });
                                }}
                                className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-2.5 ${
                                  isChecked
                                    ? "bg-primary/5 border-primary shadow-xs"
                                    : "bg-background border-border hover:bg-secondary/40"
                                }`}
                              >
                                <Checkbox checked={isChecked} className="mt-0.5 pointer-events-none" />
                                <div className="space-y-0.5 text-xs min-w-0">
                                  <div className="font-semibold text-foreground flex items-center gap-1.5 flex-wrap">
                                    <span>{feat.name}</span>
                                  </div>
                                  <p className="text-[11px] text-muted-foreground leading-normal">
                                    {feat.description}
                                  </p>
                                  <code className="text-[10px] font-mono text-muted-foreground/75 block">
                                    {feat.id}
                                  </code>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setIsRoleModalOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => saveRole(editingRole)}
                disabled={saveRoleDefsMutation.isPending}
                className="gap-1.5"
              >
                {saveRoleDefsMutation.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="size-3.5" />
                )}
                Save Role
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* DELETE ROLE CONFIRMATION DIALOG */}
      <ConfirmationDialog
        open={!!roleToDelete}
        onOpenChange={(open) => !open && setRoleToDelete(null)}
        variant="destructive"
        title="Delete Custom Role Blueprint?"
        description={
          roleToDelete ? (
            <>
              Are you sure you want to delete the custom role{" "}
              <strong className="text-foreground">{roleToDelete.label}</strong> (
              <code className="font-mono">{roleToDelete.key}</code>)? This removes the role blueprint from the platform configuration.
            </>
          ) : undefined
        }
        confirmLabel="Delete Role"
        isLoading={saveRoleDefsMutation.isPending}
        onConfirm={() => {
          if (roleToDelete) confirmDeleteRole(roleToDelete);
        }}
      />
    </div>
  );
}

export default RolesAdminStudio;
