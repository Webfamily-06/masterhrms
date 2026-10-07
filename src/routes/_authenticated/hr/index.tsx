import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Clock,
  Calendar,
  Banknote,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Building2,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/")({
  component: HrDashboardFoundation,
});

function HrDashboardFoundation() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="HR Command Center"
          description="Enterprise workforce governance, compliance, and human capital administration."
        />
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="h-6 gap-1.5 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 font-medium">
            <ShieldCheck className="h-3.5 w-3.5" />
            P1 Foundation Active
          </Badge>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Workforce"
          value="--"
          description="Active tenant employees"
          icon={<Users className="h-5 w-5 text-primary" />}
        />
        <StatCard
          title="Present Today"
          value="--"
          description="Biometric & web check-ins"
          icon={<Clock className="h-5 w-5 text-emerald-500" />}
        />
        <StatCard
          title="Leave Requests"
          value="0"
          description="Pending management review"
          icon={<Calendar className="h-5 w-5 text-amber-500" />}
        />
        <StatCard
          title="Payroll Status"
          value="Ready"
          description="Next run scheduled"
          icon={<Banknote className="h-5 w-5 text-blue-500" />}
        />
      </div>

      {/* Foundation Architecture Notice */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border/80 shadow-xs">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Workforce Operations
            </CardTitle>
            <CardDescription className="text-xs">
              Manage organization structure, employee lifecycles, and roles.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent/40 transition-colors">
              <div>
                <p className="text-xs font-semibold">Employee Directory</p>
                <p className="text-[11px] text-muted-foreground">Browse all organizational profiles</p>
              </div>
              <Button size="sm" variant="outline" asChild>
                <Link to="/hr/employees" className="gap-1.5 text-xs">
                  Open <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent/40 transition-colors">
              <div>
                <p className="text-xs font-semibold">Time & Attendance</p>
                <p className="text-[11px] text-muted-foreground">View real-time punch logs and shift rosters</p>
              </div>
              <Button size="sm" variant="outline" asChild>
                <Link to="/hr/attendance" className="gap-1.5 text-xs">
                  Open <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-xs">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Approval Engine & Workflows
            </CardTitle>
            <CardDescription className="text-xs">
              Multi-step approval workflows across leaves, regularizations, and profile changes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent/40 transition-colors">
              <div>
                <p className="text-xs font-semibold">Unified Approval Inbox</p>
                <p className="text-[11px] text-muted-foreground">All pending tenant approval requests</p>
              </div>
              <Button size="sm" variant="outline" asChild>
                <Link to="/hr/approvals" className="gap-1.5 text-xs">
                  Review <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent/40 transition-colors">
              <div>
                <p className="text-xs font-semibold">Workflow Definitions</p>
                <p className="text-[11px] text-muted-foreground">Configure sequential & parallel approval rules</p>
              </div>
              <Button size="sm" variant="outline" asChild>
                <Link to="/hr/settings" className="gap-1.5 text-xs">
                  Configure <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
