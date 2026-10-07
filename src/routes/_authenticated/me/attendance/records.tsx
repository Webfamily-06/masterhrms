import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/me/attendance/records")({
  component: MeAttendanceRecordsPage,
});

export default function MeAttendanceRecordsPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());

  const month = selectedDate.getUTCMonth() + 1;
  const year = selectedDate.getUTCFullYear();

  const { data: response, isLoading, refetch } = useQuery({
    queryKey: ["me-attendance-records", month, year],
    queryFn: async () => {
      const res = await api.get("/api/v1/me/attendance/records", {
        params: { month, year },
      });
      return res.data;
    },
  });

  const records = response?.records || [];
  const summary = response?.summary || { present: 0, halfDay: 0, late: 0, leave: 0 };

  const prevMonth = () => {
    setSelectedDate(new Date(Date.UTC(year, month - 2, 1)));
  };

  const nextMonth = () => {
    setSelectedDate(new Date(Date.UTC(year, month, 1)));
  };

  const monthName = selectedDate.toLocaleString("default", { month: "long" });

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Attendance Log"
        description="Review your monthly punch records, working hours, and request regularization for missing punches."
      >
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Present Days" value={summary.present} icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />} />
        <StatCard label="Late Check-ins" value={summary.late} icon={<Clock className="w-5 h-5 text-amber-500" />} className="border-amber-200 bg-amber-50/20" />
        <StatCard label="Half Days" value={summary.halfDay} icon={<AlertCircle className="w-5 h-5 text-purple-500" />} />
        <StatCard label="Leaves Recorded" value={summary.leave} icon={<CalendarCheck className="w-5 h-5 text-blue-500" />} />
      </div>

      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">
              Attendance Records — {monthName} {year}
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
                  <th className="py-3 px-4 text-left">Date</th>
                  <th className="py-3 px-4 text-left">Check-In</th>
                  <th className="py-3 px-4 text-left">Check-Out</th>
                  <th className="py-3 px-4 text-left">Worked Hours</th>
                  <th className="py-3 px-4 text-left">Late / Overtime</th>
                  <th className="py-3 px-4 text-left">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground">
                      No attendance records found for {monthName} {year}
                    </td>
                  </tr>
                ) : (
                  records.map((r: any) => (
                    <tr key={r.id} className="hover:bg-muted/30">
                      <td className="py-3 px-4 font-mono text-xs font-semibold">
                        {new Date(r.date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs">
                        {r.checkIn ? new Date(r.checkIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs">
                        {r.checkOut ? new Date(r.checkOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold">
                        {r.hours ? `${Number(r.hours).toFixed(1)} hrs` : "—"}
                      </td>
                      <td className="py-3 px-4 text-xs font-mono">
                        {r.lateMinutes > 0 && <span className="text-amber-600 block">+{r.lateMinutes}m Late</span>}
                        {r.overtimeMinutes > 0 && <span className="text-emerald-600 block">+{r.overtimeMinutes}m OT</span>}
                        {!r.lateMinutes && !r.overtimeMinutes && "—"}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            r.status === "present"
                              ? "default"
                              : r.status === "late"
                              ? "secondary"
                              : r.status === "half_day"
                              ? "outline"
                              : "secondary"
                          }
                          className="capitalize text-xs"
                        >
                          {r.status.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {(!r.checkIn || !r.checkOut || r.status === "absent" || r.status === "late") && (
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-primary" asChild>
                            <Link to="/me/attendance/regularizations">
                              Regularize <ArrowRight className="w-3 h-3 ml-1" />
                            </Link>
                          </Button>
                        )}
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
