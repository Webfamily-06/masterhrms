'use client';
import { Link } from "@/src/lib/router-compat";
import { useQuery } from "@tanstack/react-query";
import { api, unwrapArray } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard, StatsOverviewGrid } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CalendarCheck,
  PieChart,
  Layers,
  ShieldCheck,
  Coins,
  ArrowRight,
  Clock,
  Users,
} from "lucide-react";

export default function HrLeaveOverviewPage() {
  const todayIso = new Date().toISOString().slice(0, 10);

  const { data: requests = [] } = useQuery({
    queryKey: ["hr-leave-overview", "applications"],
    queryFn: async () => {
      try {
        const res = await api.get("/api/v1/hr/leave/applications", {
          params: { limit: 200 },
        });
        return unwrapArray<any>(res);
      } catch {
        return [];
      }
    },
  });

  const { data: leaveTypes = [] } = useQuery({
    queryKey: ["hr-leave-overview", "types"],
    queryFn: async () => {
      try {
        const res = await api.get("/api/v1/hr/leave/types", {
          params: { status: "active", limit: 100 },
        });
        return unwrapArray<any>(res);
      } catch {
        return [];
      }
    },
  });

  const { data: policies = [] } = useQuery({
    queryKey: ["hr-leave-overview", "policies"],
    queryFn: async () => {
      try {
        const res = await api.get("/api/v1/hr/leave/policies", {
          params: { status: "active", limit: 100 },
        });
        return unwrapArray<any>(res);
      } catch {
        return [];
      }
    },
  });

  const pendingCount = requests.filter((r: any) => r.status === "pending").length;
  const onLeaveToday = requests.filter((r: any) => {
    if (r.status !== "approved") return false;
    const s = String(r.startDate).slice(0, 10);
    const e = String(r.endDate).slice(0, 10);
    return s <= todayIso && e >= todayIso;
  }).length;

  const modules = [
    {
      title: "Leave Applications",
      description: "Review, approve, reject, or reverse company-wide leave requests with live ledger updates.",
      href: "/hr/leave/applications",
      icon: CalendarCheck,
      color: "text-blue-500",
    },
    {
      title: "Leave Balances",
      description: "Monitor and adjust staff leave quotas, credit accruals, and view immutable ledger trails.",
      href: "/hr/leave/balances",
      icon: PieChart,
      color: "text-emerald-500",
    },
    {
      title: "Leave Types",
      description: "Define paid and unpaid leave categories with custom allocations, colors, and carry-forward.",
      href: "/hr/leave/types",
      icon: Layers,
      color: "text-purple-500",
    },
    {
      title: "Leave Policies",
      description: "Configure notice rules, min/max days, probation restrictions, half-days, and sandwich rules.",
      href: "/hr/leave/policies",
      icon: ShieldCheck,
      color: "text-amber-500",
    },
    {
      title: "Leave Encashment & Comp-Off",
      description: "Manage leave encashment payouts, payroll processing, Comp-Off earn credits, FIFO expiry, and policies.",
      href: "/hr/leave/encashment-compoff",
      icon: Coins,
      color: "text-teal-600",
    },
  ];

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden">
      <PageHeader
        title="Leave Administration & Policy Control"
        description="Oversee company-wide time-off, approve pending requests, and manage leave accrual policies."
      />

      <StatsOverviewGrid>
        <StatCard
          title="On Leave Today"
          value={`${onLeaveToday} Employees`}
          icon={Users}
          description="Approved absences today"
        />
        <StatCard
          title="Pending Approvals"
          value={pendingCount}
          icon={Clock}
          description="Awaiting HR / Supervisor"
        />
        <StatCard
          title="Active Leave Types"
          value={`${leaveTypes.length} Categories`}
          icon={Layers}
          description="Available in Self-Service"
        />
        <StatCard
          title="Active Policies"
          value={`${policies.length} Rules`}
          icon={ShieldCheck}
          description="Enforced across requests"
        />
      </StatsOverviewGrid>

      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Leave Management Modules
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {modules.map((m) => {
            const Icon = m.icon;
            return (
              <Card
                key={m.href}
                className="hover:border-primary/50 transition-colors flex flex-col justify-between"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <div className="p-2 rounded-lg bg-muted">
                      <Icon className={`h-5 w-5 ${m.color}`} />
                    </div>
                    <CardTitle className="text-base">{m.title}</CardTitle>
                  </div>
                  <CardDescription className="text-xs">{m.description}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <Button variant="ghost" size="sm" asChild className="w-full justify-between text-xs">
                    <Link to={m.href as any}>
                      <span>Open {m.title}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
