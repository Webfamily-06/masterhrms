"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api, unwrapData } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { BarChart2, List } from "lucide-react";

interface DashboardResponse {
  stats: {
    totalTrainings: number;
    completed: number;
    inProgress: number;
    assigned: number;
    failed: number;
    completionRate: number;
  };
  programCompletionRates: Array<{
    courseId: string;
    name: string;
    total: number;
    completed: number;
    rate: number;
  }>;
  recentCompletions: Array<{
    id: string;
    completionDate: string;
    score: number | null;
    result: string | null;
    employee?: { firstName: string; lastName: string } | null;
    course?: { title: string } | null;
  }>;
  upcomingTrainings: Array<{
    id: string;
    assignedDate: string;
    employee?: { firstName: string; lastName: string } | null;
    course?: { title: string } | null;
  }>;
}

export default function EmployeeTrainingDashboardPage() {
  const router = useRouter();

  const { data, isLoading } = useQuery<DashboardResponse>({
    queryKey: ["hr-employee-trainings-dashboard"],
    queryFn: async () => {
      const res = await api.get("/hr/training/employee-trainings/dashboard");
      return unwrapData<DashboardResponse>(res);
    },
  });

  const stats = data?.stats || {
    totalTrainings: 0,
    completed: 0,
    inProgress: 0,
    assigned: 0,
    failed: 0,
    completionRate: 0,
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Training Dashboard"
        description="Overview of training activity, progress, and completion stats."
        actions={
          <Button
            variant="outline"
            onClick={() => router.push("/hr/training/employee-trainings")}
          >
            <List className="h-4 w-4 mr-1.5" />
            List View
          </Button>
        }
      />

      {isLoading ? (
        <div className="bg-card border border-border/80 rounded-xl p-10 text-center text-sm text-muted-foreground">
          Loading training dashboard...
        </div>
      ) : (
        <>
          {/* 5 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-card border border-border/80 rounded-xl shadow-xs p-5 flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground">Total Trainings</div>
                <div className="text-2xl font-bold text-foreground">{stats.totalTrainings}</div>
                <div className="text-xs text-muted-foreground">All time</div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-muted text-muted-foreground flex items-center justify-center">
                <BarChart2 className="h-5 w-5" />
              </div>
            </div>

            <div className="bg-card border border-border/80 rounded-xl shadow-xs p-5 flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground">Completed</div>
                <div className="text-2xl font-bold text-foreground">{stats.completed}</div>
                <div className="text-xs font-medium text-emerald-600">
                  {stats.completionRate}% rate
                </div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <BarChart2 className="h-5 w-5" />
              </div>
            </div>

            <div className="bg-card border border-border/80 rounded-xl shadow-xs p-5 flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground">In Progress</div>
                <div className="text-2xl font-bold text-foreground">{stats.inProgress}</div>
                <div className="text-xs font-medium text-sky-600">Ongoing</div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center">
                <BarChart2 className="h-5 w-5" />
              </div>
            </div>

            <div className="bg-card border border-border/80 rounded-xl shadow-xs p-5 flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground">Assigned</div>
                <div className="text-2xl font-bold text-foreground">{stats.assigned}</div>
                <div className="text-xs font-medium text-amber-600">Pending start</div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <BarChart2 className="h-5 w-5" />
              </div>
            </div>

            <div className="bg-card border border-border/80 rounded-xl shadow-xs p-5 flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground">Failed</div>
                <div className="text-2xl font-bold text-foreground">{stats.failed}</div>
                <div className="text-xs font-medium text-rose-600">Did not pass</div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
                <BarChart2 className="h-5 w-5" />
              </div>
            </div>
          </div>

          {/* Middle 2-Column Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Program Completion Rates */}
            <div className="bg-card border border-border/80 rounded-xl shadow-xs p-6 space-y-5">
              <h2 className="text-base font-bold text-foreground">Program Completion Rates</h2>
              {(data?.programCompletionRates || []).length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No program enrollments yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {(data?.programCompletionRates || []).map((prog) => (
                    <div key={prog.courseId} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground">{prog.name}</span>
                        <span className="font-bold text-foreground">{prog.rate}%</span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${prog.rate}%` }}
                        />
                      </div>
                      <div className="text-right text-[11px] text-muted-foreground">
                        {prog.completed}/{prog.total}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Completions */}
            <div className="bg-card border border-border/80 rounded-xl shadow-xs p-6 space-y-5">
              <h2 className="text-base font-bold text-foreground">Recent Completions</h2>
              {(data?.recentCompletions || []).length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No completed trainings yet.
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {(data?.recentCompletions || []).map((item) => {
                    const empName = item.employee
                      ? `${item.employee.firstName} ${item.employee.lastName}`.trim()
                      : "—";
                    return (
                      <div
                        key={item.id}
                        className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4"
                      >
                        <div>
                          <div className="text-sm font-semibold text-foreground">{empName}</div>
                          <div className="text-xs text-muted-foreground">
                            {item.course?.title || "—"}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            Completed {item.completionDate || "-"}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-bold text-foreground">
                            {item.score !== null && item.score !== undefined
                              ? `${Number(item.score).toFixed(2)}%`
                              : "-"}
                          </div>
                          <div
                            className={`text-xs font-medium ${
                              item.result === "Failed" ? "text-rose-600" : "text-emerald-600"
                            }`}
                          >
                            {item.result || "Passed"}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Bottom Card: Upcoming Trainings */}
          <div className="bg-card border border-border/80 rounded-xl shadow-xs p-6 space-y-5">
            <h2 className="text-base font-bold text-foreground">Upcoming Trainings</h2>
            {(data?.upcomingTrainings || []).length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No upcoming or in-progress trainings.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {(data?.upcomingTrainings || []).map((item) => {
                  const empName = item.employee
                    ? `${item.employee.firstName} ${item.employee.lastName}`.trim()
                    : "—";
                  return (
                    <div
                      key={item.id}
                      className="p-4 rounded-xl border border-border/80 bg-background/50 space-y-3"
                    >
                      <div>
                        <div className="text-sm font-bold text-foreground">
                          {item.course?.title || "—"}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">{empName}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          Assigned {item.assignedDate || "-"}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() =>
                          router.push(`/hr/training/employee-trainings/${item.id}`)
                        }
                      >
                        View Details
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
