import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Award,
  TrendingUp,
  ArrowRightLeft,
  AlertTriangle,
  LogOut,
  UserX,
  Plane,
  ShieldAlert,
  Clock,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/lifecycle/")({
  component: HrLifecycleDashboardPage,
});

export default function HrLifecycleDashboardPage() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ["hr-lifecycle-overview"],
    queryFn: async () => {
      const res = await api.get("/hr/lifecycle/overview");
      return res.data;
    },
  });

  const cards = [
    {
      title: "Probation Tracking",
      desc: "Monitor trial period progress & review confirmation eligibility.",
      route: "/hr/lifecycle/probation",
      icon: Clock,
      stat: metrics?.activeProbations ?? "0",
      label: "Active Probations",
      color: "text-amber-500",
    },
    {
      title: "Promotions & Growth",
      desc: "Process role elevations, grade increases & compensation revisions.",
      route: "/hr/lifecycle/promotions",
      icon: TrendingUp,
      stat: metrics?.promotionsCount ?? "0",
      label: "Promotions Recorded",
      color: "text-emerald-500",
    },
    {
      title: "Transfers & Relocation",
      desc: "Manage branch, department, and reporting manager transitions.",
      route: "/hr/lifecycle/transfers",
      icon: ArrowRightLeft,
      stat: "Active",
      label: "Org Movements",
      color: "text-blue-500",
    },
    {
      title: "Disciplinary Warnings",
      desc: "Track incident logs, formal reprimands, and employee responses.",
      route: "/hr/lifecycle/warnings",
      icon: AlertTriangle,
      stat: metrics?.warningsCount ?? "0",
      label: "Active Warnings",
      color: "text-rose-500",
    },
    {
      title: "Resignations & Notices",
      desc: "Manage notice period calculations, retention talks & counter-offers.",
      route: "/hr/lifecycle/resignations",
      icon: LogOut,
      stat: metrics?.pendingExits ?? "0",
      label: "Serving Notice",
      color: "text-purple-500",
    },
    {
      title: "Exit Management & Clearance",
      desc: "Oversee multi-dept clearance, asset returns, and F&F handoff.",
      route: "/hr/lifecycle/exits",
      icon: UserX,
      stat: metrics?.pendingExits ?? "0",
      label: "Clearances In Progress",
      color: "text-orange-500",
    },
    {
      title: "Honors & Awards",
      desc: "Recognize exemplary milestones with digital certificates.",
      route: "/hr/lifecycle/awards",
      icon: Award,
      stat: "Directory",
      label: "Rewards Program",
      color: "text-yellow-500",
    },
    {
      title: "Business Travel & Advances",
      desc: "Process official trip authorizations and expense settlements.",
      route: "/hr/lifecycle/trips",
      icon: Plane,
      stat: metrics?.pendingTrips ?? "0",
      label: "Pending Trips",
      color: "text-indigo-500",
    },
    {
      title: "Grievances & Confidential Cases",
      desc: "Investigate workplace reports with whistleblower protection.",
      route: "/hr/lifecycle/complaints",
      icon: ShieldAlert,
      stat: metrics?.openComplaints ?? "0",
      label: "Open Cases",
      color: "text-red-500",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employee Lifecycle Command Center"
        description="Comprehensive management of employment milestones, career transitions, disciplinary compliance, and offboarding."
      />

      {/* Top Metrics Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Probations"
          value={isLoading ? "..." : String(metrics?.activeProbations || 0)}
          description="Awaiting 90-day review"
          icon={Clock}
        />
        <StatCard
          title="Promotions Executed"
          value={isLoading ? "..." : String(metrics?.promotionsCount || 0)}
          description="Career progressions"
          icon={TrendingUp}
        />
        <StatCard
          title="Exits In Progress"
          value={isLoading ? "..." : String(metrics?.pendingExits || 0)}
          description="Notice & clearance tasks"
          icon={LogOut}
        />
        <StatCard
          title="Open Grievances"
          value={isLoading ? "..." : String(metrics?.openComplaints || 0)}
          description="Confidential investigations"
          icon={ShieldAlert}
        />
      </div>

      {/* Operational Modules Navigation Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.title} className="hover:border-primary/50 transition-all flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-lg bg-muted ${c.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <Badge variant="outline" className="font-mono text-xs">
                    {c.stat}
                  </Badge>
                </div>
                <CardTitle className="text-lg mt-3">{c.title}</CardTitle>
                <CardDescription className="text-xs leading-relaxed">{c.desc}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Link to={c.route}>
                  <Button variant="outline" size="sm" className="w-full justify-between group">
                    <span>Manage Module</span>
                    <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
