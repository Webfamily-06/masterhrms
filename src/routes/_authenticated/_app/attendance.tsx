import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentProfile, useSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Clock, LogIn, LogOut } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/_app/attendance")({
  component: Attendance,
  head: () => ({ meta: [{ title: "Attendance — Master HRMS" }] }),
});

function Attendance() {
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: myEmployee } = useQuery({
    queryKey: ["my-employee", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("employees").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data: todayRecord } = useQuery({
    queryKey: ["attendance-today", myEmployee?.id],
    enabled: !!myEmployee,
    queryFn: async () => {
      const { data } = await supabase
        .from("attendance")
        .select("*")
        .eq("employee_id", myEmployee!.id)
        .eq("date", today)
        .maybeSingle();
      return data;
    },
  });

  const { data: records = [] } = useQuery({
    queryKey: ["attendance-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("attendance")
        .select("*, employees(first_name, last_name, employee_code)")
        .order("date", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  const checkInMut = useMutation({
    mutationFn: async () => {
      if (!myEmployee || !profile?.tenant_id) throw new Error("Not an employee");
      const { error } = await supabase.from("attendance").upsert({
        tenant_id: profile.tenant_id,
        employee_id: myEmployee.id,
        date: today,
        check_in: new Date().toISOString(),
        status: "present",
      }, { onConflict: "employee_id,date" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Checked in");
      qc.invalidateQueries({ queryKey: ["attendance-today"] });
      qc.invalidateQueries({ queryKey: ["attendance-list"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const checkOutMut = useMutation({
    mutationFn: async () => {
      if (!todayRecord) throw new Error("Check in first");
      const now = new Date();
      const inTime = todayRecord.check_in ? new Date(todayRecord.check_in) : now;
      const hours = Math.max(0, (now.getTime() - inTime.getTime()) / 3600000);
      const { error } = await supabase
        .from("attendance")
        .update({ check_out: now.toISOString(), hours: Math.round(hours * 100) / 100 })
        .eq("id", todayRecord.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Checked out");
      qc.invalidateQueries({ queryKey: ["attendance-today"] });
      qc.invalidateQueries({ queryKey: ["attendance-list"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Attendance</h1>
        <p className="text-muted-foreground text-sm mt-1">Track check-in and check-out.</p>
      </div>

      {myEmployee && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Clock className="size-4" /> Today · {format(new Date(), "PPP")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-4">
            <div className="grid grid-cols-2 gap-6 flex-1 min-w-[220px]">
              <div>
                <p className="text-xs text-muted-foreground">Check in</p>
                <p className="font-semibold text-lg">{todayRecord?.check_in ? format(new Date(todayRecord.check_in), "p") : "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Check out</p>
                <p className="font-semibold text-lg">{todayRecord?.check_out ? format(new Date(todayRecord.check_out), "p") : "—"}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => checkInMut.mutate()} disabled={!!todayRecord?.check_in || checkInMut.isPending} className="gap-2">
                <LogIn className="size-4" /> Check in
              </Button>
              <Button onClick={() => checkOutMut.mutate()} disabled={!todayRecord?.check_in || !!todayRecord?.check_out || checkOutMut.isPending} variant="outline" className="gap-2">
                <LogOut className="size-4" /> Check out
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Recent Records</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Check in</TableHead>
                <TableHead>Check out</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-10">No attendance yet.</TableCell></TableRow>
              )}
              {records.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell>{r.date}</TableCell>
                  <TableCell className="font-medium">{r.employees?.first_name} {r.employees?.last_name}</TableCell>
                  <TableCell>{r.check_in ? format(new Date(r.check_in), "p") : "—"}</TableCell>
                  <TableCell>{r.check_out ? format(new Date(r.check_out), "p") : "—"}</TableCell>
                  <TableCell>{r.hours ?? 0}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{r.status.replace("_", " ")}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
