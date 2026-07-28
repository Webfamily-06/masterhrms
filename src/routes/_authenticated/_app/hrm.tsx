import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Clock, CalendarCheck, Wallet, ArrowRight, UserPlus, Sparkles, Building2 } from "lucide-react";
import { PlanGuard, PlanLimitBar } from "@/components/plan-guard";
import { formatSystemAmount } from "@/lib/currency";

export const Route = createFileRoute("/_authenticated/_app/hrm")({
  component: HrmHubPage,
  head: () => ({ meta: [{ title: "HRM Suite Hub — Master ERP" }] }),
});

export function HrmHubPage() {
  const { data: sysConfig } = useQuery({
    queryKey: ["realtime-platform-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("cms_pages").select("content").eq("slug", "system-platform-settings").maybeSingle();
      return data?.content as any;
    },
  });

  const { data: hrmStats } = useQuery({
    queryKey: ["hrm-hub-stats"],
    queryFn: async () => {
      const [emp, att, leave] = await Promise.all([
        supabase.from("employees").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("attendance").select("id", { count: "exact", head: true }).eq("date", new Date().toISOString().slice(0, 10)),
        supabase.from("leave_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
      ]);
      return {
        totalEmployees: emp.count ?? 0,
        presentToday: att.count ?? 0,
        pendingLeaves: leave.count ?? 0,
      };
    },
  });

  const hrmModules = [
    {
      title: "Employees Directory",
      desc: "Employee profiles, department structure, designation & onboarding documents.",
      count: hrmStats?.totalEmployees ?? 0,
      label: "Active Staff",
      url: "/employees",
      icon: Users,
      color: "from-blue-500 to-indigo-600",
    },
    {
      title: "Attendance & Geo-Tracking",
      desc: "Daily clock-in/out, biometric terminal sync & shift management.",
      count: hrmStats?.presentToday ?? 0,
      label: "Present Today",
      url: "/attendance",
      icon: Clock,
      color: "from-emerald-500 to-teal-600",
    },
    {
      title: "Leave Management",
      desc: "Casual, sick & annual leave workflows with manager approvals.",
      count: hrmStats?.pendingLeaves ?? 0,
      label: "Pending Approvals",
      url: "/leave",
      icon: CalendarCheck,
      color: "from-purple-500 to-pink-600",
    },
    {
      title: "Global Payroll & Tax",
      desc: "Automated monthly salary calculation, statutory PF/ESI & payslips.",
      count: "100% Auto",
      label: "Compliance Status",
      url: "/payroll",
      icon: Wallet,
      color: "from-amber-500 to-orange-600",
    },
  ];

  return (
    <PlanGuard moduleName="HRM Suite" requiredPlan="free">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <Users className="size-6 text-primary" /> HRM Suite Hub
            </h1>
            <p className="text-xs text-muted-foreground">Unified workforce management, attendance, leave approvals & automated payroll processing.</p>
          </div>
          <div className="flex items-center gap-3">
            <PlanLimitBar used={hrmStats?.totalEmployees ?? 0} limit={200} label="Active Employees Limit" />
          </div>
        </div>

        {/* Modules Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {hrmModules.map((m) => (
            <Card key={m.title} className="group hover:border-primary/50 transition-all shadow-sm hover:shadow-lg overflow-hidden">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div className={`size-12 rounded-2xl bg-gradient-to-br ${m.color} text-white grid place-items-center shadow-md group-hover:scale-110 transition-transform`}>
                    <m.icon className="size-6" />
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black font-mono tracking-tight">{m.count}</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">{m.label}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-base group-hover:text-primary transition-colors">{m.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-1">{m.desc}</p>
                </div>

                <div className="pt-2 border-t flex justify-end">
                  <Button asChild variant="ghost" size="sm" className="font-bold text-xs gap-1 group-hover:text-primary">
                    <Link to={m.url}>
                      Open Module <ArrowRight className="size-3.5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </PlanGuard>
  );
}
