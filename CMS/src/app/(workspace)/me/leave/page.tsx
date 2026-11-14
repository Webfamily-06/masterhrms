'use client';
import { Link } from "@/src/lib/router-compat";
import { useQuery } from "@tanstack/react-query";
import { api, unwrapArray } from "@/lib/api";
import { formatLeaveDays } from "@/lib/leave-helpers";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard, StatsOverviewGrid } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  CalendarCheck,
  PieChart,
  ShieldCheck,
  ArrowRight,
  Clock,
  CheckCircle2,
  Plus,
  Users,
} from "lucide-react";

export default function MeLeaveOverviewPage() {
  const currentYear = new Date().getUTCFullYear();

  const { data: applications = [] } = useQuery({
    queryKey: ["me-leave-overview", "applications", currentYear],
    queryFn: async () => {
      try {
        const res = await api.get("/api/v1/me/leave/applications", {
          params: { year: currentYear },
        });
        return unwrapArray<any>(res);
      } catch {
        return [];
      }
    },
  });

  const { data: balances = [] } = useQuery({
    queryKey: ["me-leave-overview", "balances", currentYear],
    queryFn: async () => {
      try {
        const res = await api.get("/api/v1/me/leave/balance", {
          params: { year: currentYear },
        });
        return unwrapArray<any>(res);
      } catch {
        return [];
      }
    },
  });

  const pendingCount = applications.filter((r: any) => r.status === "pending").length;
  const approvedDays = balances.reduce((sum: number, b: any) => sum + Number(b.used || 0), 0);
  const availablePaidDays = balances
    .filter((b: any) => b.isPaid !== false)
    .reduce((sum: number, b: any) => sum + Number(b.available || 0), 0);
  const activeTypesCount = balances.filter((b: any) => b.status !== "inactive").length;

  const modules = [
    {
      title: "Leave Applications",
      description: "Apply for leaves, view status of submitted requests, and track supervisor approvals.",
      href: "/me/leave/applications",
      icon: CalendarCheck,
      color: "text-blue-500",
    },
    {
      title: "Leave Balance",
      description: "Detailed breakdown of active leave entitlements, used days, and ledger history.",
      href: "/me/leave/balance",
      icon: PieChart,
      color: "text-emerald-500",
    },
    {
      title: "Leave Policies",
      description: "Understand accrual schedules, carry-forward limits, notice rules, and eligibility.",
      href: "/me/leave/policies",
      icon: ShieldCheck,
      color: "text-purple-500",
    },
    {
      title: "Team Calendar",
      description: "View department absence schedule, public holidays, and team time-off.",
      href: "/me/leave/team-calendar",
      icon: Users,
      color: "text-amber-500",
    },
  ];

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Leave & Time-Off Overview"
          description="Track your live leave balances, submit new applications, and review company leave policies."
        />
        <Button asChild className="gap-2 self-start sm:self-auto">
          <Link to={"/me/leave/applications" as any}>
            <Plus className="h-4 w-4" />
            <span>Apply For Leave</span>
          </Link>
        </Button>
      </div>

      <StatsOverviewGrid>
        <StatCard
          title="Available Paid Balance"
          value={`${formatLeaveDays(availablePaidDays)} Days`}
          icon={<Calendar className="h-5 w-5" />}
          description="Paid time-off remaining"
        />
        <StatCard
          title="Pending Requests"
          value={pendingCount}
          icon={<Clock className="h-5 w-5" />}
          description="Awaiting manager / HR review"
        />
        <StatCard
          title="Used This Year"
          value={`${formatLeaveDays(approvedDays)} Days`}
          icon={<CheckCircle2 className="h-5 w-5" />}
          description={`Approved in ${currentYear}`}
        />
        <StatCard
          title="Active Categories"
          value={activeTypesCount}
          icon={<PieChart className="h-5 w-5" />}
          description="Configured leave entitlements"
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
                      <span>Go to {m.title}</span>
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
