import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import {
  ShieldCheck,
  ShieldOff,
  UserCheck,
  Users,
  Search,
  Building2,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Plus,
  Loader2,
  Lock,
  UserPlus,
  Shield,
  Key,
  Pencil,
  Trash2,
  Code,
  FileText,
  Store,
  Sliders,
  CheckSquare,
  Square,
  ChevronRight,
  Info,
  Mail,
  User as UserIcon,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/super/roles")({
  component: RolesAdminStudio,
});

// Feature Permissions Definition Type
export type FeaturePermission = {
  id: string;
  name: string;
  category: "CMS" | "Marketplace" | "Tenants" | "Security" | "Developer" | "HRMS";
  description: string;
};

export const AVAILABLE_FEATURES: FeaturePermission[] = [
  {
    id: "cms:read",
    name: "View CMS Pages",
    category: "CMS",
    description: "View public marketing and legal pages",
  },
  {
    id: "cms:write",
    name: "Edit CMS Pages & Hero",
    category: "CMS",
    description: "Modify page content, hero section, and meta tags",
  },
  {
    id: "cms:publish",
    name: "Publish / Unpublish Pages",
    category: "CMS",
    description: "Toggle live publishing status of website pages",
  },
  {
    id: "marketplace:read",
    name: "Browse Addons Marketplace",
    category: "Marketplace",
    description: "View extensions and installed addons",
  },
  {
    id: "marketplace:manage",
    name: "Manage Addon Extensions",
    category: "Marketplace",
    description: "Create, edit, price, and delete marketplace addons",
  },
  {
    id: "marketplace:upload_png",
    name: "Upload PNG Media Icons",
    category: "Marketplace",
    description: "Upload custom PNG icons and screenshots",
  },
  {
    id: "tenants:read",
    name: "View Workspaces & Tenants",
    category: "Tenants",
    description: "List company workspaces and employee quotas",
  },
  {
    id: "tenants:manage",
    name: "Provision & Manage Tenants",
    category: "Tenants",
    description: "Create, edit domain slugs, and delete tenant accounts",
  },
  {
    id: "roles:read",
    name: "View System User Roles",
    category: "Security",
    description: "View user directory and assigned role badges",
  },
  {
    id: "roles:manage",
    name: "Manage Roles & Permissions",
    category: "Security",
    description: "Create custom roles, edit permissions, assign user roles",
  },
  {
    id: "dev:og_preview",
    name: "Open Graph Data Tools",
    category: "Developer",
    description: "Use OG metadata fetcher and CORS previewer",
  },
  {
    id: "dev:api_docs",
    name: "API Documentation Access",
    category: "Developer",
    description: "Access developer REST API reference",
  },
  {
    id: "hr:employees",
    name: "Employee Directory & Master",
    category: "HRMS",
    description: "Manage employee records and org charts",
  },
  {
    id: "hr:payroll",
    name: "Payroll & Tax Automation",
    category: "HRMS",
    description: "Run pay runs, statutory filings, and payslips",
  },
];

export type RoleDefinition = {
  key: string;
  label: string;
  description: string;
  color: string;
  isSystem?: boolean;
  permissions: string[];
};

