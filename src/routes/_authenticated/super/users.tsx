import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Users,
  Search,
  Plus,
  Key,
  Edit,
  Trash2,
  Building2,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  LayoutGrid,
  List,
  UserCheck,
  Lock,
  Mail,
  Calendar,
  History,
  Globe,
  Clock,
  Laptop,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/super/users")({
  component: SuperUsersPage,
  head: () => ({
    meta: [{ title: "Platform Users Management — Super Admin" }],
  }),
});

export function SuperUsersPage() {
  const qc = useQueryClient();

  // View state
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [search, setSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState("all");
  const [selectedTenant, setSelectedTenant] = useState("all");

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [passwordUser, setPasswordUser] = useState<any | null>(null);
  const [deletingUser, setDeletingUser] = useState<any | null>(null);

  // Login History Drawer state
  const [isLoginHistoryOpen, setIsLoginHistoryOpen] = useState(false);
  const [loginHistoryUserFilter, setLoginHistoryUserFilter] = useState<any | null>(null);
  const [loginHistorySearch, setLoginHistorySearch] = useState("");

  // Form states
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "admin",
    tenantId: "",
  });
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Fetch all tenants for workspace assignment
  const { data: tenants = [] } = useQuery({
    queryKey: ["super-tenants-list"],
    queryFn: async () => {
      const res = await api.get("/super/tenants");
      return Array.isArray(res) ? res : Array.isArray((res as any)?.data) ? (res as any).data : [];
    },
  });

  // Fetch users across all workspaces
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["super-users-list", selectedRole, selectedTenant],
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (selectedRole !== "all") qs.set("role", selectedRole);
      if (selectedTenant !== "all") qs.set("tenantId", selectedTenant);
      const query = qs.toString() ? `?${qs.toString()}` : "";
      const res = await api.get(`/super/users${query}`);
      return Array.isArray(res) ? res : Array.isArray((res as any)?.data) ? (res as any).data : [];
    },
  });

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((u: any) => {
      const q = search.toLowerCase();
      const email = (u.email || "").toLowerCase();
      const first = (u.profile?.firstName || "").toLowerCase();
      const last = (u.profile?.lastName || "").toLowerCase();
      const fullName = `${first} ${last}`.trim();
      const tenantName = (u.profile?.tenant?.name || "").toLowerCase();

      return (
        !search ||
        email.includes(q) ||
        fullName.includes(q) ||
        tenantName.includes(q)
      );
    });
  }, [users, search]);

  // Create User Mutation
  const createMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      const res = await api.post("/super/users", payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Platform user created successfully!");
      setIsCreateOpen(false);
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        role: "admin",
        tenantId: "",
      });
      qc.invalidateQueries({ queryKey: ["super-users-list"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to create user");
    },
  });

  // Edit User Mutation
  const editMutation = useMutation({
    mutationFn: async (payload: { id: string; firstName: string; lastName: string; role: string; tenantId: string }) => {
      const res = await api.put(`/super/users/${payload.id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("User updated successfully!");
      setEditingUser(null);
      qc.invalidateQueries({ queryKey: ["super-users-list"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to update user");
    },
  });

  // Reset Password Mutation
  const passwordMutation = useMutation({
    mutationFn: async ({ id, password, password_confirmation }: { id: string; password: string; password_confirmation: string }) => {
      const res = await api.put(`/super/users/${id}/reset-password`, { password, password_confirmation });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Password reset successfully!");
      setPasswordUser(null);
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to reset password");
    },
  });

  // Login History Query
  const { data: loginHistoryData, isLoading: loginHistoryLoading, refetch: refetchLoginHistory } = useQuery({
    queryKey: ["super-login-history", loginHistoryUserFilter?.id, loginHistorySearch],
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (loginHistorySearch) qs.set("search", loginHistorySearch);
      if (loginHistoryUserFilter?.id) {
        const res = await api.get(`/super/users/${loginHistoryUserFilter.id}/login-history?${qs.toString()}`);
        return (res as any)?.data || [];
      } else {
        const res = await api.get(`/super/users/login-history?${qs.toString()}`);
        return (res as any)?.data || [];
      }
    },
    enabled: isLoginHistoryOpen,
  });

  // Delete Login History Mutation
  const deleteLoginHistoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/super/users/login-history/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Login history record removed.");
      qc.invalidateQueries({ queryKey: ["super-login-history"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to remove entry");
    },
  });

  // Delete User Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/super/users/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("User account deleted successfully!");
      setDeletingUser(null);
      qc.invalidateQueries({ queryKey: ["super-users-list"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to delete user");
    },
  });

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto animate-in fade-in duration-300">
      {/* ── Top Header Bar ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Users className="size-7 text-primary" />
            Global Platform Users
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage system administrators, tenant workspace owners, and cross-organization accounts.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center border border-border/60 rounded-lg p-0.5 bg-muted/20">
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="h-8 px-2.5"
            >
              <List className="size-4" />
            </Button>
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="h-8 px-2.5"
            >
              <LayoutGrid className="size-4" />
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setLoginHistoryUserFilter(null);
              setIsLoginHistoryOpen(true);
            }}
            className="h-9 gap-1.5 font-medium shadow-xs"
          >
            <History className="size-4" />
            Login History
          </Button>

          <Button
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="h-9 gap-1.5 font-medium shadow-xs"
          >
            <Plus className="size-4" />
            Create User
          </Button>
        </div>
      </div>

      {/* ── Filters Bar ─── */}
      <Card className="p-4 border-border/60 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/10">
        <div className="relative min-w-[240px] max-w-sm flex-1">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, workspace..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-9 text-xs bg-background"
          />
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger className="h-9 w-[150px] text-xs bg-background font-medium">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="super_admin">Super Admin</SelectItem>
              <SelectItem value="admin">Workspace Admin</SelectItem>
              <SelectItem value="hr_admin">HR Admin</SelectItem>
              <SelectItem value="employee">Employee</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedTenant} onValueChange={setSelectedTenant}>
            <SelectTrigger className="h-9 w-[180px] text-xs bg-background font-medium">
              <SelectValue placeholder="Workspace" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Workspaces</SelectItem>
              {tenants.map((t: any) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* ── Content View: List or Grid ─── */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-16 border rounded-lg bg-card">
          <Loader2 className="size-8 animate-spin text-primary mb-2" />
          <p className="text-xs text-muted-foreground">Loading platform users...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 border rounded-lg bg-card text-center">
          <Users className="size-10 text-muted-foreground/40 mb-2" />
          <h3 className="text-base font-bold text-foreground">No users found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            Try adjusting your search criteria or create a new user account.
          </p>
        </div>
      ) : viewMode === "list" ? (
        /* List / Table View */
        <Card className="border-border/60 shadow-xs overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-bold text-xs uppercase tracking-wider py-3.5 pl-5">User</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider py-3.5">Workspace / Tenant</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider py-3.5">Assigned Roles</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider py-3.5">2FA Status</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider py-3.5">Joined Date</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider py-3.5 text-right pr-5">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((u: any) => {
                const fullName = u.full_name || `${u.profile?.firstName || ""} ${u.profile?.lastName || ""}`.trim() || u.email?.split("@")[0] || "User";
                const firstRole = u.roles?.[0];
                const primaryRole = typeof firstRole === "string" ? firstRole : firstRole?.role || "employee";
                const isSuper = u.roles?.some((r: any) => (typeof r === "string" ? r : r?.role) === "super_admin");
                const tenantName = u.tenants?.name || u.profile?.tenant?.name || null;

                return (
                  <TableRow key={u.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="py-3 pl-5">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-9 border border-border/80">
                          <AvatarImage src={u.avatar_url || u.profile?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${fullName}`} />
                          <AvatarFallback className="text-xs font-semibold">
                            {fullName.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-bold text-foreground leading-tight flex items-center gap-1.5">
                            {fullName}
                            {isSuper && (
                              <ShieldAlert className="size-3.5 text-amber-500 fill-amber-500/20" />
                            )}
                          </p>
                          <span className="text-xs text-muted-foreground">{u.email}</span>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="py-3">
                      {tenantName ? (
                        <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                          <Building2 className="size-3.5 text-muted-foreground" />
                          <span>{tenantName}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Platform Wide</span>
                      )}
                    </TableCell>

                    <TableCell className="py-3">
                      <div className="flex items-center gap-1 flex-wrap">
                        {u.roles?.map((r: any, idx: number) => {
                          const rName = typeof r === "string" ? r : r?.role || "employee";
                          return (
                            <Badge
                              key={idx}
                              variant="outline"
                              className={
                                rName === "super_admin"
                                  ? "bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300 font-bold text-[10px]"
                                  : rName === "admin"
                                  ? "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 font-bold text-[10px]"
                                  : "bg-slate-50 text-slate-700 border-slate-300 dark:bg-slate-900 dark:text-slate-300 text-[10px]"
                              }
                            >
                              {rName.replace("_", " ").toUpperCase()}
                            </Badge>
                          );
                        })}
                      </div>
                    </TableCell>

                    <TableCell className="py-3">
                      <Badge
                        variant="outline"
                        className={
                          u.twoFactorEnabled
                            ? "bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px]"
                            : "bg-slate-50 text-slate-500 border-slate-200 text-[10px]"
                        }
                      >
                        {u.twoFactorEnabled ? "2FA Enabled" : "Disabled"}
                      </Badge>
                    </TableCell>

                    <TableCell className="py-3 text-xs text-muted-foreground">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                    </TableCell>

                    <TableCell className="py-3 text-right pr-5">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:text-foreground"
                          title="View Login History"
                          onClick={() => {
                            setLoginHistoryUserFilter(u);
                            setIsLoginHistoryOpen(true);
                          }}
                        >
                          <History className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:text-foreground"
                          title="Reset Password"
                          onClick={() => setPasswordUser(u)}
                        >
                          <Key className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:text-foreground"
                          title="Edit User"
                          onClick={() =>
                            setEditingUser({
                              id: u.id,
                              firstName: u.profile?.firstName || "",
                              lastName: u.profile?.lastName || "",
                              role: primaryRole,
                              tenantId: u.profile?.tenantId || "",
                            })
                          }
                        >
                          <Edit className="size-4" />
                        </Button>
                        {!isSuper && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                            title="Delete User"
                            onClick={() => setDeletingUser(u)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      ) : (
        /* Grid / Card View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map((u: any) => {
            const fullName = u.full_name || `${u.profile?.firstName || ""} ${u.profile?.lastName || ""}`.trim() || u.email?.split("@")[0] || "User";
            const firstRole = u.roles?.[0];
            const primaryRole = typeof firstRole === "string" ? firstRole : firstRole?.role || "employee";
            const isSuper = u.roles?.some((r: any) => (typeof r === "string" ? r : r?.role) === "super_admin");
            const tenantName = u.tenants?.name || u.profile?.tenant?.name || null;

            return (
              <Card
                key={u.id}
                className="p-5 border-border/60 shadow-xs hover:border-primary/40 transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-11 border border-border/80">
                        <AvatarImage src={u.avatar_url || u.profile?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${fullName}`} />
                        <AvatarFallback className="text-sm font-semibold">
                          {fullName.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="text-sm font-bold text-foreground leading-tight flex items-center gap-1.5">
                          {fullName}
                          {isSuper && <ShieldAlert className="size-3.5 text-amber-500" />}
                        </h4>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        primaryRole === "super_admin"
                          ? "bg-purple-50 text-purple-700 border-purple-300 text-[10px] font-bold"
                          : primaryRole === "admin"
                          ? "bg-blue-50 text-blue-700 border-blue-300 text-[10px] font-bold"
                          : "text-[10px]"
                      }
                    >
                      {primaryRole.replace("_", " ").toUpperCase()}
                    </Badge>
                  </div>

                  <div className="bg-muted/30 border border-border/40 rounded-lg p-2.5 space-y-1.5 text-xs text-muted-foreground my-3">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Building2 className="size-3 text-muted-foreground" />
                        Workspace:
                      </span>
                      <span className="font-semibold text-foreground">
                        {u.profile?.tenant?.name || "Global / None"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="size-3 text-muted-foreground" />
                        Created:
                      </span>
                      <span>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-1 border-t border-border/40 pt-3 mt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1 text-xs"
                    onClick={() => {
                      setLoginHistoryUserFilter(u);
                      setIsLoginHistoryOpen(true);
                    }}
                  >
                    <History className="size-3.5" />
                    History
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1 text-xs"
                    onClick={() => setPasswordUser(u)}
                  >
                    <Key className="size-3.5" />
                    Reset Key
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1 text-xs"
                    onClick={() =>
                      setEditingUser({
                        id: u.id,
                        firstName: u.profile?.firstName || "",
                        lastName: u.profile?.lastName || "",
                        role: primaryRole,
                        tenantId: u.profile?.tenantId || "",
                      })
                    }
                  >
                    <Edit className="size-3.5" />
                    Edit
                  </Button>
                  {!isSuper && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 text-xs px-2.5"
                      onClick={() => setDeletingUser(u)}
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

      {/* ── Create User Modal ─── */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Users className="size-5 text-primary" />
              Create Platform User
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate(formData);
            }}
            className="space-y-4 pt-2 text-xs"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>First Name</Label>
                <Input
                  required
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="John"
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Last Name</Label>
                <Input
                  required
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Doe"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Email Address</Label>
              <Input
                required
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john.doe@company.com"
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Initial Password</Label>
              <Input
                required
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••••••"
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label>System Role</Label>
              <Select
                value={formData.role}
                onValueChange={(val) => setFormData({ ...formData, role: val })}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Workspace Admin</SelectItem>
                  <SelectItem value="hr_admin">HR Admin</SelectItem>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="super_admin">Super Admin (Platform Wide)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Assigned Workspace</Label>
              <Select
                value={formData.tenantId}
                onValueChange={(val) => setFormData({ ...formData, tenantId: val })}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select Workspace (Optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None / Platform Level</SelectItem>
                  {tenants.map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="border-t pt-4">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
                Create User
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Edit User Modal ─── */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Edit className="size-5 text-primary" />
              Edit User Profile
            </DialogTitle>
          </DialogHeader>

          {editingUser && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                editMutation.mutate(editingUser);
              }}
              className="space-y-4 pt-2 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>First Name</Label>
                  <Input
                    required
                    value={editingUser.firstName}
                    onChange={(e) => setEditingUser({ ...editingUser, firstName: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Last Name</Label>
                  <Input
                    required
                    value={editingUser.lastName}
                    onChange={(e) => setEditingUser({ ...editingUser, lastName: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select
                  value={editingUser.role}
                  onValueChange={(val) => setEditingUser({ ...editingUser, role: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Workspace Admin</SelectItem>
                    <SelectItem value="hr_admin">HR Admin</SelectItem>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Workspace</Label>
                <Select
                  value={editingUser.tenantId || ""}
                  onValueChange={(val) => setEditingUser({ ...editingUser, tenantId: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select Workspace" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None / Platform Level</SelectItem>
                    {tenants.map((t: any) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter className="border-t pt-4">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditingUser(null)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={editMutation.isPending}>
                  {editMutation.isPending && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Reset Password Modal ─── */}
      <Dialog
        open={!!passwordUser}
        onOpenChange={(open) => {
          if (!open) {
            setPasswordUser(null);
            setNewPassword("");
            setConfirmPassword("");
          }
        }}
      >
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Key className="size-5 text-primary" />
              Reset User Password
            </DialogTitle>
          </DialogHeader>

          {passwordUser && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (newPassword !== confirmPassword) {
                  toast.error("Password confirmation does not match.");
                  return;
                }
                passwordMutation.mutate({
                  id: passwordUser.id,
                  password: newPassword,
                  password_confirmation: confirmPassword,
                });
              }}
              className="space-y-4 pt-2 text-xs"
            >
              <p className="text-muted-foreground">
                Set a secure password for <strong>{passwordUser.email}</strong>.
              </p>

              <div className="space-y-1.5">
                <Label>New Password (min 8 characters)</Label>
                <Input
                  required
                  type="password"
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter at least 8 characters"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Confirm Password</Label>
                <Input
                  required
                  type="password"
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password to confirm"
                  className="h-9 text-xs"
                />
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-[11px] text-destructive font-medium">
                    Passwords do not match
                  </p>
                )}
              </div>

              <DialogFooter className="border-t pt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPasswordUser(null);
                    setNewPassword("");
                    setConfirmPassword("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={passwordMutation.isPending || newPassword.length < 8 || newPassword !== confirmPassword}
                >
                  {passwordMutation.isPending && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
                  Update Password
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Login History Direct Inspection Dialog ─── */}
      <Dialog
        open={isLoginHistoryOpen}
        onOpenChange={(open) => {
          setIsLoginHistoryOpen(open);
          if (!open) {
            setLoginHistoryUserFilter(null);
            setLoginHistorySearch("");
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-6">
          <DialogHeader className="border-b pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-6">
              <div>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <History className="size-5 text-primary" />
                  User Login Audit & Access History
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  {loginHistoryUserFilter
                    ? `Inspecting authentication sessions for: ${loginHistoryUserFilter.email}`
                    : "Live authentication history and IP audit across all workspace accounts."}
                </p>
              </div>

              {loginHistoryUserFilter && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setLoginHistoryUserFilter(null)}
                  className="text-xs h-7"
                >
                  Show All Users
                </Button>
              )}
            </div>

            <div className="pt-3">
              <div className="relative">
                <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Filter by IP address, user name, or email..."
                  value={loginHistorySearch}
                  onChange={(e) => setLoginHistorySearch(e.target.value)}
                  className="pl-9 h-8 text-xs max-w-sm"
                />
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-2">
            {loginHistoryLoading ? (
              <div className="py-16 grid place-items-center">
                <Loader2 className="size-8 animate-spin text-primary" />
              </div>
            ) : !loginHistoryData || loginHistoryData.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground text-xs">
                No login history records found.
              </div>
            ) : (
              <div className="rounded-lg border border-border/60 overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow className="text-[11px] font-semibold">
                      <TableHead className="py-2.5">User</TableHead>
                      <TableHead className="py-2.5">IP Address</TableHead>
                      <TableHead className="py-2.5">Login Time</TableHead>
                      <TableHead className="py-2.5">Client Details</TableHead>
                      <TableHead className="py-2.5 text-right pr-4">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loginHistoryData.map((row: any) => {
                      let detailsObj: any = {};
                      try {
                        detailsObj = typeof row.details === "string" ? JSON.parse(row.details) : row.details || {};
                      } catch {}

                      return (
                        <TableRow key={row.id} className="text-xs hover:bg-muted/30">
                          <TableCell className="py-2.5">
                            <div className="flex items-center gap-2">
                              <Avatar className="size-7 border border-border/60">
                                <AvatarImage src={row.user?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${row.user?.name}`} />
                                <AvatarFallback className="text-[10px]">
                                  {(row.user?.name || "U").slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium text-foreground">{row.user?.name || "User"}</div>
                                <div className="text-[11px] text-muted-foreground">{row.user?.email || "—"}</div>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="py-2.5 font-mono text-[11px]">
                            <div className="flex items-center gap-1.5">
                              <Globe className="size-3 text-muted-foreground" />
                              {row.ip || "127.0.0.1"}
                            </div>
                          </TableCell>

                          <TableCell className="py-2.5 text-[11px] text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <Clock className="size-3 text-muted-foreground" />
                              {row.date ? new Date(row.date).toLocaleString() : "—"}
                            </div>
                          </TableCell>

                          <TableCell className="py-2.5 text-[11px]">
                            <div className="flex items-center gap-1.5">
                              <Laptop className="size-3 text-muted-foreground" />
                              <span className="font-medium">{detailsObj.browser_name || "Browser"}</span>
                              <span className="text-muted-foreground">/ {detailsObj.os_name || "OS"}</span>
                            </div>
                          </TableCell>

                          <TableCell className="py-2.5 text-right pr-4">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                              title="Delete Record"
                              disabled={deleteLoginHistoryMutation.isPending}
                              onClick={() => {
                                if (confirm("Delete this login history entry?")) {
                                  deleteLoginHistoryMutation.mutate(row.id);
                                }
                              }}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <DialogFooter className="border-t pt-3 flex justify-between items-center">
            <span className="text-xs text-muted-foreground">
              Total {loginHistoryData?.length || 0} login events recorded
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsLoginHistoryOpen(false);
                setLoginHistoryUserFilter(null);
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ─── */}
      <Dialog open={!!deletingUser} onOpenChange={(open) => !open && setDeletingUser(null)}>
        <DialogContent className="max-w-sm p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-rose-600 flex items-center gap-2">
              <Trash2 className="size-5" />
              Delete Account
            </DialogTitle>
          </DialogHeader>

          <p className="text-xs text-muted-foreground">
            Are you sure you want to permanently delete the account for{" "}
            <strong className="text-foreground">{deletingUser?.email}</strong>? All associated roles and profiles
            will be removed.
          </p>

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" size="sm" onClick={() => setDeletingUser(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate(deletingUser.id)}
            >
              {deleteMutation.isPending && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
