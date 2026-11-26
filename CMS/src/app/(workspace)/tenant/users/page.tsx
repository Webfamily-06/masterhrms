'use client';

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, getAuthToken, setToken } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface WorkspaceRoleOption {
  id: string;
  name: string;
  label?: string;
}

interface WorkspaceUserItem {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
  loginStatus?: "enabled" | "disabled";
  assignedRole?: {
    id: string;
    name: string;
    description?: string | null;
    isActive?: boolean;
  } | null;
  legacyRoles?: string[];
  twoFactorEnabled?: boolean;
  createdAt?: string;
}

function getInitials(name?: string): string {
  const parts = String(name || "U").trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "U";
}

function getDisplayRole(u: WorkspaceUserItem): string {
  if (u.assignedRole?.name) return u.assignedRole.name;
  const legacy = u.legacyRoles?.[0];
  if (!legacy) return "Employee";
  return legacy.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function TenantUsersPage() {
  const queryClient = useQueryClient();

  // View, Search, Filter & Pagination State
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [sortKey, setSortKey] = useState<"name" | "email" | "role" | "status">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Create User Modal State
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    roleId: "",
    loginStatus: "enabled" as "enabled" | "disabled",
  });

  // Edit User Modal State (Matches Screenshot 3)
  const [editTarget, setEditTarget] = useState<WorkspaceUserItem | null>(null);
  const [editForm, setEditForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    roleId: "",
    loginStatus: "enabled" as "enabled" | "disabled",
  });

  // Change Password Modal State (Matches Screenshot 4)
  const [passwordTarget, setPasswordTarget] = useState<WorkspaceUserItem | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  // Delete User Dialog State
  const [deleteTarget, setDeleteTarget] = useState<WorkspaceUserItem | null>(null);

  // Data Queries
  const { data: users = [], isLoading } = useQuery<WorkspaceUserItem[]>({
    queryKey: ["tenant-workspace-users"],
    queryFn: async () => {
      const res: any = await api.get("/workspace/users");
      return Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
    },
  });

  const { data: roles = [] } = useQuery<WorkspaceRoleOption[]>({
    queryKey: ["workspace-roles-list"],
    queryFn: async () => {
      const res: any = await api.get("/workspace/roles");
      return Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
    },
  });

  // 1. Login As User Mutation
  const loginAsMutation = useMutation({
    mutationFn: async (user: WorkspaceUserItem) => {
      const res: any = await api.post(`/workspace/users/${user.id}/login-as`, {});
      return { res: res?.data || res, user };
    },
    onSuccess: ({ res, user }) => {
      const nextToken = res?.token;
      if (!nextToken) {
        toast.error("Failed to create impersonation session.");
        return;
      }
      const currentAdminToken =
        getAuthToken() ||
        localStorage.getItem("auth_token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("master_hrms_token") ||
        "";
      if (currentAdminToken) {
        localStorage.setItem("hrms_tenant_admin_backup_token", currentAdminToken);
      }
      localStorage.setItem("hrms_tenant_impersonation_active", "true");
      localStorage.setItem("hrms_tenant_impersonated_user_name", user.fullName || user.email);
      localStorage.setItem("hrms_tenant_impersonated_user_email", user.email || "");

      setToken(nextToken);
      localStorage.setItem("auth_token", nextToken);
      localStorage.setItem("token", nextToken);
      localStorage.setItem("master_hrms_token", nextToken);

      toast.success(`Logged in as ${user.fullName}. Use "Back to Tenant Portal" to return.`);
      window.location.href = res?.redirectTo || "/me/dashboard";
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to login as user.");
    },
  });

  // 2. Create User Mutation
  const createUserMutation = useMutation({
    mutationFn: async () => {
      if (!createForm.fullName.trim()) throw new Error("Name is required.");
      if (!createForm.email.trim() || !createForm.email.includes("@")) {
        throw new Error("Valid Email is required.");
      }
      if (createForm.password.trim().length < 6) {
        throw new Error("Password must be at least 6 characters.");
      }
      return await api.post("/workspace/users", {
        fullName: createForm.fullName.trim(),
        email: createForm.email.trim(),
        phone: createForm.phone.trim() || undefined,
        password: createForm.password.trim(),
        roleId: createForm.roleId && createForm.roleId !== "__none__" ? createForm.roleId : undefined,
        loginStatus: createForm.loginStatus,
      });
    },
    onSuccess: () => {
      toast.success("User created successfully.");
      queryClient.invalidateQueries({ queryKey: ["tenant-workspace-users"] });
      setCreateOpen(false);
      setCreateForm({ fullName: "", email: "", phone: "", password: "", roleId: "", loginStatus: "enabled" });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to create user.");
    },
  });

  // 3. Edit User Mutation
  const editUserMutation = useMutation({
    mutationFn: async () => {
      if (!editTarget) return;
      if (!editForm.fullName.trim()) throw new Error("Name is required.");
      if (!editForm.email.trim() || !editForm.email.includes("@")) {
        throw new Error("Valid Email is required.");
      }
      return await api.put(`/workspace/users/${editTarget.id}`, {
        fullName: editForm.fullName.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone.trim(),
        roleId: editForm.roleId && editForm.roleId !== "__none__" ? editForm.roleId : undefined,
        loginStatus: editForm.loginStatus,
      });
    },
    onSuccess: () => {
      toast.success("User details updated.");
      queryClient.invalidateQueries({ queryKey: ["tenant-workspace-users"] });
      setEditTarget(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to update user.");
    },
  });

  // 4. Change Password Mutation (Updates userId passwordHash in PostgreSQL)
  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      if (!passwordTarget) return;
      if (newPassword.trim().length < 6) {
        throw new Error("Password must be at least 6 characters.");
      }
      if (newPassword !== confirmPassword) {
        throw new Error("Passwords do not match.");
      }
      return await api.post(`/workspace/users/${passwordTarget.id}/reset-password`, {
        newPassword: newPassword.trim(),
      });
    },
    onSuccess: () => {
      toast.success(`Password updated for ${passwordTarget?.fullName}.`);
      setPasswordTarget(null);
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to update password.");
    },
  });

  // 5. Delete User Mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => api.delete(`/workspace/users/${userId}`),
    onSuccess: () => {
      toast.success("User deleted from workspace.");
      queryClient.invalidateQueries({ queryKey: ["tenant-workspace-users"] });
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to delete user.");
    },
  });

  // Filter, Sort & Paginate
  const filteredUsers = useMemo(() => {
    const q = appliedSearch.trim().toLowerCase();
    const list = users.filter((u) => {
      const roleName = getDisplayRole(u);
      const status = u.loginStatus || "enabled";
      if (roleFilter !== "all" && roleName.toLowerCase() !== roleFilter.toLowerCase()) return false;
      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (!q) return true;
      return (
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        String(u.phone || "").toLowerCase().includes(q) ||
        roleName.toLowerCase().includes(q)
      );
    });

    list.sort((a, b) => {
      const val = (u: WorkspaceUserItem) => {
        if (sortKey === "email") return u.email.toLowerCase();
        if (sortKey === "role") return getDisplayRole(u).toLowerCase();
        if (sortKey === "status") return (u.loginStatus || "enabled").toLowerCase();
        return u.fullName.toLowerCase();
      };
      return sortDir === "asc" ? val(a).localeCompare(val(b)) : val(b).localeCompare(val(a));
    });
    return list;
  }, [users, appliedSearch, roleFilter, statusFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / perPage));
  const safePage = Math.min(page, totalPages);
  const paginatedUsers = filteredUsers.slice((safePage - 1) * perPage, safePage * perPage);
  const startIdx = filteredUsers.length === 0 ? 0 : (safePage - 1) * perPage + 1;
  const endIdx = Math.min(safePage * perPage, filteredUsers.length);

  const uniqueRoleNames = useMemo(
    () => Array.from(new Set(users.map((u) => getDisplayRole(u)))).sort(),
    [users]
  );

  const openEditModal = (u: WorkspaceUserItem) => {
    setEditTarget(u);
    setEditForm({
      fullName: u.fullName || "",
      email: u.email || "",
      phone: u.phone || "",
      roleId: u.assignedRole?.id || "__none__",
      loginStatus: u.loginStatus === "disabled" ? "disabled" : "enabled",
    });
  };

  const openPasswordModal = (u: WorkspaceUserItem) => {
    setPasswordTarget(u);
    setNewPassword("");
    setConfirmPassword("");
    setShowPass(false);
  };

  const toggleSort = (key: "name" | "email" | "role" | "status") => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const activeFilterCount = (roleFilter !== "all" ? 1 : 0) + (statusFilter !== "all" ? 1 : 0);

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 py-4 space-y-5">
      <PageHeader
        title="Manage Users"
        description="Manage workspace user accounts, roles, login status, passwords, and direct user portal access."
        actions={
          <div className="flex items-center gap-2">
            <Link href="/tenant/audit-logs">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9"
                title="Login & Activity History"
              >
                <i className="ph ph-clock-counter-clockwise text-base" />
              </Button>
            </Link>
            <Button
              type="button"
              size="sm"
              onClick={() => setCreateOpen(true)}
              className="h-9 px-3.5 bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shadow-xs"
              title="Add User"
            >
              <i className="ph-bold ph-plus text-sm" />
              Add User
            </Button>
          </div>
        }
      />

      <Card className="border border-border/80 rounded-xl bg-card shadow-xs">
        <CardContent className="p-4 space-y-5">
          {/* Toolbar: Search, List/Grid Toggle, Per Page, Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setAppliedSearch(searchInput);
                setPage(1);
              }}
              className="flex items-center gap-2 flex-1 min-w-[240px] max-w-md"
            >
              <div className="relative flex-1">
                <i className="ph ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm" />
                <Input
                  value={searchInput}
                  onChange={(e) => {
                    setSearchInput(e.target.value);
                    if (!e.target.value) setAppliedSearch("");
                  }}
                  placeholder="Search users..."
                  className="pl-9 h-9 text-xs"
                />
              </div>
              <Button
                type="submit"
                size="sm"
                className="h-9 px-4 text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Search
              </Button>
            </form>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center rounded-lg border border-border/80 p-0.5 bg-muted/30">
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "h-8 w-8 rounded-md flex items-center justify-center transition-colors cursor-pointer",
                    viewMode === "list"
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  title="List View"
                >
                  <i className="ph ph-list-bullets text-base" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "h-8 w-8 rounded-md flex items-center justify-center transition-colors cursor-pointer",
                    viewMode === "grid"
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  title="Grid View"
                >
                  <i className="ph ph-squares-four text-base" />
                </button>
              </div>

              <Select
                value={String(perPage)}
                onValueChange={(v) => {
                  setPerPage(Number(v));
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 w-[124px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 per page</SelectItem>
                  <SelectItem value="25">25 per page</SelectItem>
                  <SelectItem value="50">50 per page</SelectItem>
                </SelectContent>
              </Select>

              <Popover>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" size="sm" className="h-9 text-xs gap-1.5">
                    <i className="ph ph-funnel text-sm" />
                    Filters
                    {activeFilterCount > 0 && (
                      <span className="size-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                        {activeFilterCount}
                      </span>
                    )}
                    <i className="ph ph-caret-down text-xs opacity-70" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-64 p-4 space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Role</Label>
                    <Select
                      value={roleFilter}
                      onValueChange={(v) => {
                        setRoleFilter(v);
                        setPage(1);
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        {uniqueRoleNames.map((rn) => (
                          <SelectItem key={rn} value={rn}>
                            {rn}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Login Status</Label>
                    <Select
                      value={statusFilter}
                      onValueChange={(v) => {
                        setStatusFilter(v);
                        setPage(1);
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="enabled">Enabled</SelectItem>
                        <SelectItem value="disabled">Disabled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {activeFilterCount > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setRoleFilter("all");
                        setStatusFilter("all");
                        setPage(1);
                      }}
                      className="w-full h-8 text-xs text-rose-600 hover:bg-rose-500/10"
                    >
                      Reset Filters
                    </Button>
                  )}
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              <i className="ph ph-spinner-gap animate-spin text-2xl text-primary block mx-auto mb-2" />
              Loading workspace users...
            </div>
          ) : paginatedUsers.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
              No users match your search or filters.
            </div>
          ) : viewMode === "grid" ? (
            /* ── CARD GRID VIEW (Matches Screenshot 1) ── */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {paginatedUsers.map((u) => {
                const isEnabled = (u.loginStatus || "enabled") === "enabled";
                const roleDisplay = getDisplayRole(u);
                return (
                  <div
                    key={u.id}
                    className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs hover:border-primary/40 transition-colors flex flex-col justify-between gap-3 relative"
                  >
                    {/* Top-right Enabled / Disabled Pill */}
                    <div className="flex justify-end">
                      <span
                        className={cn(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold",
                          isEnabled
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                        )}
                      >
                        {isEnabled ? "Enabled" : "Disabled"}
                      </span>
                    </div>

                    {/* Centered Avatar + Name + Role Pill */}
                    <div className="flex flex-col items-center text-center gap-2 -mt-2">
                      <div className="relative">
                        <Avatar className="size-16 border-2 border-primary/25 bg-muted">
                          {u.avatarUrl ? <AvatarImage src={u.avatarUrl} alt={u.fullName} /> : null}
                          <AvatarFallback className="text-base font-bold bg-primary/10 text-primary">
                            {getInitials(u.fullName)}
                          </AvatarFallback>
                        </Avatar>
                        <span
                          className={cn(
                            "absolute bottom-0.5 right-0.5 size-3 rounded-full border-2 border-card",
                            isEnabled ? "bg-emerald-500" : "bg-slate-400"
                          )}
                        />
                      </div>
                      <p className="text-sm font-bold text-foreground truncate max-w-full">{u.fullName}</p>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-primary/10 text-primary">
                        {roleDisplay}
                      </span>
                    </div>

                    {/* Soft Contact Details Box */}
                    <div className="rounded-lg bg-muted/45 border border-border/50 px-3 py-2 space-y-1.5 text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-2 min-w-0">
                        <i className="ph ph-envelope-simple text-primary text-sm shrink-0" />
                        <span className="truncate">{u.email}</span>
                      </div>
                      <div className="flex items-center gap-2 min-w-0">
                        <i className="ph ph-phone text-primary text-sm shrink-0" />
                        <span className="truncate">{u.phone || "—"}</span>
                      </div>
                    </div>

                    {/* Bottom 4 Action Icons: Login As, Password, Edit, Delete */}
                    <div className="pt-2.5 border-t border-border/60 flex items-center justify-center gap-3">
                      <button
                        type="button"
                        disabled={!isEnabled || loginAsMutation.isPending}
                        onClick={() => loginAsMutation.mutate(u)}
                        className="size-7 rounded-md inline-flex items-center justify-center text-purple-600 hover:bg-purple-500/10 disabled:opacity-40 transition-colors cursor-pointer"
                        title="Login As User"
                      >
                        <i className="ph ph-user-switch text-base" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openPasswordModal(u)}
                        className="size-7 rounded-md inline-flex items-center justify-center text-amber-600 hover:bg-amber-500/10 transition-colors cursor-pointer"
                        title="Change Password"
                      >
                        <i className="ph ph-key text-base" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(u)}
                        className="size-7 rounded-md inline-flex items-center justify-center text-blue-600 hover:bg-blue-500/10 transition-colors cursor-pointer"
                        title="Edit User"
                      >
                        <i className="ph ph-pencil-simple-line text-base" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(u)}
                        className="size-7 rounded-md inline-flex items-center justify-center text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Delete User"
                      >
                        <i className="ph ph-trash text-base" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ── TABLE LIST VIEW (Matches Screenshot 2) ── */
            <div className="overflow-x-auto border border-border/80 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border/70">
                    <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3 w-16">
                      Avatar
                    </th>
                    <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3">
                      <button
                        type="button"
                        onClick={() => toggleSort("name")}
                        className="inline-flex items-center gap-1 cursor-pointer hover:text-foreground"
                      >
                        Name <i className="ph ph-arrows-down-up text-xs" />
                      </button>
                    </th>
                    <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3">
                      <button
                        type="button"
                        onClick={() => toggleSort("email")}
                        className="inline-flex items-center gap-1 cursor-pointer hover:text-foreground"
                      >
                        Email <i className="ph ph-arrows-down-up text-xs" />
                      </button>
                    </th>
                    <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3">
                      Mobile No
                    </th>
                    <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3">
                      <button
                        type="button"
                        onClick={() => toggleSort("role")}
                        className="inline-flex items-center gap-1 cursor-pointer hover:text-foreground"
                      >
                        Role <i className="ph ph-arrows-down-up text-xs" />
                      </button>
                    </th>
                    <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3">
                      <button
                        type="button"
                        onClick={() => toggleSort("status")}
                        className="inline-flex items-center gap-1 cursor-pointer hover:text-foreground"
                      >
                        Login Status <i className="ph ph-arrows-down-up text-xs" />
                      </button>
                    </th>
                    <th className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground p-3 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {paginatedUsers.map((u) => {
                    const isEnabled = (u.loginStatus || "enabled") === "enabled";
                    const roleDisplay = getDisplayRole(u);
                    return (
                      <tr key={u.id} className="hover:bg-muted/40 transition-colors">
                        <td className="p-3">
                          <Avatar className="size-8 rounded-lg border border-border/70">
                            {u.avatarUrl ? <AvatarImage src={u.avatarUrl} alt={u.fullName} /> : null}
                            <AvatarFallback className="rounded-lg text-[11px] font-bold bg-muted text-foreground">
                              {getInitials(u.fullName)}
                            </AvatarFallback>
                          </Avatar>
                        </td>
                        <td className="p-3 font-semibold text-foreground">{u.fullName}</td>
                        <td className="p-3 text-muted-foreground">{u.email}</td>
                        <td className="p-3 text-foreground">{u.phone || "—"}</td>
                        <td className="p-3">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-muted text-foreground border border-border/70">
                            {roleDisplay}
                          </span>
                        </td>
                        <td className="p-3">
                          <span
                            className={cn(
                              "inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold",
                              isEnabled
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                            )}
                          >
                            {isEnabled ? "Enabled" : "Disabled"}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              disabled={!isEnabled || loginAsMutation.isPending}
                              onClick={() => loginAsMutation.mutate(u)}
                              className="size-7 rounded-md inline-flex items-center justify-center text-purple-600 hover:bg-purple-500/10 disabled:opacity-40 transition-colors cursor-pointer"
                              title="Login As User"
                            >
                              <i className="ph ph-user-switch text-base" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openPasswordModal(u)}
                              className="size-7 rounded-md inline-flex items-center justify-center text-amber-600 hover:bg-amber-500/10 transition-colors cursor-pointer"
                              title="Change Password"
                            >
                              <i className="ph ph-key text-base" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditModal(u)}
                              className="size-7 rounded-md inline-flex items-center justify-center text-blue-600 hover:bg-blue-500/10 transition-colors cursor-pointer"
                              title="Edit User"
                            >
                              <i className="ph ph-pencil-simple-line text-base" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(u)}
                              className="size-7 rounded-md inline-flex items-center justify-center text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer"
                              title="Delete User"
                            >
                              <i className="ph ph-trash text-base" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/60 text-xs text-muted-foreground">
            <span>
              Showing {startIdx} to {endIdx} of {filteredUsers.length} results
            </span>
            <div className="inline-flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-8 text-xs"
              >
                <i className="ph ph-caret-left mr-1" />
                Previous
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pNum) => (
                <Button
                  key={pNum}
                  type="button"
                  size="sm"
                  variant={pNum === safePage ? "default" : "outline"}
                  onClick={() => setPage(pNum)}
                  className={cn(
                    "h-8 w-8 p-0 text-xs",
                    pNum === safePage && "bg-primary hover:bg-primary/90 text-primary-foreground border-primary"
                  )}
                >
                  {pNum}
                </Button>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="h-8 text-xs"
              >
                Next
                <i className="ph ph-caret-right ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── CREATE USER MODAL ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Create User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                value={createForm.fullName}
                onChange={(e) => setCreateForm((p) => ({ ...p, fullName: e.target.value }))}
                placeholder="Enter full name"
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Email <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))}
                placeholder="user@company.com"
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Password <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))}
                placeholder="Minimum 6 characters"
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Mobile Number</Label>
              <Input
                value={createForm.phone}
                onChange={(e) => setCreateForm((p) => ({ ...p, phone: e.target.value }))}
                placeholder="+919876543210"
                className="h-9 text-xs"
              />
              <p className="text-[11px] text-muted-foreground">Format: +[country code][phone number]</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Role</Label>
                <Select
                  value={createForm.roleId || "__none__"}
                  onValueChange={(v) => setCreateForm((p) => ({ ...p, roleId: v }))}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Default Employee</SelectItem>
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Login Status</Label>
                <Select
                  value={createForm.loginStatus}
                  onValueChange={(v: "enabled" | "disabled") => setCreateForm((p) => ({ ...p, loginStatus: v }))}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="enabled">Enabled</SelectItem>
                    <SelectItem value="disabled">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={createUserMutation.isPending}
              onClick={() => createUserMutation.mutate()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── EDIT USER MODAL (Matches Screenshot 3) ── */}
      <Dialog open={Boolean(editTarget)} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Edit User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                value={editForm.fullName}
                onChange={(e) => setEditForm((p) => ({ ...p, fullName: e.target.value }))}
                placeholder="Enter user name"
                className="h-10 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Email <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                placeholder="user@company.com"
                className="h-10 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Mobile Number</Label>
              <Input
                value={editForm.phone}
                onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
                placeholder="+919876543210"
                className="h-10 text-xs"
              />
              <p className="text-[11px] text-muted-foreground">Format: +[country code][phone number]</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Role</Label>
              <Select
                value={editForm.roleId || "__none__"}
                onValueChange={(v) => setEditForm((p) => ({ ...p, roleId: v }))}
              >
                <SelectTrigger className="h-10 text-xs">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Keep Current Role</SelectItem>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Login Status</Label>
              <Select
                value={editForm.loginStatus}
                onValueChange={(v: "enabled" | "disabled") => setEditForm((p) => ({ ...p, loginStatus: v }))}
              >
                <SelectTrigger className="h-10 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="enabled">Enabled</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setEditTarget(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={editUserMutation.isPending}
              onClick={() => editUserMutation.mutate()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── CHANGE PASSWORD MODAL (Matches Screenshot 4) ── */}
      <Dialog open={Boolean(passwordTarget)} onOpenChange={(o) => !o && setPasswordTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Change Password - {passwordTarget?.fullName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Password <span className="text-rose-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  type={showPass ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="h-10 text-xs pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <i className={showPass ? "ph ph-eye-slash text-base" : "ph ph-eye text-base"} />
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Confirm Password <span className="text-rose-500">*</span>
              </Label>
              <Input
                type={showPass ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="h-10 text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setPasswordTarget(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={changePasswordMutation.isPending}
              onClick={() => changePasswordMutation.mutate()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Change Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── DELETE USER CONFIRMATION DIALOG ── */}
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User &quot;{deleteTarget?.fullName}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes <strong>{deleteTarget?.email}</strong> from your organization workspace and revokes their access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700 text-white"
              onClick={() => deleteTarget && deleteUserMutation.mutate(deleteTarget.id)}
            >
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