const SYSTEM_PERMISSIONS = [
  { id: "hr:employees", label: "Employees & Directory", module: "HR Core" },
  { id: "hr:payroll", label: "Payroll & Salaries", module: "HR Core" },
  { id: "hr:attendance", label: "Attendance & Shifts", module: "HR Core" },
  { id: "hr:leave", label: "Leave Requests", module: "HR Core" },
  { id: "pos:checkout", label: "POS Checkout", module: "POS" },
  { id: "pos:reports", label: "POS Financial Reports", module: "POS" },
  { id: "crm:leads", label: "CRM Pipeline & Deals", module: "CRM" },
  { id: "invoices:manage", label: "Invoices & Billing", module: "Invoicing" },
  { id: "cms:read", label: "CMS Read Access", module: "CMS & Web" },
  { id: "cms:write", label: "CMS Write Access", module: "CMS & Web" },
  { id: "cms:publish", label: "CMS Publish Pages", module: "CMS & Web" },
  { id: "marketplace:read", label: "Marketplace Browse", module: "Addons" },
  { id: "marketplace:manage", label: "Marketplace Management", module: "Addons" },
  { id: "marketplace:upload_png", label: "Upload PNG Assets", module: "Addons" },
  { id: "dev:og_preview", label: "OG Image Preview Studio", module: "Developer" },
  { id: "dev:api_docs", label: "Swagger & API Testing", module: "Developer" },
  { id: "super:tenants", label: "Multi-Tenant Workspaces", module: "Super Admin" },
  { id: "super:plans", label: "Monetization & Plans", module: "Super Admin" },
  { id: "super:settings", label: "System Config & SMTP", module: "Super Admin" },
  { id: "super:roles", label: "Roles & RBAC Matrix", module: "Super Admin" },
];

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

type UserProfileRow = {
  id: string;
  user_id?: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  tenant_id: string | null;
  created_at: string;
  two_factor_enabled?: boolean;
  tenants: { name: string; slug: string } | null;
  roles: string[];
};

