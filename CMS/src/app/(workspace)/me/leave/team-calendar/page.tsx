'use client';
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, unwrapData } from "@/lib/api";
import { formatLeaveDays } from "@/lib/leave-helpers";
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
  CalendarCheck,
  Loader2,
} from "lucide-react";

export default function MeLeaveTeamCalendarPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());

  const month = selectedDate.getUTCMonth() + 1;
  const year = selectedDate.getUTCFullYear();

  const {
    data: calendarPayload,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["me-leave-team-calendar", month, year],
    queryFn: async () => {
      const res = await api.get("/api/v1/me/leave/team-calendar", {
        params: { month, year, includeMeta: "true" },
      });
      return unwrapData<any>(res);
    },
  });

  const teamLeaves: any[] = Array.isArray(calendarPayload?.leaves)
    ? calendarPayload.leaves
    : Array.isArray(calendarPayload)
    ? calendarPayload
    : [];
  const holidays: any[] = Array.isArray(calendarPayload?.holidays)
    ? calendarPayload.holidays
    : [];

  const prevMonth = () => setSelectedDate(new Date(Date.UTC(year, month - 2, 1)));
  const nextMonth = () => setSelectedDate(new Date(Date.UTC(year, month, 1)));

  const todayIso = new Date().toISOString().slice(0, 10);
  const activeTodayCount = teamLeaves.filter((l: any) => {
    const s = String(l.startDate).slice(0, 10);
    const e = String(l.endDate).slice(0, 10);
    return s <= todayIso && e >= todayIso;
  }).length;

  const monthName = selectedDate.toLocaleString("default", {
    month: "long",
    timeZone: "UTC",
  });

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden">
      <PageHeader
        title="Team Absence Calendar"
        description="Review approved absences across your team and company holidays."
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`w-4 h-4 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Team Leaves This Month"
          value={teamLeaves.length}
          icon={<CalendarDays className="w-5 h-5 text-blue-500" />}
        />
        <StatCard
          label="Teammates Out Today"
          value={activeTodayCount}
          icon={<Users className="w-5 h-5 text-amber-500" />}
          className="border-amber-200 bg-amber-50/20 dark:border-amber-900/40 dark:bg-amber-950/10"
        />
        <StatCard
          label="Current Period"
          value={`${monthName} ${year}`}
          icon={<CalendarCheck className="w-5 h-5 text-emerald-500" />}
        />
      </div>

      {holidays.length > 0 && (
        <Card>
          <CardContent className="p-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-muted-foreground mr-1">
              Holidays in {monthName}:
            </span>
            {holidays.map((h: any) => (
              <Badge key={h.id} variant="secondary" className="font-normal">
                {String(h.date).slice(0, 10)} — {h.name}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base font-semibold">
              Department Schedule — {monthName} {year}
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
          {isLoading ? (
            <div className="py-12 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading team schedule...
            </div>
          ) : teamLeaves.length === 0 ? (
            <div className="py-12 px-4 text-center text-sm text-muted-foreground">
              No team members scheduled on leave for {monthName} {year}.
            </div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs font-medium text-muted-foreground border-b">
                    <tr>
                      <th className="py-3 px-4 text-left">Colleague</th>
                      <th className="py-3 px-4 text-left">Department</th>
                      <th className="py-3 px-4 text-left">Leave Type</th>
                      <th className="py-3 px-4 text-left">Dates</th>
                      <th className="py-3 px-4 text-left">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {teamLeaves.map((l: any) => (
                      <tr key={l.id} className="hover:bg-muted/30">
                        <td className="py-3 px-4 font-medium">
                          {l.employee?.firstName} {l.employee?.lastName}
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">
                          {l.employee?.department?.name || "Team"}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline">{l.leaveType?.name || "Leave"}</Badge>
                        </td>
                        <td className="py-3 px-4 tabular-nums text-xs whitespace-nowrap">
                          {String(l.startDate).slice(0, 10)} → {String(l.endDate).slice(0, 10)}
                        </td>
                        <td className="py-3 px-4 tabular-nums text-xs font-semibold">
                          {formatLeaveDays(l.days)} day(s)
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden divide-y divide-border">
                {teamLeaves.map((l: any) => (
                  <div key={l.id} className="p-4 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm">
                        {l.employee?.firstName} {l.employee?.lastName}
                      </span>
                      <Badge variant="outline">{l.leaveType?.name || "Leave"}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground tabular-nums">
                      <span>
                        {String(l.startDate).slice(0, 10)} → {String(l.endDate).slice(0, 10)}
                      </span>
                      <span className="font-semibold text-foreground">
                        {formatLeaveDays(l.days)}d
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
