import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentProfile, useSession, hasRole } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Play, Wallet } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_app/payroll")({
  component: Payroll,
  head: () => ({ meta: [{ title: "Payroll — Master HRMS" }] }),
});

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function Payroll() {
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);
  const qc = useQueryClient();
  const isHR = hasRole(profile, "hr_admin");

  const { data: runs = [] } = useQuery({
    queryKey: ["payroll-runs"],
    enabled: isHR,
    queryFn: async () => (await supabase.from("payroll_runs").select("*").order("period_year", { ascending: false }).order("period_month", { ascending: false })).data ?? [],
  });

  const { data: mySlips = [] } = useQuery({
    queryKey: ["my-payslips", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("payslips")
        .select("*, employees(first_name, last_name, employee_code)")
        .order("period_year", { ascending: false })
        .order("period_month", { ascending: false });
      return data ?? [];
    },
  });

  const runMut = useMutation({
    mutationFn: async () => {
      if (!profile?.tenant_id) throw new Error("No tenant");
      const tenantId = profile.tenant_id;
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();
      const { data: employees } = await supabase.from("employees").select("*").eq("status", "active");
      if (!employees?.length) throw new Error("No active employees");

      const { data: run, error: runErr } = await supabase.from("payroll_runs").upsert({
        tenant_id: tenantId,
        period_month: month,
        period_year: year,
        status: "processing",
      }, { onConflict: "tenant_id,period_month,period_year" }).select().single();
      if (runErr) throw runErr;

      // Delete existing payslips for this run
      await supabase.from("payslips").delete().eq("payroll_run_id", run.id);

      const payslips = employees.map((e: any) => {
        const gross = Number(e.salary || 0);
        const tax = gross * 0.15;
        const insurance = gross * 0.03;
        const deductions = tax + insurance;
        return {
          tenant_id: tenantId,
          payroll_run_id: run.id,
          employee_id: e.id,
          gross_salary: gross,
          deductions,
          net_salary: gross - deductions,
          breakdown: { tax, insurance },
          period_month: month,
          period_year: year,
        };
      });
      const { error: psErr } = await supabase.from("payslips").insert(payslips);
      if (psErr) throw psErr;

      const total = payslips.reduce((s, p) => s + p.net_salary, 0);
      await supabase
        .from("payroll_runs")
        .update({ status: "paid", total_amount: total, processed_at: new Date().toISOString() })
        .eq("id", run.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payroll-runs"] });
      qc.invalidateQueries({ queryKey: ["my-payslips"] });
      toast.success("Payroll processed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payroll</h1>
          <p className="text-muted-foreground text-sm mt-1">Monthly runs and payslips.</p>
        </div>
        {isHR && (
          <Button onClick={() => runMut.mutate()} disabled={runMut.isPending} className="gap-2">
            <Play className="size-4" /> Run this month's payroll
          </Button>
        )}
      </div>

      {isHR && (
        <Card>
          <CardHeader><CardTitle className="text-base">Payroll Runs</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Processed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.length === 0 && (<TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-10">No runs yet.</TableCell></TableRow>)}
                {runs.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{MONTHS[r.period_month - 1]} {r.period_year}</TableCell>
                    <TableCell><Badge variant={r.status === "paid" ? "default" : "secondary"} className="capitalize">{r.status}</Badge></TableCell>
                    <TableCell>${Number(r.total_amount).toLocaleString()}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.processed_at ? new Date(r.processed_at).toLocaleDateString() : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Wallet className="size-4" /> Payslips</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Gross</TableHead>
                <TableHead>Deductions</TableHead>
                <TableHead>Net</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mySlips.length === 0 && (<TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-10">No payslips yet.</TableCell></TableRow>)}
              {mySlips.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell>{MONTHS[p.period_month - 1]} {p.period_year}</TableCell>
                  <TableCell className="font-medium">{p.employees?.first_name} {p.employees?.last_name}</TableCell>
                  <TableCell>${Number(p.gross_salary).toLocaleString()}</TableCell>
                  <TableCell className="text-muted-foreground">${Number(p.deductions).toLocaleString()}</TableCell>
                  <TableCell className="font-semibold">${Number(p.net_salary).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
