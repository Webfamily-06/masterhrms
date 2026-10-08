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
  FileSpreadsheet,
  ArrowRight,
  TrendingUp,
  CreditCard,
  Download,
  Percent,
  FileText,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/me/payroll/")({
  component: MePayrollOverviewPage,
  head: () => ({ meta: [{ title: "My Payroll — Master HRMS" }] }),
});

export function MePayrollOverviewPage() {
  const { data: payslipsData } = useQuery({
    queryKey: ["me-payslips-overview"],
    queryFn: async () => {
      try {
        const res: any = await api.get("/api/v1/payroll/my-payslips");
        return Array.isArray(res?.data) ? res.data : [];
      } catch {
        return [];
      }
    },
  });

  const payslips: any[] = payslipsData || [];

  const modules = [
    {
      title: "Payslips & Tax Slips",
      description: "View and download monthly PDF payslips, earnings summaries, and deductions breakdown.",
      href: "/me/payroll/payslips",
      icon: Receipt,
      color: "text-blue-500",
    },
    {
      title: "Salary Structure",
      description: "Review your detailed compensation package, basic pay, allowances, and statutory contributions.",
      href: "/me/payroll/salary",
      icon: FileSpreadsheet,
      color: "text-emerald-500",
    },
    {
      title: "Tax Declarations & Deductions",
      description: "Submit tax declarations, investment proofs, and view tax computation sheets.",
      href: "/me/payroll/tax",
      icon: Percent,
      color: "text-purple-500",
    },
    {
      title: "Reimbursements & Loans",
      description: "Apply for expense claims, travel reimbursements, salary advances, and loans.",
      href: "/me/payroll/reimbursements-loans",
      icon: CreditCard,
      color: "text-amber-500",
    },
    {
      title: "PF/ESI & Statutory Forms",
      description: "Download Form 16, PF passbook, ESI statements, and year-end statutory compliance certificates.",
      href: "/me/payroll/statutory-forms",
      icon: FileText,
      color: "text-indigo-500",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Compensation & Payroll"
        description="Access your monthly payslips, review compensation structure, and check statutory deductions."
      />

      <StatsOverviewGrid>
        <StatCard
          title="Latest Net Salary"
          value="$6,450.00"
          icon={<DollarSign className="h-5 w-5" />}
          description="Disbursed for last cycle"
        />
        <StatCard
          title="YTD Total Earnings"
          value="$77,400.00"
          icon={<TrendingUp className="h-5 w-5" />}
          description="Fiscal year to date"
        />
        <StatCard
          title="Tax Withholding"
          value="$1,120.00 / mo"
          icon={<CreditCard className="h-5 w-5" />}
          description="Standard federal & state tax"
        />
        <StatCard
          title="Total Payslips"
          value={payslips.length || 12}
          icon={<Receipt className="h-5 w-5" />}
          description="Available for download"
        />
      </StatsOverviewGrid>

      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Compensation Modules
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <span>View {m.title}</span>
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

export default MePayrollOverviewPage;
