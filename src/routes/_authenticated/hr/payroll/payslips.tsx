import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Receipt,
  Download,
  Eye,
  Send,
  Lock,
  Search,
  RefreshCw,
  FileText,
  DollarSign,
  Users,
  ShieldCheck,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/hr/payroll/payslips")({
  component: HrPayrollPayslipsPage,
});

export default function HrPayrollPayslipsPage() {
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [selectedMonth, setSelectedMonth] = useState(String(currentMonth));
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedPayslip, setSelectedPayslip] = useState<any | null>(null);

  // 1. Fetch Payslips
  const { data: payslipsData, isLoading, refetch } = useQuery({
    queryKey: ["hr-payroll-payslips", selectedYear, selectedMonth, statusFilter],
    queryFn: async () => {
      const params: any = {
        periodMonth: selectedMonth,
        periodYear: selectedYear,
      };
      if (statusFilter !== "all") {
        params.isPublished = statusFilter === "published";
      }
      const res = await api.get("/api/v1/hr/payroll/payslips", { params });
      return res.data;
    },
  });

  const payslips = payslipsData?.payslips || [];

  // Filtered list
  const filteredPayslips = payslips.filter((p: any) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const name = `${p.employee?.firstName || ""} ${p.employee?.lastName || ""}`.toLowerCase();
    const code = (p.employee?.employeeCode || "").toLowerCase();
    return name.includes(term) || code.includes(term);
  });

  // Bulk Publish Mutation
  const bulkPublishMutation = useMutation({
    mutationFn: async () => {
      return api.post("/api/v1/hr/payroll/payslips/bulk-publish", {
        periodMonth: Number(selectedMonth),
        periodYear: Number(selectedYear),
      });
    },
    onSuccess: (res) => {
      toast.success(res.data.message || "Payslips published successfully");
      queryClient.invalidateQueries({ queryKey: ["hr-payroll-payslips"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to publish payslips");
    },
  });

  const publishedCount = payslips.filter((p: any) => p.isPublished).length;
  const draftCount = payslips.length - publishedCount;
  const totalNet = payslips.reduce((acc: number, p: any) => acc + Number(p.netSalary || 0), 0);

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Payslips & Document Distribution"
        description="Review generated employee payslips, verify line items, and execute bulk releases with PDF password protection."
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          <Button
            onClick={() => bulkPublishMutation.mutate()}
            disabled={bulkPublishMutation.isPending || payslips.length === 0}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Send className="h-4 w-4" /> Release All for Period
          </Button>
        </div>
      </PageHeader>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Generated Payslips"
          value={payslips.length}
          description="Total records for period"
          icon={Receipt}
        />
        <StatCard
          title="Published to ESS"
          value={publishedCount}
          description="Available in Employee Portal"
          icon={ShieldCheck}
        />
        <StatCard
          title="Unpublished Drafts"
          value={draftCount}
          description="Awaiting release"
          icon={Lock}
        />
        <StatCard
          title="Period Net Pay"
          value={`₹${totalNet.toLocaleString("en-IN")}`}
          description="Sum of employee net payouts"
          icon={DollarSign}
        />
      </div>

      {/* Filter Toolbar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-muted-foreground uppercase">Period:</span>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="border rounded-md px-2.5 py-1.5 bg-background text-sm"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {new Date(2026, m - 1).toLocaleString("default", { month: "short" })}
                    </option>
                  ))}
                </select>
                <Input
                  type="number"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-24 h-8 text-sm"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-muted-foreground uppercase">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border rounded-md px-2.5 py-1.5 bg-background text-sm"
                >
                  <option value="all">All States</option>
                  <option value="published">Published</option>
                  <option value="draft">Draft (Unpublished)</option>
                </select>
              </div>
            </div>

            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employee name/code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-8 text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payslips Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payslip Registry</CardTitle>
          <CardDescription>
            All compensation statements calculated by the payroll engine. Password policy: First 4 letters of name + DDMM of birth.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="p-3 text-left font-medium">Employee</th>
                  <th className="p-3 text-left font-medium">Code</th>
                  <th className="p-3 text-left font-medium">Department</th>
                  <th className="p-3 text-right font-medium">Gross Salary</th>
                  <th className="p-3 text-right font-medium">Deductions</th>
                  <th className="p-3 text-right font-medium">Net Salary</th>
                  <th className="p-3 text-center font-medium">ESS Status</th>
                  <th className="p-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      Loading payslips...
                    </td>
                  </tr>
                ) : filteredPayslips.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      No payslips found for this period filter.
                    </td>
                  </tr>
                ) : (
                  filteredPayslips.map((p: any) => (
                    <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-semibold">
                        {p.employee?.firstName} {p.employee?.lastName}
                      </td>
                      <td className="p-3 text-muted-foreground font-mono">{p.employee?.employeeCode}</td>
                      <td className="p-3">{p.employee?.department?.name || "General"}</td>
                      <td className="p-3 text-right font-medium">
                        ₹{Number(p.grossSalary || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="p-3 text-right font-medium text-destructive">
                        -₹{Number(p.deductions || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="p-3 text-right font-bold text-emerald-600">
                        ₹{Number(p.netSalary || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="p-3 text-center">
                        {p.isPublished ? (
                          <Badge variant="default" className="bg-emerald-600 text-white">
                            Released
                          </Badge>
                        ) : (
                          <Badge variant="outline">Draft</Badge>
                        )}
                      </td>
                      <td className="p-3 text-right space-x-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedPayslip(p)}
                          className="gap-1"
                        >
                          <Eye className="h-3.5 w-3.5" /> View
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Payslip View Dialog */}
      <Dialog open={!!selectedPayslip} onOpenChange={() => setSelectedPayslip(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Compensation Statement — {selectedPayslip?.employee?.firstName} {selectedPayslip?.employee?.lastName}
            </DialogTitle>
            <DialogDescription>
              {selectedPayslip?.employee?.employeeCode} • Period: {selectedPayslip?.periodMonth}/{selectedPayslip?.periodYear}
            </DialogDescription>
          </DialogHeader>
          {selectedPayslip && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                {/* Earnings */}
                <div className="border rounded-lg p-4 space-y-3">
                  <h4 className="text-sm font-bold text-emerald-600 uppercase tracking-wide">Earnings</h4>
                  <div className="space-y-1.5 text-sm">
                    {selectedPayslip.breakdown?.earnings?.map((e: any, idx: number) => (
                      <div key={idx} className="flex justify-between py-1 border-b border-muted/30">
                        <span className="text-muted-foreground">{e.name}</span>
                        <span className="font-semibold">₹{Number(e.amount).toLocaleString("en-IN")}</span>
                      </div>
                    )) || (
                      <div className="flex justify-between py-1">
                        <span className="text-muted-foreground">Gross Remuneration</span>
                        <span className="font-semibold">₹{Number(selectedPayslip.grossSalary).toLocaleString("en-IN")}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Deductions */}
                <div className="border rounded-lg p-4 space-y-3">
                  <h4 className="text-sm font-bold text-destructive uppercase tracking-wide">Deductions</h4>
                  <div className="space-y-1.5 text-sm">
                    {selectedPayslip.breakdown?.deductions?.map((d: any, idx: number) => (
                      <div key={idx} className="flex justify-between py-1 border-b border-muted/30">
                        <span className="text-muted-foreground">{d.name}</span>
                        <span className="font-semibold text-destructive">-₹{Number(d.amount).toLocaleString("en-IN")}</span>
                      </div>
                    )) || (
                      <div className="flex justify-between py-1">
                        <span className="text-muted-foreground">Total Deductions</span>
                        <span className="font-semibold text-destructive">-₹{Number(selectedPayslip.deductions).toLocaleString("en-IN")}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Net Payout Banner */}
              <div className="p-4 bg-muted/40 rounded-lg flex items-center justify-between border">
                <div>
                  <span className="text-xs text-muted-foreground font-semibold uppercase">Net Take-Home Pay</span>
                  <div className="text-2xl font-black text-emerald-600">
                    ₹{Number(selectedPayslip.netSalary).toLocaleString("en-IN")}
                  </div>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p>Status: {selectedPayslip.isPublished ? "Published to ESS" : "Internal Draft"}</p>
                  <p>Attendance Credited: {selectedPayslip.breakdown?.attendance?.payableDays || 30} Days</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedPayslip(null)}>
              Close
            </Button>
            <Button
              onClick={() => {
                toast.success("Printing payslip document...");
                window.print();
              }}
              className="gap-1.5"
            >
              <Download className="h-4 w-4" /> Download / Print PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
