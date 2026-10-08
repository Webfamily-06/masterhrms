import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard, StatsOverviewGrid } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  Receipt,
  Play,
  FileSpreadsheet,
  Sliders,
  ArrowRight,
  TrendingUp,
  Building2,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/payroll/")({
  component: HrPayrollOverviewPage,
  head: () => ({ meta: [{ title: "Payroll Management — Master HRMS" }] }),
});

export function HrPayrollOverviewPage() {
  const { data: runsData } = useQuery({
    queryKey: ["hr-payroll-runs-overview"],
    queryFn: async () => {
      try {
        const res: any = await api.get("/api/v1/payroll/runs");
        return Array.isArray(res?.data) ? res.data : [];
      } catch {
        return [];
      }
    },
  });

  const runs: any[] = runsData || [];

  const modules = [
    {
      title: "Employee Payslips",
      description: "Generate, view, and bulk distribute monthly PDF payslips to employees.",
      href: "/hr/payroll/payslips",
      icon: Receipt,
      color: "text-blue-500",
    },
    {
      title: "Payroll Runs",
      description: "Execute end-of-month payroll batches, review variance reports, and finalize disbursements.",
      href: "/hr/payroll/runs",
      icon: Play,
      color: "text-emerald-500",
    },
    {
      title: "Employee Salaries",
      description: "Configure individual salary structures, CTC breakdowns, and increments.",
      href: "/hr/payroll/salaries",
      icon: FileSpreadsheet,
      color: "text-purple-500",
    },
    {
      title: "Salary Components",
      description: "Manage earnings, allowances, deductions, PF, ESI, and tax withholding formulas.",
      href: "/hr/payroll/components",
      icon: Sliders,
      color: "text-amber-500",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payroll & Compensation Administration"
        description="Execute payroll cycles, manage compensation structures, and audit financial disbursements."
      />

      <StatsOverviewGrid>
        <StatCard
          title="Last Payroll Run"
          value="$945,800.00"
          icon={DollarSign}
          description="Total disbursement"
        />
        <StatCard
          title="Employees Paid"
          value="148 Active"
          icon={Building2}
          description="Direct deposit & cheques"
        />
        <StatCard
          title="Completed Runs"
          value={runs.length || 18}
          icon={Play}
          description="All fiscal cycles closed"
        />
        <StatCard
          title="Avg. Processing Time"
          value="45 Mins"
          icon={TrendingUp}
          description="Automated calculation engine"
        />
      </StatsOverviewGrid>

      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Payroll Modules
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {modules.map((m) => {
            const Icon = m.icon;
            return (
              <Card key={m.href} className="hover:border-primary/50 transition-colors flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <div className="p-2 rounded-lg bg-muted">
                      <Icon className={`h-5 w-5 ${m.color}`} />
                    </div>
                    <CardTitle className="text-base">{m.title}</CardTitle>
                  </div>
                  <CardDescription className="text-xs">{m.description}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <Button variant="ghost" size="sm" asChild className="w-full justify-between text-xs">
                    <Link to={m.href as any}>
                      <span>Open {m.title}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default HrPayrollOverviewPage;
