import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Database, Download, Upload, RefreshCw, CheckCircle2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/tenant/data")({
  component: TenantDataPage,
  head: () => ({
    meta: [{ title: "Data Management & Backups — Master HRMS" }],
  }),
});

function TenantDataPage() {
  const [exporting, setExporting] = useState(false);

  const handleExport = (type: string) => {
    setExporting(true);
    setTimeout(() => {
      setExporting(false);
      toast.success(`${type} export package generated and downloaded.`);
    }, 1200);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
          <Database className="h-6 w-6 text-primary" />
          Data Import, Export & Backups
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Export employee master data, statutory payroll ledgers, and trigger tenant snapshot backups.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Download className="h-4 w-4 text-primary" /> Full Workspace Export
            </CardTitle>
            <CardDescription className="text-xs">
              Download comprehensive JSON/CSV bundle of all workforce, payroll, and asset data.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Includes complete employee records, historical attendance logs, leave balances, and payslips.
            </p>
            <Button
              variant="outline"
              size="sm"
              disabled={exporting}
              onClick={() => handleExport("Complete Workspace")}
              className="gap-2 w-full"
            >
              <Download className="h-4 w-4" /> Export All Data (.ZIP)
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" /> Automated Cloud Backups
            </CardTitle>
            <CardDescription className="text-xs">
              Daily point-in-time snapshots with instant rollback capabilities.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-border/50">
              <span className="text-muted-foreground">Last Automated Snapshot:</span>
              <span className="font-medium text-foreground">Today, 03:00 AM UTC</span>
            </div>
            <div className="flex items-center justify-between text-xs pb-2 border-b border-border/50">
              <span className="text-muted-foreground">Retention Policy:</span>
              <span className="font-medium text-foreground">90 Days Active</span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => toast.success("Snapshot trigger initiated.")}
              className="gap-2 w-full text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Create Immediate Backup
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
