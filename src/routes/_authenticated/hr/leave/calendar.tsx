import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Users,
  Building2,
  CalendarCheck,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/leave/calendar")({
  component: HrLeaveCalendarPage,
});

export default function HrLeaveCalendarPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());

  const month = selectedDate.getUTCMonth() + 1;
  const year = selectedDate.getUTCFullYear();

  const { data: leaves = [], isLoading, refetch } = useQuery({
    queryKey: ["hr-leave-calendar", month, year],
    queryFn: async () => {
      const res = await api.get("/api/v1/hr/leave/calendar", {
        params: { month, year },
      });
      return res.data;
    },
  });

  const prevMonth = () => {
    setSelectedDate(new Date(Date.UTC(year, month - 2, 1)));
  };

  const nextMonth = () => {
    setSelectedDate(new Date(Date.UTC(year, month, 1)));
  };

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const activeTodayCount = leaves.filter((l: any) => {
    const s = new Date(l.startDate);
    const e = new Date(l.endDate);
    return s <= today && e >= today;
  }).length;

  const uniqueDepts = new Set(leaves.map((l: any) => l.employee?.department?.name).filter(Boolean)).size;

  const monthName = selectedDate.toLocaleString("default", { month: "long" });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organization Leave Calendar"
        description="Comprehensive schedule of approved employee leaves, team coverage, and planned absences."
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Absences This Month" value={leaves.length} icon={<CalendarDays className="w-5 h-5 text-blue-500" />} />
        <StatCard label="On Leave Today" value={activeTodayCount} icon={<Users className="w-5 h-5 text-amber-500" />} className="border-amber-200 bg-amber-50/20" />
        <StatCard label="Departments Affected" value={uniqueDepts} icon={<Building2 className="w-5 h-5 text-purple-500" />} />
        <StatCard label="Current Period" value={`${monthName} ${year}`} icon={<CalendarCheck className="w-5 h-5 text-emerald-500" />} />
      </div>

      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">
              Planned Absences — {monthName} {year}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={prevMonth}>
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              <Button variant="outline" size="sm" onClick={nextMonth}>
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs font-medium text-muted-foreground border-b">
                <tr>
                  <th className="py-3 px-4 text-left">Employee</th>
                  <th className="py-3 px-4 text-left">Department</th>
                  <th className="py-3 px-4 text-left">Leave Type</th>
                  <th className="py-3 px-4 text-left">Start Date</th>
                  <th className="py-3 px-4 text-left">End Date</th>
                  <th className="py-3 px-4 text-left">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {leaves.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground">
                      No approved leaves scheduled for {monthName} {year}
                    </td>
                  </tr>
                ) : (
                  leaves.map((l: any) => (
                    <tr key={l.id} className="hover:bg-muted/30">
                      <td className="py-3 px-4">
                        <div className="font-medium">{l.employee?.firstName} {l.employee?.lastName}</div>
                        <div className="text-xs text-muted-foreground font-mono">{l.employee?.employeeCode}</div>
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">
                        {l.employee?.department?.name || "General"}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline">{l.leaveType?.name || "Leave"}</Badge>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs">
                        {new Date(l.startDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs">
                        {new Date(l.endDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 font-semibold text-xs">
                        {l.days} day(s) {l.isHalfDay ? "(Half)" : ""}
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