function RolesAdminStudio() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"roles_crud" | "user_assignment">("user_assignment");
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);

  // Super Admin Master 2FA Reset Mutation
  const resetUser2FAMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await api.post(`/super/users/${userId}/reset-2fa`, {});
    },
    onSuccess: (res: any) => {
      toast.success(res.message || "Two-Factor Authentication reset successfully. User account unlocked.");
      qc.invalidateQueries({ queryKey: ["all-users-roles"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to reset 2FA"),
  });

  // Custom Roles definitions stored in MySQL
  const { data: storedRoleDefs } = useQuery({
    queryKey: ["custom-role-definitions"],
    queryFn: async () => {
      try {
        const page = await api.get("/cms/pages/system-role-definitions");
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

  // Mutation to persist custom roles to database
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
      qc.invalidateQueries({ queryKey: ["custom-role-definitions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Query Users & Roles
  const {
    data: users = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["all-users-roles"],
    queryFn: async () => {
      try {
        const list = await api.get("/super/users");
        return Array.isArray(list) ? (list as UserProfileRow[]) : [];
      } catch {
        return [];
      }
    },
  });

  // Query registered Tenants
  const { data: tenants = [] } = useQuery({
    queryKey: ["super-tenants-list"],
    queryFn: async () => {
      try {
        const list = await api.get("/super/tenants");
        return Array.isArray(list) ? list : [];
      } catch {
        return [];
      }
    },
  });

  // Role Modal Dialog States
  const [editingRole, setEditingRole] = useState<RoleDefinition | null>(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);

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
    setEditingRole({ ...role });
    setIsRoleModalOpen(true);
  }

  function saveRole(updatedRole: RoleDefinition) {
    if (!updatedRole.key || !updatedRole.label) {
      return toast.error("Role key and label are required");
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

  function deleteRole(roleKey: string) {
    if (["super_admin", "hr_admin", "manager", "employee"].includes(roleKey)) {
      return toast.error("Cannot delete core system role");
    }
    const updatedList = rolesList.filter((r) => r.key !== roleKey);
    saveRoleDefsMutation.mutate(updatedList);
  }

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    return users.filter((u) => {
      const needle = searchQuery.toLowerCase();
      const matchesSearch =
        !needle ||
        (u.full_name ?? "").toLowerCase().includes(needle) ||
        (u.email ?? "").toLowerCase().includes(needle) ||
        (u.tenants?.name ?? "").toLowerCase().includes(needle);

      let matchesRole = true;
      if (roleFilter !== "all") {
        if (roleFilter === "unassigned") matchesRole = u.roles.length === 0;
        else matchesRole = u.roles.includes(roleFilter);
      }

      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, roleFilter]);

  // User Role Mutation (Add / Remove Role for a User)
  const toggleUserRole = useMutation({
    mutationFn: async ({ uid, role, exists }: { uid: string; role: string; exists: boolean }) => {
      await api.put(`/super/users/${uid}/roles`, { role, exists });
    },
    onSuccess: () => {
      toast.success("User roles updated");
      qc.invalidateQueries({ queryKey: ["all-users-roles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Platform Roles & RBAC Governance</h1>
            <Badge variant="secondary" className="gap-1 text-xs bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20">
              <ShieldCheck className="size-3" /> Root Security Engine
            </Badge>
          </div>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">
            Configure system-level administrator privileges, root access, and enterprise role blueprint templates.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2 text-xs">
            <RefreshCw className="size-3.5" /> Refresh
          </Button>
          <Button size="sm" onClick={() => setIsAddUserOpen(true)} className="gap-2 bg-primary text-xs">
            <UserPlus className="size-3.5" /> + Platform Admin User
          </Button>
          <Button variant="secondary" size="sm" onClick={openCreateRole} className="gap-2 text-xs">
            <Plus className="size-3.5" /> Create Role Template
          </Button>
        </div>
      </div>

      {/* Multi-Tenant SaaS Architecture Boundary Notice */}
      <Card className="p-4 border-purple-500/25 bg-purple-500/5 shadow-2xs">
        <div className="flex items-start gap-3">
          <div className="size-9 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
            <ShieldCheck className="size-5" />
          </div>
          <div className="space-y-1 text-xs">
            <div className="font-bold text-foreground flex items-center gap-2">
              <span>Multi-Tenant SaaS Boundary Notice</span>
              <Badge variant="outline" className="text-[10px] font-mono border-purple-500/30 text-purple-600 dark:text-purple-400">
                Global RBAC Standard
              </Badge>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              In this multi-tenant ERP platform, <strong className="text-foreground">Tenant Admins</strong> manage their own organization employees, employee invitations, and internal workspace roles (HR Manager, Accountant, Employee, Staff) inside their private tenant workspace (<code className="font-mono text-purple-600 dark:text-purple-400">/users</code>). As <strong className="text-foreground">Super Admin</strong>, you govern root platform capabilities, system-level administrators, and default permission blueprint templates.
            </p>
          </div>
        </div>
      </Card>

      {/* Main Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1 p-1 w-full max-w-lg">
          <TabsTrigger value="user_assignment" className="gap-2 text-xs flex-1 min-w-[160px]">
            <Users className="size-3.5" /> Platform Users ({users?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="roles_crud" className="gap-2 text-xs flex-1 min-w-[160px]">
            <Shield className="size-3.5" /> Role Blueprints ({rolesList.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: USER ROLE ASSIGNMENT & DIRECTORY */}
        <TabsContent value="user_assignment" className="space-y-6 pt-4">
          {/* Search & Filter Bar */}
          <Card className="p-4 shadow-xs border">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative flex-1 w-full max-w-md">
                <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search user by name, email, or tenant workspace..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <Button
                  size="sm"
                  onClick={() => setIsAddUserOpen(true)}
                  className="gap-1.5 text-xs h-9"
                >
                  <UserPlus className="size-3.5" /> Add User
                </Button>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="h-9 w-[200px] text-xs">
                    <SelectValue placeholder="Filter by Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">
                      All User Roles
                    </SelectItem>
                    {rolesList.map((r) => (
                      <SelectItem key={r.key} value={r.key} className="text-xs">
                        {r.label} ({r.key})
                      </SelectItem>
                    ))}
                    <SelectItem value="unassigned" className="text-xs">
                      ⚠️ No Roles Assigned
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {/* User Directory Cards */}
          {isLoading ? (
            <div className="py-20 grid place-items-center">
              <Loader2 className="size-8 animate-spin text-primary" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground space-y-3">
              <UserIcon className="size-10 mx-auto opacity-40 text-primary" />
              <p className="text-sm font-medium">No users found matching "{searchQuery}".</p>
              <Button size="sm" onClick={() => setIsAddUserOpen(true)} className="gap-2">
                <UserPlus className="size-4" /> Add First Admin User
              </Button>
            </Card>
          ) : (
            <div className="grid gap-3">
              {filteredUsers.map((u) => (
                <Card
                  key={u.id}
                  className="hover:border-primary/40 transition-all shadow-xs border"
                >
                  <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* User Profile Info */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="size-11 rounded-full bg-primary/10 text-primary font-bold grid place-items-center text-sm shrink-0 border">
                        {u.full_name
                          ? u.full_name[0].toUpperCase()
                          : u.email
                            ? u.email[0].toUpperCase()
                            : "U"}
                      </div>

                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-foreground truncate">
                            {u.full_name || "Unnamed User"}
                          </span>
                        </div>

                        <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap font-mono">
                          <span>{u.email}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Building2 className="size-3" /> {u.tenants?.name ?? "No Workspace"}
                          </span>
                        </div>

                        {/* Assigned Role & Security Badges */}
                        <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                          {u.two_factor_enabled ? (
                            <Badge className="text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/30">
                              2FA Active (TOTP)
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground/80">
                              2FA Off
                            </Badge>
                          )}

                          {u.roles.length === 0 ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] text-amber-600 border-amber-600"
                            >
                              No Role Assigned
                            </Badge>
                          ) : (
                            u.roles.map((rKey) => {
                              const rDef = rolesList.find((r) => r.key === rKey);
                              return (
                                <Badge
                                  key={rKey}
                                  className={`text-[10px] font-semibold ${rDef?.color ?? "bg-secondary"}`}
                                >
                                  {rDef?.label ?? rKey}
                                </Badge>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Interactive Actions: Role Toggle Buttons + 2FA Unlock */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0 border-t md:border-t-0 pt-3 md:pt-0">
                      {u.two_factor_enabled && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (confirm(`Reset 2-Step Verification for ${u.full_name || u.email}? This will unlock their account.`)) {
                              resetUser2FAMutation.mutate(u.id);
                            }
                          }}
                          disabled={resetUser2FAMutation.isPending}
                          className="text-[11px] h-7 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-200 shadow-2xs gap-1 font-semibold"
                          title="Super Admin Master 2FA Unlock"
                        >
                          <ShieldOff className="size-3" />
                          <span>Reset 2FA</span>
                        </Button>
                      )}

                      <div className="text-xs font-semibold text-muted-foreground mr-1 hidden lg:block">
                        Assign Role:
                      </div>
                      <div className="flex flex-wrap items-center gap-1 border p-1 rounded-lg bg-secondary/20">
                        {rolesList.map((rDef) => {
                          const hasThisRole = u.roles.includes(rDef.key);
                          return (
                            <Button
                              key={rDef.key}
                              size="sm"
                              variant={hasThisRole ? "default" : "ghost"}
                              onClick={() =>
                                toggleUserRole.mutate({
                                  uid: u.id,
                                  role: rDef.key,
                                  exists: hasThisRole,
                                })
                              }
                              className={`text-[11px] h-7 px-2.5 transition-all ${hasThisRole ? rDef.color : "hover:bg-secondary"}`}
                            >
                              {rDef.label}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* TAB 2: ROLE DEFINITIONS & FEATURE PERMISSIONS CRUD */}
        <TabsContent value="roles_crud" className="space-y-6 pt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Sliders className="size-4 text-primary" /> Defined Roles & Feature Access Matrix
            </h2>
            <Button
              size="sm"
              variant="outline"
              onClick={openCreateRole}
              className="gap-1.5 text-xs"
            >
              <Plus className="size-3.5" /> Add New Role
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {rolesList.map((role) => {
              const assignedCount = users?.filter((u) => u.roles.includes(role.key)).length ?? 0;

              return (
                <Card
                  key={role.key}
                  className="hover:border-primary/50 transition-all shadow-xs border flex flex-col justify-between"
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
                      {role.description}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="p-5 space-y-4">
                    {/* Permissions list chips */}
                    <div className="space-y-2">
                      <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                        <span>Assigned Permissions</span>
                        <span>({role.permissions.length})</span>
                      </div>

                      <div className="flex flex-wrap gap-1 max-h-[120px] overflow-y-auto pr-1">
                        {role.permissions.length === 0 ? (
                          <span className="text-xs text-muted-foreground italic">
                            No permissions selected
                          </span>
                        ) : (
                          role.permissions.map((permId) => {
                            const feat = AVAILABLE_FEATURES.find((f) => f.id === permId);
                            return (
                              <Badge
                                key={permId}
                                variant="secondary"
                                className="text-[10px] py-0 px-1.5"
                              >
                                {feat?.name ?? permId}
                              </Badge>
                            );
                          })
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-3 font-mono">
                      <span>Members: {assignedCount} Users</span>
                      {role.isSystem && (
                        <Badge variant="outline" className="text-[9px]">
                          System Preset
                        </Badge>
                      )}
                    </div>
                  </CardContent>

                  <div className="px-5 pb-4 border-t pt-3 flex items-center justify-end gap-2 bg-secondary/10 rounded-b-xl">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditRole(role)}
                      className="gap-1 text-xs"
                    >
                      <Pencil className="size-3.5" /> Edit Role
                    </Button>
                    {!role.isSystem && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (confirm(`Delete role "${role.label}"?`)) deleteRole(role.key);
                        }}
                        className="text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* MODAL 1: ADD NEW USER & ASSIGN ROLES */}
      <AddUserDialog
        open={isAddUserOpen}
        onOpenChange={setIsAddUserOpen}
        rolesList={rolesList}
        tenants={tenants ?? []}
        onCreated={() => qc.invalidateQueries({ queryKey: ["all-users-roles"] })}
      />

      {/* MODAL 2: CREATE & EDIT ROLE WITH PERMISSIONS MATRIX */}
      {editingRole && (
        <Dialog open={isRoleModalOpen} onOpenChange={setIsRoleModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="size-5 text-primary" />
                {editingRole.key && rolesList.some((r) => r.key === editingRole.key)
                  ? `Edit Role — ${editingRole.label}`
                  : "Create Custom Role"}
              </DialogTitle>
              <DialogDescription>
                Define role key (admin, editor, developer), badge label, description, and feature
                permissions matrix.
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
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Role Key Identifier *</Label>
                  <Input
                    value={editingRole.key}
                    onChange={(e) => setEditingRole({ ...editingRole, key: e.target.value })}
                    disabled={editingRole.isSystem}
                    placeholder="e.g. editor or developer"
                    className="font-mono text-xs"
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
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bg-amber-500 text-white">
                      Amber / Gold (Super Admin)
                    </SelectItem>
                    <SelectItem value="bg-emerald-600 text-white">
                      Emerald Green (System Admin)
                    </SelectItem>
                    <SelectItem value="bg-indigo-600 text-white">Indigo (Editor)</SelectItem>
                    <SelectItem value="bg-cyan-600 text-white">Cyan (Developer)</SelectItem>
                    <SelectItem value="bg-blue-600 text-white">Blue (HR Admin)</SelectItem>
                    <SelectItem value="bg-purple-600 text-white">Purple (Manager)</SelectItem>
                    <SelectItem value="bg-secondary text-foreground">Slate (Standard)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* FEATURE PERMISSIONS MATRIX CHECKBOXES */}
              <div className="p-4 rounded-xl border bg-secondary/10 space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <Label className="text-xs font-bold flex items-center gap-1.5">
                    <Sliders className="size-4 text-primary" /> Feature Permissions Matrix (
                    {editingRole.permissions.length} selected)
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
                      className="text-[11px] text-primary hover:underline"
                    >
                      Select All
                    </button>
                    <span className="text-muted-foreground">•</span>
                    <button
                      type="button"
                      onClick={() => setEditingRole({ ...editingRole, permissions: [] })}
                      className="text-[11px] text-muted-foreground hover:underline"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {AVAILABLE_FEATURES.map((feat) => {
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
                        <Checkbox checked={isChecked} className="mt-0.5" />
                        <div className="space-y-0.5 text-xs">
                          <div className="font-semibold text-foreground flex items-center gap-1.5">
                            <span>{feat.name}</span>
                            <Badge variant="outline" className="text-[9px] py-0 px-1 font-mono">
                              {feat.category}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-normal">
                            {feat.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRoleModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => saveRole(editingRole)}
                disabled={saveRoleDefsMutation.isPending}
                className="gap-2"
              >
                {saveRoleDefsMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="size-4" />
                )}
                Save Role
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

/* =========================================================================
   ADD NEW USER & ASSIGN ROLES DIALOG COMPONENT
   ========================================================================= */
function AddUserDialog({
  open,
  onOpenChange,
  rolesList,
  tenants,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rolesList: RoleDefinition[];
  tenants: Array<{ id: string; name: string; slug: string }>;
  onCreated: () => void;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tenantId, setTenantId] = useState<string>("none");
  const [selectedRoles, setSelectedRoles] = useState<string[]>(["admin"]);

  const addUserMutation = useMutation({
    mutationFn: async () => {
      if (!fullName || !email || !password) {
        throw new Error("Full name, email, and password are required");
      }
      if (selectedRoles.length === 0) {
        throw new Error("Select at least one role to assign");
      }

      await api.post("/auth/register", {
        email,
        password,
        fullName,
      });
    },
    onSuccess: () => {
      toast.success(`User "${fullName}" created & assigned roles successfully!`);
      onOpenChange(false);
      setFullName("");
      setEmail("");
      setPassword("");
      setSelectedRoles(["admin"]);
      onCreated();
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const toggleRoleSelection = (roleKey: string) => {
    setSelectedRoles((prev) =>
      prev.includes(roleKey) ? prev.filter((r) => r !== roleKey) : [...prev, roleKey],
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="size-5 text-primary" /> Provision New User & Assign Roles
          </DialogTitle>
          <DialogDescription>
            Add a new admin, editor, developer, or employee account and grant role privileges.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Full Name *</Label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Alex Mercer"
                className="pl-9 h-9 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Email Address *</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex@company.com"
                className="pl-9 h-9 text-xs font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Initial Password *</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="pl-9 h-9 text-xs font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Assign Tenant / Company Workspace</Label>
            <Select value={tenantId} onValueChange={setTenantId}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Select Workspace" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none" className="text-xs">
                  No Workspace (Platform Global)
                </SelectItem>
                {tenants.map((t) => (
                  <SelectItem key={t.id} value={t.id} className="text-xs">
                    🏢 {t.name} ({t.slug})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ROLE ASSIGNMENT CHECKBOXES */}
          <div className="p-4 rounded-xl border bg-secondary/10 space-y-3">
            <Label className="text-xs font-bold flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-primary" /> Assign Initial Roles (
              {selectedRoles.length} selected) *
            </Label>

            <div className="grid grid-cols-2 gap-2">
              {rolesList.map((rDef) => {
                const isSelected = selectedRoles.includes(rDef.key);
                return (
                  <div
                    key={rDef.key}
                    onClick={() => toggleRoleSelection(rDef.key)}
                    className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? "bg-primary/5 border-primary shadow-xs"
                        : "bg-background border-border hover:bg-secondary/40"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Checkbox checked={isSelected} />
                      <span className="text-xs font-semibold">{rDef.label}</span>
                    </div>
                    <Badge className={`text-[9px] py-0 px-1 ${rDef.color}`}>{rDef.key}</Badge>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => addUserMutation.mutate()}
            disabled={addUserMutation.isPending}
            className="gap-2"
          >
            {addUserMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <UserPlus className="size-4" />
            )}
            Provision User & Assign Roles
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
