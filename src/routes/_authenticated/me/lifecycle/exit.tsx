import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, LogOut, ShieldCheck, FileCheck, HelpCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/me/lifecycle/exit")({
  component: MeExitClearancePage,
});

export default function MeExitClearancePage() {
  const { data: exitData, isLoading } = useQuery({
    queryKey: ["me-lifecycle-exit"],
    queryFn: async () => {
      const res = await api.get("/me/lifecycle/exit");
      return res.data;
    },
  });

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Exit Clearance & Offboarding Status"
        description="Monitor departmental sign-offs, asset handovers, exit interview scheduling, and final settlement preparation."
      />

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Checking clearance status...</div>
      ) : !exitData?.resignation ? (
        <Card className="py-12 text-center">
          <ShieldCheck className="h-12 w-12 text-emerald-500 mx-auto mb-3 opacity-80" />
          <h3 className="text-base font-semibold">No Active Offboarding Workflow</h3>
          <p className="text-sm text-muted-foreground mt-1">
            You are currently an active employee in good standing. Offboarding trackers activate only upon notice submission.
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">Exit Offboarding Status</CardTitle>
                  <CardDescription>
                    Last Working Day:{" "}
                    <strong className="text-foreground">
                      {new Date(exitData.resignation.intendedLastWorkingDay).toLocaleDateString()}
                    </strong>
                  </CardDescription>
                </div>
                <Badge
                  variant={exitData.isCleared ? "default" : "secondary"}
                  className="text-xs uppercase"
                >
                  {exitData.isCleared ? "ALL CLEARANCES COMPLETE" : "CLEARANCES IN PROGRESS"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Departmental Clearances
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(exitData.clearanceTasks || []).map((task: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-lg border border-border bg-card"
                    >
                      <div className="flex items-center gap-3">
                        {task.status === "cleared" ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        ) : (
                          <Clock className="h-5 w-5 text-amber-500" />
                        )}
                        <div>
                          <span className="text-sm font-medium">{task.department} Department</span>
                          <span className="block text-xs text-muted-foreground">
                            {task.signOffBy ? `Signed by: ${task.signOffBy}` : "Pending Review"}
                          </span>
                        </div>
                      </div>
                      <Badge variant={task.status === "cleared" ? "outline" : "secondary"} className="text-xs">
                        {task.status?.toUpperCase()}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileCheck className="h-5 w-5 text-indigo-500" />
                  <div>
                    <span className="text-sm font-medium">HR Exit Interview</span>
                    <span className="block text-xs text-muted-foreground">
                      {exitData.exitInterviewScheduled
                        ? "Interview session scheduled with People Operations"
                        : "Awaiting HR scheduling"}
                    </span>
                  </div>
                </div>
                <Badge variant="outline">
                  {exitData.exitInterviewScheduled ? "SCHEDULED" : "PENDING"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
