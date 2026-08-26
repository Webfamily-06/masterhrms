import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  UserCheck,
  Plus,
  Mail,
  Users,
  UserPlus,
  ShieldCheck,
  Search,
  Download,
  MoreVertical,
  Shield,
} from "lucide-react";
import { PlanGuard, PlanLimitBar } from "@/components/plan-guard";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_app/users")({
  component: UsersPage,
  head: () => ({ meta: [{ title: "User Management & Roles — Sneat ERP" }] }),
});

export type WorkspaceUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  plan: string;
  created: string;
  avatar?: string;
};

const INITIAL_USERS: WorkspaceUser[] = [
  {
    id: "usr-01",
    name: "John Doe",
    email: "john@company.com",
    role: "Tenant Admin",
    status: "active",
    plan: "Enterprise",
    created: "2026-01-15",
    avatar: "/images/avatars/avatar-1.png",
  },
  {
    id: "usr-02",
    name: "Jennie O'Brien",
    email: "jennie@company.com",
    role: "HR Manager",
    status: "active",
    plan: "Enterprise",
    created: "2026-02-01",
    avatar: "/images/avatars/avatar-2.png",
  },
  {
    id: "usr-03",
    name: "Peter Harper",
    email: "peter@company.com",
    role: "Accountant",
    status: "inactive",
    plan: "Team",
    created: "2026-03-10",
    avatar: "/images/avatars/avatar-3.png",
  },
  {
    id: "usr-04",
    name: "Sara Connor",
    email: "sara@company.com",
    role: "Staff",
    status: "pending",
    plan: "Basic",
    created: "2026-04-05",
    avatar: "/images/avatars/avatar-4.png",
  },
];

