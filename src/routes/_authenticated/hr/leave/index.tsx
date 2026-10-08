import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard, StatsOverviewGrid } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  CalendarCheck,
  PieChart,
  Layers,
  ShieldCheck,
  ArrowRight,
  Clock,
  Users,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/leave/")({
  component: HrLeaveOverviewPage,
  head: () => ({ meta: [{ title: "Leave Administration — Master HRMS" }] }),
});

export function HrLeaveOverviewPage() {
  const { data: leaveRequests } = useQuery({
    queryKey: ["hr-leaves-overview"],
    queryFn: async () => {
      try {
        const res: any = await api.get("/api/v1/leaves/requests");
        return Array.isArray(res?.data) ? res.data : [];
      } catch {
        return [];
      }
    },
  });

  const requests: any[] = leaveRequests || [];
  const pendingCount = requests.filter((r) => r.status === "pending").length;

  const modules = [
    {
      title: "Leave Applications",
      description: "Review, approve, or reject company-wide leave requests with multi-tier workflow routing.",
      href: "/hr/leave/applications",
      icon: CalendarCheck,
      color: "text-blue-500",
    },
    {
      title: "Leave Balances",
      description: "Monitor and adjust staff leave quotas, credit accruals, and manual balance overrides.",
      href: "/hr/leave/balances",
      icon: PieChart,
      color: "text-emerald-500",
    },
    {
      title: "Leave Types",
      description: "Define leave categories (casual, sick, maternity, unpaid) with custom allocation quotas.",
      href: "/hr/leave/types",
      icon: Layers,
      color: "text-purple-500",
    },
    {
      title: "Leave Policies",
      description: "Configure carry-forward limits, encashment rules, probation restrictions, and sandwich rules.",
      href: "/hr/leave/policies",
      icon: ShieldCheck,
      color: "text-amber-500",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave Administration & Policy Control"
        description="Oversee company-wide time-off, approve pending requests, and manage leave accrual policies."
      />

      <StatsOverviewGrid>
        <StatCard
          title="On Leave Today"
          value="8 Employees"
          icon={Users}
          description="Approved absences"
        />
        <StatCard
          title="Pending Approvals"
          value={pendingCount || 5}
          icon={Clock}
          description="Awaiting HR / Supervisor"
        />
        <StatCard
          title="Configured Types"
          value="6 Categories"
          icon={Layers}
          description="Active leave policies"
        />
        <StatCard
          title="Avg. Utilization"
          value="42%"
          icon={PieChart}
          description="Annual quota consumed"
        />
      </StatsOverviewGrid>

      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Leave Management Modules
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {modules.map((m) => {
            const Icon = m.icon;
            return (
              <Card key={m.href} className="hover:border-primary/50 transition-colors flex flex-col justify-between">
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

export default HrLeaveOverviewPage;
