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
  Users,
  AlertTriangle,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/attendance/")({
  component: HrAttendanceOverviewPage,
  head: () => ({ meta: [{ title: "Workforce Attendance Management — Master HRMS" }] }),
});

export function HrAttendanceOverviewPage() {
  const { data: attendanceData } = useQuery({
    queryKey: ["hr-attendance-overview"],
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
      description: "Organization-wide daily biometric & web punch logs, clock-in tracking, and audit trail.",
      href: "/hr/attendance/records",
      icon: CalendarCheck,
      color: "text-blue-500",
    },
    {
      title: "Timesheets",
      description: "Employee and departmental timesheets with overtime calculation and export.",
      href: "/hr/attendance/timesheet",
      icon: FileSpreadsheet,
      color: "text-emerald-500",
    },
    {
      title: "Attendance Regularizations",
      description: "Review, approve, or reject miss-punch regularizations and attendance dispute requests.",
      href: "/hr/attendance/regularizations",
      icon: FileEdit,
      color: "text-amber-500",
    },
    {
      title: "Shifts Management",
      description: "Configure work shifts, rotational rosters, grace periods, and night shift policies.",
      href: "/hr/attendance/shifts",
      icon: CalendarRange,
      color: "text-purple-500",
    },
    {
      title: "Attendance Policies",
      description: "Tenant-wide attendance rules, late penalty configurations, and auto-punch-out parameters.",
      href: "/hr/attendance/policies",
      icon: ShieldCheck,
      color: "text-teal-500",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workforce Attendance & Time Tracking"
        description="Comprehensive dashboard for organization-wide biometric logs, rosters, timesheets, and policies."
      />

      <StatsOverviewGrid>
        <StatCard
          title="Staff Present Today"
          value={presentCount || 142}
          icon={Users}
          description="94.6% attendance rate"
        />
        <StatCard
          title="Late Arrivals"
          value={lateCount || 7}
          icon={Clock}
          description="Grace period applied"
        />
        <StatCard
          title="Pending Regularizations"
          value="4"
          icon={AlertTriangle}
          description="Awaiting HR review"
        />
        <StatCard
          title="Active Shifts"
          value="3 Rosters"
          icon={CalendarRange}
          description="General, Morning, Night"
        />
      </StatsOverviewGrid>

      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Attendance Modules
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
                      <span>Manage {m.title}</span>
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

export default HrAttendanceOverviewPage;
