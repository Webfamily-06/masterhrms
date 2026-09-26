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
import { Switch } from "@/components/ui/switch";
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
  Brain,
  TrendingDown,
  Activity,
  Zap,
  ShieldCheck,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  CreditCard,
  Landmark,
  UserCheck,
  Award,
  Lock,
  FileCheck2,
  Receipt,
  FileCode,
  Shield,
  Search,
  RefreshCw,
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { generatePayslipPdf } from "@/lib/pdf-generator";
import { generateOfficialStatutoryPdf } from "@/lib/statutory-pdf-generator";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_app/payroll")({
  component: Payroll,
  head: () => ({ meta: [{ title: "Payroll & Statutory Compliance Suite — Master HRMS" }] }),
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

  // Modals & Drawers
  const [isRunModalOpen, setIsRunModalOpen] = useState(false);
  const [runMonth, setRunMonth] = useState<number>(new Date().getMonth() + 1);
  const [runYear, setRunYear] = useState<number>(CURRENT_YEAR);
  const [runIncludeAttendance, setRunIncludeAttendance] = useState<boolean>(true);

  const [viewingSlip, setViewingSlip] = useState<any | null>(null);
  const [viewingSnapshot, setViewingSnapshot] = useState<any | null>(null);

  // Component Modal State
  const [isCompModalOpen, setIsCompModalOpen] = useState(false);
  const [editingComp, setEditingComp] = useState<any | null>(null);
  const [compName, setCompName] = useState("");
  const [compCode, setCompCode] = useState("");
  const [compType, setCompType] = useState<"earning" | "deduction">("earning");
  const [compCalcType, setCompCalcType] = useState("percentage_of_ctc");
  const [compValue, setCompValue] = useState<number>(10);
  const [compIsTaxable, setCompIsTaxable] = useState(true);
  const [compIsStatutory, setCompIsStatutory] = useState(false);
  const [compIncludeInPf, setCompIncludeInPf] = useState(false);
  const [compIncludeInEsi, setCompIncludeInEsi] = useState(false);
  const [compDesc, setCompDesc] = useState("");

  // Structure Modal State
  const [isStructModalOpen, setIsStructModalOpen] = useState(false);
  const [editingStruct, setEditingStruct] = useState<any | null>(null);
  const [structName, setStructName] = useState("");
  const [structDesc, setStructDesc] = useState("");
  const [structIsDefault, setStructIsDefault] = useState(false);

  // Salary Assignment Drawer State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assigningEmp, setAssigningEmp] = useState<any | null>(null);
  const [assignStructureId, setAssignStructureId] = useState("");
  const [assignCtcMonthly, setAssignCtcMonthly] = useState<number>(35000);
  const [assignEffectiveFrom, setAssignEffectiveFrom] = useState(new Date().toISOString().split("T")[0]);
  const [assignTaxRegime, setAssignTaxRegime] = useState<"new" | "old">("new");
  const [assignRemarks, setAssignRemarks] = useState("");

  // Live Simulator Modal State
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [simCtcMonthly, setSimCtcMonthly] = useState<number>(60000);
  const [simRegime, setSimRegime] = useState<"new" | "old">("new");
  const [simState, setSimState] = useState<string>("MH");
  const [simPf, setSimPf] = useState<boolean>(true);
  const [simEsi, setSimEsi] = useState<boolean>(true);
  const [simPt, setSimPt] = useState<boolean>(true);

  // Form 12BB Declaration Modal State
  const [isDeclarationModalOpen, setIsDeclarationModalOpen] = useState(false);
  const [declaringEmp, setDeclaringEmp] = useState<any | null>(null);
  const [declFinancialYear, setDeclFinancialYear] = useState("2025-2026");
  const [declTaxRegime, setDeclTaxRegime] = useState<"new" | "old">("new");
  const [declHouseRent, setDeclHouseRent] = useState<number>(0);
  const [declLandlordPan, setDeclLandlordPan] = useState("");
  const [declLandlordName, setDeclLandlordName] = useState("");
  const [decl80C, setDecl80C] = useState<number>(0);
  const [decl80D, setDecl80D] = useState<number>(0);
  const [decl80G, setDecl80G] = useState<number>(0);
  const [declHomeLoan, setDeclHomeLoan] = useState<number>(0);
  const [declOtherIncome, setDeclOtherIncome] = useState<number>(0);

  // Form 16 Modal State
  const [viewingForm16Emp, setViewingForm16Emp] = useState<any | null>(null);
  const [form16Data, setForm16Data] = useState<any | null>(null);

  // ==========================================
  // QUERIES
  // ==========================================

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
    total_net: Number(r.totalNet ?? r.total_net ?? 0),
    total_deductions: Number(r.totalDeductions ?? r.total_deductions ?? 0),
    approval_status: r.approvalStatus ?? "draft",
    status: r.status,
    payslips_count: r._count?.payslips ?? 0,
    snapshots_count: r._count?.snapshots ?? 0,
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

  // 3. Employee Master Auto-Bound Query
  const { data: payrollEmployees = [], isLoading: isLoadingEmployees } = useQuery({
    queryKey: ["payroll-employees"],
    queryFn: async () => {
      try {
        const res = await api.get("/payroll/employees");
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  // 4. Salary Components Query
  const { data: rawComponents = [] } = useQuery({
    queryKey: ["payroll-salary-components"],
    queryFn: async () => {
      try {
        const res = await api.get("/payroll/salary-components");
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  // 5. Salary Structures Query
  const { data: rawStructures = [] } = useQuery({
    queryKey: ["payroll-salary-structures"],
    queryFn: async () => {
      try {
        const res = await api.get("/payroll/salary-structures");
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  // 6. Tax Declarations Query
  const { data: taxDeclarations = [] } = useQuery({
    queryKey: ["tax-declarations"],
    queryFn: async () => {
      try {
        const res = await api.get("/payroll/tax-declarations");
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  // 7. CTC Simulator Live Query
  const { data: simResult } = useQuery({
    queryKey: ["sim-ctc", simCtcMonthly, simRegime, simState, simPf, simEsi, simPt],
    queryFn: async () => {
      try {
        const res = await api.post("/payroll/simulate-ctc", {
          ctcMonthly: simCtcMonthly,
          taxRegime: simRegime,
          state: simState,
          pfEligible: simPf,
          esiEligible: simEsi,
          ptEligible: simPt,
          tdsEligible: true,
        });
        return res;
      } catch {
        return null;
      }
    },
    enabled: isSimulatorOpen,
  });

  // ==========================================
  // MUTATIONS
  // ==========================================

  // Generate Payroll Run Mutation
  const generateMutation = useMutation({
    mutationFn: async (payload: { periodMonth: number; periodYear: number; includeAttendance: boolean }) => {
      return await api.post("/payroll/generate", payload);
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["payroll-runs"] });
      qc.invalidateQueries({ queryKey: ["all-payslips"] });
      setIsRunModalOpen(false);
      toast.success(
        `Payroll processed for ${data.employeeCount} employees! Total Payout: ₹${Number(data.totalNet || 0).toLocaleString("en-IN")}`
      );
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to process payroll batch.");
    },
  });

  // Update Run Status Mutation
  const updateRunStatusMutation = useMutation({
    mutationFn: async ({ id, status, approvalStatus }: { id: string; status: string; approvalStatus?: string }) => {
      return await api.patch(`/payroll/runs/${id}/status`, { status, approvalStatus });
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["payroll-runs"] });
      qc.invalidateQueries({ queryKey: ["all-payslips"] });
      toast.success(`Payroll run updated to: ${data.approvalStatus || data.status}`);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update payroll run status.");
    },
  });

  // Component Upsert Mutation
  const saveComponentMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editingComp) {
        return await api.put(`/payroll/salary-components/${editingComp.id}`, payload);
      }
      return await api.post("/payroll/salary-components", payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payroll-salary-components"] });
      setIsCompModalOpen(false);
      toast.success(editingComp ? "Component updated successfully." : "Component created.");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save component.");
    },
  });

  // Structure Upsert Mutation
  const saveStructureMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editingStruct) {
        return await api.put(`/payroll/salary-structures/${editingStruct.id}`, payload);
      }
      return await api.post("/payroll/salary-structures", payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payroll-salary-structures"] });
      setIsStructModalOpen(false);
      toast.success(editingStruct ? "Salary structure updated." : "Salary structure created.");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save structure.");
    },
  });

  // Assign Salary Structure Mutation
  const assignSalaryMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post("/payroll/salary-assignments", payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payroll-employees"] });
      setIsAssignModalOpen(false);
      toast.success("Salary assignment & CTC updated with effective dating.");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to assign salary structure.");
    },
  });

  // Submit Tax Declaration Mutation
  const submitDeclarationMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post("/payroll/tax-declarations", payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tax-declarations"] });
      qc.invalidateQueries({ queryKey: ["payroll-employees"] });
      setIsDeclarationModalOpen(false);
      toast.success("Form 12BB tax declaration submitted successfully.");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to submit declaration.");
    },
  });

  // Verify Declaration Mutation
  const verifyDeclarationMutation = useMutation({
    mutationFn: async ({ id, status, totalDeductionApproved }: { id: string; status: string; totalDeductionApproved: number }) => {
      return await api.patch(`/payroll/tax-declarations/${id}/status`, { status, totalDeductionApproved });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tax-declarations"] });
      toast.success("Tax declaration verified.");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to verify declaration.");
    },
  });

  // Fetch Form 16 Mutation
  const fetchForm16 = async (emp: any) => {
    try {
      setViewingForm16Emp(emp);
      const res = await api.get(`/payroll/statutory-forms/form16/${emp.id}?financialYear=2025-2026`);
      setForm16Data(res);
    } catch (err: any) {
      toast.error("Failed to generate Form 16.");
    }
  };

  // KPI Calculations
  const totalGrossDisbursed = useMemo(() => {
    return payslips.reduce((sum, p) => sum + Number(p.gross_salary || 0), 0);
  }, [payslips]);

  const totalNetDisbursed = useMemo(() => {
    return payslips.reduce((sum, p) => sum + Number(p.net_salary || 0), 0);
  }, [payslips]);

  const totalDeductionsDisbursed = useMemo(() => {
    return payslips.reduce((sum, p) => sum + Number(p.deductions || 0), 0);
  }, [payslips]);

  const totalTdsDisbursed = useMemo(() => {
    return payslips.reduce((sum, p) => {
      const breakdown = p.breakdown as any;
      return sum + Number(breakdown?.deductions?.tds || 0);
    }, 0);
  }, [payslips]);

  const currentMonthRun = useMemo(() => {
    return runs.find(
      (r: any) =>
        r.period_month === Number(filterMonth !== "all" ? filterMonth : new Date().getMonth() + 1) &&
        r.period_year === Number(filterYear !== "all" ? filterYear : CURRENT_YEAR)
    );
  }, [runs, filterMonth, filterYear]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto min-h-screen">
      {/* Top Banner & Action Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Calculator className="size-5" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-foreground">
              Payroll & Statutory Compliance Suite
            </h1>
            <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary bg-primary/5">
              Income-tax Act 2025 Sec 392 + EPF/ESI
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Execute automated attendance-linked payroll runs, assign structured CTC with effective dates, and verify Form 12BB & Form 16.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSimulatorOpen(true)}
            className="text-xs font-bold gap-1.5 h-9"
          >
            <Zap className="size-3.5 text-amber-500" />
            <span>CTC Simulator</span>
          </Button>

          {isHR && (
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
          )}
        </div>
      </div>

      {/* Corporate KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: "Gross Monthly CTC",
            value: fmtCurrency(totalGrossDisbursed),
            desc: `Gross earned across ${payslips.length} payslips`,
            icon: Wallet,
            color: "text-primary bg-primary/10",
          },
          {
            title: "Net Disbursed",
            value: fmtCurrency(totalNetDisbursed),
            desc: "Direct bank transfer payout",
            icon: TrendingUp,
            color: "text-[oklch(0.60_0.17_155)] bg-[oklch(0.60_0.17_155/0.10)]",
          },
          {
            title: "Statutory Deductions",
            value: fmtCurrency(totalDeductionsDisbursed),
            desc: "EPF (12%), ESI, and State PT",
            icon: Percent,
            color: "text-[oklch(0.73_0.16_75)] bg-[oklch(0.73_0.16_75/0.10)]",
          },
          {
            title: "TDS Withheld (Sec 392)",
            value: fmtCurrency(totalTdsDisbursed),
            desc: "Tax deducted at source for Treasury",
            icon: ShieldCheck,
            color: "text-[oklch(0.60_0.20_200)] bg-[oklch(0.60_0.20_200/0.10)]",
          },
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
        <TabsList className="bg-muted/40 h-10 p-1 flex flex-wrap gap-1 w-full justify-start border overflow-x-auto">
          <TabsTrigger value="runs" className="text-xs h-8 gap-1.5 font-bold data-[state=active]:bg-background">
            <Play className="size-3.5 text-primary" />
            <span>Payroll Runs</span>
          </TabsTrigger>

          <TabsTrigger value="employee_salary" className="text-xs h-8 gap-1.5 font-bold data-[state=active]:bg-background">
            <UserCheck className="size-3.5 text-indigo-500" />
            <span>Employee Salary & Master</span>
          </TabsTrigger>

          <TabsTrigger value="payslips" className="text-xs h-8 gap-1.5 font-bold data-[state=active]:bg-background">
            <FileSpreadsheet className="size-3.5 text-emerald-600" />
            <span>Payslips & Breakdown</span>
          </TabsTrigger>

          {isHR && (
            <>
              <TabsTrigger value="structures" className="text-xs h-8 gap-1.5 font-bold data-[state=active]:bg-background">
                <Layers className="size-3.5 text-blue-500" />
                <span>Salary Structures</span>
              </TabsTrigger>

              <TabsTrigger value="components" className="text-xs h-8 gap-1.5 font-bold data-[state=active]:bg-background">
                <Sliders className="size-3.5 text-amber-500" />
                <span>Salary Components</span>
              </TabsTrigger>

              <TabsTrigger value="tax_declarations" className="text-xs h-8 gap-1.5 font-bold data-[state=active]:bg-background">
                <FileCheck2 className="size-3.5 text-purple-600" />
                <span>Tax & Form 12BB</span>
              </TabsTrigger>

              <TabsTrigger value="statutory_forms" className="text-xs h-8 gap-1.5 font-bold data-[state=active]:bg-background">
                <FileCode className="size-3.5 text-teal-600" />
                <span>Form 16 & Form 138</span>
              </TabsTrigger>
            </>
          )}

          <TabsTrigger
            value="ai_forecast"
            className="text-xs h-8 gap-1.5 font-bold data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white text-amber-600 shadow-xs"
          >
            <Sparkles className="size-3.5" />
            <span>AI Cost Forecast</span>
          </TabsTrigger>
        </TabsList>

        {/* ===================== TAB 1: PAYROLL RUNS ===================== */}
        <TabsContent value="runs" className="space-y-4">
          <Card className="border shadow-2xs bg-card">
            <CardHeader className="py-3 px-4 border-b bg-muted/20">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="text-sm font-black flex items-center gap-2 text-foreground">
                    <Play className="size-4 text-primary" />
                    <span>Monthly Payroll Processing Lifecycle</span>
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Execute batches with attendance sync, verify calculations, and lock immutable audit snapshots.
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
                    <TableHead className="font-bold">Gross Total</TableHead>
                    <TableHead className="font-bold">Net Payout</TableHead>
                    <TableHead className="font-bold">Total Deductions</TableHead>
                    <TableHead className="font-bold">Staff Count</TableHead>
                    <TableHead className="font-bold">Lifecycle State</TableHead>
                    <TableHead className="text-right font-bold pr-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-xs italic">
                        No payroll runs executed yet. Click &quot;Run Automated Payroll&quot; above to generate your first batch.
                      </TableCell>
                    </TableRow>
                  ) : (
                    runs.map((run: any) => (
                      <TableRow key={run.id} className="text-xs hover:bg-muted/20 transition-colors">
                        <TableCell className="font-bold text-foreground">
                          {MONTHS[run.period_month - 1]} {run.period_year}
                        </TableCell>
                        <TableCell className="font-mono font-bold text-foreground">
                          {fmtCurrency(run.total_amount)}
                        </TableCell>
                        <TableCell className="font-mono font-bold text-emerald-600">
                          {fmtCurrency(run.total_net)}
                        </TableCell>
                        <TableCell className="font-mono text-muted-foreground">
                          {fmtCurrency(run.total_deductions)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {run.payslips_count} staff
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={cn(
                              "text-[10px] uppercase font-bold",
                              run.approval_status === "paid"
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                : run.approval_status === "finalized"
                                ? "bg-blue-500/10 text-blue-600 border-blue-500/30"
                                : run.approval_status === "approved"
                                ? "bg-purple-500/10 text-purple-600 border-purple-500/30"
                                : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                            )}
                            variant="outline"
                          >
                            {run.approval_status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-4 space-x-1">
                          {run.approval_status === "calculated" && isHR && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                updateRunStatusMutation.mutate({
                                  id: run.id,
                                  status: "completed",
                                  approvalStatus: "approved",
                                })
                              }
                              className="h-7 text-[11px] font-bold text-purple-600 hover:bg-purple-50"
                            >
                              Approve
                            </Button>
                          )}

                          {run.approval_status === "approved" && isHR && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                updateRunStatusMutation.mutate({
                                  id: run.id,
                                  status: "completed",
                                  approvalStatus: "finalized",
                                })
                              }
                              className="h-7 text-[11px] font-bold text-blue-600 hover:bg-blue-50"
                            >
                              <Lock className="size-3 mr-1" /> Finalize & Freeze
                            </Button>
                          )}

                          {run.approval_status === "finalized" && isHR && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() =>
                                updateRunStatusMutation.mutate({
                                  id: run.id,
                                  status: "paid",
                                  approvalStatus: "paid",
                                })
                              }
                              className="h-7 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              <CheckCircle2 className="size-3 mr-1" /> Mark Paid & Post Ledger
                            </Button>
                          )}

                          {run.snapshots_count > 0 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={async () => {
                                const snapshots = await api.get(`/payroll/runs/${run.id}/snapshots`);
                                setViewingSnapshot({ run, snapshots });
                              }}
                              className="h-7 text-[11px] font-bold text-muted-foreground"
                            >
                              <Shield className="size-3 mr-1" /> Frozen Snapshot ({run.snapshots_count})
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

        {/* ===================== TAB 2: EMPLOYEE SALARY PASSPORT ===================== */}
        <TabsContent value="employee_salary" className="space-y-4">
          <Card className="border shadow-2xs bg-card">
            <CardHeader className="py-3 px-4 border-b bg-muted/20">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="text-sm font-black flex items-center gap-2 text-foreground">
                    <UserCheck className="size-4 text-indigo-500" />
                    <span>Employee Master $\to$ Payroll Auto-Bound Passports</span>
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Statutory numbers (PAN, Aadhaar, UAN, ESIC), bank accounts, tax regimes, and structured CTC assignments.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40 text-xs">
                    <TableHead className="font-bold py-2.5">Employee</TableHead>
                    <TableHead className="font-bold">Statutory KYC (PAN / UAN)</TableHead>
                    <TableHead className="font-bold">Direct Bank Account</TableHead>
                    <TableHead className="font-bold">Tax Regime & State</TableHead>
                    <TableHead className="font-bold">Monthly CTC</TableHead>
                    <TableHead className="font-bold">Annual CTC</TableHead>
                    <TableHead className="text-right font-bold pr-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrollEmployees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-xs italic">
                        No employees found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    payrollEmployees.map((emp: any) => (
                      <TableRow key={emp.id} className="text-xs hover:bg-muted/20 transition-colors">
                        <TableCell>
                          <div className="font-bold text-foreground">{emp.fullName}</div>
                          <div className="text-[11px] text-muted-foreground font-mono">
                            {emp.employeeCode} &bull; {emp.department}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-mono text-xs font-bold text-foreground">
                            {emp.pan ? `PAN: ${emp.pan}` : <span className="text-amber-500">Missing PAN</span>}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono">
                            {emp.uan ? `UAN: ${emp.uan}` : "No UAN"} &bull; {emp.aadhaar ? `Aadhaar: ${emp.aadhaar}` : "No Aadhaar"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-mono text-xs font-semibold text-foreground">
                            {emp.bankAccount ? `${emp.bankName || "Bank"}: ${emp.bankAccount}` : <span className="text-muted-foreground">Unassigned</span>}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono">
                            {emp.bankIfsc ? `IFSC: ${emp.bankIfsc}` : ""}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] uppercase font-mono">
                            {emp.taxRegime} Regime
                          </Badge>
                          <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                            State: {emp.state || "MH"}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono font-bold text-emerald-600">
                          {fmtCurrency(emp.monthlyCtc)}
                        </TableCell>
                        <TableCell className="font-mono font-bold text-foreground">
                          {fmtCurrency(emp.annualCtc)}
                        </TableCell>
                        <TableCell className="text-right pr-4 space-x-1">
                          {isHR && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setAssigningEmp(emp);
                                setAssignCtcMonthly(emp.monthlyCtc || 35000);
                                setAssignTaxRegime(emp.taxRegime === "old" ? "old" : "new");
                                setIsAssignModalOpen(true);
                              }}
                              className="h-7 text-[11px] font-bold text-primary"
                            >
                              <Edit2 className="size-3 mr-1" /> Assign Structure
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

        {/* ===================== TAB 3: PAYSLIPS ===================== */}
        <TabsContent value="payslips" className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative w-64">
                <Search className="size-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input
                  placeholder="Search staff, code, dept..."
                  value={searchEmployee}
                  onChange={(e) => setSearchEmployee(e.target.value)}
                  className="h-8 pl-8 text-xs bg-background"
                />
              </div>

              <Select value={filterMonth} onValueChange={setFilterMonth}>
                <SelectTrigger className="h-8 text-xs w-36 bg-background font-bold">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  {MONTHS.map((m, idx) => (
                    <SelectItem key={m} value={String(idx + 1)}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger className="h-8 text-xs w-28 bg-background font-bold">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {YEARS.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card className="border shadow-2xs bg-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40 text-xs">
                    <TableHead className="font-bold py-2.5">Staff Details</TableHead>
                    <TableHead className="font-bold">Period</TableHead>
                    <TableHead className="font-bold">Gross Earned</TableHead>
                    <TableHead className="font-bold">Total Deductions</TableHead>
                    <TableHead className="font-bold">Net Payout</TableHead>
                    <TableHead className="text-right font-bold pr-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayslips.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-xs italic">
                        No payslips found for this period.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPayslips.map((slip: any) => (
                      <TableRow key={slip.id} className="text-xs hover:bg-muted/20 transition-colors">
                        <TableCell>
                          <div className="font-bold text-foreground">
                            {slip.employee?.firstName} {slip.employee?.lastName}
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono">
                            {slip.employee?.employeeCode} &bull; {slip.employee?.department?.name || "General"}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono">
                          {MONTHS[slip.period_month - 1]} {slip.period_year}
                        </TableCell>
                        <TableCell className="font-mono font-bold text-foreground">
                          {fmtCurrency(slip.gross_salary)}
                        </TableCell>
                        <TableCell className="font-mono text-muted-foreground">
                          {fmtCurrency(slip.deductions)}
                        </TableCell>
                        <TableCell className="font-mono font-bold text-emerald-600">
                          {fmtCurrency(slip.net_salary)}
                        </TableCell>
                        <TableCell className="text-right pr-4 space-x-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setViewingSlip(slip)}
                            className="h-7 text-[11px] font-bold text-primary"
                          >
                            <Eye className="size-3 mr-1" /> Breakdown
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => generatePayslipPdf(slip)}
                            className="h-7 text-[11px] font-bold text-emerald-600"
                          >
                            <Download className="size-3 mr-1" /> PDF
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===================== TAB 4: STRUCTURES ===================== */}
        <TabsContent value="structures" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">Salary Structure Templates</h3>
              <p className="text-xs text-muted-foreground">Define standard percentage or formula CTC templates.</p>
            </div>
            {isHR && (
              <Button
                size="sm"
                onClick={() => {
                  setEditingStruct(null);
                  setStructName("");
                  setStructDesc("");
                  setStructIsDefault(false);
                  setIsStructModalOpen(true);
                }}
                className="h-8 text-xs font-bold bg-primary text-primary-foreground gap-1.5"
              >
                <Plus className="size-3.5" /> Create Structure
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {rawStructures.map((st: any) => (
              <Card key={st.id} className="border shadow-xs">
                <CardHeader className="p-4 pb-2 border-b bg-muted/10">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-sm font-bold text-foreground">{st.name}</CardTitle>
                      <CardDescription className="text-[11px] mt-0.5">{st.description || "Corporate CTC Formula"}</CardDescription>
                    </div>
                    {st.isDefault && (
                      <Badge variant="default" className="text-[9px] bg-primary font-mono">
                        DEFAULT
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground">Components Distribution:</div>
                  <div className="space-y-1">
                    {st.items?.map((it: any) => (
                      <div key={it.id} className="flex justify-between text-xs font-mono">
                        <span>{it.component?.name || it.componentId}:</span>
                        <span className="font-bold text-foreground">
                          {Number(it.value)}% of CTC
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ===================== TAB 5: COMPONENTS ===================== */}
        <TabsContent value="components" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">Salary Components & Statutory Tax Rules</h3>
              <p className="text-xs text-muted-foreground">Earnings, deductions, taxable flags, and PF/ESI inclusions.</p>
            </div>
            {isHR && (
              <Button
                size="sm"
                onClick={() => {
                  setEditingComp(null);
                  setCompName("");
                  setCompCode("");
                  setCompType("earning");
                  setCompCalcType("percentage_of_ctc");
                  setCompValue(10);
                  setCompIsTaxable(true);
                  setCompIsStatutory(false);
                  setCompIncludeInPf(false);
                  setCompIncludeInEsi(false);
                  setCompDesc("");
                  setIsCompModalOpen(true);
                }}
                className="h-8 text-xs font-bold bg-primary text-primary-foreground gap-1.5"
              >
                <Plus className="size-3.5" /> Add Component
              </Button>
            )}
          </div>

          <Card className="border shadow-2xs bg-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40 text-xs">
                    <TableHead className="font-bold py-2.5">Component</TableHead>
                    <TableHead className="font-bold">Code</TableHead>
                    <TableHead className="font-bold">Type</TableHead>
                    <TableHead className="font-bold">Default Value</TableHead>
                    <TableHead className="font-bold">Taxable</TableHead>
                    <TableHead className="font-bold">PF / ESI Inclusion</TableHead>
                    <TableHead className="text-right font-bold pr-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rawComponents.map((c: any) => (
                    <TableRow key={c.id} className="text-xs hover:bg-muted/20 transition-colors">
                      <TableCell>
                        <div className="font-bold text-foreground">{c.name}</div>
                        <div className="text-[11px] text-muted-foreground">{c.description}</div>
                      </TableCell>
                      <TableCell className="font-mono font-bold text-foreground">{c.code}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] uppercase font-bold",
                            c.type === "earning"
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                              : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                          )}
                        >
                          {c.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">
                        {c.calculationType === "percentage_of_ctc" ? `${Number(c.defaultValue)}% CTC` : `₹${Number(c.defaultValue)}`}
                      </TableCell>
                      <TableCell>
                        {c.isTaxable ? (
                          <Badge variant="outline" className="text-[10px] text-red-600 bg-red-500/10 border-red-500/30">
                            Taxable
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-500/10 border-emerald-500/30">
                            Exempt
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-[11px]">
                        PF: {c.includeInPf ? "Yes" : "No"} &bull; ESI: {c.includeInEsi ? "Yes" : "No"}
                      </TableCell>
                      <TableCell className="text-right pr-4 space-x-1">
                        {isHR && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingComp(c);
                              setCompName(c.name);
                              setCompCode(c.code);
                              setCompType(c.type);
                              setCompCalcType(c.calculationType);
                              setCompValue(Number(c.defaultValue || 0));
                              setCompIsTaxable(c.isTaxable);
                              setCompIsStatutory(c.isStatutory);
                              setCompIncludeInPf(c.includeInPf);
                              setCompIncludeInEsi(c.includeInEsi);
                              setCompDesc(c.description || "");
                              setIsCompModalOpen(true);
                            }}
                            className="h-7 text-[11px] font-bold text-primary"
                          >
                            <Edit2 className="size-3" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===================== TAB 6: TAX DECLARATIONS (FORM 12BB) ===================== */}
        <TabsContent value="tax_declarations" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">Form 12BB Employee Tax Declarations</h3>
              <p className="text-xs text-muted-foreground">
                Employee claims under Section 192 (HRA, 80C, 80D, 24b) with proof verification.
              </p>
            </div>
            {isHR && (
              <Button
                size="sm"
                onClick={() => {
                  setDeclaringEmp(payrollEmployees[0] || null);
                  setDeclFinancialYear("2025-2026");
                  setDeclTaxRegime("new");
                  setDeclHouseRent(0);
                  setDecl80C(0);
                  setDecl80D(0);
                  setDecl80G(0);
                  setDeclHomeLoan(0);
                  setDeclOtherIncome(0);
                  setIsDeclarationModalOpen(true);
                }}
                className="h-8 text-xs font-bold bg-primary text-primary-foreground gap-1.5"
              >
                <Plus className="size-3.5" /> Submit Form 12BB
              </Button>
            )}
          </div>

          <Card className="border shadow-2xs bg-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40 text-xs">
                    <TableHead className="font-bold py-2.5">Staff</TableHead>
                    <TableHead className="font-bold">Financial Year</TableHead>
                    <TableHead className="font-bold">Tax Regime</TableHead>
                    <TableHead className="font-bold">Total Claimed</TableHead>
                    <TableHead className="font-bold">Total Approved</TableHead>
                    <TableHead className="font-bold">Status</TableHead>
                    <TableHead className="text-right font-bold pr-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taxDeclarations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-xs italic">
                        No Form 12BB declarations submitted for this fiscal year.
                      </TableCell>
                    </TableRow>
                  ) : (
                    taxDeclarations.map((decl: any) => (
                      <TableRow key={decl.id} className="text-xs hover:bg-muted/20 transition-colors">
                        <TableCell>
                          <div className="font-bold text-foreground">
                            {decl.employee?.firstName} {decl.employee?.lastName}
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono">
                            {decl.employee?.employeeCode} &bull; PAN: {decl.employee?.pan || "N/A"}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono font-bold">{decl.financialYear}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] uppercase font-mono">
                            {decl.taxRegime} Regime
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono font-bold text-foreground">
                          {fmtCurrency(Number(decl.totalDeductionClaimed || 0))}
                        </TableCell>
                        <TableCell className="font-mono font-bold text-emerald-600">
                          {fmtCurrency(Number(decl.totalDeductionApproved || 0))}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] uppercase font-bold",
                              decl.status === "verified"
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                            )}
                          >
                            {decl.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-4 space-x-1">
                          {isHR && decl.status !== "verified" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                verifyDeclarationMutation.mutate({
                                  id: decl.id,
                                  status: "verified",
                                  totalDeductionApproved: Number(decl.totalDeductionClaimed || 0),
                                })
                              }
                              className="h-7 text-[11px] font-bold text-emerald-600"
                            >
                              <Check className="size-3 mr-1" /> Approve
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

        {/* ===================== TAB 7: STATUTORY FORMS ===================== */}
        <TabsContent value="statutory_forms" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">Statutory Tax Certificates & e-Filing Forms</h3>
              <p className="text-xs text-muted-foreground">
                Income-tax Act Section 203 Form 16 (Part A & B) and Form 138 (24Q quarterly return).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border shadow-xs">
              <CardHeader className="p-4 border-b bg-muted/10">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <FileText className="size-4 text-teal-600" />
                  <span>Form 16 Generator (Part A & Part B)</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Generate annual TDS certificate for employees under Section 203 of the Income-tax Act.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Select Employee</Label>
                  <Select
                    onValueChange={(empId) => {
                      const emp = payrollEmployees.find((e: any) => e.id === empId);
                      if (emp) fetchForm16(emp);
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Choose an employee..." />
                    </SelectTrigger>
                    <SelectContent>
                      {payrollEmployees.map((e: any) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.fullName} ({e.employeeCode}) - {e.department}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {form16Data && (
                  <div className="p-3 bg-muted/40 rounded-lg border text-xs space-y-2 font-mono">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Certificate No:</span>
                      <span className="font-bold">{form16Data.certificateNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Gross Salary:</span>
                      <span className="font-bold">{fmtCurrency(form16Data.partB?.grossSalary)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Standard Deduction:</span>
                      <span className="font-bold">{fmtCurrency(form16Data.partB?.standardDeduction)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Net Tax Liability:</span>
                      <span className="font-bold text-emerald-600">{fmtCurrency(form16Data.partB?.netTaxLiability)}</span>
                    </div>
                    <Button
                      size="sm"
                      onClick={async () => {
                        try {
                          const res = await generateOfficialStatutoryPdf({
                            actGroup: "ita_2025",
                            actTitle: "Income-tax Act, 2025",
                            formNumber: "FORM NO. 16",
                            title: "Certificate under Section 392 of the Income-tax Act, 2025 for Tax Deducted at Source on Salary",
                            ruleCitation: "[See rule 31(1)(a) & section 392 of Income-tax Act, 2025]",
                            employeeName: form16Data.employee?.fullName || viewingForm16Emp?.fullName || "Assessee",
                            employeeCode: form16Data.employee?.code || viewingForm16Emp?.employeeCode || "EMP001",
                            employeePan: form16Data.employee?.pan || viewingForm16Emp?.pan,
                            tenantName: form16Data.employer?.name || "Global Enterprise Corp",
                            financialYear: form16Data.financialYear || "2026-2027",
                            assessmentYear: form16Data.assessmentYear || "2027-2028",
                            sha256Fingerprint: `F16-SEAL-${form16Data.certificateNumber || "LIVE"}`,
                            sections: [
                              {
                                title: "PART A — TAX DEDUCTION & DEPOSIT DETAILS (SEC 392)",
                                fields: [
                                  { label: "Certificate Number", value: form16Data.certificateNumber },
                                  { label: "Employer Name", value: form16Data.employer?.name },
                                  { label: "Employer TAN", value: form16Data.employer?.tan },
                                  { label: "Employer PAN", value: form16Data.employer?.pan },
                                  { label: "Employee PAN", value: form16Data.employee?.pan || "—" },
                                  { label: "Assessment Year", value: form16Data.assessmentYear },
                                  { label: "Total TDS Deposited", value: form16Data.partA?.totalTdsDeposited, type: "currency" },
                                ],
                              },
                              {
                                title: "PART B — SALARY PAID, DEDUCTIONS & NET TAX LIABILITY",
                                fields: [
                                  { label: "Gross Salary (Sec 392)", value: form16Data.partB?.grossSalary, type: "currency" },
                                  { label: "Standard Deduction", value: form16Data.partB?.standardDeduction, type: "currency" },
                                  { label: "Section 80C Deduction", value: form16Data.partB?.section80CDeduction, type: "currency" },
                                  { label: "Section 80D Health Insurance", value: form16Data.partB?.section80DDeduction, type: "currency" },
                                  { label: "Section 24(b) Home Loan Interest", value: form16Data.partB?.section24bDeduction, type: "currency" },
                                  { label: "HRA Exemption", value: form16Data.partB?.hraExemption, type: "currency" },
                                  { label: "Total Taxable Income", value: form16Data.partB?.totalTaxableIncome, type: "currency" },
                                  { label: "Tax Calculated on Income", value: form16Data.partB?.taxPayable, type: "currency" },
                                  { label: "Rebate under Section 87A", value: form16Data.partB?.rebate87A, type: "currency" },
                                  { label: "Health & Education Cess (4%)", value: form16Data.partB?.cess, type: "currency" },
                                  { label: "Net Tax Liability Certified", value: form16Data.partB?.netTaxLiability, type: "currency" },
                                ],
                              },
                            ],
                          });
                          toast.success(`Form 16 PDF downloaded: ${res.filename} (${(res.byteSize / 1024).toFixed(1)} KB)`);
                        } catch (err: any) {
                          toast.error(`PDF generation failed: ${err.message}`);
                        }
                      }}
                      className="w-full text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white mt-2"
                    >
                      <Download className="size-3.5 mr-1" /> Download Official Form 16 PDF
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border shadow-xs">
              <CardHeader className="p-4 border-b bg-muted/10">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <FileCode className="size-4 text-purple-600" />
                  <span>Form 138 / 24Q Quarterly Return</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Quarterly statement of deduction of tax under Section 200(3) in respect of salary.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="p-3 bg-muted/20 rounded-lg border text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fiscal Year:</span>
                    <span className="font-bold font-mono">2026-2027 (FY 26-27)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Deductees:</span>
                    <span className="font-bold font-mono">{payrollEmployees.length} Staff</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total TDS Deposited:</span>
                    <span className="font-bold font-mono text-emerald-600">{fmtCurrency(totalTdsDisbursed)}</span>
                  </div>
                </div>

                <Button
                  size="sm"
                  onClick={async () => {
                    try {
                      const res = await generateOfficialStatutoryPdf({
                        actGroup: "ita_2025",
                        actTitle: "Income-tax Act, 2025",
                        formNumber: "FORM NO. 138",
                        title: "Quarterly Statement of Tax Deducted at Source in respect of Salary under Section 392",
                        ruleCitation: "[See rule 31A & section 392 of Income-tax Act, 2025]",
                        employeeName: "Corporate Deductor Record",
                        employeeCode: "CORP-01",
                        tenantName: profile?.tenant?.name || "Global Enterprise Corp",
                        financialYear: "2026-2027",
                        assessmentYear: "2027-2028",
                        sha256Fingerprint: "FORM138-CORP-VALIDATED-FVU-8.4",
                        sections: [
                          {
                            title: "1. DEDUCTOR CONTROL TOTALS & SUMMARY",
                            fields: [
                              { label: "Employer Name", value: profile?.tenant?.name || "Global Enterprise Corp" },
                              { label: "Quarter", value: "Q1" },
                              { label: "Financial Year", value: "2026-2027" },
                              { label: "Total Deductee Staff Count", value: payrollEmployees.length },
                              { label: "Total Gross Salary Paid", value: totalGrossDisbursed, type: "currency" },
                              { label: "Total TDS Deposited", value: totalTdsDisbursed, type: "currency" },
                              { label: "FVU Compliance Version", value: "FVU Version 8.4" },
                            ],
                          },
                        ],
                      });
                      toast.success(`Form 138 PDF downloaded: ${res.filename} (${(res.byteSize / 1024).toFixed(1)} KB)`);
                    } catch (err: any) {
                      toast.error(`Export failed: ${err.message}`);
                    }
                  }}
                  className="w-full text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <Download className="size-3.5 mr-1" /> Export Form 138 (24Q) PDF
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ===================== TAB 8: AI FORECAST ===================== */}
        <TabsContent value="ai_forecast" className="space-y-4">
          <Card className="border shadow-2xs bg-gradient-to-br from-amber-500/5 via-background to-orange-500/5">
            <CardHeader className="p-5 border-b">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                  <Sparkles className="size-4" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-foreground">
                    AI Payroll & Labor Cost Projections
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Predictive analysis of annual wage inflation, statutory employer liability, and upcoming increments.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-background rounded-lg border space-y-1">
                  <span className="text-xs text-muted-foreground font-semibold">Projected Annual Wage Bill</span>
                  <h4 className="text-xl font-bold font-mono text-foreground">
                    {fmtCurrency(totalGrossDisbursed * 12)}
                  </h4>
                  <p className="text-[10px] text-emerald-600 font-medium">+4.2% YoY growth projection</p>
                </div>

                <div className="p-4 bg-background rounded-lg border space-y-1">
                  <span className="text-xs text-muted-foreground font-semibold">Employer Statutory Burden (EPF/ESI)</span>
                  <h4 className="text-xl font-bold font-mono text-foreground">
                    {fmtCurrency(totalGrossDisbursed * 0.13 * 12)}
                  </h4>
                  <p className="text-[10px] text-muted-foreground font-medium">12% EPF match + 3.25% ESI</p>
                </div>

                <div className="p-4 bg-background rounded-lg border space-y-1">
                  <span className="text-xs text-muted-foreground font-semibold">Gratuity Accrual Provision</span>
                  <h4 className="text-xl font-bold font-mono text-foreground">
                    {fmtCurrency(((15 * totalGrossDisbursed * 0.5) / 26))}
                  </h4>
                  <p className="text-[10px] text-muted-foreground font-medium">15/26 days per annum per employee</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ============================================================= */}
      {/* MODAL 1: RUN AUTOMATED PAYROLL */}
      {/* ============================================================= */}
      <Dialog open={isRunModalOpen} onOpenChange={setIsRunModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Play className="size-4 text-primary" />
              <span>Execute Automated Payroll Batch</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Calculate wages, loss of pay (LOP) days, statutory EPF/ESI/PT, and Income Tax withholding.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Period Month</Label>
                <Select value={String(runMonth)} onValueChange={(v) => setRunMonth(Number(v))}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, idx) => (
                      <SelectItem key={m} value={String(idx + 1)}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Period Year</Label>
                <Select value={String(runYear)} onValueChange={(v) => setRunYear(Number(v))}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
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

            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
              <div className="space-y-0.5">
                <Label className="text-xs font-bold">Include Attendance & Leave Sync</Label>
                <p className="text-[11px] text-muted-foreground">
                  Deduct loss of pay (LOP) for unapproved absences
                </p>
              </div>
              <Switch checked={runIncludeAttendance} onCheckedChange={setRunIncludeAttendance} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsRunModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={generateMutation.isPending}
              onClick={() =>
                generateMutation.mutate({
                  periodMonth: runMonth,
                  periodYear: runYear,
                  includeAttendance: runIncludeAttendance,
                })
              }
              className="bg-primary font-bold text-xs"
            >
              {generateMutation.isPending ? "Calculating Batch..." : "Execute Calculation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================= */}
      {/* MODAL 2: ASSIGN SALARY STRUCTURE & CTC */}
      {/* ============================================================= */}
      <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Edit2 className="size-4 text-primary" />
              <span>Assign Salary Structure & CTC</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Update compensation for {assigningEmp?.fullName} ({assigningEmp?.employeeCode}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Salary Structure Template</Label>
              <Select value={assignStructureId} onValueChange={setAssignStructureId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Standard Corporate (Default)" />
                </SelectTrigger>
                <SelectContent>
                  {rawStructures.map((st: any) => (
                    <SelectItem key={st.id} value={st.id}>
                      {st.name} {st.isDefault ? "(Default)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Monthly CTC (₹)</Label>
                <Input
                  type="number"
                  value={assignCtcMonthly}
                  onChange={(e) => setAssignCtcMonthly(Number(e.target.value))}
                  className="h-9 text-xs font-mono font-bold"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Annual CTC (₹)</Label>
                <Input
                  type="number"
                  disabled
                  value={assignCtcMonthly * 12}
                  className="h-9 text-xs font-mono bg-muted"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Tax Regime</Label>
                <Select value={assignTaxRegime} onValueChange={(v: any) => setAssignTaxRegime(v)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New Tax Regime (ITA 2025)</SelectItem>
                    <SelectItem value="old">Old Tax Regime (Sec 192)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Effective Date</Label>
                <Input
                  type="date"
                  value={assignEffectiveFrom}
                  onChange={(e) => setAssignEffectiveFrom(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Revision Remarks</Label>
              <Input
                placeholder="e.g. Annual appraisal increment / promotion"
                value={assignRemarks}
                onChange={(e) => setAssignRemarks(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsAssignModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={assignSalaryMutation.isPending}
              onClick={() =>
                assignSalaryMutation.mutate({
                  employeeId: assigningEmp?.id,
                  structureId: assignStructureId || undefined,
                  ctcMonthly: assignCtcMonthly,
                  ctcAnnual: assignCtcMonthly * 12,
                  effectiveFrom: assignEffectiveFrom,
                  taxRegime: assignTaxRegime,
                  remarks: assignRemarks,
                })
              }
              className="bg-primary font-bold text-xs"
            >
              {assignSalaryMutation.isPending ? "Assigning..." : "Save Assignment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================= */}
      {/* MODAL 3: REAL-TIME LIVE CTC SIMULATOR */}
      {/* ============================================================= */}
      <Dialog open={isSimulatorOpen} onOpenChange={setIsSimulatorOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Zap className="size-4 text-amber-500" />
              <span>Real-Time CTC & Statutory Tax Simulator</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Simulate take-home pay, statutory deductions, employer contributions, and Section 392 TDS tax slabs.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Monthly CTC (₹)</Label>
                <Input
                  type="number"
                  value={simCtcMonthly}
                  onChange={(e) => setSimCtcMonthly(Number(e.target.value))}
                  className="h-9 text-xs font-mono font-bold"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Tax Regime</Label>
                <Select value={simRegime} onValueChange={(v: any) => setSimRegime(v)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New Tax Regime (2025 Act)</SelectItem>
                    <SelectItem value="old">Old Tax Regime</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Work State (PT)</Label>
                <Select value={simState} onValueChange={setSimState}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MH">Maharashtra (MH)</SelectItem>
                    <SelectItem value="KA">Karnataka (KA)</SelectItem>
                    <SelectItem value="TN">Tamil Nadu (TN)</SelectItem>
                    <SelectItem value="TS">Telangana (TS)</SelectItem>
                    <SelectItem value="WB">West Bengal (WB)</SelectItem>
                    <SelectItem value="DL">Delhi (Nil PT)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {simResult && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/20 rounded-lg border text-xs">
                <div className="space-y-2">
                  <div className="font-bold text-foreground border-b pb-1">Earnings Breakdown</div>
                  <div className="flex justify-between font-mono">
                    <span>Basic Salary (50%):</span>
                    <span className="font-bold">{fmtCurrency(simResult.earnings?.basicSalary)}</span>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span>HRA (20%):</span>
                    <span className="font-bold">{fmtCurrency(simResult.earnings?.hra)}</span>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span>Special Allowance:</span>
                    <span className="font-bold">{fmtCurrency(simResult.earnings?.specialAllowance)}</span>
                  </div>
                  <div className="flex justify-between font-mono font-bold border-t pt-1">
                    <span>Total Gross:</span>
                    <span>{fmtCurrency(simResult.earnings?.totalGross)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="font-bold text-foreground border-b pb-1">Deductions & Take-Home</div>
                  <div className="flex justify-between font-mono">
                    <span>Provident Fund (12%):</span>
                    <span className="font-bold text-amber-600">{fmtCurrency(simResult.deductions?.providentFund)}</span>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span>ESI (0.75%):</span>
                    <span className="font-bold text-amber-600">{fmtCurrency(simResult.deductions?.esi)}</span>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span>Professional Tax:</span>
                    <span className="font-bold text-amber-600">{fmtCurrency(simResult.deductions?.professionalTax)}</span>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span>Monthly TDS (Tax):</span>
                    <span className="font-bold text-red-600">{fmtCurrency(simResult.deductions?.tds)}</span>
                  </div>
                  <div className="flex justify-between font-mono font-bold text-emerald-600 border-t pt-1 text-sm">
                    <span>Net Take-Home Pay:</span>
                    <span>{fmtCurrency(simResult.netPay)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsSimulatorOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================= */}
      {/* MODAL 4: DETAILED PAYSLIP PASSPORT */}
      {/* ============================================================= */}
      <Dialog open={!!viewingSlip} onOpenChange={(open) => !open && setViewingSlip(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <FileSpreadsheet className="size-4 text-emerald-600" />
              <span>Granular Payslip Breakdown</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              {viewingSlip?.employee?.firstName} {viewingSlip?.employee?.lastName} &bull;{" "}
              {MONTHS[viewingSlip?.period_month - 1]} {viewingSlip?.period_year}
            </DialogDescription>
          </DialogHeader>

          {viewingSlip && (
            <div className="space-y-4 py-2 text-xs">
              <div className="grid grid-cols-2 gap-4 p-3 bg-muted/20 rounded-lg border">
                <div>
                  <div className="text-muted-foreground font-semibold">Employee Code:</div>
                  <div className="font-mono font-bold">{viewingSlip.employee?.employeeCode}</div>
                  <div className="text-muted-foreground font-semibold mt-2">Department:</div>
                  <div className="font-semibold">{viewingSlip.employee?.department?.name || "General"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground font-semibold">Direct Bank Account:</div>
                  <div className="font-mono font-bold">{viewingSlip.employee?.bankAccount || "Unassigned"}</div>
                  <div className="text-muted-foreground font-semibold mt-2">PAN Card:</div>
                  <div className="font-mono font-bold">{viewingSlip.employee?.pan || "N/A"}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border rounded-lg p-3">
                <div className="space-y-1.5">
                  <div className="font-bold text-foreground border-b pb-1">Earnings</div>
                  <div className="flex justify-between font-mono">
                    <span>Basic Salary:</span>
                    <span>{fmtCurrency(viewingSlip.breakdown?.earnings?.basicSalary || viewingSlip.gross_salary * 0.5)}</span>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span>HRA:</span>
                    <span>{fmtCurrency(viewingSlip.breakdown?.earnings?.hra || viewingSlip.gross_salary * 0.2)}</span>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span>Special Allowance:</span>
                    <span>{fmtCurrency(viewingSlip.breakdown?.earnings?.specialAllowance || viewingSlip.gross_salary * 0.15)}</span>
                  </div>
                  <div className="flex justify-between font-mono font-bold border-t pt-1">
                    <span>Total Gross:</span>
                    <span>{fmtCurrency(viewingSlip.gross_salary)}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="font-bold text-foreground border-b pb-1">Deductions</div>
                  <div className="flex justify-between font-mono">
                    <span>Provident Fund (12%):</span>
                    <span className="text-amber-600">{fmtCurrency(viewingSlip.breakdown?.deductions?.providentFund)}</span>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span>ESI:</span>
                    <span className="text-amber-600">{fmtCurrency(viewingSlip.breakdown?.deductions?.esi)}</span>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span>Professional Tax:</span>
                    <span className="text-amber-600">{fmtCurrency(viewingSlip.breakdown?.deductions?.professionalTax)}</span>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span>TDS (Income Tax):</span>
                    <span className="text-red-600">{fmtCurrency(viewingSlip.breakdown?.deductions?.tds)}</span>
                  </div>
                  <div className="flex justify-between font-mono font-bold border-t pt-1">
                    <span>Total Deductions:</span>
                    <span>{fmtCurrency(viewingSlip.deductions)}</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center justify-between">
                <span className="font-bold text-emerald-800 dark:text-emerald-300">Net Pay Disbursed:</span>
                <span className="text-lg font-black font-mono text-emerald-600">{fmtCurrency(viewingSlip.net_salary)}</span>
              </div>
            </div>
          )}

          <DialogFooter className="flex justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => generatePayslipPdf(viewingSlip)}
              className="font-bold text-xs"
            >
              <Download className="size-3.5 mr-1" /> Download PDF
            </Button>
            <Button size="sm" onClick={() => setViewingSlip(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export default Payroll;
