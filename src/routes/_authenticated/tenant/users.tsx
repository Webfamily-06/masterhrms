import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Users,
  UserPlus,
  ShieldCheck,
  Search,
  Shield,
  Loader2,
  Mail,
  CheckCircle2,
  Edit2,
  KeyRound,
  Trash2,
  MoreVertical,
  Briefcase,
  Copy,
  Check,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/tenant/users")({
  component: TenantUsersPage,
  head: () => ({
    meta: [{ title: "Users & Access Control — Master HRMS" }],
  }),
});

interface WorkspaceUser {
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
  employee?: {
    id: string;
    employeeCode: string;
    position?: string;
  } | null;
  twoFactorEnabled?: boolean;
  legacyRoles: string[];
  createdAt: string;
}

function TenantUsersPage() {
  const qc = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  // Create User Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    fullName: "",
    email: "",
    password: "",
    roleId: "",
    employeeId: "",
  });

  // Edit User Modal State
  const [editingUser, setEditingUser] = useState<WorkspaceUser | null>(null);
  const [editForm, setEditForm] = useState({
    fullName: "",
    roleId: "",
    employeeId: "",
  });

  // Reset Password Modal State
  const [resetTargetUser, setResetTargetUser] = useState<WorkspaceUser | null>(null);
  const [resetResult, setResetResult] = useState<{ temporaryPassword?: string } | null>(null);
  const [hasCopied, setHasCopied] = useState(false);

  // Delete User Modal State
  const [deleteTargetUser, setDeleteTargetUser] = useState<WorkspaceUser | null>(null);

  // 1. Fetch Workspace Users
  const { data: users = [], isLoading } = useQuery<WorkspaceUser[]>({
    queryKey: ["workspace-users-list"],
    queryFn: async () => {
      try {
        const res = await api.get("/workspace/users");
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  // 2. Fetch Workspace Roles for Selectors
  const { data: roles = [] } = useQuery<any[]>({
    queryKey: ["workspace-roles-dropdown"],
    queryFn: async () => {
      try {
        const res = await api.get("/workspace/roles");
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  // 3. Fetch Employees for Mapping Selector
  const { data: employees = [] } = useQuery<any[]>({
    queryKey: ["workspace-employees-dropdown"],
    queryFn: async () => {
      try {
        const res = await api.get("/api/employees?limit=200");
        return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  // Create User Mutation
  const createUserMutation = useMutation({
    mutationFn: async (payload: typeof createForm) => {
      return await api.post("/workspace/users", payload);
    },
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ["workspace-users-list"] });
      toast.success(res?.message || "User account created successfully!");
      if (res?.temporaryPassword) {
        toast.info(`Temporary password: ${res.temporaryPassword}`, { duration: 10000 });
      }
      setIsCreateOpen(false);
      setCreateForm({ fullName: "", email: "", password: "", roleId: "", employeeId: "" });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Failed to create user.");
    },
  });

  // Edit User Mutation
  const editUserMutation = useMutation({
    mutationFn: async ({ userId, payload }: { userId: string; payload: typeof editForm }) => {
      return await api.put(`/workspace/users/${userId}`, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspace-users-list"] });
      toast.success("User profile updated successfully!");
      setEditingUser(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Failed to update user.");
    },
  });

  // Reset Password Mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await api.post(`/workspace/users/${userId}/reset-password`, {});
    },
    onSuccess: (res: any) => {
      setResetResult({ temporaryPassword: res?.temporaryPassword });
      toast.success("Password reset successfully!");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Failed to reset password.");
    },
  });

  // Delete User Mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await api.delete(`/workspace/users/${userId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspace-users-list"] });
      toast.success("User removed from workspace successfully.");
      setDeleteTargetUser(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Failed to remove user.");
    },
  });

  const handleOpenEdit = (user: WorkspaceUser) => {
    setEditingUser(user);
    setEditForm({
      fullName: user.fullName || "",
      roleId: user.assignedRole?.id || "",
      employeeId: user.employee?.id || "",
    });
  };

  const handleCopyPassword = (pwd?: string) => {
    if (!pwd) return;
    navigator.clipboard.writeText(pwd);
    setHasCopied(true);
    toast.success("Password copied to clipboard!");
    setTimeout(() => setHasCopied(false), 2000);
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = searchTerm.toLowerCase();
      const name = (u.fullName || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      const matchesSearch = name.includes(q) || email.includes(q);

      if (!matchesSearch) return false;
      if (roleFilter !== "all") {
        if (roleFilter === "none") return !u.assignedRole;
        return u.assignedRole?.id === roleFilter;
      }
      return true;
    });
  }, [users, searchTerm, roleFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Users & Access Control
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage authenticated portal users, assign custom workspace roles, and map accounts to employees.
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="gap-2 bg-[#FF6F28] hover:bg-[#e05917] text-white">
          <UserPlus className="h-4 w-4" />
          Add User
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name or email..."
            className="pl-8 text-xs"
          />
        </div>

        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[180px] text-xs">
            <SelectValue placeholder="Filter by Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="none">Unassigned Role</SelectItem>
            {roles.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="border-border/80 shadow-xs">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border/60 uppercase tracking-wider text-[11px] text-muted-foreground font-semibold">
                <tr>
                  <th className="p-3.5">User</th>
                  <th className="p-3.5">Assigned Role</th>
                  <th className="p-3.5">Mapped Employee</th>
                  <th className="p-3.5">Created At</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                      Loading workspace users...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => {
                    const isSuperAdmin = user.legacyRoles.includes("super_admin");
                    const roleName = user.assignedRole?.name || (user.legacyRoles.includes("admin") ? "Workspace Admin" : "Standard User");

                    return (
                      <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3.5 flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                              {user.fullName.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-semibold text-foreground flex items-center gap-1.5">
                              {user.fullName}
                              {isSuperAdmin && (
                                <Badge variant="secondary" className="text-[10px] bg-purple-500/10 text-purple-600">
                                  Super Admin
                                </Badge>
                              )}
                            </div>
                            <div className="text-[11px] text-muted-foreground">{user.email}</div>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <Badge
                            variant="outline"
                            className="bg-orange-500/10 text-[#FF6F28] border-orange-500/20 font-medium"
                          >
                            <Shield className="h-3 w-3 mr-1" />
                            {roleName}
                          </Badge>
                        </td>
                        <td className="p-3.5">
                          {user.employee ? (
                            <Badge variant="secondary" className="gap-1 font-mono text-[11px]">
                              <Briefcase className="h-3 w-3 text-muted-foreground" />
                              {user.employee.employeeCode}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-[11px]">Not mapped</span>
                          )}
                        </td>
                        <td className="p-3.5 text-muted-foreground">
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}
                        </td>
                        <td className="p-3.5 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44 text-xs">
                              <DropdownMenuItem
                                onClick={() => handleOpenEdit(user)}
                                disabled={isSuperAdmin}
                                className="cursor-pointer gap-2"
                              >
                                <Edit2 className="h-3.5 w-3.5 text-blue-600" />
                                Edit Profile & Role
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setResetTargetUser(user);
                                  setResetResult(null);
                                }}
                                disabled={isSuperAdmin}
                                className="cursor-pointer gap-2"
                              >
                                <KeyRound className="h-3.5 w-3.5 text-amber-600" />
                                Reset Password
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setDeleteTargetUser(user)}
                                disabled={isSuperAdmin}
                                className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Remove from Workspace
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── CREATE USER MODAL ── */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add User to Workspace</DialogTitle>
            <DialogDescription className="text-xs">
              Provision a new user account with portal access, role permissions, and employee linkage.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Full Name *</Label>
              <Input
                value={createForm.fullName}
                onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                placeholder="Jane Doe"
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Email Address *</Label>
              <Input
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                placeholder="jane@company.com"
                className="text-xs"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Password (Leave blank to auto-generate)</Label>
              <Input
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                placeholder="Min 6 characters"
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Workspace Role</Label>
              <Select
                value={createForm.roleId}
                onValueChange={(val) => setCreateForm({ ...createForm, roleId: val })}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Select a role..." />
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
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Link to Existing Employee (Optional)</Label>
              <Select
                value={createForm.employeeId}
                onValueChange={(val) => setCreateForm({ ...createForm, employeeId: val })}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Select employee to map..." />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp: any) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.employeeCode} — {emp.firstName} {emp.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              onClick={() => createUserMutation.mutate(createForm)}
              disabled={!createForm.email || !createForm.fullName || createUserMutation.isPending}
              className="text-xs bg-[#FF6F28] hover:bg-[#e05917] text-white"
            >
              {createUserMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── EDIT USER MODAL ── */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User Profile</DialogTitle>
            <DialogDescription className="text-xs">
              Update user display name, assigned workspace role, or mapped employee record.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Full Name</Label>
              <Input
                value={editForm.fullName}
                onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Workspace Role</Label>
              <Select
                value={editForm.roleId}
                onValueChange={(val) => setEditForm({ ...editForm, roleId: val })}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Select role..." />
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
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Mapped Employee</Label>
              <Select
                value={editForm.employeeId}
                onValueChange={(val) => setEditForm({ ...editForm, employeeId: val })}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Select employee to map..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No employee mapped</SelectItem>
                  {employees.map((emp: any) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.employeeCode} — {emp.firstName} {emp.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)} className="text-xs">
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (editingUser) {
                  editUserMutation.mutate({ userId: editingUser.id, payload: editForm });
                }
              }}
              disabled={editUserMutation.isPending}
              className="text-xs bg-[#FF6F28] hover:bg-[#e05917] text-white"
            >
              {editUserMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── RESET PASSWORD MODAL ── */}
      <Dialog open={!!resetTargetUser} onOpenChange={(open) => !open && setResetTargetUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-amber-500" /> Reset User Password
            </DialogTitle>
            <DialogDescription className="text-xs">
              Generate a secure temporary password for <strong>{resetTargetUser?.fullName}</strong> ({resetTargetUser?.email}).
            </DialogDescription>
          </DialogHeader>

          {resetResult?.temporaryPassword ? (
            <div className="space-y-4 py-3">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-800 dark:text-emerald-200 text-xs">
                Password has been successfully updated! Provide this temporary credential to the user:
              </div>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={resetResult.temporaryPassword}
                  className="font-mono text-sm bg-muted select-all"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCopyPassword(resetResult.temporaryPassword)}
                  className="gap-1.5 shrink-0"
                >
                  {hasCopied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  {hasCopied ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="py-3 text-xs text-muted-foreground">
              Clicking &quot;Generate New Password&quot; will immediately invalidate existing sessions and generate a secure temporary credential.
            </div>
          )}

          <DialogFooter>
            {resetResult?.temporaryPassword ? (
              <Button onClick={() => setResetTargetUser(null)} className="w-full text-xs">
                Done
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setResetTargetUser(null)} className="text-xs">
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (resetTargetUser) {
                      resetPasswordMutation.mutate(resetTargetUser.id);
                    }
                  }}
                  disabled={resetPasswordMutation.isPending}
                  className="text-xs bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {resetPasswordMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate New Password"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── DELETE USER MODAL ── */}
      <Dialog open={!!deleteTargetUser} onOpenChange={(open) => !open && setDeleteTargetUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Remove User from Workspace
            </DialogTitle>
            <DialogDescription className="text-xs">
              Are you sure you want to remove <strong>{deleteTargetUser?.fullName}</strong> from this workspace? They will lose all access to company records immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTargetUser(null)} className="text-xs">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteTargetUser) {
                  deleteUserMutation.mutate(deleteTargetUser.id);
                }
              }}
              disabled={deleteUserMutation.isPending}
              className="text-xs"
            >
              {deleteUserMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Yes, Remove User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
