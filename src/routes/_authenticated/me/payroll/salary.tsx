import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  Eye,
  EyeOff,
  Layers,
  History,
  TrendingUp,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/me/payroll/salary")({
  component: MeSalaryPage,
});

export default function MeSalaryPage() {
  const [revealed, setRevealed] = useState(false);

  const { data: salaryData, isLoading, refetch } = useQuery({
    queryKey: ["me-payroll-salary"],
    queryFn: async () => {
      const res = await api.get("/api/v1/me/payroll/salary");
      return res.data;
    },
  });

  const currentSalary = salaryData?.currentSalary;
  const revisions = salaryData?.revisionHistory || [];

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="My Compensation & CTC Structure"
        description="View your active compensation components, monthly gross salary, and historical revision timeline."
      >
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRevealed(!revealed)}
            className="gap-1.5"
          >
            {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {revealed ? "Hide Figures" : "Reveal Salary"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>
      </PageHeader>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Annual CTC"
          value={revealed && currentSalary ? `₹${Number(currentSalary.ctcAnnual).toLocaleString("en-IN")}` : "₹ ••••••"}
          description="Total cost to company"
          icon={<DollarSign className="h-5 w-5" />}
        />
        <StatCard
          title="Monthly Gross"
          value={revealed && currentSalary ? `₹${Number(currentSalary.ctcMonthly).toLocaleString("en-IN")}` : "₹ ••••••"}
          description="Base monthly compensation"
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatCard
          title="Tax Regime"
          value={currentSalary ? `${currentSalary.taxRegime.toUpperCase()} Regime` : "Default"}
          description="Applicable TDS schedule"
          icon={<ShieldCheck className="h-5 w-5" />}
        />
        <StatCard
          title="Revisions Count"
          value={revisions.length}
          description="Career salary changes"
          icon={<History className="h-5 w-5" />}
        />
      </div>

      {/* Current Components Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Active Component Breakdown</CardTitle>
          <CardDescription>
            Earnings and allowances mapped to your compensation structure. Effective since {currentSalary ? new Date(currentSalary.effectiveFrom).toLocaleDateString("en-IN") : "Hire"}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-4">Loading compensation structure...</p>
          ) : !currentSalary ? (
            <p className="text-sm text-muted-foreground py-4">No active salary structure assigned. Please contact HR.</p>
          ) : (
            <div className="border rounded-md overflow-hidden text-sm">
              <table className="w-full">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="p-3 text-left font-medium">Component</th>
                    <th className="p-3 text-left font-medium">Type</th>
                    <th className="p-3 text-right font-medium">Monthly Amount</th>
                    <th className="p-3 text-right font-medium">Annualized</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {currentSalary.items?.map((item: any) => (
                    <tr key={item.id} className="hover:bg-muted/20">
                      <td className="p-3 font-semibold">
                        <div>{item.component?.name}</div>
                        <span className="text-xs text-muted-foreground font-mono">({item.component?.code})</span>
                      </td>
                      <td className="p-3 capitalize text-muted-foreground">{item.component?.type}</td>
                      <td className="p-3 text-right font-medium">
                        {revealed ? `₹${Number(item.monthlyAmount).toLocaleString("en-IN")}` : "₹ ••••••"}
                      </td>
                      <td className="p-3 text-right font-bold text-emerald-600">
                        {revealed ? `₹${Number(item.annualAmount).toLocaleString("en-IN")}` : "₹ ••••••"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Revision History */}
      <Card>
        <CardHeader>
          <CardTitle>Salary Revision Timeline</CardTitle>
          <CardDescription>
            Historical record of increments, promotions, and compensation changes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md overflow-hidden text-sm">
            <table className="w-full">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="p-3 text-left font-medium">Effective Date</th>
                  <th className="p-3 text-right font-medium">Annual CTC</th>
                  <th className="p-3 text-right font-medium">Monthly Gross</th>
                  <th className="p-3 text-left font-medium">Remarks</th>
                  <th className="p-3 text-center font-medium">State</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {revisions.map((rev: any) => (
                  <tr key={rev.id} className="hover:bg-muted/20">
                    <td className="p-3 font-mono">
                      {new Date(rev.effectiveFrom).toLocaleDateString("en-IN")}
                    </td>
                    <td className="p-3 text-right font-medium">
                      {revealed ? `₹${Number(rev.ctcAnnual).toLocaleString("en-IN")}` : "₹ ••••••"}
                    </td>
                    <td className="p-3 text-right font-bold">
                      {revealed ? `₹${Number(rev.ctcMonthly).toLocaleString("en-IN")}` : "₹ ••••••"}
                    </td>
                    <td className="p-3 text-muted-foreground">{rev.remarks || "Standard revision"}</td>
                    <td className="p-3 text-center">
                      {rev.isCurrent ? (
                        <Badge variant="default" className="bg-emerald-600">Current</Badge>
                      ) : (
                        <Badge variant="outline">Superseded</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
