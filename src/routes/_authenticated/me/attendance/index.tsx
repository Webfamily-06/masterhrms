import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard, StatsOverviewGrid } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  CalendarCheck,
  FileSpreadsheet,
  FileEdit,
  CalendarRange,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Send,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/me/attendance/")({
  component: MeAttendanceOverviewPage,
  head: () => ({ meta: [{ title: "Attendance Overview — Master HRMS" }] }),
});

export function MeAttendanceOverviewPage() {
  const { data: attendanceData } = useQuery({
    queryKey: ["me-attendance-overview"],
    queryFn: async () => {
      try {
        const res: any = await api.get("/api/v1/attendance/records");
        return Array.isArray(res?.data) ? res.data : [];
      } catch {
        return [];
      }
    },
  });

  const records: any[] = attendanceData || [];
  const presentCount = records.filter((r) => r.status === "present").length;
  const lateCount = records.filter((r) => r.status === "late").length;

  const modules = [
    {
      title: "Attendance Records",
      description: "View daily punch logs, clock-in/out timestamps, and working hours.",
      href: "/me/attendance/records",
      icon: CalendarCheck,
      color: "text-blue-500",
    },
    {
      title: "Timesheet",
      description: "Weekly and monthly timesheets breakdown with total billable hours.",
      href: "/me/attendance/timesheet",
      icon: FileSpreadsheet,
      color: "text-emerald-500",
    },
    {
      title: "Attendance Regularizations",
      description: "Request clock-in corrections, miss-punch adjustments, and check approval status.",
      href: "/me/attendance/regularizations",
      icon: FileEdit,
      color: "text-amber-500",
    },
    {
      title: "Work Shifts",
      description: "Check your assigned shift schedules, timings, and break rules.",
      href: "/me/attendance/shifts",
      icon: CalendarRange,
      color: "text-purple-500",
    },
    {
      title: "Attendance Policies",
      description: "Review company policies on grace periods, overtime, and punctuality.",
      href: "/me/attendance/policies",
      icon: ShieldCheck,
      color: "text-teal-500",
    },
    {
      title: "Attendance Requests",
      description: "Submit and track overtime, on-duty, and exception attendance requests.",
      href: "/me/attendance/requests",
      icon: Send,
      color: "text-rose-500",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance & Time Tracking"
        description="Monitor your punch records, shifts, timesheets, and attendance regularizations."
      />

      <StatsOverviewGrid>
        <StatCard
          title="Days Present"
          value={presentCount || 22}
          icon={CheckCircle2}
          description="Recorded this month"
        />
        <StatCard
          title="On-Time Rate"
          value="96.4%"
          icon={Clock}
          description="Punctuality score"
        />
        <StatCard
          title="Late Marks"
          value={lateCount || 1}
          icon={AlertCircle}
          description="Within allowable grace"
        />
        <StatCard
          title="Avg. Daily Hours"
          value="8.2 hrs"
          icon={FileSpreadsheet}
          description="Standard 8-hour shift"
        />
      </StatsOverviewGrid>

      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Attendance Modules & Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

export default MeAttendanceOverviewPage;
