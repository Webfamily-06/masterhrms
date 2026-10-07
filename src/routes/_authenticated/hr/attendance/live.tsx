import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Radio,
  Users,
  CheckCircle2,
  Clock,
  UserCheck,
  UserX,
  RefreshCw,
  Bell,
  CalendarCheck,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/attendance/live")({
  component: HrAttendanceLivePage,
});

export default function HrAttendanceLivePage() {
  const queryClient = useQueryClient();
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const { data: liveData, isLoading, refetch } = useQuery({
    queryKey: ["hr-attendance-live"],
    queryFn: async () => {
      const res = await api.get<{
        summary: {
          totalActive: number;
          checkedIn: number;
          checkedOut: number;
          late: number;
          onLeave: number;
          notYetIn: number;
        };
        todayPunches: any[];
      }>("/api/v1/hr/attendance/live");
      setLastRefreshed(new Date());
      return res;
    },
    refetchInterval: 10000, // 10s polling catch-up
  });

  const summary = liveData?.summary || {
    totalActive: 0,
    checkedIn: 0,
    checkedOut: 0,
    late: 0,
    onLeave: 0,
    notYetIn: 0,
  };

  const punches = liveData?.todayPunches || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <PageHeader
            title="Realtime Attendance Board"
            description="Live streaming attendance activity, active punch counters, and today's presence status."
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            Live Stream Active
          </div>

          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Live Counters Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <StatCard
          title="Total Workforce"
          value={summary.totalActive}
          description="Active tenant personnel"
          icon={<Users className="h-5 w-5 text-primary" />}
        />
        <StatCard
          title="Checked In"
          value={summary.checkedIn}
          description="Currently on duty"
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />}
        />
        <StatCard
          title="Checked Out"
          value={summary.checkedOut}
          description="Completed day shift"
          icon={<UserCheck className="h-5 w-5 text-blue-500" />}
        />
        <StatCard
          title="Late Arrivals"
          value={summary.late}
          description="Past grace period"
          icon={<Clock className="h-5 w-5 text-amber-500" />}
        />
        <StatCard
          title="On Leave"
          value={summary.onLeave}
          description="Approved leave today"
          icon={<CalendarCheck className="h-5 w-5 text-purple-500" />}
        />
        <StatCard
          title="Not Yet In"
          value={summary.notYetIn}
          description="Pending morning punch"
          icon={<UserX className="h-5 w-5 text-rose-500" />}
        />
      </div>

      {/* Live Punches Stream Table */}
      <Card>
        <CardHeader className="px-6 py-4 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">Today's Punch Stream</CardTitle>
            <CardDescription>Live log of punches recorded for today</CardDescription>
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            Updated: {lastRefreshed.toLocaleTimeString()}
          </span>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-muted/40 text-xs font-semibold uppercase text-muted-foreground">
                <tr>
                  <th className="px-6 py-3">Employee</th>
                  <th className="px-6 py-3">Department</th>
                  <th className="px-6 py-3">Check-In</th>
                  <th className="px-6 py-3">Check-Out</th>
                  <th className="px-6 py-3">Worked Hours</th>
                  <th className="px-6 py-3">Current Status</th>
                  <th className="px-6 py-3">Source & Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                      Connecting to live stream...
                    </td>
                  </tr>
                ) : punches.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                      No punches recorded yet today.
                    </td>
                  </tr>
                ) : (
                  punches.map((p: any) => (
                    <tr key={p.id} className="hover:bg-muted/30">
                      <td className="px-6 py-3.5 font-medium">
                        {p.employee?.firstName} {p.employee?.lastName}
                        <span className="block text-xs text-muted-foreground font-mono">
                          {p.employee?.employeeCode}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-xs text-muted-foreground">
                        {p.employee?.department?.name || "General"}
                      </td>
                      <td className="px-6 py-3.5 text-xs font-mono font-medium text-emerald-600">
                        {p.checkIn ? new Date(p.checkIn).toLocaleTimeString() : "--:--"}
                      </td>
                      <td className="px-6 py-3.5 text-xs font-mono text-blue-600">
                        {p.checkOut ? new Date(p.checkOut).toLocaleTimeString() : "--:--"}
                      </td>
                      <td className="px-6 py-3.5 text-xs font-mono">
                        {p.hours ? `${Number(p.hours).toFixed(2)}h` : "In Progress"}
                      </td>
                      <td className="px-6 py-3.5">
                        <Badge
                          variant={
                            p.status === "present"
                              ? "default"
                              : p.status === "late"
                              ? "secondary"
                              : "outline"
                          }
                          className="capitalize text-xs font-normal"
                        >
                          {p.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-3.5 text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground mr-1">[{p.source || "WEB"}]</span>
                        {p.notes || "Standard office location"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
