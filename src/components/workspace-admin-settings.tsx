import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { usePermissions } from "@/lib/permissions";
import { ERP_MODULES } from "@/lib/erp-modules";
import {
  Shield, ShieldCheck, Plus, Search, Edit2, Copy, Trash2,
  Users, Check, X, CheckCircle2, AlertCircle, Loader2,
  Sparkles, Layers, Sliders, ToggleLeft, ToggleRight, Building, Lock
} from "lucide-react";
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
        {/* TAB 4: GENERAL WORKSPACE INFO */}
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
    </div>
  );
}
