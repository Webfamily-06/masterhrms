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
  Clock,
  ArrowLeftRight,
  RefreshCw,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/me/attendance/shifts")({
  component: MeAttendanceShiftsPage,
});

export default function MeAttendanceShiftsPage() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["me-attendance-shifts"],
    queryFn: async () => {
      const res = await api.get("/api/v1/me/attendance/shifts");
      return res.data;
    },
  });

  const rosters = data?.rosters || [];
  const swaps = data?.swaps || [];

  const nextRoster = rosters[0]?.shift || { name: "General Shift", startTime: "09:30", endTime: "18:30" };

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Shifts & Rosters"
        description="Inspect your assigned shift schedule and monitor peer shift swap requests."
      >
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Assigned Rosters" value={rosters.length} icon={<CalendarDays className="w-5 h-5 text-blue-500" />} />
        <StatCard label="Current Shift" value={nextRoster.name} icon={<Clock className="w-5 h-5 text-emerald-500" />} />
        <StatCard label="Standard Hours" value={`${nextRoster.startTime} - ${nextRoster.endTime}`} icon={<Clock className="w-5 h-5 text-purple-500" />} />
        <StatCard label="Swap Requests" value={swaps.length} icon={<ArrowLeftRight className="w-5 h-5 text-amber-500" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base font-semibold">Upcoming Shift Schedule</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs font-medium text-muted-foreground border-b">
                  <tr>
                    <th className="py-3 px-4 text-left">Date</th>
                    <th className="py-3 px-4 text-left">Shift</th>
                    <th className="py-3 px-4 text-left">Timings</th>
                    <th className="py-3 px-4 text-left">Break</th>
                    <th className="py-3 px-4 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rosters.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-muted-foreground">
                        No upcoming shifts scheduled. You are on default general shift.
                      </td>
                    </tr>
                  ) : (
                    rosters.map((r: any) => (
                      <tr key={r.id} className="hover:bg-muted/30">
                        <td className="py-3 px-4 font-mono text-xs font-semibold">
                          {new Date(r.rosterDate).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="secondary">{r.shift?.name || "General Shift"}</Badge>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs">
                          {r.shift?.startTime} - {r.shift?.endTime}
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">
                          {r.shift?.breakMinutes || 60} mins
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="capitalize text-xs">
                            {r.status}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base font-semibold">My Shift Swaps</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {swaps.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">
                No active or pending shift swap requests.
              </p>
            ) : (
              swaps.map((s: any) => (
                <div key={s.id} className="p-3 border rounded-lg space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold font-mono">
                      {new Date(s.shiftDate).toLocaleDateString()}
                    </span>
                    <Badge variant="outline" className="capitalize text-[10px]">
                      {s.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground">{s.reason}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
