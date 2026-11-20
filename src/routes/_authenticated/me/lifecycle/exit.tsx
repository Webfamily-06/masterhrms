import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, unwrapData } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  CheckCircle2,
  Clock,
  LogOut,
  ShieldCheck,
  FileCheck,
  HelpCircle,
  Download,
  FileText,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/me/lifecycle/exit")({
  component: MeExitClearancePage,
});

export default function MeExitClearancePage() {
  const [downloading, setDownloading] = useState(false);

  const { data: exitData, isLoading } = useQuery({
    queryKey: ["me-lifecycle-exit"],
    queryFn: async () => {
      const res = await api.get("/me/lifecycle/exit");
      return unwrapData(res);
    },
  });

  const activeRecord = exitData?.resignation || exitData;
  const exitId = activeRecord?.id;
  const relievingCode = activeRecord?.relievingLetterCode;
  const isCompleted = activeRecord?.status === "completed" || activeRecord?.isCleared;

  const handleDownloadRelieving = async () => {
    if (!exitId) {
      toast.error("No active exit record ID found.");
      return;
    }
    try {
      setDownloading(true);
      toast.info("Retrieving your signed Relieving Certificate...");
      const res = await api.get(`/api/offboarding/exits/${exitId}/relieving-letter`);
      const payload = res.data;

      if (payload.downloadUrl) {
        window.open(payload.downloadUrl, "_blank");
      } else {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
        const downloadAnchor = document.createElement("a");
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `Relieving_Certificate_${relievingCode || exitId}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
      }
      toast.success("Relieving Certificate downloaded successfully.");
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || "Failed to download relieving certificate.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Exit Clearance & Offboarding Status"
        description="Monitor departmental sign-offs, asset handovers, exit interview scheduling, and final settlement preparation."
      />

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Checking clearance status...</div>
      ) : !activeRecord ? (
        <Card className="py-12 text-center">
          <ShieldCheck className="h-12 w-12 text-emerald-500 mx-auto mb-3 opacity-80" />
          <h3 className="text-base font-semibold">No Active Offboarding Workflow</h3>
          <p className="text-sm text-muted-foreground mt-1">
            You are currently an active employee in good standing. Offboarding trackers activate only upon notice submission.
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Relieving Certificate Card when Available */}
          {(relievingCode || isCompleted) && (
            <Card className="border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Badge variant="default" className="bg-emerald-600 text-white">
                    OFFICIALLY ISSUED
                  </Badge>
                  {relievingCode && (
                    <span className="font-mono text-xs font-semibold">{relievingCode}</span>
                  )}
                </div>
                <CardTitle className="text-base mt-2 flex items-center gap-2">
                  <FileCheck className="h-5 w-5 text-emerald-600" />
                  Official Relieving & Experience Certificate
                </CardTitle>
                <CardDescription>
                  Your exit clearances are verified and your official relieving certificate has been issued.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button
                  size="sm"
                  disabled={downloading}
                  onClick={handleDownloadRelieving}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Download className="h-4 w-4" />
                  {downloading ? "Downloading..." : "Download Signed Relieving Letter"}
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">Exit Offboarding Status</CardTitle>
                  <CardDescription>
                    Last Working Day:{" "}
                    <strong className="text-foreground">
                      {activeRecord.intendedLastWorkingDay || activeRecord.lastWorkingDay
                        ? new Date(activeRecord.intendedLastWorkingDay || activeRecord.lastWorkingDay).toLocaleDateString()
                        : "N/A"}
                    </strong>
                  </CardDescription>
                </div>
                <Badge
                  variant={isCompleted ? "default" : "secondary"}
                  className="text-xs uppercase"
                >
                  {isCompleted ? "ALL CLEARANCES COMPLETE" : "CLEARANCES IN PROGRESS"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Departmental Clearances
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(activeRecord.clearanceTasks || activeRecord.checklists || []).map((task: any, idx: number) => {
                    const isTaskCleared = task.status === "cleared" || task.isCompleted;
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-lg border border-border bg-card"
                      >
                        <div className="flex items-center gap-3">
                          {isTaskCleared ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                          ) : (
                            <Clock className="h-5 w-5 text-amber-500" />
                          )}
                          <div>
                            <span className="text-sm font-medium">
                              {task.department || task.title || "Department"} Department
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {task.signOffBy ? `Signed by: ${task.signOffBy}` : task.completedBy ? `Completed by ${task.completedBy}` : "Pending Review"}
                            </span>
                          </div>
                        </div>
                        <Badge variant={isTaskCleared ? "outline" : "secondary"} className="text-xs">
                          {isTaskCleared ? "CLEARED" : "PENDING"}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileCheck className="h-5 w-5 text-indigo-500" />
                  <div>
                    <span className="text-sm font-medium">HR Exit Interview</span>
                    <span className="block text-xs text-muted-foreground">
                      {activeRecord.exitInterviewScheduled || activeRecord.exitInterviewNotes
                        ? "Interview session completed/scheduled with People Operations"
                        : "Awaiting HR scheduling"}
                    </span>
                  </div>
                </div>
                <Badge variant="outline">
                  {activeRecord.exitInterviewScheduled || activeRecord.exitInterviewNotes ? "SCHEDULED" : "PENDING"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
