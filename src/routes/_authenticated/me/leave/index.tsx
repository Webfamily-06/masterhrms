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
  ShieldCheck,
  ArrowRight,
  Clock,
  CheckCircle2,
  Plus,
  Users,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/me/leave/")({
  component: MeLeaveOverviewPage,
  head: () => ({ meta: [{ title: "Leave Overview — Master HRMS" }] }),
});

export function MeLeaveOverviewPage() {
  const { data: leaveData } = useQuery({
    queryKey: ["me-leaves-overview"],
    queryFn: async () => {
      try {
        const res: any = await api.get("/api/v1/leaves/my-requests");
        return Array.isArray(res?.data) ? res.data : [];
      } catch {
        return [];
      }
    },
  });

  const requests: any[] = leaveData || [];
  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const approvedCount = requests.filter((r) => r.status === "approved").length;

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
      description: "Detailed breakdown of casual, sick, annual, and earned leave quotas remaining.",
      href: "/me/leave/balance",
      icon: PieChart,
      color: "text-emerald-500",
    },
    {
      title: "Leave Policies",
      description: "Understand accrual schedules, carry-forward limits, and blackout period rules.",
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Leave & Time-Off Overview"
          description="Track your available leave balance, submit new applications, and check company leave rules."
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
          title="Available Balance"
          value="18 Days"
          icon={<Calendar className="h-5 w-5" />}
          description="Paid time-off remaining"
        />
        <StatCard
          title="Pending Requests"
          value={pendingCount}
          icon={<Clock className="h-5 w-5" />}
          description="Awaiting manager sign-off"
        />
        <StatCard
          title="Approved This Year"
          value={approvedCount || 4}
          icon={<CheckCircle2 className="h-5 w-5" />}
          description="Total taken days"
        />
        <StatCard
          title="Sick Leave Quota"
          value="10 Days"
          icon={<PieChart className="h-5 w-5" />}
          description="Available for use"
        />
      </StatsOverviewGrid>

      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Leave Management Modules
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

export default MeLeaveOverviewPage;
