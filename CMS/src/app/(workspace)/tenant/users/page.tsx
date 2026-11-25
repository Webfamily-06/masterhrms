'use client';

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AccessDenied } from "@/components/access-denied";
import { usePermissions } from "@/lib/permissions";

type WorkspaceUser = {
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
  twoFactorEnabled?: boolean;
  legacyRoles: string[];
  createdAt: string;
};

type RoleOption = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
};

export default function TenantUsersPage() {
  const { isWorkspaceAdmin, isSuperAdmin, loading, profile } = usePermissions();
  const queryClient = useQueryClient();

  const isHR = profile?.roles?.includes("hr_admin");
  const isAuthorized = isWorkspaceAdmin || isSuperAdmin || isHR;

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  // Add User Modal
  const [createOpen, setCreateOpen] = useState(false);
  const [newFullName, setNewFullName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRoleId, setNewRoleId] = useState("");

  // Change Role Modal
  const [roleTarget, setRoleTarget] = useState<WorkspaceUser | null>(null);
  const [targetRoleId, setTargetRoleId] = useState("");

  // Disable 2FA Modal
  const [disable2faTarget, setDisable2faTarget] = useState<WorkspaceUser | null>(null);

  // Reset Password Modal
  const [resetPwTarget, setResetPwTarget] = useState<WorkspaceUser | null>(null);
  const [resetPasswordVal, setResetPasswordVal] = useState("");

  const { data: users = [], isLoading: usersLoading } = useQuery<WorkspaceUser[]>({
    queryKey: ["workspace-users-list"],
    queryFn: async () => {
      const res: any = await api.get("/workspace/users");
      return Array.isArray(res) ? res : res?.data || [];
    },
    enabled: isAuthorized,
  });

  const { data: roles = [] } = useQuery<RoleOption[]>({
    queryKey: ["workspace-roles"],
    queryFn: async () => {
      const res: any = await api.get("/workspace/roles");
      return Array.isArray(res) ? res : res?.data || [];
    },
    enabled: isAuthorized,
  });

  const createUserMutation = useMutation({
    mutationFn: async () => {
      return await api.post("/workspace/users", {
        fullName: newFullName.trim(),
        email: newEmail.trim(),
        password: newPassword,
        roleId: newRoleId || roles[0]?.id,
      });
    },
    onSuccess: () => {
      toast.success("Workspace user created successfully.");
      setCreateOpen(false);
      setNewFullName("");
      setNewEmail("");
      setNewPassword("");
      setNewRoleId("");
      queryClient.invalidateQueries({ queryKey: ["workspace-users-list"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to create user.");
    },
  });

  const assignRoleMutation = useMutation({
    mutationFn: async () => {
      if (!roleTarget || !targetRoleId) return;
      return await api.put(`/workspace/users/${roleTarget.id}/role`, { roleId: targetRoleId });
    },
    onSuccess: () => {
      toast.success(`Role updated for ${roleTarget?.fullName}.`);
      setRoleTarget(null);
      queryClient.invalidateQueries({ queryKey: ["workspace-users-list"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update role.");
    },
  });

  const disable2faMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await api.post(`/auth/admin/users/${userId}/disable-2fa`, {});
    },
    onSuccess: (res: any) => {
      toast.success(res?.message || "Two-Factor Authentication disabled.");
      setDisable2faTarget(null);
      queryClient.invalidateQueries({ queryKey: ["workspace-users-list"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to disable 2FA.");
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async () => {
      if (!resetPwTarget) return;
      return await api.post(`/workspace/users/${resetPwTarget.id}/reset-password`, {
        newPassword: resetPasswordVal,
      });
    },
    onSuccess: () => {
      toast.success(`Password reset for ${resetPwTarget?.fullName}.`);
      setResetPwTarget(null);
      setResetPasswordVal("");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to reset password.");
    },
  });

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q);
      const roleName = u.assignedRole?.name || "Employee";
      const matchesRole =
        roleFilter === "all" || roleName.toLowerCase() === roleFilter.toLowerCase();
      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  const twoFaEnabledCount = users.filter((u) => u.twoFactorEnabled).length;
  const adminCount = users.filter((u) => u.assignedRole?.name === "Workspace Admin").length;

  if (!loading && !isAuthorized) {
    return <AccessDenied moduleName="Tenant User Management" requiredPermission="workspace.users.manage" />;
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Tenant Users & Access Control"
        description="Manage organization members, RBAC roles, password resets, and 2FA security overrides."
        actions={
          <Button
            size="sm"
            onClick={() => {
              setNewRoleId(roles[0]?.id || "");
              setCreateOpen(true);
            }}
            className="gap-1.5"
          >
            <i className="ph ph-user-plus" />
            Add User
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Users", value: users.length, icon: "ph-users", tone: "bg-primary/10 text-primary" },
          { label: "Workspace Admins", value: adminCount, icon: "ph-shield-star", tone: "bg-amber-500/10 text-amber-600" },
          { label: "2FA Protected", value: twoFaEnabledCount, icon: "ph-shield-check", tone: "bg-emerald-500/10 text-emerald-600" },
          { label: "Active Roles", value: roles.length, icon: "ph-key", tone: "bg-sky-500/10 text-sky-600" },
        ].map((kpi) => (
          <Card key={kpi.label} className="border border-border/80 rounded-xl bg-card shadow-xs">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">{kpi.label}</p>
                <p className="text-2xl font-bold text-foreground mt-1">{kpi.value}</p>
              </div>
              <div className={cn("size-10 rounded-xl flex items-center justify-center text-lg", kpi.tone)}>
                <i className={cn("ph", kpi.icon)} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <i className="ph ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm" />
            <Input
              placeholder="Search users by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-52 h-9 text-xs">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {roles.map((r) => (
                <SelectItem key={r.id} value={r.name}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Users Table */}
      <div className="overflow-x-auto border border-border/80 rounded-lg bg-card">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-border/70">
              <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3">User</th>
              <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3">Role</th>
              <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3">2FA Security</th>
              <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3">Joined</th>
              <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {usersLoading ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                  <i className="ph ph-spinner-gap animate-spin text-xl text-primary block mx-auto mb-2" />
                  Loading tenant users...
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                  No users matched your filter.
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-muted/40 transition-colors">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-8">
                        {u.avatarUrl && <AvatarImage src={u.avatarUrl} alt={u.fullName} />}
                        <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                          {u.fullName.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-foreground">{u.fullName}</p>
                        <p className="text-[11px] text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <Badge variant="soft" className="text-[11px]">
                      {u.assignedRole?.name || "Employee"}
                    </Badge>
                  </td>
                  <td className="p-3">
                    {u.twoFactorEnabled ? (
                      <Badge variant="success" className="text-[10px] gap-1">
                        <i className="ph ph-shield-check" />
                        Enabled
                      </Badge>
                    ) : (
                      <Badge variant="warning" className="text-[10px] gap-1">
                        <i className="ph ph-shield-warning" />
                        Disabled
                      </Badge>
                    )}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-3 text-right">
                    <div className="inline-flex items-center gap-1.5 justify-end flex-wrap">
                      {u.twoFactorEnabled && (
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => setDisable2faTarget(u)}
                          className="gap-1 text-rose-600 border-rose-500/30 hover:bg-rose-500/10"
                        >
                          <i className="ph ph-shield-slash" />
                          Disable 2FA
                        </Button>
                      )}
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => {
                          setResetPwTarget(u);
                          setResetPasswordVal("");
                        }}
                        className="gap-1"
                      >
                        <i className="ph ph-key" />
                        Reset Password
                      </Button>
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => {
                          setRoleTarget(u);
                          setTargetRoleId(u.assignedRole?.id || roles[0]?.id || "");
                        }}
                        className="gap-1"
                      >
                        <i className="ph ph-pencil-simple" />
                        Role
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add User Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Add Workspace User</DialogTitle>
            <DialogDescription className="text-xs">
              Create a new user account in this tenant organization.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createUserMutation.mutate();
            }}
            className="space-y-4 py-2"
          >
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Full Name *</Label>
              <Input
                required
                value={newFullName}
                onChange={(e) => setNewFullName(e.target.value)}
                placeholder="Enter full name"
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Work Email *</Label>
              <Input
                required
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="name@company.com"
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Initial Password *</Label>
              <Input
                required
                type="password"
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Workspace Role</Label>
              <Select value={newRoleId} onValueChange={setNewRoleId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={createUserMutation.isPending} className="gap-1.5">
                {createUserMutation.isPending && <i className="ph ph-spinner-gap animate-spin" />}
                Create User
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Change Role Dialog */}
      <Dialog open={Boolean(roleTarget)} onOpenChange={(o) => !o && setRoleTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Change User Role</DialogTitle>
            <DialogDescription className="text-xs">
              Update RBAC permissions for {roleTarget?.fullName} ({roleTarget?.email}).
            </DialogDescription>
          </DialogHeader>
          <div className="py-3 space-y-2">
            <Label className="text-xs font-medium">Workspace Role</Label>
            <Select value={targetRoleId} onValueChange={setTargetRoleId}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Choose role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setRoleTarget(null)}>
              Cancel
            </Button>
            <Button size="sm" disabled={assignRoleMutation.isPending} onClick={() => assignRoleMutation.mutate()}>
              Save Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={Boolean(resetPwTarget)} onOpenChange={(o) => !o && setResetPwTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Reset User Password</DialogTitle>
            <DialogDescription className="text-xs">
              Set a new temporary password for {resetPwTarget?.fullName} ({resetPwTarget?.email}).
            </DialogDescription>
          </DialogHeader>
          <div className="py-3 space-y-2">
            <Label className="text-xs font-medium">New Password *</Label>
            <Input
              type="password"
              minLength={6}
              value={resetPasswordVal}
              onChange={(e) => setResetPasswordVal(e.target.value)}
              placeholder="Minimum 6 characters"
              className="text-xs"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setResetPwTarget(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={resetPasswordMutation.isPending || resetPasswordVal.length < 6}
              onClick={() => resetPasswordMutation.mutate()}
            >
              Update Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disable 2FA Dialog */}
      <Dialog open={Boolean(disable2faTarget)} onOpenChange={(o) => !o && setDisable2faTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <i className="ph ph-shield-slash text-rose-600" />
              Disable User 2FA
            </DialogTitle>
            <DialogDescription className="text-xs">
              Disable Two-Factor Authentication for {disable2faTarget?.fullName} ({disable2faTarget?.email})?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDisable2faTarget(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={disable2faMutation.isPending || !disable2faTarget}
              onClick={() => disable2faTarget && disable2faMutation.mutate(disable2faTarget.id)}
            >
              Confirm Disable 2FA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
