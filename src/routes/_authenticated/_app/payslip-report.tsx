import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useSession, useCurrentProfile } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatSystemAmount } from "@/lib/currency";
import { toast } from "sonner";
import {
  FileText,
  Download,
  Calendar,
  Building2,
  DollarSign,
  Loader2,
  Eye,
  CheckCircle2,
  Clock,
  Printer,
  ShieldCheck,
  CreditCard,
} from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";
import { StatsOverviewGrid } from "@/components/ui/stats-overview-grid";
import { StatCard } from "@/components/ui/stat-card";
import { FilterToolbar } from "@/components/ui/filter-toolbar";
import { EmptyState } from "@/components/system-states/empty-state";

export const Route = createFileRoute("/_authenticated/_app/payslip-report")({
  component: PayslipReportPage,
  head: () => ({
    meta: [{ title: "Payslip Report — Master HRMS" }],
  }),
});

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export function PayslipReportPage() {
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);
  const tenantId = profile?.tenant_id || "default";

  // Filter states
  const [search, setSearch] = useState("");
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedPayslip, setSelectedPayslip] = useState<any | null>(null);

  // Fetch departments for filtering
  const { data: departments = [] } = useQuery({
    queryKey: ["departments", tenantId],
    queryFn: async () => {
      const res = await api.get("/employees/departments");
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  // Fetch payslips from real backend endpoint
  const { data: payslips = [], isLoading } = useQuery({
    queryKey: ["payslips-report", tenantId, selectedYear, selectedMonth],
    queryFn: async () => {
      const query = new URLSearchParams();
      if (selectedYear !== "all") query.set("year", selectedYear);
      if (selectedMonth !== "all") query.set("month", selectedMonth);
      const qStr = query.toString();

      const res: any = await api.get(`/payroll/payslips${qStr ? `?${qStr}` : ""}`);
      if (Array.isArray(res)) return res;
      if (Array.isArray(res?.data)) return res.data;
      if (res?.data && Array.isArray(res.data.data)) return res.data.data;
      return [];
    },
  });

  // Filtered dataset
  const filteredData = useMemo(() => {
    return payslips.filter((p: any) => {
      const emp = p.employee || {};
      const fullName = `${emp.firstName || ""} ${emp.lastName || ""}`.toLowerCase();
      const code = (emp.employeeCode || "").toLowerCase();
      const pos = (emp.position || "").toLowerCase();
      const deptName = (emp.department?.name || "").toLowerCase();
      const q = search.toLowerCase();

      const matchesSearch =
        !search ||
        fullName.includes(q) ||
        code.includes(q) ||
        pos.includes(q) ||
        deptName.includes(q);

      const matchesStatus =
        selectedStatus === "all" ||
        (selectedStatus === "paid" && (p.paymentStatus === "paid" || p.status === "paid")) ||
        (selectedStatus === "pending" && (p.paymentStatus !== "paid" && p.status !== "paid"));

      return matchesSearch && matchesStatus;
    });
  }, [payslips, search, selectedStatus]);

  // Aggregate KPI metrics (preserved exactly from original)
  const metrics = useMemo(() => {
    let totalGross = 0;
    let totalNet = 0;
    let totalDeductions = 0;
    let totalAllowances = 0;

    filteredData.forEach((p: any) => {
      const gross = Number(p.grossPay || p.grossAmount || 0);
      const net = Number(p.netPay || p.netAmount || 0);
      const ded = Number(p.totalDeductions || p.deductions || 0);
      const allow = Math.max(0, gross - Number(p.basicPay || (gross * 0.5)));

      totalGross += gross;
      totalNet += net;
      totalDeductions += ded;
      totalAllowances += allow;
    });

    return { totalGross, totalNet, totalDeductions, totalAllowances };
  }, [filteredData]);

  // Monthly summary for trend visualization
  const monthlyAggregates = useMemo(() => {
    const monthsData: Record<number, number> = {};
    for (let m = 1; m <= 12; m++) monthsData[m] = 0;

    payslips.forEach((p: any) => {
      const m = Number(p.periodMonth || (p.createdAt ? new Date(p.createdAt).getMonth() + 1 : 1));
      const net = Number(p.netPay || p.netAmount || 0);
      if (monthsData[m] !== undefined) {
        monthsData[m] += net;
      }
    });

    const maxVal = Math.max(1, ...Object.values(monthsData));
    return Object.entries(monthsData).map(([m, amt]) => ({
      month: MONTHS[Number(m) - 1].slice(0, 3),
      amount: amt,
      heightPct: Math.round((amt / maxVal) * 100),
    }));
  }, [payslips]);

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredData.length === 0) {
      toast.error("No payslip records available to export.");
      return;
    }

    const headers = [
      "Payslip ID",
      "Employee Code",
      "Employee Name",
      "Department",
      "Position",
      "Period Month",
      "Period Year",
      "Basic Pay",
      "Gross Pay",
      "Total Deductions",
      "Net Pay",
      "Status",
    ];

    const rows = filteredData.map((p: any) => {
      const emp = p.employee || {};
      return [
        `"${p.id}"`,
        `"${emp.employeeCode || "N/A"}"`,
        `"${emp.firstName || ""} ${emp.lastName || ""}"`,
        `"${emp.department?.name || "General"}"`,
        `"${emp.position || "Staff"}"`,
        `"${MONTHS[Number(p.periodMonth || 1) - 1] || p.periodMonth}"`,
        `"${p.periodYear || new Date().getFullYear()}"`,
        p.basicPay || 0,
        p.grossPay || 0,
        p.totalDeductions || 0,
        p.netPay || 0,
        `"${p.paymentStatus || p.status || "Pending"}"`,
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `payslip-report-${selectedYear}-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Payslip report exported successfully!");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payroll & Payslip Report"
        description="Comprehensive audit of salary disbursements, deductions, statutory contributions, and net payouts."
        breadcrumbs={[
          { label: "HRM & Payroll", href: "/payroll" },
          { label: "Reports", href: "/payslip-report" },
          { label: "Payslip Report" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              onClick={handleExportCSV}
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 text-xs font-semibold shadow-2xs"
            >
              <Download className="size-3.5 text-muted-foreground" />
              Export CSV
            </Button>
            <Button asChild size="sm" className="h-9 gap-1.5 text-xs font-semibold shadow-2xs">
              <Link to="/payroll">
                <CreditCard className="size-3.5" />
                Run Payroll
              </Link>
            </Button>
          </div>
        }
      />

      {/* KPI Visual Progress Cards */}
      <StatsOverviewGrid columns={4}>
        <StatCard
          label="Total Gross Payroll"
          value={formatSystemAmount(metrics.totalGross)}
          icon={<DollarSign className="size-4" />}
          description="+12.5% budget allocation"
          variant="default"
        />
        <StatCard
          label="Total Deductions"
          value={formatSystemAmount(metrics.totalDeductions)}
          icon={<ShieldCheck className="size-4" />}
          description="PF, ESI, TDS withholdings"
          variant="rose"
        />
        <StatCard
          label="Disbursed Net Pay"
          value={formatSystemAmount(metrics.totalNet)}
          icon={<CheckCircle2 className="size-4" />}
          description={`${filteredData.length} records processed`}
          variant="success"
        />
        <StatCard
          label="Allowances & Perks"
          value={formatSystemAmount(metrics.totalAllowances)}
          icon={<Building2 className="size-4" />}
          description="HRA, Special, DA allowances"
          variant="info"
        />
      </StatsOverviewGrid>

      {/* Annual Payroll Distribution Bar Trend */}
      <Card className="p-5 border-border/80 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Calendar className="size-4 text-primary" />
              Annual Net Payroll Distribution ({selectedYear})
            </h3>
            <p className="text-xs text-muted-foreground">Monthly net salary disbursement trend across all active departments</p>
          </div>
        </div>
        <div className="grid grid-cols-12 gap-2 h-28 items-end pt-4 border-b border-border/40 pb-2">
          {monthlyAggregates.map((item, idx) => (
            <div key={idx} className="flex flex-col items-center gap-1.5 h-full justify-end group">
              <div className="text-[10px] text-muted-foreground font-mono opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {item.amount > 0 ? formatSystemAmount(item.amount) : "—"}
              </div>
              <div
                className="w-full max-w-[28px] bg-primary/20 hover:bg-primary rounded-t transition-all duration-300 group-hover:scale-105"
                style={{ height: `${Math.max(6, item.heightPct)}%` }}
              />
              <span className="text-[10px] font-medium text-muted-foreground">{item.month}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Filter Toolbar */}
      <FilterToolbar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: "Search employee, ID, role...",
        }}
        filters={
          <>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[110px] h-8.5 text-xs">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                <SelectItem value="2027">2027</SelectItem>
                <SelectItem value="2026">2026</SelectItem>
                <SelectItem value="2025">2025</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[130px] h-8.5 text-xs">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Months</SelectItem>
                {MONTHS.map((m, idx) => (
                  <SelectItem key={idx} value={String(idx + 1)}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[120px] h-8.5 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
      />

      {/* Payslip Table Card */}
      <Card className="border border-border/80 shadow-2xs overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-48 text-xs font-semibold pl-5">Employee</TableHead>
                  <TableHead className="text-xs font-semibold">Department & Role</TableHead>
                  <TableHead className="text-xs font-semibold">Payroll Period</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Gross Pay</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Deductions</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Net Salary</TableHead>
                  <TableHead className="text-xs font-semibold text-center">Status</TableHead>
                  <TableHead className="text-xs font-semibold text-center pr-5">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-xs text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="size-4 animate-spin text-primary" />
                        <span>Loading payslip audit records...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="p-0">
                      <EmptyState
                        icon={FileText}
                        title="No payslips found"
                        description="Try adjusting your year, month, or search filter criteria."
                        compact
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((p: any) => {
                    const emp = p.employee || {};
                    const fullName = `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || "Employee";
                    const monthName = MONTHS[Number(p.periodMonth || 1) - 1] || `Month ${p.periodMonth}`;
                    const isPaid = p.paymentStatus === "paid" || p.status === "paid";

                    return (
                      <TableRow key={p.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="py-3 pl-5">
                          <div className="flex items-center gap-3">
                            <Avatar className="size-8 border border-border/80">
                              <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${fullName}`} />
                              <AvatarFallback className="text-[11px] font-semibold">
                                {fullName.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-xs font-bold text-foreground leading-tight">{fullName}</p>
                              <span className="text-[11px] font-mono text-muted-foreground">
                                {emp.employeeCode || "EMP-000"}
                              </span>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="py-3">
                          <p className="text-xs font-semibold text-foreground">{emp.department?.name || "General"}</p>
                          <p className="text-[11px] text-muted-foreground">{emp.position || "Staff"}</p>
                        </TableCell>

                        <TableCell className="py-3 text-xs font-medium text-foreground">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="size-3.5 text-muted-foreground" />
                            <span>{monthName} {p.periodYear || new Date().getFullYear()}</span>
                          </div>
                        </TableCell>

                        <TableCell className="py-3 text-right text-xs font-medium text-foreground">
                          {formatSystemAmount(p.grossPay || 0)}
                        </TableCell>

                        <TableCell className="py-3 text-right text-xs font-medium text-rose-500">
                          -{formatSystemAmount(p.totalDeductions || 0)}
                        </TableCell>

                        <TableCell className="py-3 text-right text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          {formatSystemAmount(p.netPay || 0)}
                        </TableCell>

                        <TableCell className="py-3 text-center">
                          <Badge
                            variant="outline"
                            className={
                              isPaid
                                ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 text-[11px] font-bold"
                                : "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 text-[11px] font-bold"
                            }
                          >
                            {isPaid ? (
                              <span className="flex items-center gap-1">
                                <CheckCircle2 className="size-3" /> Paid
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <Clock className="size-3" /> Pending
                              </span>
                            )}
                          </Badge>
                        </TableCell>

                        <TableCell className="py-3 text-center pr-5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedPayslip(p)}
                            className="h-8 gap-1.5 text-xs text-primary hover:text-primary hover:bg-primary/10"
                          >
                            <Eye className="size-3.5" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Payslip Breakdown Passport Dialog */}
      <Dialog open={!!selectedPayslip} onOpenChange={(open) => !open && setSelectedPayslip(null)}>
        <DialogContent className="max-w-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center justify-between border-b pb-3">
              <span className="flex items-center gap-2">
                <FileText className="size-5 text-primary" />
                Salary Payslip Passport
              </span>
              <Badge
                variant="outline"
                className={
                  selectedPayslip?.paymentStatus === "paid" || selectedPayslip?.status === "paid"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                    : "bg-amber-50 text-amber-700 border-amber-300"
                }
              >
                {selectedPayslip?.paymentStatus === "paid" || selectedPayslip?.status === "paid" ? "Disbursed" : "Pending"}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          {selectedPayslip && (
            <div className="space-y-5 text-xs">
              <div className="bg-muted/40 p-3.5 rounded-lg border border-border/60 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-foreground">
                    {selectedPayslip.employee?.firstName} {selectedPayslip.employee?.lastName}
                  </h4>
                  <p className="text-muted-foreground">
                    {selectedPayslip.employee?.position || "Staff"} • {selectedPayslip.employee?.department?.name || "General"}
                  </p>
                  <p className="font-mono text-[11px] text-muted-foreground mt-0.5">
                    Emp ID: {selectedPayslip.employee?.employeeCode || "N/A"} • PAN: {selectedPayslip.employee?.pan || "N/A"}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-muted-foreground block">Period</span>
                  <span className="text-xs font-bold text-foreground">
                    {MONTHS[Number(selectedPayslip.periodMonth || 1) - 1]} {selectedPayslip.periodYear}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="border border-border/60 rounded-lg p-3 space-y-2 bg-background">
                  <h5 className="font-bold text-foreground text-xs uppercase tracking-wider text-emerald-600 border-b pb-1.5">
                    Earnings
                  </h5>
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Basic Pay:</span>
                      <span className="font-medium">{formatSystemAmount(selectedPayslip.basicPay || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">HRA / Allowances:</span>
                      <span className="font-medium">
                        {formatSystemAmount(
                          Math.max(0, (selectedPayslip.grossPay || 0) - (selectedPayslip.basicPay || 0))
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between font-bold border-t pt-1.5 text-foreground">
                      <span>Total Gross Pay:</span>
                      <span>{formatSystemAmount(selectedPayslip.grossPay || 0)}</span>
                    </div>
                  </div>
                </div>

                <div className="border border-border/60 rounded-lg p-3 space-y-2 bg-background">
                  <h5 className="font-bold text-foreground text-xs uppercase tracking-wider text-rose-500 border-b pb-1.5">
                    Deductions
                  </h5>
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">PF (Provident Fund):</span>
                      <span className="font-medium">{formatSystemAmount(selectedPayslip.pfAmount || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">ESI (Health Insurance):</span>
                      <span className="font-medium">{formatSystemAmount(selectedPayslip.esiAmount || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">TDS (Tax Withholding):</span>
                      <span className="font-medium">{formatSystemAmount(selectedPayslip.tdsAmount || 0)}</span>
                    </div>
                    <div className="flex justify-between font-bold border-t pt-1.5 text-rose-500">
                      <span>Total Deductions:</span>
                      <span>-{formatSystemAmount(selectedPayslip.totalDeductions || 0)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-muted-foreground block">Net Remuneration Disbursed</span>
                  <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                    {formatSystemAmount(selectedPayslip.netPay || 0)}
                  </span>
                </div>
                <div className="text-right text-[11px] text-muted-foreground">
                  <p>Bank: {selectedPayslip.employee?.bankName || "Primary Account"}</p>
                  <p className="font-mono">A/C: •••• {selectedPayslip.employee?.bankAccount?.slice(-4) || "0000"}</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="mt-4 border-t pt-3 flex items-center justify-between sm:justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                window.print();
              }}
              className="gap-1.5"
            >
              <Printer className="size-3.5" />
              Print
            </Button>
            <Button size="sm" onClick={() => setSelectedPayslip(null)}>
              Close Passport
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
