import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentProfile, useSession, hasRole } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Check, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_app/leave")({
  component: Leave,
  head: () => ({ meta: [{ title: "Leave — Master HRMS" }] }),
});

function daysBetween(a: string, b: string) {
  const d1 = new Date(a), d2 = new Date(b);
  return Math.max(1, Math.round((d2.getTime() - d1.getTime()) / 86400000) + 1);
}

function Leave() {
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const isHR = hasRole(profile, "hr_admin");
  const isManager = hasRole(profile, "manager");

  const { data: myEmployee } = useQuery({
    queryKey: ["my-employee", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("employees").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data: leaveTypes = [] } = useQuery({
    queryKey: ["leave-types"],
    queryFn: async () => (await supabase.from("leave_types").select("*").order("name")).data ?? [],
  });

  const { data: requests = [] } = useQuery({
    queryKey: ["leave-requests"],
    queryFn: async () => {
      const { data } = await supabase
        .from("leave_requests")
        .select("*, employees(first_name, last_name), leave_types(name, color)")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const createMut = useMutation({
    mutationFn: async (form: FormData) => {
      if (!myEmployee || !profile?.tenant_id) throw new Error("No employee profile linked");
      const start = String(form.get("start_date"));
      const end = String(form.get("end_date"));
      const { error } = await supabase.from("leave_requests").insert({
        tenant_id: profile.tenant_id,
        employee_id: myEmployee.id,
        leave_type_id: String(form.get("leave_type_id")),
        start_date: start,
        end_date: end,
        days: daysBetween(start, end),
        reason: String(form.get("reason") || ""),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leave-requests"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setOpen(false);
      toast.success("Leave requested");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const decisionMut = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "approved" | "rejected" }) => {
      const { error } = await supabase
        .from("leave_requests")
        .update({ status, approver_id: user!.id, approved_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leave-requests"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leave</h1>
          <p className="text-muted-foreground text-sm mt-1">Requests and approvals.</p>
        </div>
        {myEmployee && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="size-4" /> Request Leave</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Leave Request</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); createMut.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Leave type</Label>
                  <Select name="leave_type_id" required>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      {leaveTypes.map((t: any) => (<SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5"><Label>Start</Label><Input name="start_date" type="date" required /></div>
                  <div className="space-y-1.5"><Label>End</Label><Input name="end_date" type="date" required /></div>
                </div>
                <div className="space-y-1.5"><Label>Reason</Label><Textarea name="reason" rows={3} /></div>
                <DialogFooter><Button type="submit" disabled={createMut.isPending}>Submit</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-10">No requests yet.</TableCell></TableRow>
              )}
              {requests.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.employees?.first_name} {r.employees?.last_name}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="size-2 rounded-full" style={{ backgroundColor: r.leave_types?.color || "#3b82f6" }} />
                      {r.leave_types?.name || "—"}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">{r.start_date} → {r.end_date}</TableCell>
                  <TableCell>{r.days}</TableCell>
                  <TableCell className="max-w-[240px] truncate text-sm text-muted-foreground">{r.reason || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "secondary"} className="capitalize">
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {r.status === "pending" && (isHR || isManager) && (
                      <div className="inline-flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => decisionMut.mutate({ id: r.id, status: "approved" })}>
                          <Check className="size-3.5" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => decisionMut.mutate({ id: r.id, status: "rejected" })}>
                          <X className="size-3.5" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
