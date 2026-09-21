import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useCurrentProfile, useSession, hasRole } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Play,
  Wallet,
  Download,
  Eye,
  Users,
  TrendingUp,
  DollarSign,
  Printer,
  Building2,
  CalendarCheck,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Clock,
  Layers,
  Sliders,
  Sparkles,
  ShieldAlert,
  Percent,
  Calculator,
  Check,
  FileSpreadsheet,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { generatePayslipPdf } from "@/lib/pdf-generator";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_app/payroll")({
  component: Payroll,
  head: () => ({ meta: [{ title: "Payroll & Compensation Suite — Master HRMS" }] }),
});

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n || 0);
}

function Payroll() {
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);
  const qc = useQueryClient();
  const isHR = hasRole(profile, "hr_admin") || hasRole(profile, "super_admin");

  const [activeTab, setActiveTab] = useState<string>("runs");
  const [filterMonth, setFilterMonth] = useState<string>(String(new Date().getMonth() + 1));
  const [filterYear, setFilterYear] = useState<string>(String(CURRENT_YEAR));
  const [searchEmployee, setSearchEmployee] = useState<string>("");

  // Modals
  const [isRunModalOpen, setIsRunModalOpen] = useState(false);
  const [runMonth, setRunMonth] = useState<number>(new Date().getMonth() + 1);
  const [runYear, setRunYear] = useState<number>(CURRENT_YEAR);
  const [runIncludeAttendance, setRunIncludeAttendance] = useState<boolean>(true);

  const [viewingSlip, setViewingSlip] = useState<any | null>(null);

  // Component Create / Edit Modal State
  const [isCompModalOpen, setIsCompModalOpen] = useState(false);
  const [editingComp, setEditingComp] = useState<any | null>(null);
  const [compName, setCompName] = useState("");
  const [compCode, setCompCode] = useState("");
  const [compType, setCompType] = useState<"earning" | "deduction">("earning");
  const [compCalcType, setCompCalcType] = useState("percentage_of_ctc");
  const [compValue, setCompValue] = useState<number>(10);
  const [compIsTaxable, setCompIsTaxable] = useState(true);
  const [compIsStatutory, setCompIsStatutory] = useState(false);
  const [compDesc, setCompDesc] = useState("");

  // Structure Create / Edit Modal State
  const [isStructModalOpen, setIsStructModalOpen] = useState(false);
  const [editingStruct, setEditingStruct] = useState<any | null>(null);
  const [structName, setStructName] = useState("");
  const [structDesc, setStructDesc] = useState("");
  const [structIsDefault, setStructIsDefault] = useState(false);

  // 1. Payroll Runs Query
  const { data: rawRuns = [], isLoading: isLoadingRuns } = useQuery({
    queryKey: ["payroll-runs"],
    queryFn: async () => {
      try {
        const res = await api.get("/payroll/runs");
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  const runs = rawRuns.map((r: any) => ({
    ...r,
    id: r.id,
    period_month: r.periodMonth ?? r.period_month,
    period_year: r.periodYear ?? r.period_year,
    total_amount: Number(r.totalAmount ?? r.total_amount ?? 0),
    status: r.status,
    payslips_count: r._count?.payslips ?? 0,
  }));

  // 2. All Payslips Query
  const { data: rawSlips = [], isLoading: isLoadingSlips } = useQuery({
    queryKey: ["all-payslips", filterMonth, filterYear],
    queryFn: async () => {
      try {
        const query = new URLSearchParams();
        if (filterMonth && filterMonth !== "all") query.set("month", filterMonth);
        if (filterYear && filterYear !== "all") query.set("year", filterYear);
        const qStr = query.toString() ? `?${query.toString()}` : "";
        const res = await api.get(`/payroll/payslips${qStr}`);
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  const payslips = useMemo(() => {
    return rawSlips.map((s: any) => ({
      ...s,
      id: s.id,
      employee_id: s.employeeId ?? s.employee_id,
      period_month: s.periodMonth ?? s.period_month,
      period_year: s.periodYear ?? s.period_year,
      gross_salary: Number(s.grossSalary ?? s.gross_salary ?? 0),
      deductions: Number(s.deductions ?? 0),
      net_salary: Number(s.netSalary ?? s.net_salary ?? 0),
      breakdown: s.breakdown,
      employee: s.employee,
    }));
  }, [rawSlips]);

  const filteredPayslips = useMemo(() => {
    if (!searchEmployee.trim()) return payslips;
    const q = searchEmployee.toLowerCase();
    return payslips.filter((s: any) => {
      const name = `${s.employee?.firstName || ""} ${s.employee?.lastName || ""}`.toLowerCase();
      const code = (s.employee?.employeeCode || "").toLowerCase();
      const dept = (s.employee?.department?.name || "").toLowerCase();
      return name.includes(q) || code.includes(q) || dept.includes(q);
    });
  }, [payslips, searchEmployee]);

  // 3. Salary Components Query
  const { data: rawComponents = [] } = useQuery({
    queryKey: ["salary-components"],
    queryFn: async () => {
      try {
        const res = await api.get("/payroll/salary-components");
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  const earningsComponents = rawComponents.filter((c: any) => c.type === "earning");
  const deductionsComponents = rawComponents.filter((c: any) => c.type === "deduction");

  // 4. Salary Structures Query
  const { data: rawStructures = [] } = useQuery({
    queryKey: ["salary-structures"],
    queryFn: async () => {
      try {
        const res = await api.get("/payroll/salary-structures");
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  // KPI Metrics Computation
  const currentMonthRun = runs.find(
    (r: any) => r.period_month === Number(filterMonth) && r.period_year === Number(filterYear)
  );

  const totalGrossDisbursed = payslips.reduce((sum: number, s: any) => sum + s.gross_salary, 0);
  const totalNetDisbursed = payslips.reduce((sum: number, s: any) => sum + s.net_salary, 0);
  const totalDeductionsDisbursed = payslips.reduce((sum: number, s: any) => sum + s.deductions, 0);

  // Generate Payroll Mutation
  const generatePayrollMutation = useMutation({
    mutationFn: async () => {
      return await api.post("/payroll/generate", {
        periodMonth: runMonth,
        periodYear: runYear,
        includeAttendance: runIncludeAttendance,
      });
    },
    onSuccess: (data: any) => {
      setIsRunModalOpen(false);
      qc.invalidateQueries({ queryKey: ["payroll-runs"] });
      qc.invalidateQueries({ queryKey: ["all-payslips"] });
      toast.success(`🎉 Payroll generated successfully for ${data.employeeCount} employees! Total Net: ₹${Number(data.totalNet).toLocaleString("en-IN")}`);
    },
    onError: (e: any) => toast.error(e.message || "Failed to process payroll run"),
  });

  // Update Run Status Mutation
  const updateRunStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return await api.patch(`/payroll/runs/${id}/status`, { status });
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["payroll-runs"] });
      toast.success(`Payroll run status updated to "${vars.status.toUpperCase()}"!`);
    },
    onError: (e: any) => toast.error(e.message || "Failed to update run status"),
  });

  // Component Mutations
  const saveComponentMutation = useMutation({
    mutationFn: async () => {
      if (editingComp) {
        return await api.put(`/payroll/salary-components/${editingComp.id}`, {
          name: compName,
          code: compCode,
          type: compType,
          calculationType: compCalcType,
          value: compValue,
          isTaxable: compIsTaxable,
          isStatutory: compIsStatutory,
          description: compDesc,
        });
      } else {
        return await api.post("/payroll/salary-components", {
          name: compName,
          code: compCode,
          type: compType,
          calculationType: compCalcType,
          value: compValue,
          isTaxable: compIsTaxable,
          isStatutory: compIsStatutory,
          description: compDesc,
        });
      }
    },
    onSuccess: () => {
      setIsCompModalOpen(false);
      setEditingComp(null);
      qc.invalidateQueries({ queryKey: ["salary-components"] });
      toast.success("✅ Salary component saved successfully!");
    },
    onError: (e: any) => toast.error(e.message || "Failed to save salary component"),
  });

  const deleteComponentMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/payroll/salary-components/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["salary-components"] });
      toast.success("Salary component deleted");
    },
    onError: (e: any) => toast.error(e.message || "Failed to delete component"),
  });

  // Structure Mutations
  const saveStructureMutation = useMutation({
    mutationFn: async () => {
      if (editingStruct) {
        return await api.put(`/payroll/salary-structures/${editingStruct.id}`, {
          name: structName,
          description: structDesc,
          isDefault: structIsDefault,
        });
      } else {
        return await api.post("/payroll/salary-structures", {
          name: structName,
          description: structDesc,
          isDefault: structIsDefault,
        });
      }
    },
    onSuccess: () => {
      setIsStructModalOpen(false);
      setEditingStruct(null);
      qc.invalidateQueries({ queryKey: ["salary-structures"] });
      toast.success("✅ Salary structure template saved!");
    },
    onError: (e: any) => toast.error(e.message || "Failed to save salary structure"),
  });

  const deleteStructureMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/payroll/salary-structures/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["salary-structures"] });
      toast.success("Salary structure template deleted");
    },
    onError: (e: any) => toast.error(e.message || "Failed to delete structure"),
  });

  function openNewCompModal(type: "earning" | "deduction") {
    setEditingComp(null);
    setCompName("");
    setCompCode("");
    setCompType(type);
    setCompCalcType(type === "earning" ? "percentage_of_ctc" : "percentage_of_basic");
    setCompValue(type === "earning" ? 10 : 12);
    setCompIsTaxable(type === "earning");
    setCompIsStatutory(false);
    setCompDesc("");
    setIsCompModalOpen(true);
  }

  function openEditCompModal(comp: any) {
    setEditingComp(comp);
    setCompName(comp.name);
    setCompCode(comp.code);
    setCompType(comp.type);
    setCompCalcType(comp.calculationType || "percentage_of_ctc");
    setCompValue(comp.value || 0);
    setCompIsTaxable(comp.isTaxable !== false);
    setCompIsStatutory(Boolean(comp.isStatutory));
    setCompDesc(comp.description || "");
    setIsCompModalOpen(true);
  }

  function openNewStructModal() {
    setEditingStruct(null);
    setStructName("");
    setStructDesc("");
    setStructIsDefault(false);
    setIsStructModalOpen(true);
  }

  function openEditStructModal(struct: any) {
    setEditingStruct(struct);
    setStructName(struct.name);
    setStructDesc(struct.description || "");
    setStructIsDefault(Boolean(struct.isDefault));
    setIsStructModalOpen(true);
  }

  return (
    <div className="space-y-6 max-w-full pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
              <Calculator className="size-5" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-foreground">
              Payroll & Compensation Suite
            </h1>
            <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary bg-primary/5">
              Attendance-Integrated
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Execute automated attendance-linked payroll runs, generate granular payslips, and configure salary breakdowns & statutory taxes.
          </p>
        </div>

        {isHR && (
          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                setRunMonth(Number(filterMonth !== "all" ? filterMonth : new Date().getMonth() + 1));
                setRunYear(Number(filterYear !== "all" ? filterYear : CURRENT_YEAR));
                setIsRunModalOpen(true);
              }}
              className="font-bold text-xs bg-primary text-primary-foreground gap-1.5 h-9 shadow-sm"
            >
              <Play className="size-3.5 fill-current" />
              <span>Run Automated Payroll</span>
            </Button>
          </div>
        )}
      </div>

      {/* Sneat Pro Payroll KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "Gross Payroll Payout", value: fmtCurrency(totalGrossDisbursed), desc: `Monthly CTC for ${payslips.length} payslips`, icon: Wallet, color: "text-primary bg-primary/10" },
          { title: "Net Disbursed", value: fmtCurrency(totalNetDisbursed), desc: "Net transferred to bank accounts", icon: TrendingUp, color: "text-[oklch(0.60_0.17_155)] bg-[oklch(0.60_0.17_155/0.10)]" },
          { title: "Statutory Deductions", value: fmtCurrency(totalDeductionsDisbursed), desc: "PF (12%), ESI, PT, TDS", icon: Percent, color: "text-[oklch(0.73_0.16_75)] bg-[oklch(0.73_0.16_75/0.10)]" },
          { title: "Active Run Period", value: `${MONTHS[Number(filterMonth) - 1] || "All"} ${filterYear}`, desc: currentMonthRun ? `Status: ${currentMonthRun.status.toUpperCase()}` : "Ready to process", icon: CalendarCheck, color: "text-[oklch(0.60_0.20_200)] bg-[oklch(0.60_0.20_200/0.10)]" },
        ].map((w) => (
          <Card key={w.title} className="border border-border/70 shadow-xs">
            <CardContent className="p-5 flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground">{w.title}</span>
                <h4 className="text-xl font-bold tracking-tight text-foreground">{w.value}</h4>
                <p className="text-[11px] text-muted-foreground font-mono">{w.desc}</p>
              </div>
              <div className={cn("size-10 rounded-lg flex items-center justify-center shrink-0", w.color)}>
                <w.icon className="size-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Suite Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/40 h-10 p-1 flex flex-wrap gap-1 w-full justify-start border">
          <TabsTrigger value="runs" className="text-xs h-8 gap-1.5 font-bold data-[state=active]:bg-background">
            <Play className="size-3.5 text-primary" />
            <span>Payroll Runs History</span>
          </TabsTrigger>

          <TabsTrigger value="payslips" className="text-xs h-8 gap-1.5 font-bold data-[state=active]:bg-background">
            <FileSpreadsheet className="size-3.5 text-emerald-600" />
            <span>Employee Payslips & Breakdown</span>
          </TabsTrigger>

          {isHR && (
            <>
              <TabsTrigger value="structures" className="text-xs h-8 gap-1.5 font-bold data-[state=active]:bg-background">
                <Layers className="size-3.5 text-blue-500" />
                <span>Salary Structure Templates</span>
              </TabsTrigger>

              <TabsTrigger value="components" className="text-xs h-8 gap-1.5 font-bold data-[state=active]:bg-background">
                <Sliders className="size-3.5 text-amber-500" />
                <span>Salary Components & Tax Rules</span>
              </TabsTrigger>
            </>
          )}
        </TabsList>

        {/* ===================== TAB 1: PAYROLL RUNS ===================== */}
        <TabsContent value="runs" className="space-y-4">
          <Card className="border shadow-2xs bg-card">
            <CardHeader className="py-3 px-4 border-b bg-muted/20">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="text-sm font-black flex items-center gap-2 text-foreground">
                    <Play className="size-4 text-primary" />
                    <span>Monthly Payroll Processing Runs</span>
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    History of all executed payroll batches with payout amounts, attendance status, and approval workflows.
                  </CardDescription>
                </div>

                {isHR && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setRunMonth(new Date().getMonth() + 1);
                      setRunYear(CURRENT_YEAR);
                      setIsRunModalOpen(true);
                    }}
                    className="h-8 text-xs font-bold bg-primary text-primary-foreground gap-1.5"
                  >
                    <Plus className="size-3.5" /> New Payroll Run
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40 text-xs">
                    <TableHead className="font-bold py-2.5">Period Month / Year</TableHead>
                    <TableHead className="font-bold">Total Gross Amount</TableHead>
                    <TableHead className="font-bold">Staff Payslips</TableHead>
                    <TableHead className="font-bold">Processing Status</TableHead>
                    <TableHead className="font-bold">Processed Date</TableHead>
                    <TableHead className="text-right font-bold pr-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-xs italic">
                        No payroll runs executed yet. Click &quot;Run Automated Payroll&quot; above to generate your first batch.
                      </TableCell>
                    </TableRow>
                  ) : (
                    runs.map((run: any) => (
                      <TableRow key={run.id} className="text-xs hover:bg-muted/20 transition-colors">
                        <TableCell className="font-bold text-foreground">
                          {MONTHS[run.period_month - 1]} {run.period_year}
                        </TableCell>
                        <TableCell className="font-mono font-bold text-emerald-600">
                          {fmtCurrency(run.total_amount)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {run.payslips_count} Employees
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-bold uppercase ${
                              run.status === "completed" || run.status === "paid"
                                ? "border-emerald-500/30 text-emerald-600 bg-emerald-500/10"
                                : run.status === "processing"
                                ? "border-amber-500/30 text-amber-600 bg-amber-500/10"
                                : "border-muted text-muted-foreground"
                            }`}
                          >
                            {run.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground font-mono text-[11px]">
                          {run.processedAt ? new Date(run.processedAt).toLocaleString() : "N/A"}
                        </TableCell>
                        <TableCell className="text-right pr-4 space-x-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setFilterMonth(String(run.period_month));
                              setFilterYear(String(run.period_year));
                              setActiveTab("payslips");
                            }}
                            className="h-7 text-xs px-2.5 font-semibold"
                          >
                            <Eye className="size-3.5 mr-1 text-primary" /> View Payslips
                          </Button>

                          {isHR && run.status !== "paid" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateRunStatusMutation.mutate({ id: run.id, status: "paid" })}
                              className="h-7 text-xs px-2 font-semibold text-emerald-600 hover:bg-emerald-50 border-emerald-200"
                            >
                              <Check className="size-3 mr-1" /> Mark Paid
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===================== TAB 2: PAYSLIPS & BREAKDOWN ===================== */}
        <TabsContent value="payslips" className="space-y-4">
          <Card className="border shadow-2xs bg-card">
            <CardHeader className="py-3 px-4 border-b bg-muted/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-sm font-black flex items-center gap-2 text-foreground">
                    <FileSpreadsheet className="size-4 text-emerald-600" />
                    <span>Employee Payslips & Salary Breakdown Passport</span>
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Individual salary breakdown with real biometric attendance, payable days, Basic, HRA, PF, and Net Pay.
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Input
                    placeholder="Search employee name or code..."
                    value={searchEmployee}
                    onChange={(e) => setSearchEmployee(e.target.value)}
                    className="text-xs h-8 w-48 bg-background"
                  />

                  <Select value={filterMonth} onValueChange={setFilterMonth}>
                    <SelectTrigger className="text-xs h-8 w-32 bg-background">
                      <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Months</SelectItem>
                      {MONTHS.map((m, i) => (
                        <SelectItem key={m} value={String(i + 1)}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={filterYear} onValueChange={setFilterYear}>
                    <SelectTrigger className="text-xs h-8 w-24 bg-background">
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                      {YEARS.map((y) => (
                        <SelectItem key={y} value={String(y)}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40 text-xs">
                    <TableHead className="font-bold py-2.5">Employee Code & Name</TableHead>
                    <TableHead className="font-bold">Department / Role</TableHead>
                    <TableHead className="font-bold">Payable / Working Days</TableHead>
                    <TableHead className="font-bold">Gross Earned</TableHead>
                    <TableHead className="font-bold">Total Deductions (PF/PT/Tax)</TableHead>
                    <TableHead className="font-bold">Net Salary (In-Hand)</TableHead>
                    <TableHead className="text-right font-bold pr-4">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayslips.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-xs italic">
                        No payslips found for this period. Try selecting another month/year or generate a new payroll run.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPayslips.map((slip: any) => {
                      const empName = `${slip.employee?.firstName || ""} ${slip.employee?.lastName || ""}`.trim() || "Staff Member";
                      const breakdown = slip.breakdown || {};
                      const payableDays = breakdown.payableDays ?? 26;
                      const workingDays = breakdown.totalWorkingDays ?? 26;

                      return (
                        <TableRow key={slip.id} className="text-xs hover:bg-muted/20 transition-colors">
                          <TableCell>
                            <div>
                              <strong className="font-bold text-foreground block">{empName}</strong>
                              <span className="text-[10px] font-mono text-muted-foreground">
                                {slip.employee?.employeeCode || "EMP-N/A"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-foreground block">{slip.employee?.position || "Employee"}</span>
                            <span className="text-[10px] text-muted-foreground block">
                              {slip.employee?.department?.name || "General"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 font-mono">
                              <span className="font-bold text-emerald-600">{payableDays}</span>
                              <span className="text-muted-foreground">/</span>
                              <span>{workingDays} Days</span>
                            </div>
                            {breakdown.lossOfPayDays > 0 && (
                              <span className="text-[9px] text-rose-500 font-semibold block">
                                ({breakdown.lossOfPayDays}d LOP Absent)
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="font-mono font-semibold text-foreground">
                            {fmtCurrency(slip.gross_salary)}
                          </TableCell>
                          <TableCell className="font-mono font-semibold text-amber-600">
                            {fmtCurrency(slip.deductions)}
                          </TableCell>
                          <TableCell className="font-mono font-black text-emerald-600 text-sm">
                            {fmtCurrency(slip.net_salary)}
                          </TableCell>
                          <TableCell className="text-right pr-4 space-x-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setViewingSlip(slip)}
                              className="h-7 text-xs px-2.5 font-semibold text-primary"
                            >
                              <Eye className="size-3.5 mr-1" /> View Breakdown
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                generatePayslipPdf({
                                  ...slip,
                                  tenantName: profile?.tenant?.name || "TSV GLOBAL SOLUTIONS PVT LTD",
                                });
                                toast.success(`Payslip PDF downloaded for ${empName}!`);
                              }}
                              className="h-7 text-xs px-2"
                              title="Download Payslip PDF"
                            >
                              <Download className="size-3.5 text-muted-foreground hover:text-foreground" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===================== TAB 3: SALARY STRUCTURES ===================== */}
        {isHR && (
          <TabsContent value="structures" className="space-y-4">
            <Card className="border shadow-2xs bg-card">
              <CardHeader className="py-3 px-4 border-b bg-muted/20">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle className="text-sm font-black flex items-center gap-2 text-foreground">
                      <Layers className="size-4 text-blue-500" />
                      <span>Salary Structure Templates</span>
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Configure standard CTC distribution formulas and allocation percentages across different employee roles.
                    </CardDescription>
                  </div>

                  <Button
                    size="sm"
                    onClick={openNewStructModal}
                    className="h-8 text-xs font-bold bg-primary text-primary-foreground gap-1.5"
                  >
                    <Plus className="size-3.5" /> Add Structure Template
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {rawStructures.map((struct: any) => (
                    <div
                      key={struct.id}
                      className="p-4 rounded-xl border bg-muted/10 flex flex-col justify-between space-y-4 hover:border-primary/40 transition-colors shadow-2xs"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <strong className="font-bold text-foreground text-xs block">{struct.name}</strong>
                            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                              {struct.description}
                            </p>
                          </div>
                          {struct.isDefault && (
                            <Badge variant="outline" className="text-[9px] font-bold border-emerald-500/30 text-emerald-600 bg-emerald-500/10 shrink-0">
                              Default
                            </Badge>
                          )}
                        </div>

                        {/* Breakdown distribution chips */}
                        <div className="space-y-1.5 pt-2 border-t text-[10px]">
                          <strong className="text-muted-foreground font-semibold block">Component Weightings:</strong>
                          <div className="flex flex-wrap gap-1">
                            {(struct.components || []).map((c: any, i: number) => (
                              <Badge key={i} variant="secondary" className="text-[10px] font-mono py-0">
                                {c.code}: {c.percentage ? `${c.percentage}%` : `₹${c.fixed}`}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-1.5 pt-2 border-t">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditStructModal(struct)}
                          className="h-7 text-xs px-2.5 font-semibold text-primary"
                        >
                          <Edit2 className="size-3 mr-1" /> Edit
                        </Button>
                        {!struct.isDefault && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteStructureMutation.mutate(struct.id)}
                            className="h-7 text-xs px-2 text-rose-500 hover:text-rose-700"
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* ===================== TAB 4: SALARY COMPONENTS & TAX RULES ===================== */}
        {isHR && (
          <TabsContent value="components" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Earnings Components Card */}
              <Card className="border shadow-2xs bg-card">
                <CardHeader className="py-3 px-4 border-b bg-muted/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-black flex items-center gap-2 text-emerald-600">
                        <Wallet className="size-4" />
                        <span>Earnings Components</span>
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Allowances, Basic remuneration, and variable bonuses.
                      </CardDescription>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => openNewCompModal("earning")}
                      className="h-7 text-xs font-bold bg-emerald-600 text-white gap-1"
                    >
                      <Plus className="size-3" /> Add Earning
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="p-0 divide-y">
                  {earningsComponents.map((comp: any) => (
                    <div key={comp.id} className="p-3.5 flex items-center justify-between hover:bg-muted/20 transition-colors text-xs">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <strong className="font-bold text-foreground">{comp.name}</strong>
                          <Badge variant="outline" className="text-[9px] font-mono">
                            {comp.code}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground">{comp.description}</p>
                        <span className="text-[10px] font-mono text-emerald-600 font-bold">
                          Weight: {comp.value}% of CTC ({comp.calculationType})
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditCompModal(comp)}
                          className="h-7 text-primary hover:bg-primary/10"
                        >
                          <Edit2 className="size-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteComponentMutation.mutate(comp.id)}
                          className="h-7 text-rose-500 hover:text-rose-700"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Deductions & Statutory Rules Card */}
              <Card className="border shadow-2xs bg-card">
                <CardHeader className="py-3 px-4 border-b bg-muted/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-black flex items-center gap-2 text-amber-600">
                        <Percent className="size-4" />
                        <span>Deductions & Statutory Taxes</span>
                      </CardTitle>
                      <CardDescription className="text-xs">
                        PF (12%), ESI, Professional Tax (PT), and TDS withholdings.
                      </CardDescription>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => openNewCompModal("deduction")}
                      className="h-7 text-xs font-bold bg-amber-600 text-white gap-1"
                    >
                      <Plus className="size-3" /> Add Deduction
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="p-0 divide-y">
                  {deductionsComponents.map((comp: any) => (
                    <div key={comp.id} className="p-3.5 flex items-center justify-between hover:bg-muted/20 transition-colors text-xs">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <strong className="font-bold text-foreground">{comp.name}</strong>
                          <Badge variant="outline" className="text-[9px] font-mono">
                            {comp.code}
                          </Badge>
                          {comp.isStatutory && (
                            <Badge variant="secondary" className="text-[9px] font-bold text-amber-600">
                              Statutory
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground">{comp.description}</p>
                        <span className="text-[10px] font-mono text-amber-600 font-bold">
                          Formula: {comp.calculationType === "fixed_amount" ? `₹${comp.value} Flat` : `${comp.value}% of ${comp.calculationType}`}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditCompModal(comp)}
                          className="h-7 text-primary hover:bg-primary/10"
                        >
                          <Edit2 className="size-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteComponentMutation.mutate(comp.id)}
                          className="h-7 text-rose-500 hover:text-rose-700"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* ===================== RUN AUTOMATED PAYROLL MODAL ===================== */}
      <Dialog open={isRunModalOpen} onOpenChange={setIsRunModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-black flex items-center gap-2 text-foreground">
              <Calculator className="size-5 text-primary" /> Execute Monthly Payroll Run
            </DialogTitle>
            <DialogDescription className="text-xs">
              Calculate automated salaries for all active employees with attendance proration, LOP deductions, PF (12%), ESI, and Professional Tax.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Payroll Month</Label>
                <Select value={String(runMonth)} onValueChange={(v) => setRunMonth(Number(v))}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => (
                      <SelectItem key={m} value={String(i + 1)}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Payroll Year</Label>
                <Select value={String(runYear)} onValueChange={(v) => setRunYear(Number(v))}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {YEARS.map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Attendance Toggle Card */}
            <div className="p-3.5 rounded-xl border bg-primary/5 border-primary/20 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarCheck className="size-4 text-primary" />
                  <strong className="text-xs font-bold text-foreground">Biometric Attendance Integration</strong>
                </div>
                <input
                  type="checkbox"
                  checked={runIncludeAttendance}
                  onChange={(e) => setRunIncludeAttendance(e.target.checked)}
                  className="size-4 accent-primary rounded cursor-pointer"
                />
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                When enabled, salaries are prorated based on real biometric punch logs + approved leaves. Unpaid absent days are automatically deducted as Loss of Pay (LOP).
              </p>
            </div>

            <div className="p-3 rounded-lg bg-muted/40 text-[11px] text-muted-foreground space-y-1 border">
              <span className="font-bold text-foreground block">⚡ Calculation Engine Rules:</span>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Basic Salary: 50% CTC (Prorated by attendance)</li>
                <li>HRA: 20% CTC | Special: 15% | Conveyance: 5% | Medical: 5%</li>
                <li>PF Employee: 12% of Basic | ESI: 0.75% (if Gross ≤ 21k)</li>
                <li>Professional Tax: ₹200 flat</li>
              </ul>
            </div>
          </div>

          <DialogFooter className="pt-2 border-t flex justify-between">
            <Button size="sm" variant="outline" onClick={() => setIsRunModalOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => generatePayrollMutation.mutate()}
              disabled={generatePayrollMutation.isPending}
              className="text-xs font-bold bg-primary text-primary-foreground gap-1.5"
            >
              <Play className="size-3.5 fill-current" />
              <span>{generatePayrollMutation.isPending ? "Calculating Payroll..." : "Start Payroll Calculation"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===================== VIEW FULL PAYSLIP BREAKDOWN MODAL ===================== */}
      <Dialog open={!!viewingSlip} onOpenChange={(o) => !o && setViewingSlip(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {viewingSlip && (() => {
            const emp = viewingSlip.employee || {};
            const breakdown = viewingSlip.breakdown || {};
            const earnings = breakdown.earnings || {};
            const deductions = breakdown.deductions || {};
            const currencySymbol = breakdown.currencySymbol || "₹";

            return (
              <div className="space-y-4 py-1 text-xs">
                {/* Header Passport */}
                <div className="p-4 rounded-xl border bg-primary/5 border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Building2 className="size-4 text-primary" />
                      <strong className="text-sm font-black text-foreground">
                        {profile?.tenant?.name || "TSV GLOBAL SOLUTIONS PVT LTD"}
                      </strong>
                    </div>
                    <span className="text-[10px] text-muted-foreground block mt-0.5">
                      Salary Slip for Period: {MONTHS[viewingSlip.period_month - 1]} {viewingSlip.period_year}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">Net Salary Payout</span>
                    <strong className="text-xl font-black text-emerald-600">
                      {fmtCurrency(viewingSlip.net_salary)}
                    </strong>
                  </div>
                </div>

                {/* Employee Passport Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl border bg-muted/20 text-[11px]">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Employee Name</span>
                    <strong className="font-bold text-foreground">
                      {emp.firstName} {emp.lastName}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Employee ID / Code</span>
                    <strong className="font-mono font-bold text-foreground">{emp.employeeCode || "N/A"}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Designation</span>
                    <strong className="font-bold text-foreground">{emp.position || "Staff"}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Department</span>
                    <strong className="font-bold text-foreground">{emp.department?.name || "General"}</strong>
                  </div>
                </div>

                {/* Attendance Metric Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-2.5 rounded-lg border bg-muted/10 font-mono text-[10px] text-center">
                  <div className="p-1.5 bg-background rounded border">
                    <span className="text-muted-foreground block">Total Days</span>
                    <strong className="text-foreground text-xs">{breakdown.totalWorkingDays ?? 26}</strong>
                  </div>
                  <div className="p-1.5 bg-background rounded border">
                    <span className="text-emerald-600 font-bold block">Payable Days</span>
                    <strong className="text-emerald-600 text-xs">{breakdown.payableDays ?? 26}</strong>
                  </div>
                  <div className="p-1.5 bg-background rounded border">
                    <span className="text-muted-foreground block">Present Days</span>
                    <strong className="text-foreground text-xs">{breakdown.presentDays ?? 26}</strong>
                  </div>
                  <div className="p-1.5 bg-background rounded border">
                    <span className="text-blue-500 font-bold block">Paid Leaves</span>
                    <strong className="text-blue-500 text-xs">{breakdown.approvedLeaveDays ?? 0}</strong>
                  </div>
                  <div className="p-1.5 bg-background rounded border">
                    <span className="text-rose-500 font-bold block">Loss of Pay (LOP)</span>
                    <strong className="text-rose-500 text-xs">{breakdown.lossOfPayDays ?? 0}</strong>
                  </div>
                </div>

                {/* Dual Column Breakdown Table */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Earnings Column */}
                  <div className="border rounded-xl overflow-hidden">
                    <div className="p-2.5 bg-emerald-500/10 border-b font-bold text-emerald-700 dark:text-emerald-300 flex justify-between">
                      <span>Earnings (Remuneration)</span>
                      <span>Amount</span>
                    </div>
                    <div className="divide-y text-xs p-1">
                      <div className="p-2 flex justify-between">
                        <span>Basic Salary</span>
                        <strong className="font-mono">{fmtCurrency(earnings.basicSalary || 0)}</strong>
                      </div>
                      <div className="p-2 flex justify-between">
                        <span>House Rent Allowance (HRA)</span>
                        <strong className="font-mono">{fmtCurrency(earnings.hra || 0)}</strong>
                      </div>
                      <div className="p-2 flex justify-between">
                        <span>Special Allowance</span>
                        <strong className="font-mono">{fmtCurrency(earnings.specialAllowance || 0)}</strong>
                      </div>
                      <div className="p-2 flex justify-between">
                        <span>Conveyance Allowance</span>
                        <strong className="font-mono">{fmtCurrency(earnings.conveyance || 0)}</strong>
                      </div>
                      <div className="p-2 flex justify-between">
                        <span>Medical Allowance</span>
                        <strong className="font-mono">{fmtCurrency(earnings.medical || 0)}</strong>
                      </div>
                      {earnings.otherAllowance > 0 && (
                        <div className="p-2 flex justify-between">
                          <span>Other Allowances</span>
                          <strong className="font-mono">{fmtCurrency(earnings.otherAllowance)}</strong>
                        </div>
                      )}
                      <div className="p-2.5 bg-muted/40 font-bold flex justify-between text-emerald-600">
                        <span>Total Gross Earnings</span>
                        <strong className="font-mono">{fmtCurrency(viewingSlip.gross_salary)}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Deductions Column */}
                  <div className="border rounded-xl overflow-hidden">
                    <div className="p-2.5 bg-amber-500/10 border-b font-bold text-amber-700 dark:text-amber-300 flex justify-between">
                      <span>Deductions & Taxes</span>
                      <span>Amount</span>
                    </div>
                    <div className="divide-y text-xs p-1">
                      <div className="p-2 flex justify-between">
                        <span>Provident Fund (PF - 12%)</span>
                        <strong className="font-mono text-amber-600">{fmtCurrency(deductions.providentFund || 0)}</strong>
                      </div>
                      <div className="p-2 flex justify-between">
                        <span>Employee State Insurance (ESI)</span>
                        <strong className="font-mono text-amber-600">{fmtCurrency(deductions.esi || 0)}</strong>
                      </div>
                      <div className="p-2 flex justify-between">
                        <span>Professional Tax (PT)</span>
                        <strong className="font-mono text-amber-600">{fmtCurrency(deductions.professionalTax || 0)}</strong>
                      </div>
                      <div className="p-2 flex justify-between">
                        <span>TDS / Income Tax</span>
                        <strong className="font-mono text-amber-600">{fmtCurrency(deductions.tds || 0)}</strong>
                      </div>
                      <div className="p-2.5 bg-muted/40 font-bold flex justify-between text-amber-600">
                        <span>Total Deductions</span>
                        <strong className="font-mono">{fmtCurrency(viewingSlip.deductions)}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                <DialogFooter className="pt-2 border-t flex justify-between">
                  <Button size="sm" variant="outline" onClick={() => setViewingSlip(null)} className="text-xs">
                    Close
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      generatePayslipPdf({
                        ...viewingSlip,
                        tenantName: profile?.tenant?.name || "TSV GLOBAL SOLUTIONS PVT LTD",
                      });
                      toast.success(`Payslip PDF downloaded for ${emp.firstName} ${emp.lastName}!`);
                    }}
                    className="text-xs font-bold bg-primary text-primary-foreground gap-1.5"
                  >
                    <Printer className="size-3.5" /> Download Payslip PDF
                  </Button>
                </DialogFooter>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ===================== SALARY COMPONENT MODAL ===================== */}
      <Dialog open={isCompModalOpen} onOpenChange={setIsCompModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-black flex items-center gap-2">
              <Sliders className="size-4 text-primary" />
              {editingComp ? "Edit Salary Component" : "Add Salary Component"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Component Name</Label>
              <Input
                value={compName}
                onChange={(e) => setCompName(e.target.value)}
                placeholder="e.g. Performance Incentive / Transport Allowance"
                className="text-xs h-9"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Component Code</Label>
                <Input
                  value={compCode}
                  onChange={(e) => setCompCode(e.target.value)}
                  placeholder="e.g. INCENTIVE"
                  className="text-xs h-9 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Type</Label>
                <Select value={compType} onValueChange={(v: any) => setCompType(v)}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="earning">Earning (Allowance)</SelectItem>
                    <SelectItem value="deduction">Deduction (Tax / PF)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Calculation Rule</Label>
                <Select value={compCalcType} onValueChange={setCompCalcType}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue placeholder="Calculation" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage_of_ctc">% of Total CTC</SelectItem>
                    <SelectItem value="percentage_of_basic">% of Basic Salary</SelectItem>
                    <SelectItem value="percentage_of_gross">% of Gross Earned</SelectItem>
                    <SelectItem value="fixed_amount">Fixed Amount (₹)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Value (% or ₹)</Label>
                <Input
                  type="number"
                  value={compValue}
                  onChange={(e) => setCompValue(Number(e.target.value))}
                  className="text-xs h-9 font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Description / Purpose</Label>
              <Textarea
                value={compDesc}
                onChange={(e) => setCompDesc(e.target.value)}
                placeholder="Optional description of this compensation rule..."
                className="text-xs h-16 resize-none"
              />
            </div>
          </div>

          <DialogFooter className="pt-2 border-t flex justify-between">
            <Button size="sm" variant="outline" onClick={() => setIsCompModalOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => saveComponentMutation.mutate()}
              disabled={saveComponentMutation.isPending || !compName.trim()}
              className="text-xs font-bold bg-primary text-primary-foreground gap-1.5"
            >
              <Check className="size-3.5" /> Save Component
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===================== SALARY STRUCTURE MODAL ===================== */}
      <Dialog open={isStructModalOpen} onOpenChange={setIsStructModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-black flex items-center gap-2">
              <Layers className="size-4 text-blue-500" />
              {editingStruct ? "Edit Salary Structure" : "Create Salary Structure"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Structure Name</Label>
              <Input
                value={structName}
                onChange={(e) => setStructName(e.target.value)}
                placeholder="e.g. Sales Executive Compensation Plan"
                className="text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Description</Label>
              <Textarea
                value={structDesc}
                onChange={(e) => setStructDesc(e.target.value)}
                placeholder="Description of target employee roles and rules..."
                className="text-xs h-16 resize-none"
              />
            </div>

            <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/20">
              <input
                type="checkbox"
                checked={structIsDefault}
                onChange={(e) => setStructIsDefault(e.target.checked)}
                className="size-4 accent-primary rounded cursor-pointer"
              />
              <Label className="text-xs font-bold text-foreground cursor-pointer">
                Set as Default Organization Structure
              </Label>
            </div>
          </div>

          <DialogFooter className="pt-2 border-t flex justify-between">
            <Button size="sm" variant="outline" onClick={() => setIsStructModalOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => saveStructureMutation.mutate()}
              disabled={saveStructureMutation.isPending || !structName.trim()}
              className="text-xs font-bold bg-primary text-primary-foreground gap-1.5"
            >
              <Check className="size-3.5" /> Save Structure
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
