import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  Users,
  UserPlus,
  ShieldCheck,
  Search,
  Shield,
  Loader2,
  Mail,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/tenant/users")({
  component: TenantUsersPage,
  head: () => ({
    meta: [{ title: "Users & Access Control — Master HRMS" }],
  }),
});

function TenantUsersPage() {
  const qc = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: "",
    fullName: "",
    role: "hr_admin",
  });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["tenant-users-list"],
    queryFn: async () => {
      try {
        const res = await api.get("/users");
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async (payload: typeof inviteForm) => {
      return await api.post("/users/invite", payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenant-users-list"] });
      toast.success(`Invitation successfully sent to ${inviteForm.email}`);
      setIsInviteOpen(false);
      setInviteForm({ email: "", fullName: "", role: "hr_admin" });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to send invitation.");
    },
  });

  const filteredUsers = useMemo(() => {
    return users.filter((u: any) => {
      const q = searchTerm.toLowerCase();
      const name = (u.name || u.profile?.fullName || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [users, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Users className="h-6 w-6 text-primary" />
            Users & Administrative Access
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage authenticated portal administrators, HR operators, and team access.
          </p>
        </div>
        <Button onClick={() => setIsInviteOpen(true)} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Invite User
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name or email..."
            className="pl-8 text-xs"
          />
        </div>
      </div>

      <Card className="border-border/80">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border/60 uppercase tracking-wider text-[11px] text-muted-foreground font-semibold">
                <tr>
                  <th className="p-3.5">User</th>
                  <th className="p-3.5">Assigned Role</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Created At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                      Loading users...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-muted-foreground">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user: any) => {
                    const name = user.name || user.profile?.fullName || user.email?.split("@")[0] || "User";
                    const roles: string[] = Array.isArray(user.roles)
                      ? user.roles.map((r: any) => (typeof r === "string" ? r : r.role))
                      : [];
                    const isOwner = roles.includes("admin") || roles.includes("workspace_admin");
                    const isHr = roles.includes("hr_admin") || roles.includes("hr_manager");

                    return (
                      <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3.5 flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                              {name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-semibold text-foreground">{name}</div>
                            <div className="text-[11px] text-muted-foreground">{user.email}</div>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <Badge
                            variant="outline"
                            className={
                              isOwner
                                ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                : isHr
                                ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                                : "bg-muted text-muted-foreground"
                            }
                          >
                            {isOwner ? "Tenant Admin" : isHr ? "HR Admin" : "Employee"}
                          </Badge>
                        </td>
                        <td className="p-3.5">
                          <span className="inline-flex items-center gap-1.5 text-emerald-500 font-medium">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        </td>
                        <td className="p-3.5 text-muted-foreground">
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "Active"}
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

      {/* Invite Modal */}
      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite User to Workspace</DialogTitle>
            <DialogDescription className="text-xs">
              Send an email invitation with login credentials and assigned portal role.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Full Name</label>
              <Input
                value={inviteForm.fullName}
                onChange={(e) => setInviteForm({ ...inviteForm, fullName: e.target.value })}
                placeholder="Jane Doe"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Email Address</label>
              <Input
                type="email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                placeholder="jane@company.com"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Assigned Role</label>
              <Select
                value={inviteForm.role}
                onValueChange={(val) => setInviteForm({ ...inviteForm, role: val })}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tenant_admin">Tenant Admin (Full Control)</SelectItem>
                  <SelectItem value="hr_admin">HR Administrator</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="employee">Employee</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInviteOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => inviteMutation.mutate(inviteForm)}
              disabled={!inviteForm.email || inviteMutation.isPending}
            >
              {inviteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Invite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
