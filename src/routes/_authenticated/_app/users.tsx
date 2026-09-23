import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  UserCheck,
  Users,
  ShieldCheck,
  Search,
  Shield,
  Loader2,
  Edit2,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_app/users")({
  component: UsersPage,
  head: () => ({ meta: [{ title: "User Management & Roles · Master ERP" }] }),
});

export type WorkspaceUser = {
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

export type RoleOption = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
};

function UsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState("all");

  // Edit Role Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<WorkspaceUser | null>(null);
  const [targetRoleId, setTargetRoleId] = useState("");

  // 1. Fetch Real Users from Workspace API
  const { data: users = [], isLoading: usersLoading } = useQuery<WorkspaceUser[]>({
    queryKey: ["workspace-users-list"],
    queryFn: async () => {
      const res = await api.get("/workspace/users");
      return res || [];
    },
  });

  // 2. Fetch Workspace Roles
  const { data: roles = [] } = useQuery<RoleOption[]>({
    queryKey: ["workspace-roles"],
    queryFn: async () => {
      const res = await api.get("/workspace/roles");
      return res || [];
    },
  });

  // 3. Mutation: Assign Role to User
  const assignRoleMutation = useMutation({
    mutationFn: async () => {
      if (!editingUser || !targetRoleId) return;
      return await api.put("/workspace/users/" + editingUser.id + "/role", { roleId: targetRoleId });
    },
    onSuccess: () => {
      toast.success("Role assigned successfully to " + editingUser?.fullName);
      setIsEditModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["workspace-users-list"] });
      queryClient.invalidateQueries({ queryKey: ["workspace-roles"] });
      queryClient.invalidateQueries({ queryKey: ["current-session-user"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to assign role");
    },
  });

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.fullName.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase());

      const userRoleName = u.assignedRole?.name || "Unassigned";
      const matchesRole =
        selectedRoleFilter === "all" || userRoleName.toLowerCase() === selectedRoleFilter.toLowerCase();

      return matchesSearch && matchesRole;
    });
  }, [users, search, selectedRoleFilter]);

  const activeCount = users.length;
  const adminCount = users.filter((u) => u.assignedRole?.name === "Workspace Admin").length;
  const employeeCount = users.filter((u) => u.assignedRole?.name === "Employee").length;
  const managerCount = users.filter(
    (u) => u.assignedRole && u.assignedRole.name !== "Workspace Admin" && u.assignedRole.name !== "Employee"
  ).length;

  const selectedRoleInfo = useMemo(() => {
    return roles.find((r) => r.id === targetRoleId);
  }, [roles, targetRoleId]);

  return (
    <div className="w-full flex-1 min-w-0 bg-background">
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                Workspace Identity & Access Management
              </span>
              <span className="text-xs text-muted-foreground font-mono">Live Database</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Workspace Users & Role Assignments
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Manage member roles and RBAC authorization scopes across the workspace.
            </p>
          </div>
        </div>

        {/* 4-Card Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { title: "Total Users", value: activeCount.toString(), desc: "Registered Members", icon: Users, color: "text-primary bg-primary/10" },
            { title: "Workspace Admins", value: adminCount.toString(), desc: "Full Access Admins", icon: ShieldCheck, color: "text-orange-500 bg-orange-500/10" },
            { title: "Specialized Managers", value: managerCount.toString(), desc: "HR, Sales, Finance Managers", icon: Shield, color: "text-purple-500 bg-purple-500/10" },
            { title: "Standard Employees", value: employeeCount.toString(), desc: "Self-Service Access", icon: UserCheck, color: "text-emerald-500 bg-emerald-500/10" },
          ].map((w) => (
            <Card key={w.title} className="border border-border/70 shadow-xs">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-muted-foreground">{w.title}</span>
                    <h4 className="text-2xl font-bold tracking-tight">{w.value}</h4>
                    <p className="text-[11px] text-muted-foreground">{w.desc}</p>
                  </div>
                  <div className={cn("size-10 rounded-lg flex items-center justify-center shrink-0", w.color)}>
                    <w.icon className="size-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters Card */}
        <Card className="border border-border/70 shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <Select value={selectedRoleFilter} onValueChange={setSelectedRoleFilter}>
                  <SelectTrigger className="w-full sm:w-48 h-9 text-xs">
                    <SelectValue placeholder="Filter by Role" />
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
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card className="border border-border/70 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/70 bg-muted/30 text-muted-foreground font-semibold">
                  <th className="px-5 py-3.5">USER</th>
                  <th className="px-4 py-3.5">ASSIGNED ROLE</th>
                  <th className="px-4 py-3.5">STATUS</th>
                  <th className="px-4 py-3.5">2FA</th>
                  <th className="px-4 py-3.5">JOINED DATE</th>
                  <th className="px-5 py-3.5 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {usersLoading ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                      Loading real users from workspace database...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-muted-foreground">
                      No users found matching search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar className="size-8">
                            <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                              {u.fullName.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold text-foreground text-xs">{u.fullName}</p>
                            <p className="text-[11px] text-muted-foreground font-mono">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 font-medium text-foreground">
                        {u.assignedRole ? (
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs font-semibold",
                              u.assignedRole.name === "Workspace Admin"
                                ? "bg-orange-500/10 text-orange-600 border-orange-500/30"
                                : u.assignedRole.name.includes("Manager")
                                ? "bg-purple-500/10 text-purple-600 border-purple-500/30"
                                : "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-300"
                            )}
                          >
                            {u.assignedRole.name}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            Employee (Default)
                          </Badge>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
                          <span className="size-1.5 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        {u.twoFactorEnabled ? (
                          <Badge variant="outline" className="text-[10px] font-bold py-0.5 px-2 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
                            ● Enabled
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] font-bold py-0.5 px-2 border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10">
                            ○ Pending Setup
                          </Badge>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-muted-foreground font-mono text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingUser(u);
                            setTargetRoleId(u.assignedRole?.id || roles[0]?.id || "");
                            setIsEditModalOpen(true);
                          }}
                          className="h-7 text-xs px-2.5 font-semibold gap-1"
                        >
                          <Edit2 className="size-3" />
                          Change Role
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Change Role Dialog */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="sm:max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <DialogHeader className="space-y-1.5">
              <DialogTitle className="text-base font-bold text-foreground">Change User Role</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Assign an RBAC role to <span className="font-semibold text-foreground">{editingUser?.fullName}</span> ({editingUser?.email}).
                Permissions take effect immediately across all workspace modules.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Select Workspace Role *</label>
                <Select value={targetRoleId} onValueChange={setTargetRoleId}>
                  <SelectTrigger className="h-10 text-xs w-full">
                    <SelectValue placeholder="Choose a workspace role..." />
                  </SelectTrigger>
                  <SelectContent className="max-w-[calc(100vw-2rem)] sm:max-w-[460px]">
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={r.id} textValue={r.name} className="text-xs py-2.5 cursor-pointer">
                        <div className="flex flex-col gap-0.5 text-left w-full pr-2">
                          <span className="font-bold text-foreground">{r.name}</span>
                          {r.description && (
                            <span className="text-[11px] text-muted-foreground whitespace-normal leading-tight font-normal">
                              {r.description}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Selected Role Summary Preview Card */}
              {selectedRoleInfo && (
                <div className="rounded-lg border border-border/80 bg-muted/30 p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">{selectedRoleInfo.name}</span>
                    <Badge variant="outline" className="text-[10px] font-semibold bg-background">
                      Selected Scope
                    </Badge>
                  </div>
                  {selectedRoleInfo.description && (
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {selectedRoleInfo.description}
                    </p>
                  )}
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/60">
              <Button variant="outline" size="sm" onClick={() => setIsEditModalOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => assignRoleMutation.mutate()}
                disabled={assignRoleMutation.isPending || !targetRoleId}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4"
              >
                {assignRoleMutation.isPending && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
