import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { usePermissions } from "@/lib/permissions";
import { ERP_MODULES } from "@/lib/erp-modules";
import {
  Shield, ShieldCheck, Plus, Search, Edit2, Copy, Trash2,
  Users, Check, X, CheckCircle2, AlertCircle, Loader2,
  Sparkles, Layers, Sliders, ToggleLeft, ToggleRight, Building, Lock,
  Globe, Globe2, ExternalLink, ArrowRight, History
} from "lucide-react";
import { CustomDomainSettings } from "./custom-domain-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { toast } from "sonner";
import { useTenantBranding } from "@/lib/useTenantBranding";

interface RoleItem {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  isSystem: boolean;
  usersCount: number;
  permissionsCount: number;
  permissionCodes: string[];
}

interface WorkspaceUserItem {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  assignedRole: {
    id: string;
    name: string;
    description: string | null;
    isActive: boolean;
  } | null;
  legacyRoles: string[];
  createdAt: string;
}

export function WorkspaceAdminSettings() {
  const queryClient = useQueryClient();
  const { isWorkspaceAdmin, isSuperAdmin, profile } = usePermissions();
  const { branding } = useTenantBranding();

  const [activeSubTab, setActiveSubTab] = useState("roles");
  const [searchQuery, setSearchQuery] = useState("");

  // Role Form State (Create / Edit)
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [roleIsActive, setRoleIsActive] = useState(true);
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set());

  // User Role Assignment Modal State
  const [isUserRoleModalOpen, setIsUserRoleModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<WorkspaceUserItem | null>(null);
  const [targetRoleId, setTargetRoleId] = useState("");

  // Rename Workspace Modal State (Flow 1: 3-30 chars)
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [newSlug, setNewSlug] = useState("");
  const [hasAcknowledgedRedirect, setHasAcknowledgedRedirect] = useState(false);
  const [slugCheck, setSlugCheck] = useState<{
    checking: boolean;
    available?: boolean;
    reason?: string;
  }>({ checking: false });
  const [renamedSuccessResult, setRenamedSuccessResult] = useState<{
    oldSlug: string;
    newSlug: string;
    newWorkspaceUrl: string;
    redirectUntil: string;
  } | null>(null);

  // Debounced check-slug query for rename
  React.useEffect(() => {
    if (!isRenameModalOpen || !newSlug) {
      setSlugCheck({ checking: false });
      return;
    }
    if (newSlug.length < 3) {
      setSlugCheck({ checking: false, available: false, reason: "too_short" });
      return;
    }
    if (newSlug.length > 30) {
      setSlugCheck({ checking: false, available: false, reason: "too_long" });
      return;
    }

    const timer = setTimeout(async () => {
      setSlugCheck({ checking: true });
      try {
        const res = await api.get(`/workspace/check-slug?slug=${encodeURIComponent(newSlug)}`);
        setSlugCheck({
          checking: false,
          available: res?.available,
          reason: res?.reason,
        });
      } catch {
        setSlugCheck({ checking: false, available: false, reason: "error" });
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [newSlug, isRenameModalOpen]);

  // Query: Slug Rename History
  const { data: slugHistory = [] } = useQuery<Array<{
    id: string;
    oldSlug: string;
    newSlug: string;
    changedAt: string;
    releaseAt: string;
  }>>({
    queryKey: ["workspace-slug-history"],
    queryFn: async () => {
      const res = await api.get("/workspace/slug-history");
      return res?.history || [];
    },
  });

  // Mutation: Rename Workspace
  const renameWorkspaceMutation = useMutation({
    mutationFn: async () => {
      return await api.post("/workspace/rename", { newSlug });
    },
    onSuccess: (res: any) => {
      toast.success(res.message || "Workspace renamed successfully!");
      setRenamedSuccessResult({
        oldSlug: res.oldSlug,
        newSlug: res.newSlug,
        newWorkspaceUrl: res.newWorkspaceUrl,
        redirectUntil: res.redirectUntil,
      });
      queryClient.invalidateQueries({ queryKey: ["tenant-branding"] });
      queryClient.invalidateQueries({ queryKey: ["workspace-slug-history"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to rename workspace");
    },
  });

  // 1. Query: Roles
  const { data: roles = [], isLoading: rolesLoading } = useQuery<RoleItem[]>({
    queryKey: ["workspace-roles"],
    queryFn: async () => {
      const res = await api.get("/workspace/roles");
      return res || [];
    },
  });

  // 2. Query: Permissions Catalog
  const { data: permData } = useQuery({
    queryKey: ["workspace-permissions-catalog"],
    queryFn: async () => {
      const res = await api.get("/workspace/permissions");
      return res || { permissions: [], modules: ERP_MODULES };
    },
  });

  // 3. Query: Tenant Modules
  const { data: modules = [], isLoading: modulesLoading } = useQuery({
    queryKey: ["workspace-modules-status"],
    queryFn: async () => {
      const res = await api.get("/workspace/modules");
      return res || [];
    },
  });

  // 4. Query: Workspace Users
  const { data: workspaceUsers = [], isLoading: usersLoading } = useQuery<WorkspaceUserItem[]>({
    queryKey: ["workspace-users-list"],
    queryFn: async () => {
      const res = await api.get("/workspace/users");
      return res || [];
    },
  });

  // Mutations
  const saveRoleMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: roleName,
        description: roleDescription,
        isActive: roleIsActive,
        permissionCodes: Array.from(selectedPerms),
      };
      if (editingRoleId) {
        return await api.put("/workspace/roles/" + editingRoleId, payload);
      } else {
        return await api.post("/workspace/roles", payload);
      }
    },
    onSuccess: () => {
      toast.success(editingRoleId ? "Role updated successfully" : "Role created successfully");
      setIsRoleModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["workspace-roles"] });
      queryClient.invalidateQueries({ queryKey: ["current-session-user"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to save role");
    },
  });

  const duplicateRoleMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.post("/workspace/roles/" + id + "/duplicate", {});
    },
    onSuccess: (res: any) => {
      toast.success("Role duplicated: " + (res?.name || "Copy"));
      queryClient.invalidateQueries({ queryKey: ["workspace-roles"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to duplicate role");
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete("/workspace/roles/" + id);
    },
    onSuccess: () => {
      toast.success("Role deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["workspace-roles"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to delete role");
    },
  });

  const toggleModuleMutation = useMutation({
    mutationFn: async ({ moduleKey, isEnabled }: { moduleKey: string; isEnabled: boolean }) => {
      return await api.put("/workspace/modules", { moduleKey, isEnabled });
    },
    onSuccess: (_, vars) => {
      toast.success("Module " + vars.moduleKey.toUpperCase() + (vars.isEnabled ? " enabled" : " disabled"));
      queryClient.invalidateQueries({ queryKey: ["workspace-modules-status"] });
      queryClient.invalidateQueries({ queryKey: ["current-session-user"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update module");
    },
  });

  const assignUserRoleMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUser || !targetRoleId) return;
      return await api.put("/workspace/users/" + selectedUser.id + "/role", { roleId: targetRoleId });
    },
    onSuccess: () => {
      toast.success("User role updated successfully");
      setIsUserRoleModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["workspace-users-list"] });
      queryClient.invalidateQueries({ queryKey: ["workspace-roles"] });
      queryClient.invalidateQueries({ queryKey: ["current-session-user"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to assign role");
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await api.delete("/workspace/users/" + userId);
    },
    onSuccess: () => {
      toast.success("User removed from workspace successfully");
      queryClient.invalidateQueries({ queryKey: ["workspace-users-list"] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to remove user");
    },
  });

  // Open Create Modal
  const openCreateModal = () => {
    setEditingRoleId(null);
    setRoleName("");
    setRoleDescription("");
    setRoleIsActive(true);
    setSelectedPerms(new Set());
    setIsRoleModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (role: RoleItem) => {
    setEditingRoleId(role.id);
    setRoleName(role.name);
    setRoleDescription(role.description || "");
    setRoleIsActive(role.isActive);
    setSelectedPerms(new Set(role.permissionCodes));
    setIsRoleModalOpen(true);
  };

  // Toggle individual permission checkbox
  const togglePermission = (code: string) => {
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  };

  // Select all permissions for a specific module
  const selectAllModulePerms = (modKey: string, select: boolean) => {
    const mod = ERP_MODULES.find((m) => m.key === modKey);
    if (!mod) return;

    const modCodes = [mod.permission];
    for (const r of mod.resources) {
      for (const a of r.actions) {
        modCodes.push(mod.key + "." + r.resource + "." + a);
      }
    }

    setSelectedPerms((prev) => {
      const next = new Set(prev);
      for (const c of modCodes) {
        if (select) next.add(c);
        else next.delete(c);
      }
      return next;
    });
  };

  // Filtered Roles list
  const filteredRoles = useMemo(() => {
    if (!searchQuery.trim()) return roles;
    const q = searchQuery.toLowerCase();
    return roles.filter(
      (r) => r.name.toLowerCase().includes(q) || (r.description && r.description.toLowerCase().includes(q))
    );
  }, [roles, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-2xl p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-xs font-semibold border border-orange-500/30">
              Workspace Administration
            </span>
            <span className="text-xs text-slate-400">Multi-Tenant Scoped</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight">Roles, Permissions & ERP Module Governance</h2>
          <p className="text-xs text-slate-300 max-w-xl mt-0.5">
            Manage your workspace roles, fine-grained action permissions, and module availability. Changes immediately govern user access upon refresh.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={openCreateModal}
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs h-9 shadow-lg shadow-orange-500/25"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Create Role
          </Button>
        </div>
      </div>

      {/* Subtabs: Roles & Permissions | Modules | Users | General */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
        <TabsList className="bg-slate-100 dark:bg-slate-900/80 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
          <TabsTrigger value="roles" className="text-xs font-semibold gap-1.5">
            <Shield className="w-3.5 h-3.5 text-orange-500" />
            <span>Roles & Permissions</span>
            <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1.5">
              {roles.length}
            </Badge>
          </TabsTrigger>

          <TabsTrigger value="modules" className="text-xs font-semibold gap-1.5">
            <Layers className="w-3.5 h-3.5 text-blue-500" />
            <span>ERP Modules</span>
            <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1.5">
              9
            </Badge>
          </TabsTrigger>

          <TabsTrigger value="users" className="text-xs font-semibold gap-1.5">
            <Users className="w-3.5 h-3.5 text-emerald-500" />
            <span>User Assignments</span>
            <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1.5">
              {workspaceUsers.length}
            </Badge>
          </TabsTrigger>

          <TabsTrigger value="workspace-address" className="text-xs font-semibold gap-1.5">
            <Globe className="w-3.5 h-3.5 text-blue-500" />
            <span>Workspace Address</span>
          </TabsTrigger>

          <TabsTrigger value="custom-domain" className="text-xs font-semibold gap-1.5">
            <Globe2 className="w-3.5 h-3.5 text-indigo-500" />
            <span>Custom Domain</span>
          </TabsTrigger>

          <TabsTrigger value="general" className="text-xs font-semibold gap-1.5">
            <Building className="w-3.5 h-3.5 text-purple-500" />
            <span>General Info</span>
          </TabsTrigger>
        </TabsList>

        {/* ======================================================== */}
        {/* TAB 1: ROLES & PERMISSIONS */}
        {/* ======================================================== */}
        <TabsContent value="roles" className="space-y-4 mt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search roles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs h-9"
              />
            </div>
          </div>

          <Card className="border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Users</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Permissions</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {rolesLoading ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1 text-orange-500" />
                        Loading workspace roles...
                      </td>
                    </tr>
                  ) : filteredRoles.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground">
                        No roles found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredRoles.map((role) => (
                      <tr key={role.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-slate-100">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">{role.name}</span>
                            {role.isSystem && (
                              <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/20">
                                System
                              </Badge>
                            )}
                          </div>
                          {role.description && (
                            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{role.description}</p>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <Badge variant="secondary" className="font-mono text-xs">
                            {role.usersCount} User{role.usersCount === 1 ? "" : "s"}
                          </Badge>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                              role.isActive
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                : "bg-slate-500/10 text-slate-500 border border-slate-500/20"
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${role.isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
                            {role.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 flex-wrap max-w-md">
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                              {role.permissionsCount} Action{role.permissionsCount === 1 ? "" : "s"}
                            </span>
                            {role.name === "Workspace Admin" && (
                              <Badge className="bg-orange-500 text-white text-[10px] font-bold">FULL ACCESS</Badge>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs px-2.5"
                              onClick={() => openEditModal(role)}
                            >
                              <Edit2 className="w-3.5 h-3.5 mr-1 text-slate-600" />
                              Edit
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs px-2 text-slate-500 hover:text-slate-900"
                              title="Duplicate Role"
                              onClick={() => duplicateRoleMutation.mutate(role.id)}
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </Button>

                            {!role.isSystem && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs px-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                title="Delete Role"
                                onClick={() => {
                                  if (confirm("Are you sure you want to delete role " + role.name + "?")) {
                                    deleteRoleMutation.mutate(role.id);
                                  }
                                }}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* ======================================================== */}
        {/* TAB 2: ERP MODULES TOGGLES */}
        {/* ======================================================== */}
        <TabsContent value="modules" className="space-y-4 mt-4">
          <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 p-4 rounded-xl text-xs text-blue-900 dark:text-blue-300 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
            <div>
              <span className="font-bold">Workspace-Level Module Governance:</span> When an ERP module is disabled here,
              no user inside this workspace will be able to view its dashboard or access its APIs, even if their assigned role possesses the underlying permission.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.map((mod: any) => (
              <Card key={mod.key} className="border border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{mod.name}</span>
                    <Switch
                      checked={mod.isEnabled}
                      onCheckedChange={(val) => toggleModuleMutation.mutate({ moduleKey: mod.key, isEnabled: val })}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-3">{mod.description}</p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                  <span className="font-mono text-muted-foreground">{mod.route}</span>
                  <Badge variant={mod.isEnabled ? "outline" : "secondary"} className={mod.isEnabled ? "text-emerald-600 border-emerald-500/30" : "text-slate-400"}>
                    {mod.isEnabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ======================================================== */}
        {/* TAB 3: USER ROLE ASSIGNMENTS */}
        {/* ======================================================== */}
        <TabsContent value="users" className="space-y-4 mt-4">
          <Card className="border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Assigned Workspace Role</th>
                    <th className="py-3 px-4 text-right">Change Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {usersLoading ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-muted-foreground">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1 text-orange-500" />
                        Loading workspace users...
                      </td>
                    </tr>
                  ) : workspaceUsers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-muted-foreground">
                        No users found in this workspace.
                      </td>
                    </tr>
                  ) : (
                    workspaceUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-orange-500/10 text-orange-600 font-bold flex items-center justify-center text-xs">
                              {u.fullName.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-semibold">{u.fullName}</span>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-muted-foreground font-mono text-[11px]">{u.email}</td>

                        <td className="py-3 px-4">
                          {u.assignedRole ? (
                            <Badge className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold text-xs">
                              {u.assignedRole.name}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-amber-600 border-amber-500/30 text-xs">
                              Unassigned (Default Employee)
                            </Badge>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => {
                                setSelectedUser(u);
                                setTargetRoleId(u.assignedRole?.id || roles[0]?.id || "");
                                setIsUserRoleModalOpen(true);
                              }}
                            >
                              <Edit2 className="w-3 h-3 mr-1" />
                              Assign Role
                            </Button>

                            {!u.legacyRoles?.includes("super_admin") && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                                onClick={() => {
                                  if (confirm("Permanently remove " + u.fullName + " (" + u.email + ") from this workspace and delete linked records from database?")) {
                                    deleteUserMutation.mutate(u.id);
                                  }
                                }}
                                title="Remove User from Workspace"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* ======================================================== */}
        {/* TAB 4: WORKSPACE ADDRESS (FLOW 1) */}
        {/* ======================================================== */}
        <TabsContent value="workspace-address" className="space-y-5 mt-4">
          {/* Card 1: Active Workspace Address */}
          <Card className="border border-slate-200 dark:border-slate-800 p-6 space-y-4 max-w-3xl shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Globe className="size-4 text-primary" /> Active Workspace Address
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Your team accesses all HRMS and ERP modules at this unique subdomain address.
                </p>
              </div>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 font-mono text-xs">
                Active & Live
              </Badge>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-border-color space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Workspace Subdomain</span>
                  <div className="font-mono text-base font-bold text-foreground">
                    {branding.slug}.{branding.baseDomain || "localhost"}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-8 gap-1.5 cursor-pointer"
                    onClick={() => {
                      const url = branding.workspaceUrl || `http://${branding.slug}.${branding.baseDomain || "localhost"}`;
                      navigator.clipboard.writeText(url);
                      toast.success("Workspace address copied to clipboard!");
                    }}
                  >
                    <Copy className="size-3.5" /> Copy Address
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-8 gap-1.5 cursor-pointer"
                    onClick={() => {
                      const url = branding.workspaceUrl || `http://${branding.slug}.${branding.baseDomain || "localhost"}`;
                      window.open(url, "_blank");
                    }}
                  >
                    <ExternalLink className="size-3.5" /> Visit
                  </Button>

                  {(isWorkspaceAdmin || isSuperAdmin) && (
                    <Button
                      size="sm"
                      className="text-xs h-8 gap-1.5 bg-primary hover:bg-primary/90 text-white cursor-pointer"
                      onClick={() => {
                        setNewSlug(branding.slug);
                        setHasAcknowledgedRedirect(false);
                        setRenamedSuccessResult(null);
                        setIsRenameModalOpen(true);
                      }}
                    >
                      <Edit2 className="size-3.5" /> Change Address
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* 30-Day Transition Notice Box */}
            <div className="rounded-xl p-4 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-900 dark:text-blue-300">
                <ShieldCheck className="size-4 text-blue-600 dark:text-blue-400" />
                <span>Zero-Downtime 30-Day Address Transition</span>
              </div>
              <p className="text-xs text-blue-800/80 dark:text-blue-300/80 leading-relaxed">
                When you rename your workspace, an automatic HTTP 301 permanent redirect is created. Any bookmarked links, employee invitations, or shared reports pointing to your previous address will seamlessly redirect to your new address for 30 days.
              </p>
              <div className="text-[11px] text-blue-700/80 dark:text-blue-400/80 font-medium">
                • 30-Day Throttle: For security and DNS stability, workspaces can only be renamed once every 30 days.
              </div>
            </div>
          </Card>

          {/* Card 2: Address Change History */}
          <Card className="border border-slate-200 dark:border-slate-800 p-6 space-y-4 max-w-3xl shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <History className="size-4 text-slate-500" /> Address Change History & Active Redirects
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Audit log of previous workspace addresses and active 30-day redirect windows.
                </p>
              </div>
              <Badge variant="secondary" className="text-xs font-mono">
                {slugHistory.length} Record{slugHistory.length === 1 ? "" : "s"}
              </Badge>
            </div>

            {slugHistory.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-dashed">
                <Globe className="size-8 mx-auto mb-2 text-slate-400" />
                No address changes recorded. This workspace is currently on its original address.
              </div>
            ) : (
              <div className="divide-y border rounded-xl overflow-hidden text-xs">
                {slugHistory.map((item) => (
                  <div key={item.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-slate-900/50">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 font-mono font-semibold text-foreground">
                        <span className="line-through text-muted-foreground">{item.oldSlug}</span>
                        <ArrowRight className="size-3 text-muted-foreground" />
                        <span className="text-primary font-bold">{item.newSlug}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Changed on {new Date(item.changedAt).toLocaleDateString()} at {new Date(item.changedAt).toLocaleTimeString()}
                      </div>
                    </div>

                    <div className="text-right">
                      {new Date(item.releaseAt) > new Date() ? (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 text-[10px]">
                          Redirect Active until {new Date(item.releaseAt).toLocaleDateString()}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] text-muted-foreground">
                          Redirect Expired
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Cross-link to Custom Domain Tab */}
          <Card className="border border-indigo-100 dark:border-indigo-950/60 bg-indigo-50/40 dark:bg-indigo-950/20 p-4 max-w-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Globe2 className="size-5" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Want to use your own branded company domain?</h4>
                <p className="text-[11px] text-muted-foreground">You can connect a custom domain (e.g. <span className="font-mono font-medium">app.yourcompany.com</span>) alongside your default address.</p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setActiveSubTab("custom-domain")}
              className="text-xs h-8 gap-1.5 cursor-pointer border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 self-start sm:self-auto"
            >
              Custom Domain Settings <ArrowRight className="size-3" />
            </Button>
          </Card>
        </TabsContent>

        {/* ======================================================== */}
        {/* TAB: CUSTOM DOMAIN (FLOW 2) */}
        {/* ======================================================== */}
        <TabsContent value="custom-domain" className="space-y-5 mt-4">
          <CustomDomainSettings />
        </TabsContent>

        {/* ======================================================== */}
        {/* TAB 5: GENERAL WORKSPACE INFO */}
        {/* ======================================================== */}
        <TabsContent value="general" className="space-y-4 mt-4">
          <Card className="border border-slate-200 dark:border-slate-800 p-6 space-y-4 max-w-2xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Workspace Details</h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-muted-foreground font-medium">Tenant Name:</span>
                <p className="font-bold text-sm text-slate-800 dark:text-slate-200 mt-0.5">
                  {profile?.tenant?.name || "Default Workspace"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground font-medium">Tenant ID:</span>
                <p className="font-mono text-xs text-slate-800 dark:text-slate-200 mt-0.5">
                  {profile?.tenant_id || "tenant-default-001"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground font-medium">Tenant Slug:</span>
                <p className="font-mono text-xs text-slate-800 dark:text-slate-200 mt-0.5">
                  {profile?.tenant?.slug || "default-workspace"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground font-medium">Your Session Role:</span>
                <p className="font-bold text-xs text-orange-600 dark:text-orange-400 mt-0.5">
                  {profile?.workspaceRole?.name || "Workspace Member"}
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ======================================================== */}
      {/* DIALOG: CREATE / EDIT ROLE WITH DETAILED PERMISSION MATRIX */}
      {/* ======================================================== */}
      <Dialog open={isRoleModalOpen} onOpenChange={setIsRoleModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editingRoleId ? "Edit Role & Permissions" : "Create New Workspace Role"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Configure role metadata and toggle access to ERP module dashboards and granular actions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Metadata Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Role Name *</Label>
                <Input
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  placeholder="e.g. Sales Manager, HR Specialist"
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1.5 flex flex-col justify-end">
                <div className="flex items-center justify-between p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                  <div className="text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Role Status</span>
                    <p className="text-[10px] text-muted-foreground">Active roles can be assigned to users</p>
                  </div>
                  <Switch checked={roleIsActive} onCheckedChange={setRoleIsActive} />
                </div>
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <Label className="text-xs font-semibold">Description</Label>
                <Input
                  value={roleDescription}
                  onChange={(e) => setRoleDescription(e.target.value)}
                  placeholder="Briefly describe the responsibilities and scope of this role..."
                  className="text-xs h-9"
                />
              </div>
            </div>

            {/* Permission Matrix */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between border-b pb-2">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    ERP Module Access & Action Permissions
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Selected actions: {selectedPerms.size} permission{selectedPerms.size === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs px-2"
                    onClick={() => {
                      const all = new Set<string>();
                      for (const m of ERP_MODULES) {
                        all.add(m.permission);
                        for (const r of m.resources) {
                          for (const a of r.actions) {
                            all.add(m.key + "." + r.resource + "." + a);
                          }
                        }
                      }
                      setSelectedPerms(all);
                    }}
                  >
                    Select All
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs px-2"
                    onClick={() => setSelectedPerms(new Set())}
                  >
                    Clear All
                  </Button>
                </div>
              </div>

              {/* Accordion/Cards for 9 Modules */}
              <div className="space-y-3">
                {ERP_MODULES.map((mod) => {
                  const isDashboardChecked = selectedPerms.has(mod.permission);

                  return (
                    <div
                      key={mod.key}
                      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-card overflow-hidden"
                    >
                      {/* Module Header Bar */}
                      <div className="p-3 bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            id={"dash-" + mod.key}
                            checked={isDashboardChecked}
                            onChange={() => togglePermission(mod.permission)}
                            className="rounded border-slate-300 text-orange-500 focus:ring-orange-500 size-4 cursor-pointer"
                          />
                          <label htmlFor={"dash-" + mod.key} className="cursor-pointer">
                            <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{mod.name}</span>
                            <span className="ml-2 text-[11px] font-mono text-muted-foreground">
                              ({mod.permission})
                            </span>
                          </label>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => selectAllModulePerms(mod.key, true)}
                            className="text-[11px] font-medium text-orange-600 dark:text-orange-400 hover:underline"
                          >
                            Check All
                          </button>
                          <span className="text-slate-300">·</span>
                          <button
                            type="button"
                            onClick={() => selectAllModulePerms(mod.key, false)}
                            className="text-[11px] font-medium text-slate-500 hover:underline"
                          >
                            Uncheck
                          </button>
                        </div>
                      </div>

                      {/* Granular Action Checkboxes */}
                      <div className="p-3.5 space-y-3">
                        {mod.resources.map((res) => (
                          <div key={res.resource} className="space-y-1.5">
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                              {res.label}
                            </span>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                              {res.actions.map((act) => {
                                const code = mod.key + "." + res.resource + "." + act;
                                const isChecked = selectedPerms.has(code);

                                return (
                                  <label
                                    key={act}
                                    className={`flex items-center gap-2 p-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                                      isChecked
                                        ? "bg-orange-500/10 border-orange-500/30 text-orange-700 dark:text-orange-300 font-semibold"
                                        : "bg-background border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => togglePermission(code)}
                                      className="rounded border-slate-300 text-orange-500 focus:ring-orange-500 size-3.5"
                                    />
                                    <span className="capitalize">{act}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t">
            <Button variant="outline" onClick={() => setIsRoleModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => saveRoleMutation.mutate()}
              disabled={saveRoleMutation.isPending || !roleName.trim()}
              className="bg-orange-500 hover:bg-orange-600 text-white font-semibold"
            >
              {saveRoleMutation.isPending && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              {editingRoleId ? "Save Changes" : "Create Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* DIALOG: ASSIGN USER ROLE */}
      {/* ======================================================== */}
      <Dialog open={isUserRoleModalOpen} onOpenChange={setIsUserRoleModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Assign Workspace Role</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Select the role to assign to {selectedUser?.fullName} ({selectedUser?.email}). The user will inherit all module and action permissions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Select Role</Label>
              <Select value={targetRoleId} onValueChange={setTargetRoleId}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="Choose a role..." />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.id} className="text-xs">
                      <span className="font-semibold">{r.name}</span>
                      {r.description && <span className="text-muted-foreground ml-2">({r.description})</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsUserRoleModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => assignUserRoleMutation.mutate()}
              disabled={assignUserRoleMutation.isPending || !targetRoleId}
              className="bg-orange-500 hover:bg-orange-600 text-white font-semibold"
            >
              {assignUserRoleMutation.isPending && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              Save Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* ======================================================== */}
      {/* DIALOG: CHANGE WORKSPACE ADDRESS (3-30 CHARS, 30-DAY THROTTLE) */}
      {/* ======================================================== */}
      <Dialog open={isRenameModalOpen} onOpenChange={setIsRenameModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Globe className="size-5 text-primary" /> Change Workspace Address
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Update your organization's subdomain address. 3–30 lowercase letters, numbers, and hyphens.
            </DialogDescription>
          </DialogHeader>

          {renamedSuccessResult ? (
            <div className="space-y-4 py-3">
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-center space-y-2">
                <CheckCircle2 className="size-8 text-emerald-600 dark:text-emerald-400 mx-auto" />
                <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                  Workspace Address Changed!
                </h4>
                <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80">
                  Your workspace is now live at:
                </p>
                <div className="font-mono text-sm font-bold text-emerald-900 dark:text-emerald-100 p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded border border-emerald-300 dark:border-emerald-700">
                  {renamedSuccessResult.newWorkspaceUrl}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Your previous address (<span className="font-mono">{renamedSuccessResult.oldSlug}</span>) will redirect to the new address for 30 days.
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  className="w-full text-xs h-9 bg-primary text-white hover:bg-primary/90"
                  onClick={() => {
                    window.location.href = `${renamedSuccessResult.newWorkspaceUrl}/settings`;
                  }}
                >
                  Go to New Workspace Address
                </Button>
                <Button
                  variant="outline"
                  className="text-xs h-9"
                  onClick={() => {
                    setIsRenameModalOpen(false);
                    setRenamedSuccessResult(null);
                  }}
                >
                  Close
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-title">Current Address</Label>
                <div className="font-mono text-xs px-3 py-2 rounded border bg-muted/40 text-muted-foreground">
                  {branding.slug}.{branding.baseDomain || "localhost"}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-title">New Address (3–30 chars)</Label>
                  {newSlug && newSlug !== branding.slug && (
                    <span className="text-[11px] font-medium flex items-center gap-1">
                      {slugCheck.checking ? (
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Loader2 className="size-3 animate-spin" /> Checking...
                        </span>
                      ) : slugCheck.available ? (
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                          <CheckCircle2 className="size-3" /> Available
                        </span>
                      ) : (
                        <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1 font-semibold">
                          <AlertCircle className="size-3" /> {slugCheck.reason === "too_short" ? "Min 3 chars" : slugCheck.reason === "too_long" ? "Max 30 chars" : slugCheck.reason === "reserved" ? "Reserved word" : slugCheck.reason === "consecutive_hyphens" ? "No consecutive hyphens" : "Not available"}
                        </span>
                      )}
                    </span>
                  )}
                </div>

                <div className="flex items-center rounded-md border border-border-color bg-white dark:bg-slate-800 px-3 py-1.5 focus-within:ring-1 focus-within:ring-primary">
                  <input
                    type="text"
                    placeholder="new-workspace-name"
                    value={newSlug}
                    maxLength={30}
                    onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    className="w-full bg-transparent text-xs text-title focus:outline-none font-mono"
                  />
                  <span className="text-xs font-mono text-muted-foreground whitespace-nowrap pl-1">
                    .{branding.baseDomain || "localhost"}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300 space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <AlertCircle className="size-3.5 text-amber-600" /> 30-Day Cooldown Notice
                </div>
                <p className="text-[11px] text-amber-700/80 dark:text-amber-300/80">
                  You can only change this address once every 30 days. Your old address will automatically 301-redirect to this new address for 30 days.
                </p>
              </div>

              <div className="flex items-start gap-2 pt-1">
                <input
                  type="checkbox"
                  id="acknowledge-redirect"
                  checked={hasAcknowledgedRedirect}
                  onChange={(e) => setHasAcknowledgedRedirect(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                />
                <label htmlFor="acknowledge-redirect" className="text-xs text-muted-foreground cursor-pointer select-none">
                  I understand this address will change immediately and can only be changed again after 30 days.
                </label>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsRenameModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={
                    !newSlug ||
                    newSlug === branding.slug ||
                    newSlug.length < 3 ||
                    newSlug.length > 30 ||
                    slugCheck.available !== true ||
                    !hasAcknowledgedRedirect ||
                    renameWorkspaceMutation.isPending
                  }
                  onClick={() => renameWorkspaceMutation.mutate()}
                  className="bg-primary hover:bg-primary/90 text-white"
                >
                  {renameWorkspaceMutation.isPending ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin mr-1.5" />
                      Renaming...
                    </>
                  ) : (
                    "Confirm Address Change"
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