function UsersPage() {
  const [users, setUsers] = useState<WorkspaceUser[]>(INITIAL_USERS);
  const [search, setSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Staff");
  const [openDrawer, setOpenDrawer] = useState(false);

  function addUser() {
    if (!name.trim() || !email.trim()) return toast.error("Please enter user name and email");
    const newUser: WorkspaceUser = {
      id: `usr-${Math.floor(10 + Math.random() * 90)}`,
      name: name.trim(),
      email: email.trim(),
      role,
      status: "active",
      plan: "Team",
      created: new Date().toISOString().slice(0, 10),
    };
    setUsers([newUser, ...users]);
    toast.success(`User invite sent to ${email} as ${role}!`);
    setName("");
    setEmail("");
    setOpenDrawer(false);
  }

  function toggleStatus(id: string) {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === id ? { ...u, status: u.status === "active" ? "inactive" : "active" } : u
      )
    );
    toast.success("User access status updated");
  }

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase());
    const matchesRole = selectedRole === "all" || u.role.toLowerCase() === selectedRole.toLowerCase();
    const matchesStatus = selectedStatus === "all" || u.status.toLowerCase() === selectedStatus.toLowerCase();
    return matchesSearch && matchesRole && matchesStatus;
  });

  const activeCount = users.filter((u) => u.status === "active").length;
  const pendingCount = users.filter((u) => u.status === "pending").length;

  return (
    <PlanGuard moduleName="User Management & Roles" requiredPlan="starter">
      <div className="space-y-6 max-w-7xl">
        {/* ── Page Header ────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <UserCheck className="size-6 text-primary" /> User Management & RBAC
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage workspace staff logins, security credentials, and role-based permissions.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <PlanLimitBar used={users.length} limit={15} label="Workspace Seats" />
            <Button
              onClick={() => setOpenDrawer(true)}
              size="sm"
              className="gap-1.5 font-bold text-xs bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="size-4" /> Add New User
            </Button>
          </div>
        </div>

        {/* ── Sneat Pro 4-Card Widgets ──────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { title: "Session", value: "21,459", change: 29, desc: "Total Users", icon: Users, color: "text-primary bg-primary/10" },
            { title: "Paid Users", value: "4,567", change: 18, desc: "Last Week Analytics", icon: UserPlus, color: "text-[oklch(0.60_0.22_25)] bg-[oklch(0.60_0.22_25/0.10)]" },
            { title: "Active Users", value: activeCount.toString(), change: -14, desc: "Active in workspace", icon: UserCheck, color: "text-[oklch(0.60_0.17_155)] bg-[oklch(0.60_0.17_155/0.10)]" },
            { title: "Pending Users", value: pendingCount.toString(), change: 42, desc: "Pending invitation", icon: ShieldCheck, color: "text-[oklch(0.73_0.16_75)] bg-[oklch(0.73_0.16_75/0.10)]" },
          ].map((w) => (
            <Card key={w.title} className="border border-border/70 shadow-xs">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-muted-foreground">{w.title}</span>
                    <div className="flex items-center gap-2">
                      <h4 className="text-2xl font-bold tracking-tight">{w.value}</h4>
                      <span
                        className={cn(
                          "text-xs font-semibold",
                          w.change > 0 ? "text-[oklch(0.60_0.17_155)]" : "text-[oklch(0.60_0.22_25)]"
                        )}
                      >
                        ({w.change > 0 ? `+${w.change}` : w.change}%)
                      </span>
                    </div>
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

        {/* ── Filters Card ───────────────────────────────────────── */}
        <Card className="border border-border/70 shadow-xs">
          <CardHeader className="pb-3 px-5 pt-5">
            <CardTitle className="text-sm font-bold">Filters</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Select Role</label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="tenant admin">Tenant Admin</SelectItem>
                    <SelectItem value="hr manager">HR Manager</SelectItem>
                    <SelectItem value="accountant">Accountant</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Select Status</label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Search User</label>
                <div className="relative">
                  <Search className="size-4 text-muted-foreground absolute left-3 top-2.5" />
                  <Input
                    placeholder="Search name, email, role..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-9 pl-9 text-xs"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Users Data Table ───────────────────────────────────── */}
        <Card className="border border-border/70 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/70 bg-muted/20">
                  <th className="text-left px-5 py-3.5 font-bold uppercase tracking-wider text-muted-foreground">User</th>
                  <th className="text-left px-4 py-3.5 font-bold uppercase tracking-wider text-muted-foreground">Role</th>
                  <th className="text-left px-4 py-3.5 font-bold uppercase tracking-wider text-muted-foreground">Plan</th>
                  <th className="text-left px-4 py-3.5 font-bold uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="text-right px-5 py-3.5 font-bold uppercase tracking-wider text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8.5">
                          <AvatarImage src={u.avatar || "/images/avatars/avatar-1.png"} />
                          <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                            {u.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-foreground text-xs">{u.name}</p>
                          <p className="text-[11px] text-muted-foreground font-mono">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-medium text-foreground">
                      <Badge variant="outline" className="text-[10px] font-semibold bg-primary/5 text-primary border-primary/20">
                        {u.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground font-medium">
                      {u.plan}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-md capitalize",
                          u.status === "active"
                            ? "bg-[oklch(0.60_0.17_155/0.10)] text-[oklch(0.60_0.17_155)]"
                            : u.status === "pending"
                            ? "bg-[oklch(0.73_0.16_75/0.10)] text-[oklch(0.73_0.16_75)]"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleStatus(u.id)}
                        className="h-7 text-[11px] px-2.5 font-semibold"
                      >
                        {u.status === "active" ? "Suspend" : "Activate"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* ── Add User Modal Drawer ──────────────────────────────── */}
        {openDrawer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in-50">
            <Card className="w-full max-w-md border border-border/80 bg-card shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between pb-3 px-6 pt-6">
                <div>
                  <CardTitle className="text-base font-bold">Add New User</CardTitle>
                  <p className="text-xs text-muted-foreground">Invite team member with customized permissions.</p>
                </div>
                <Button size="icon" variant="ghost" className="size-8" onClick={() => setOpenDrawer(false)}>
                  ✕
                </Button>
              </CardHeader>
              <CardContent className="space-y-4 px-6 pb-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Full Name *</label>
                  <Input
                    placeholder="e.g. John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Work Email *</label>
                  <Input
                    type="email"
                    placeholder="john@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Assign Role</label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Tenant Admin">Tenant Admin (Full Access)</SelectItem>
                      <SelectItem value="HR Manager">HR Manager</SelectItem>
                      <SelectItem value="Accountant">Accountant</SelectItem>
                      <SelectItem value="Staff">Regular Staff</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1 text-xs" onClick={() => setOpenDrawer(false)}>
                    Cancel
                  </Button>
                  <Button className="flex-1 text-xs font-bold bg-primary text-primary-foreground" onClick={addUser}>
                    Send Invite
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </PlanGuard>
  );
}
