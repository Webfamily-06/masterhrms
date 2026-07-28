import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserCheck, Shield, Plus, Mail, CheckCircle2, UserX, KeyRound } from "lucide-react";
import { PlanGuard, PlanLimitBar } from "@/components/plan-guard";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_app/users")({
  component: UsersPage,
  head: () => ({ meta: [{ title: "User Management — Master ERP" }] }),
});

const INITIAL_USERS = [
  { id: "usr-1", name: "Anand Sharma", email: "anand@tenant.com", role: "Tenant Admin", status: "active", created: "2026-01-15" },
  { id: "usr-2", name: "Priya Patel", email: "priya@tenant.com", role: "HR Manager", status: "active", created: "2026-02-10" },
  { id: "usr-3", name: "Rahul Verma", email: "rahul@tenant.com", role: "Accountant", status: "active", created: "2026-03-01" },
  { id: "usr-4", name: "Sanjay Mehta", email: "sanjay@tenant.com", role: "Sales Lead", status: "active", created: "2026-04-12" },
];

function UsersPage() {
  const [users, setUsers] = useState(INITIAL_USERS);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Staff");

  function addUser() {
    if (!name || !email) return toast.error("Please fill in name and email");
    const newUser = {
      id: `usr-${Math.floor(10 + Math.random() * 90)}`,
      name,
      email,
      role,
      status: "active",
      created: new Date().toISOString().slice(0, 10),
    };
    setUsers([...users, newUser]);
    toast.success(`User Invite Sent to ${email} as ${role}`);
    setName("");
    setEmail("");
  }

  function toggleStatus(id: string) {
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, status: u.status === "active" ? "suspended" : "active" } : u))
    );
    toast.success("User access status updated!");
  }

  return (
    <PlanGuard moduleName="User Management & Roles" requiredPlan="starter">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <UserCheck className="size-6 text-primary" /> User Management & Roles
            </h1>
            <p className="text-xs text-muted-foreground">Manage workspace staff logins, role-based permissions (RBAC) & security access control.</p>
          </div>
          <div className="flex items-center gap-3">
            <PlanLimitBar used={users.length} limit={15} label="Workspace User Seats" />
          </div>
        </div>

        {/* Invite User Form & Users Table */}
        <div className="grid lg:grid-cols-12 gap-6">
          {/* Invite Form */}
          <Card className="lg:col-span-4">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="size-4 text-primary" /> Invite Team Member
              </CardTitle>
              <CardDescription className="text-xs">Send an email invite link to join this workspace.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Full Name *</label>
                <Input placeholder="Neha Gupta" value={name} onChange={(e) => setName(e.target.value)} className="h-9 text-xs" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Work Email *</label>
                <Input type="email" placeholder="neha@company.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-9 text-xs" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Role & Access</label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Tenant Admin">Tenant Admin (Full Access)</SelectItem>
                    <SelectItem value="HR Manager">HR Manager</SelectItem>
                    <SelectItem value="Accountant">Accountant</SelectItem>
                    <SelectItem value="Sales Lead">Sales Lead</SelectItem>
                    <SelectItem value="Staff">Regular Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button size="lg" onClick={addUser} className="w-full font-bold gap-2">
                <Plus className="size-4" /> Send User Invite
              </Button>
            </CardContent>
          </Card>

          {/* Users List */}
          <Card className="lg:col-span-8">
            <CardHeader>
              <CardTitle className="text-base">Active Workspace Users ({users.length})</CardTitle>
              <CardDescription className="text-xs">Users with access to this tenant workspace.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y text-xs">
                {users.map((u) => (
                  <div key={u.id} className="p-4 flex items-center justify-between hover:bg-secondary/20 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-primary/10 text-primary font-bold grid place-items-center uppercase">
                        {u.name.substring(0, 2)}
                      </div>
                      <div>
                        <p className="font-bold text-foreground">{u.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{u.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="font-mono text-[10px]">
                        {u.role}
                      </Badge>
                      <Badge variant={u.status === "active" ? "default" : "destructive"} className="text-[9px] capitalize">
                        {u.status}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[10px] px-2 font-semibold"
                        onClick={() => toggleStatus(u.id)}
                      >
                        {u.status === "active" ? "Suspend" : "Activate"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PlanGuard>
  );
}
