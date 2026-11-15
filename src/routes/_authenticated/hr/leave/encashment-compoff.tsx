import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, unwrapArray, unwrapData, getAuthHeaders } from "@/lib/api";
import {
  useDebouncedValue,
  formatLeaveDays,
  extractLeaveErrorMessage,
  uploadLeaveSupportingDocument,
  invalidateEncashmentCompOff,
} from "@/lib/leave-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  Plus,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Coins,
  Banknote,
  CalendarClock,
  FileSpreadsheet,
  FileJson,
  Eye,
  SquarePen,
  RotateCcw,
  Ban,
  Settings2,
  History,
  Paperclip,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  AlertTriangle,
  Wallet,
  MessageSquareWarning,
  X,
} from "lucide-react";

type OperationalTab = "encashment" | "comp-off" | "transactions" | "configuration";
type ConfigSubTab = "encashment-policies" | "compoff-policies";

type WorkflowActionType =
  | "approve"
  | "reject"
  | "clarify"
  | "cancel"
  | "process_payroll"
  | "mark_failed"
  | "reconcile_paid"
  | "reverse";

const MONTH_OPTIONS = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const REQUEST_STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "PENDING", label: "Pending Approval" },
  { value: "MANAGER_APPROVED", label: "Manager Approved" },
  { value: "HR_APPROVED", label: "HR Approved" },
  { value: "CLARIFICATION_REQUESTED", label: "Clarification Requested" },
  { value: "APPROVED", label: "Approved / Credited" },
  { value: "PAYROLL_PENDING", label: "Awaiting Payroll" },
  { value: "PAYROLL_PROCESSING", label: "Payroll Processing" },
  { value: "PAID", label: "Paid / Disbursed" },
  { value: "FAILED", label: "Payroll Failed" },
  { value: "REJECTED", label: "Rejected" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "REVERSED", label: "Reversed" },
  { value: "EXPIRED", label: "Expired" },
];

function formatCurrencyDynamic(amount: number | string | null | undefined, currencyCode: string): string {
  if (amount === null || amount === undefined || amount === "") return "—";
  const num = Number(amount);
  if (Number.isNaN(num)) return "—";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currencyCode || "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  } catch {
    return `${currencyCode || ""} ${num.toFixed(2)}`.trim();
  }
}

function formatDateDisplay(dateVal?: string | null): string {
  if (!dateVal) return "—";
  const d = new Date(dateVal);
  if (Number.isNaN(d.getTime())) return String(dateVal).slice(0, 10);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function getStatusBadgeClasses(status?: string): string {
  const s = String(status || "").toUpperCase();
  if (["APPROVED", "PAID", "ACTIVE", "CONSUMED"].includes(s)) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800";
  }
  if (["PENDING", "MANAGER_APPROVED", "HR_APPROVED", "PAYROLL_PENDING", "PAYROLL_PROCESSING", "RESERVED"].includes(s)) {
    return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800";
  }
  if (["CLARIFICATION_REQUESTED", "DRAFT"].includes(s)) {
    return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800";
  }
  if (["REJECTED", "FAILED", "EXPIRED"].includes(s)) {
    return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800";
  }
  return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
}

function formatStatusLabel(status?: string): string {
  if (!status) return "Unknown";
  return String(status)
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export const Route = createFileRoute("/_authenticated/hr/leave/encashment-compoff")({
  component: HrLeaveEncashmentCompOffPage,
  head: () => ({ meta: [{ title: "Leave Encashment & Comp-Off — Master HRMS" }] }),
});

export default function HrLeaveEncashmentCompOffPage() {
  const queryClient = useQueryClient();
  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // Main Tabs
  const [activeTab, setActiveTab] = useState<OperationalTab>("encashment");
  const [configSubTab, setConfigSubTab] = useState<ConfigSubTab>("encashment-policies");

  // Server-Side Filters & Pagination
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebouncedValue(searchTerm, 300);
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [leaveTypeFilter, setLeaveTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [transactionTypeFilter, setTransactionTypeFilter] = useState("all");
  const [payrollMonthFilter, setPayrollMonthFilter] = useState("all");
  const [payrollYearFilter, setPayrollYearFilter] = useState("all");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12);

  // Modals & Drawers State
  const [encashModalOpen, setEncashModalOpen] = useState(false);
  const [editingEncashId, setEditingEncashId] = useState<string | null>(null);
  const [compOffModalOpen, setCompOffModalOpen] = useState(false);
  const [editingCompOffId, setEditingCompOffId] = useState<string | null>(null);
  const [detailModalId, setDetailModalId] = useState<string | null>(null);
  const [workflowModal, setWorkflowModal] = useState<{
    open: boolean;
    action: WorkflowActionType;
    record: any | null;
  }>({ open: false, action: "approve", record: null });

  // Config Modals
  const [encashConfigModalOpen, setEncashConfigModalOpen] = useState(false);
  const [editingEncashConfigId, setEditingEncashConfigId] = useState<string | null>(null);
  const [compOffConfigModalOpen, setCompOffConfigModalOpen] = useState(false);
  const [editingCompOffConfigId, setEditingCompOffConfigId] = useState<string | null>(null);

  // Encashment Request Form State
  const [encashForm, setEncashForm] = useState({
    employeeId: "",
    leaveTypeId: "",
    requestedDays: "1",
    effectiveDate: todayIso,
    reason: "",
    attachmentUrl: "",
    submitAsDraft: false,
  });
  const [encashPreview, setEncashPreview] = useState<any | null>(null);
  const [isEncashPreviewLoading, setIsEncashPreviewLoading] = useState(false);

  // Comp-Off Request Form State
  const [compOffForm, setCompOffForm] = useState({
    employeeId: "",
    workedOnDate: todayIso,
    workType: "WEEKLY_OFF",
    actualHoursWorked: "",
    requestedDays: "",
    reason: "",
    attachmentUrl: "",
    submitAsDraft: false,
  });
  const [compOffPreview, setCompOffPreview] = useState<any | null>(null);
  const [isCompOffPreviewLoading, setIsCompOffPreviewLoading] = useState(false);

  // Shared Document Upload State
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);

  // Workflow Action Form State
  const [workflowNote, setWorkflowNote] = useState("");
  const [workflowApprovedDays, setWorkflowApprovedDays] = useState("");
  const [workflowPayrollMonth, setWorkflowPayrollMonth] = useState(String(currentMonth));
  const [workflowPayrollYear, setWorkflowPayrollYear] = useState(String(currentYear));
  const [workflowPayrollRunId, setWorkflowPayrollRunId] = useState("none");
  const [workflowSalaryComponentId, setWorkflowSalaryComponentId] = useState("default");
  const [workflowPayrollRef, setWorkflowPayrollRef] = useState("");

  // Encashment Configuration Form State
  const [encashCfgForm, setEncashCfgForm] = useState({
    name: "",
    code: "",
    enabled: true,
    eligibleLeaveTypeIds: [] as string[],
    minServiceMonths: "6",
    minRemainingBalance: "5",
    maxEncashableDaysPerRequest: "15",
    maxEncashableDaysPerYear: "30",
    minRetainedBalance: "5",
    encashmentFrequency: "YEARLY",
    periodicLimitDays: "",
    applicableCategoriesText: "",
    branchId: "all",
    departmentId: "all",
    approvalMode: "MANAGER_THEN_HR",
    allowEssSubmission: true,
    requireSupportingDoc: false,
    salaryBasisType: "BASIC",
    salaryComponentCodesText: "",
    dailyRateDivisorMode: "CUSTOM",
    dailyRateDivisor: "26",
    payrollComponentId: "none",
    effectiveFrom: `${currentYear}-01-01`,
    effectiveTo: "",
  });

  // Comp-Off Configuration Form State
  const [compOffCfgForm, setCompOffCfgForm] = useState({
    name: "",
    code: "",
    enabled: true,
    leaveTypeId: "",
    allowWeeklyOffWork: true,
    allowHolidayWork: true,
    allowApprovedOvertime: true,
    minWorkedHours: "4",
    halfDayHours: "4",
    fullDayHours: "8",
    maxCreditDaysPerRequest: "2",
    maxAccrualBalance: "12",
    expiryDays: "60",
    preExpiryAlertDays: "7",
    allowCarryForward: false,
    maxBackdateDays: "30",
    branchId: "all",
    departmentId: "all",
    applicableCategoriesText: "",
    approvalMode: "MANAGER_THEN_HR",
    allowEssSubmission: true,
    requireAttendanceProof: false,
    requireApprovedOvertime: true,
    effectiveFrom: `${currentYear}-01-01`,
    effectiveTo: "",
  });

  const yearOptions = useMemo(() => {
    const yrs: number[] = [];
    for (let y = currentYear - 2; y <= currentYear + 2; y++) yrs.push(y);
    return yrs;
  }, [currentYear]);

  // 1. Metadata Query (Dynamic Dropdowns, Currency & Viewer RBAC Capabilities)
  const {
    data: metadata,
    isLoading: isMetadataLoading,
    error: metadataError,
  } = useQuery({
    queryKey: ["hr-encashment-compoff-metadata"],
    queryFn: async () => {
      const res = await api.get("/api/v1/hr/leave/encashment-compoff/metadata");
      return unwrapData<any>(res);
    },
    staleTime: 30_000,
  });

  const currencyCode: string = metadata?.currency || "INR";
  const employees: any[] = Array.isArray(metadata?.employees) ? metadata.employees : [];
  const departments: any[] = Array.isArray(metadata?.departments) ? metadata.departments : [];
  const branches: any[] = Array.isArray(metadata?.branches) ? metadata.branches : [];
  const leaveTypes: any[] = Array.isArray(metadata?.leaveTypes) ? metadata.leaveTypes : [];
  const salaryComponents: any[] = Array.isArray(metadata?.salaryComponents) ? metadata.salaryComponents : [];
  const payrollRuns: any[] = Array.isArray(metadata?.payrollRuns) ? metadata.payrollRuns : [];
  const viewerAccess = metadata?.viewerAccess || {
    canConfigurePolicies: false,
    canCreateEncashment: false,
    canCreateCompOff: false,
    canApproveRequests: false,
    canProcessPayroll: false,
    canViewSalaryAmounts: false,
  };

  // 2. Dynamic Summary KPIs Query
  const {
    data: summary,
    isLoading: isSummaryLoading,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: ["hr-encashment-compoff-summary"],
    queryFn: async () => {
      const res = await api.get("/api/v1/hr/leave/encashment-compoff/summary");
      return unwrapData<any>(res);
    },
    staleTime: 15_000,
  });

  // Shared query params for active tab
  const listParams = useMemo(() => {
    const p: Record<string, any> = {
      page,
      limit,
      sortBy,
      sortOrder,
    };
    if (debouncedSearch) p.search = debouncedSearch;
    if (employeeFilter !== "all") p.employeeId = employeeFilter;
    if (departmentFilter !== "all") p.departmentId = departmentFilter;
    if (branchFilter !== "all") p.branchId = branchFilter;
    if (leaveTypeFilter !== "all") p.leaveTypeId = leaveTypeFilter;
    if (statusFilter !== "all") p.status = statusFilter;
    if (startDateFilter) p.startDate = startDateFilter;
    if (endDateFilter) p.endDate = endDateFilter;
    if (payrollMonthFilter !== "all") p.payrollMonth = payrollMonthFilter;
    if (payrollYearFilter !== "all") p.payrollYear = payrollYearFilter;
    if (activeTab === "transactions" && transactionTypeFilter !== "all") {
      p.transactionType = transactionTypeFilter;
    }
    return p;
  }, [
    page,
    limit,
    sortBy,
    sortOrder,
    debouncedSearch,
    employeeFilter,
    departmentFilter,
    branchFilter,
    leaveTypeFilter,
    statusFilter,
    startDateFilter,
    endDateFilter,
    payrollMonthFilter,
    payrollYearFilter,
    activeTab,
    transactionTypeFilter,
  ]);

  // 3. Encashment List Query
  const {
    data: encashmentsPayload,
    isLoading: isEncashLoading,
    isFetching: isEncashFetching,
    error: encashError,
    refetch: refetchEncashments,
  } = useQuery({
    queryKey: ["hr-encashment-compoff-encashments", listParams],
    queryFn: async () => {
      return await api.get("/api/v1/hr/leave/encashment-compoff/encashments", {
        params: listParams,
      });
    },
    enabled: activeTab === "encashment",
    staleTime: 15_000,
  });

  // 4. Comp-Off List Query
  const {
    data: compOffsPayload,
    isLoading: isCompOffLoading,
    isFetching: isCompOffFetching,
    error: compOffError,
    refetch: refetchCompOffs,
  } = useQuery({
    queryKey: ["hr-encashment-compoff-compoffs", listParams],
    queryFn: async () => {
      return await api.get("/api/v1/hr/leave/encashment-compoff/comp-offs", {
        params: listParams,
      });
    },
    enabled: activeTab === "comp-off",
    staleTime: 15_000,
  });

  // 5. Unified Transaction History Query
  const {
    data: transactionsPayload,
    isLoading: isTxLoading,
    isFetching: isTxFetching,
    error: txError,
    refetch: refetchTransactions,
  } = useQuery({
    queryKey: ["hr-encashment-compoff-transactions", listParams],
    queryFn: async () => {
      return await api.get("/api/v1/hr/leave/encashment-compoff/transactions", {
        params: listParams,
      });
    },
    enabled: activeTab === "transactions",
    staleTime: 15_000,
  });

  // 6. Configurations Queries (Tab 4)
  const {
    data: encashConfigs = [],
    isLoading: isEncashCfgLoading,
    refetch: refetchEncashConfigs,
  } = useQuery({
    queryKey: ["hr-encashment-compoff-configs", "encashment"],
    queryFn: async () => {
      const res = await api.get("/api/v1/hr/leave/encashment-compoff/configs/encashment");
      return unwrapArray<any>(res);
    },
    enabled: activeTab === "configuration",
  });

  const {
    data: compOffConfigs = [],
    isLoading: isCompOffCfgLoading,
    refetch: refetchCompOffConfigs,
  } = useQuery({
    queryKey: ["hr-encashment-compoff-configs", "comp-off"],
    queryFn: async () => {
      const res = await api.get("/api/v1/hr/leave/encashment-compoff/configs/comp-off");
      return unwrapArray<any>(res);
    },
    enabled: activeTab === "configuration",
  });

  // 7. Eligible Encashment Leave Types for Selected Employee inside Modal
  const { data: eligibleTypesPayload, isLoading: isLoadingEligibleTypes } = useQuery({
    queryKey: [
      "hr-encashment-eligible-types",
      encashForm.employeeId,
      encashForm.effectiveDate,
    ],
    queryFn: async () => {
      if (!encashForm.employeeId) return null;
      const res = await api.get("/api/v1/hr/leave/encashment-compoff/encashments/eligible-types", {
        params: {
          employeeId: encashForm.employeeId,
          effectiveDate: encashForm.effectiveDate || todayIso,
        },
      });
      return unwrapData<any>(res);
    },
    enabled: Boolean(encashModalOpen && encashForm.employeeId),
  });

  const eligibleEncashTypes: any[] = Array.isArray(eligibleTypesPayload?.eligibleLeaveTypes)
    ? eligibleTypesPayload.eligibleLeaveTypes
    : [];
  const ineligibleEncashTypes: any[] = Array.isArray(eligibleTypesPayload?.ineligibleLeaveTypes)
    ? eligibleTypesPayload.ineligibleLeaveTypes
    : [];

  // Auto-select first eligible leave type when employee changes in Encashment modal
  useEffect(() => {
    if (!encashModalOpen || editingEncashId) return;
    if (eligibleEncashTypes.length > 0) {
      const stillValid = eligibleEncashTypes.some((t) => t.leaveTypeId === encashForm.leaveTypeId);
      if (!stillValid) {
        setEncashForm((prev) => ({
          ...prev,
          leaveTypeId: eligibleEncashTypes[0].leaveTypeId,
        }));
      }
    } else if (encashForm.leaveTypeId) {
      setEncashForm((prev) => ({ ...prev, leaveTypeId: "" }));
    }
  }, [eligibleEncashTypes, encashModalOpen, editingEncashId]);

  // Live Backend Calculation Preview for Encashment Modal
  useEffect(() => {
    if (
      !encashModalOpen ||
      !encashForm.employeeId ||
      !encashForm.leaveTypeId ||
      !encashForm.requestedDays ||
      Number(encashForm.requestedDays) <= 0
    ) {
      setEncashPreview(null);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        setIsEncashPreviewLoading(true);
        const res = await api.post("/api/v1/hr/leave/encashment-compoff/encashments/calculate-preview", {
          employeeId: encashForm.employeeId,
          leaveTypeId: encashForm.leaveTypeId,
          requestedDays: Number(encashForm.requestedDays),
          effectiveDate: encashForm.effectiveDate || todayIso,
          excludeEncashmentId: editingEncashId || undefined,
        });
        if (!cancelled) {
          setEncashPreview({ valid: true, data: unwrapData<any>(res) });
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setEncashPreview({
            valid: false,
            error: extractLeaveErrorMessage(err, "Encashment validation failed"),
          });
        }
      } finally {
        if (!cancelled) setIsEncashPreviewLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    encashModalOpen,
    editingEncashId,
    encashForm.employeeId,
    encashForm.leaveTypeId,
    encashForm.requestedDays,
    encashForm.effectiveDate,
    todayIso,
  ]);

  // Live Backend Verification Preview for Comp-Off Modal
  useEffect(() => {
    if (!compOffModalOpen || !compOffForm.employeeId || !compOffForm.workedOnDate) {
      setCompOffPreview(null);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        setIsCompOffPreviewLoading(true);
        const res = await api.post("/api/v1/hr/leave/encashment-compoff/comp-offs/verify-eligibility", {
          employeeId: compOffForm.employeeId,
          workedOnDate: compOffForm.workedOnDate,
          workType: compOffForm.workType,
          actualHoursWorked:
            compOffForm.actualHoursWorked !== "" ? Number(compOffForm.actualHoursWorked) : undefined,
          requestedDays:
            compOffForm.requestedDays !== "" ? Number(compOffForm.requestedDays) : undefined,
          excludeRequestId: editingCompOffId || undefined,
        });
        if (!cancelled) {
          setCompOffPreview({ valid: true, data: unwrapData<any>(res) });
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setCompOffPreview({
            valid: false,
            error: extractLeaveErrorMessage(err, "Comp-Off eligibility verification failed"),
          });
        }
      } finally {
        if (!cancelled) setIsCompOffPreviewLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    compOffModalOpen,
    editingCompOffId,
    compOffForm.employeeId,
    compOffForm.workedOnDate,
    compOffForm.workType,
    compOffForm.actualHoursWorked,
    compOffForm.requestedDays,
  ]);

  // 8. Rich Detail Modal Query
  const { data: detailRecord, isLoading: isDetailLoading } = useQuery({
    queryKey: ["hr-encashment-compoff-detail", detailModalId],
    queryFn: async () => {
      if (!detailModalId) return null;
      const res = await api.get(`/api/v1/hr/leave/encashment-compoff/transactions/${detailModalId}`);
      return unwrapData<any>(res);
    },
    enabled: Boolean(detailModalId),
  });

  // Mutations
  const saveEncashmentMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        employeeId: encashForm.employeeId,
        leaveTypeId: encashForm.leaveTypeId,
        requestedDays: Number(encashForm.requestedDays),
        effectiveDate: encashForm.effectiveDate,
        reason: encashForm.reason.trim(),
        attachmentUrl: encashForm.attachmentUrl || undefined,
        submitAsDraft: encashForm.submitAsDraft,
      };
      if (editingEncashId) {
        return await api.put(`/api/v1/hr/leave/encashment-compoff/encashments/${editingEncashId}`, payload);
      }
      return await api.post("/api/v1/hr/leave/encashment-compoff/encashments", payload);
    },
    onSuccess: async () => {
      toast.success(editingEncashId ? "Encashment request updated" : "Encashment request submitted");
      setEncashModalOpen(false);
      setEditingEncashId(null);
      await invalidateEncashmentCompOff(queryClient);
    },
    onError: (err: unknown) => {
      toast.error(extractLeaveErrorMessage(err, "Failed to save encashment request"));
    },
  });

  const saveCompOffMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, any> = {
        employeeId: compOffForm.employeeId,
        workedOnDate: compOffForm.workedOnDate,
        workType: compOffForm.workType,
        reason: compOffForm.reason.trim(),
        attachmentUrl: compOffForm.attachmentUrl || undefined,
        submitAsDraft: compOffForm.submitAsDraft,
      };
      if (compOffForm.actualHoursWorked !== "") {
        payload.actualHoursWorked = Number(compOffForm.actualHoursWorked);
      }
      if (compOffForm.requestedDays !== "") {
        payload.requestedDays = Number(compOffForm.requestedDays);
      }
      if (editingCompOffId) {
        return await api.put(`/api/v1/hr/leave/encashment-compoff/comp-offs/${editingCompOffId}`, payload);
      }
      return await api.post("/api/v1/hr/leave/encashment-compoff/comp-offs", payload);
    },
    onSuccess: async () => {
      toast.success(editingCompOffId ? "Comp-Off request updated" : "Comp-Off request submitted");
      setCompOffModalOpen(false);
      setEditingCompOffId(null);
      await invalidateEncashmentCompOff(queryClient);
    },
    onError: (err: unknown) => {
      toast.error(extractLeaveErrorMessage(err, "Failed to save Comp-Off request"));
    },
  });

  const workflowActionMutation = useMutation({
    mutationFn: async () => {
      const rec = workflowModal.record;
      if (!rec) throw new Error("No request selected");
      const isCompOff = rec.type === "COMP_OFF";
      const basePath = isCompOff
        ? `/api/v1/hr/leave/encashment-compoff/comp-offs/${rec.id}`
        : `/api/v1/hr/leave/encashment-compoff/encashments/${rec.id}`;

      switch (workflowModal.action) {
        case "approve":
          return await api.post(`${basePath}/decide`, {
            action: "approve",
            comments: workflowNote.trim() || undefined,
            approvedDays: workflowApprovedDays !== "" ? Number(workflowApprovedDays) : undefined,
          });
        case "reject":
          if (!workflowNote.trim()) {
            throw new Error("Rejection reason is mandatory.");
          }
          return await api.post(`${basePath}/decide`, {
            action: "reject",
            rejectionReason: workflowNote.trim(),
            comments: workflowNote.trim(),
          });
        case "clarify":
          if (!workflowNote.trim()) {
            throw new Error("Clarification note is mandatory.");
          }
          return await api.post(`${basePath}/decide`, {
            action: "request_clarification",
            comments: workflowNote.trim(),
          });
        case "cancel":
          return await api.post(`${basePath}/cancel`, {
            reason: workflowNote.trim() || "Cancelled by authorized user",
          });
        case "process_payroll":
          return await api.post(`${basePath}/process-payroll`, {
            payrollMonth: Number(workflowPayrollMonth),
            payrollYear: Number(workflowPayrollYear),
            payrollRunId: workflowPayrollRunId !== "none" ? workflowPayrollRunId : undefined,
            salaryComponentId:
              workflowSalaryComponentId !== "default" ? workflowSalaryComponentId : undefined,
            notes: workflowNote.trim() || undefined,
          });
        case "mark_failed":
          if (!workflowNote.trim()) {
            throw new Error("Payroll failure reason is mandatory.");
          }
          return await api.post(`${basePath}/mark-payroll-failed`, {
            failureReason: workflowNote.trim(),
          });
        case "reconcile_paid":
          return await api.post(`${basePath}/reconcile-paid`, {
            payrollRunId: workflowPayrollRunId !== "none" ? workflowPayrollRunId : undefined,
            payrollReference: workflowPayrollRef.trim() || undefined,
            notes: workflowNote.trim() || undefined,
          });
        case "reverse":
          if (!workflowNote.trim()) {
            throw new Error("Audit reason is mandatory to reverse an encashment.");
          }
          return await api.post(`${basePath}/reverse`, {
            reason: workflowNote.trim(),
          });
      }
    },
    onSuccess: async () => {
      toast.success("Workflow action completed successfully");
      setWorkflowModal({ open: false, action: "approve", record: null });
      setWorkflowNote("");
      setWorkflowApprovedDays("");
      setWorkflowPayrollRef("");
      await invalidateEncashmentCompOff(queryClient);
    },
    onError: (err: unknown) => {
      toast.error(extractLeaveErrorMessage(err, "Workflow operation failed"));
    },
  });

  const expirySweepMutation = useMutation({
    mutationFn: async () => {
      return await api.post("/api/v1/hr/leave/encashment-compoff/comp-offs/run-expiry-sweep", {});
    },
    onSuccess: async (res: any) => {
      const d = unwrapData<any>(res) || res;
      toast.success(
        `Expiry sweep finished: ${d?.expiredLotsCount ?? 0} lot(s) expired, ${d?.preExpiryAlertsSent ?? 0} alert(s) dispatched.`
      );
      await invalidateEncashmentCompOff(queryClient);
    },
    onError: (err: unknown) => {
      toast.error(extractLeaveErrorMessage(err, "Failed to run Comp-Off expiry sweep"));
    },
  });

  const saveEncashConfigMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, any> = {
        name: encashCfgForm.name.trim(),
        code: encashCfgForm.code.trim() || undefined,
        enabled: encashCfgForm.enabled,
        eligibleLeaveTypeIds: encashCfgForm.eligibleLeaveTypeIds,
        minServiceMonths: Number(encashCfgForm.minServiceMonths || 0),
        minRemainingBalance: Number(encashCfgForm.minRemainingBalance || 0),
        maxEncashableDaysPerRequest: Number(encashCfgForm.maxEncashableDaysPerRequest || 1),
        maxEncashableDaysPerYear: Number(encashCfgForm.maxEncashableDaysPerYear || 1),
        minRetainedBalance: Number(encashCfgForm.minRetainedBalance || 0),
        encashmentFrequency: encashCfgForm.encashmentFrequency,
        periodicLimitDays:
          encashCfgForm.periodicLimitDays !== "" ? Number(encashCfgForm.periodicLimitDays) : null,
        applicableCategories: encashCfgForm.applicableCategoriesText
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        branchId: encashCfgForm.branchId !== "all" ? encashCfgForm.branchId : null,
        departmentId: encashCfgForm.departmentId !== "all" ? encashCfgForm.departmentId : null,
        approvalMode: encashCfgForm.approvalMode,
        allowEssSubmission: encashCfgForm.allowEssSubmission,
        requireSupportingDoc: encashCfgForm.requireSupportingDoc,
        salaryBasisType: encashCfgForm.salaryBasisType,
        salaryComponentCodes: encashCfgForm.salaryComponentCodesText
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        dailyRateDivisorMode: encashCfgForm.dailyRateDivisorMode,
        dailyRateDivisor:
          encashCfgForm.dailyRateDivisorMode === "CUSTOM"
            ? Number(encashCfgForm.dailyRateDivisor || 26)
            : null,
        payrollComponentId:
          encashCfgForm.payrollComponentId !== "none" ? encashCfgForm.payrollComponentId : null,
        effectiveFrom: encashCfgForm.effectiveFrom,
        effectiveTo: encashCfgForm.effectiveTo || null,
      };
      if (editingEncashConfigId) {
        return await api.put(
          `/api/v1/hr/leave/encashment-compoff/configs/encashment/${editingEncashConfigId}`,
          payload
        );
      }
      return await api.post("/api/v1/hr/leave/encashment-compoff/configs/encashment", payload);
    },
    onSuccess: async () => {
      toast.success(
        editingEncashConfigId
          ? "Leave Encashment Policy updated"
          : "Leave Encashment Policy created"
      );
      setEncashConfigModalOpen(false);
      setEditingEncashConfigId(null);
      await invalidateEncashmentCompOff(queryClient);
    },
    onError: (err: unknown) => {
      toast.error(extractLeaveErrorMessage(err, "Failed to save Encashment Policy"));
    },
  });

  const deactivateEncashConfigMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.post(`/api/v1/hr/leave/encashment-compoff/configs/encashment/${id}/deactivate`, {});
    },
    onSuccess: async () => {
      toast.success("Encashment Policy deactivated");
      await invalidateEncashmentCompOff(queryClient);
    },
    onError: (err: unknown) => {
      toast.error(extractLeaveErrorMessage(err, "Failed to deactivate policy"));
    },
  });

  const saveCompOffConfigMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, any> = {
        name: compOffCfgForm.name.trim(),
        code: compOffCfgForm.code.trim() || undefined,
        enabled: compOffCfgForm.enabled,
        leaveTypeId: compOffCfgForm.leaveTypeId,
        allowWeeklyOffWork: compOffCfgForm.allowWeeklyOffWork,
        allowHolidayWork: compOffCfgForm.allowHolidayWork,
        allowApprovedOvertime: compOffCfgForm.allowApprovedOvertime,
        minWorkedHours: Number(compOffCfgForm.minWorkedHours || 4),
        halfDayHours: Number(compOffCfgForm.halfDayHours || 4),
        fullDayHours: Number(compOffCfgForm.fullDayHours || 8),
        maxCreditDaysPerRequest: Number(compOffCfgForm.maxCreditDaysPerRequest || 2),
        maxAccrualBalance: Number(compOffCfgForm.maxAccrualBalance || 12),
        expiryDays: Number(compOffCfgForm.expiryDays || 60),
        preExpiryAlertDays: Number(compOffCfgForm.preExpiryAlertDays || 7),
        allowCarryForward: compOffCfgForm.allowCarryForward,
        maxBackdateDays: Number(compOffCfgForm.maxBackdateDays || 30),
        branchId: compOffCfgForm.branchId !== "all" ? compOffCfgForm.branchId : null,
        departmentId: compOffCfgForm.departmentId !== "all" ? compOffCfgForm.departmentId : null,
        applicableCategories: compOffCfgForm.applicableCategoriesText
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        approvalMode: compOffCfgForm.approvalMode,
        allowEssSubmission: compOffCfgForm.allowEssSubmission,
        requireAttendanceProof: compOffCfgForm.requireAttendanceProof,
        requireApprovedOvertime: compOffCfgForm.requireApprovedOvertime,
        effectiveFrom: compOffCfgForm.effectiveFrom,
        effectiveTo: compOffCfgForm.effectiveTo || null,
      };
      if (editingCompOffConfigId) {
        return await api.put(
          `/api/v1/hr/leave/encashment-compoff/configs/comp-off/${editingCompOffConfigId}`,
          payload
        );
      }
      return await api.post("/api/v1/hr/leave/encashment-compoff/configs/comp-off", payload);
    },
    onSuccess: async () => {
      toast.success(
        editingCompOffConfigId ? "Comp-Off Policy updated" : "Comp-Off Policy created"
      );
      setCompOffConfigModalOpen(false);
      setEditingCompOffConfigId(null);
      await invalidateEncashmentCompOff(queryClient);
    },
    onError: (err: unknown) => {
      toast.error(extractLeaveErrorMessage(err, "Failed to save Comp-Off Policy"));
    },
  });

  const deactivateCompOffConfigMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.post(`/api/v1/hr/leave/encashment-compoff/configs/comp-off/${id}/deactivate`, {});
    },
    onSuccess: async () => {
      toast.success("Comp-Off Policy deactivated");
      await invalidateEncashmentCompOff(queryClient);
    },
    onError: (err: unknown) => {
      toast.error(extractLeaveErrorMessage(err, "Failed to deactivate Comp-Off Policy"));
    },
  });

  // Active dataset & pagination info
  const encashmentRows: any[] = Array.isArray(encashmentsPayload?.data)
    ? encashmentsPayload.data
    : unwrapArray(encashmentsPayload);
  const encashPagination = encashmentsPayload?.pagination || {
    page,
    limit,
    total: encashmentRows.length,
    totalPages: 1,
  };

  const compOffRows: any[] = Array.isArray(compOffsPayload?.data)
    ? compOffsPayload.data
    : unwrapArray(compOffsPayload);
  const compOffPagination = compOffsPayload?.pagination || {
    page,
    limit,
    total: compOffRows.length,
    totalPages: 1,
  };

  const transactionRows: any[] = Array.isArray(transactionsPayload?.data)
    ? transactionsPayload.data
    : unwrapArray(transactionsPayload);
  const txPagination = transactionsPayload?.pagination || {
    page,
    limit,
    total: transactionRows.length,
    totalPages: 1,
  };

  const activePagination =
    activeTab === "encashment"
      ? encashPagination
      : activeTab === "comp-off"
      ? compOffPagination
      : txPagination;

  const isRefreshing = isEncashFetching || isCompOffFetching || isTxFetching || isSummaryLoading;

  // Handlers
  const handleRefreshAll = () => {
    refetchSummary();
    if (activeTab === "encashment") refetchEncashments();
    if (activeTab === "comp-off") refetchCompOffs();
    if (activeTab === "transactions") refetchTransactions();
    if (activeTab === "configuration") {
      refetchEncashConfigs();
      refetchCompOffConfigs();
    }
  };

  const resetFilters = () => {
    setSearchTerm("");
    setEmployeeFilter("all");
    setDepartmentFilter("all");
    setBranchFilter("all");
    setLeaveTypeFilter("all");
    setStatusFilter("all");
    setTransactionTypeFilter("all");
    setPayrollMonthFilter("all");
    setPayrollYearFilter("all");
    setStartDateFilter("");
    setEndDateFilter("");
    setPage(1);
  };

  const openNewEncashmentModal = () => {
    setEditingEncashId(null);
    setEncashForm({
      employeeId: employees[0]?.id || "",
      leaveTypeId: "",
      requestedDays: "1",
      effectiveDate: todayIso,
      reason: "",
      attachmentUrl: "",
      submitAsDraft: false,
    });
    setEncashPreview(null);
    setEncashModalOpen(true);
  };

  const openEditEncashmentModal = (rec: any) => {
    setEditingEncashId(rec.id);
    setEncashForm({
      employeeId: rec.employeeId,
      leaveTypeId: rec.leaveTypeId,
      requestedDays: String(rec.days ?? 1),
      effectiveDate: rec.effectiveDate ? String(rec.effectiveDate).slice(0, 10) : todayIso,
      reason: rec.reason || "",
      attachmentUrl: rec.attachmentUrl || rec.supportingDocUrl || "",
      submitAsDraft: rec.status === "DRAFT",
    });
    setEncashModalOpen(true);
  };

  const openNewCompOffModal = () => {
    setEditingCompOffId(null);
    setCompOffForm({
      employeeId: employees[0]?.id || "",
      workedOnDate: todayIso,
      workType: "WEEKLY_OFF",
      actualHoursWorked: "",
      requestedDays: "",
      reason: "",
      attachmentUrl: "",
      submitAsDraft: false,
    });
    setCompOffPreview(null);
    setCompOffModalOpen(true);
  };

  const openEditCompOffModal = (rec: any) => {
    setEditingCompOffId(rec.id);
    setCompOffForm({
      employeeId: rec.employeeId,
      workedOnDate: rec.workedOnDate ? String(rec.workedOnDate).slice(0, 10) : todayIso,
      workType: rec.workType || "WEEKLY_OFF",
      actualHoursWorked:
        rec.actualHoursWorked !== null && rec.actualHoursWorked !== undefined
          ? String(rec.actualHoursWorked)
          : "",
      requestedDays: rec.days ? String(rec.days) : "",
      reason: rec.reason || "",
      attachmentUrl: rec.attachmentUrl || rec.supportingDocUrl || "",
      submitAsDraft: rec.status === "DRAFT",
    });
    setCompOffModalOpen(true);
  };

  const openWorkflowDialog = (action: WorkflowActionType, record: any) => {
    setWorkflowNote("");
    setWorkflowApprovedDays(String(record.approvedDays ?? record.days ?? ""));
    setWorkflowPayrollMonth(String(record.payrollMonth || record.payrollPeriodMonth || currentMonth));
    setWorkflowPayrollYear(String(record.payrollYear || record.payrollPeriodYear || currentYear));
    setWorkflowPayrollRunId(record.payrollRunId || "none");
    setWorkflowSalaryComponentId(record.payrollComponentId || "default");
    setWorkflowPayrollRef(record.payrollRef || "");
    setWorkflowModal({ open: true, action, record });
  };

  const handleSupportingFileSelect = async (
    file: File | undefined,
    target: "encashment" | "comp-off"
  ) => {
    if (!file) return;
    try {
      setIsUploadingDoc(true);
      const url = await uploadLeaveSupportingDocument(file);
      if (target === "encashment") {
        setEncashForm((prev) => ({ ...prev, attachmentUrl: url }));
      } else {
        setCompOffForm((prev) => ({ ...prev, attachmentUrl: url }));
      }
      toast.success("Supporting document uploaded");
    } catch (err: unknown) {
      toast.error(extractLeaveErrorMessage(err, "Document upload failed"));
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const handleExportTransactions = async (format: "csv" | "json") => {
    try {
      const qs = new URLSearchParams();
      Object.entries(listParams).forEach(([k, v]) => {
        if (k !== "page" && k !== "limit" && v !== undefined && v !== "") {
          qs.set(k, String(v));
        }
      });
      qs.set("format", format);

      const res = await fetch(
        `/api/v1/hr/leave/encashment-compoff/transactions/export?${qs.toString()}`,
        { headers: getAuthHeaders() }
      );
      if (!res.ok) {
        throw new Error(`Export failed with HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `leave-encashment-compoff-${todayIso}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Exported Transaction History (${format.toUpperCase()})`);
    } catch (err: unknown) {
      toast.error(extractLeaveErrorMessage(err, "Export failed"));
    }
  };

  const openNewEncashConfigModal = () => {
    setEditingEncashConfigId(null);
    setEncashCfgForm({
      name: "",
      code: "",
      enabled: true,
      eligibleLeaveTypeIds: leaveTypes.filter((lt) => lt.isPaid !== false).slice(0, 1).map((lt) => lt.id),
      minServiceMonths: "6",
      minRemainingBalance: "5",
      maxEncashableDaysPerRequest: "15",
      maxEncashableDaysPerYear: "30",
      minRetainedBalance: "5",
      encashmentFrequency: "YEARLY",
      periodicLimitDays: "",
      applicableCategoriesText: "",
      branchId: "all",
      departmentId: "all",
      approvalMode: "MANAGER_THEN_HR",
      allowEssSubmission: true,
      requireSupportingDoc: false,
      salaryBasisType: "BASIC",
      salaryComponentCodesText: "",
      dailyRateDivisorMode: "CUSTOM",
      dailyRateDivisor: "26",
      payrollComponentId: salaryComponents[0]?.id || "none",
      effectiveFrom: `${currentYear}-01-01`,
      effectiveTo: "",
    });
    setEncashConfigModalOpen(true);
  };

  const openEditEncashConfigModal = (cfg: any) => {
    setEditingEncashConfigId(cfg.id);
    const ltIds = Array.isArray(cfg.eligibleLeaveTypeIds)
      ? cfg.eligibleLeaveTypeIds
      : cfg.leaveTypeId
      ? [cfg.leaveTypeId]
      : [];
    setEncashCfgForm({
      name: cfg.name || "",
      code: cfg.code || "",
      enabled: Boolean(cfg.enabled ?? cfg.isEnabled ?? true),
      eligibleLeaveTypeIds: ltIds,
      minServiceMonths: String(cfg.minServiceMonths ?? 0),
      minRemainingBalance: String(cfg.minRemainingBalance ?? 0),
      maxEncashableDaysPerRequest: String(cfg.maxEncashableDaysPerRequest ?? 15),
      maxEncashableDaysPerYear: String(cfg.maxEncashableDaysPerYear ?? cfg.annualMaxDays ?? 30),
      minRetainedBalance: String(cfg.minRetainedBalance ?? 0),
      encashmentFrequency: cfg.encashmentFrequency || cfg.frequency || "YEARLY",
      periodicLimitDays:
        cfg.periodicLimitDays !== null && cfg.periodicLimitDays !== undefined
          ? String(cfg.periodicLimitDays)
          : "",
      applicableCategoriesText: Array.isArray(cfg.applicableCategories)
        ? cfg.applicableCategories.join(", ")
        : "",
      branchId: cfg.branchId || "all",
      departmentId: cfg.departmentId || "all",
      approvalMode: cfg.approvalMode || "MANAGER_THEN_HR",
      allowEssSubmission: Boolean(cfg.allowEssSubmission ?? cfg.allowSelfService ?? true),
      requireSupportingDoc: Boolean(cfg.requireSupportingDoc ?? false),
      salaryBasisType: cfg.salaryBasisType || cfg.salaryBasis || "BASIC",
      salaryComponentCodesText: Array.isArray(cfg.salaryComponentCodes)
        ? cfg.salaryComponentCodes.join(", ")
        : "",
      dailyRateDivisorMode: cfg.dailyRateDivisorMode || cfg.divisorMode || "CUSTOM",
      dailyRateDivisor:
        cfg.dailyRateDivisor !== null && cfg.dailyRateDivisor !== undefined
          ? String(cfg.dailyRateDivisor)
          : "26",
      payrollComponentId: cfg.payrollComponentId || cfg.salaryComponentId || "none",
      effectiveFrom: cfg.effectiveFrom ? String(cfg.effectiveFrom).slice(0, 10) : `${currentYear}-01-01`,
      effectiveTo: cfg.effectiveTo ? String(cfg.effectiveTo).slice(0, 10) : "",
    });
    setEncashConfigModalOpen(true);
  };

  const openNewCompOffConfigModal = () => {
    setEditingCompOffConfigId(null);
    const defaultCompOffLt =
      leaveTypes.find((lt) =>
        /comp/i.test(String(lt.code || "")) || /comp/i.test(String(lt.name || ""))
      ) || leaveTypes[0];
    setCompOffCfgForm({
      name: "",
      code: "",
      enabled: true,
      leaveTypeId: defaultCompOffLt?.id || "",
      allowWeeklyOffWork: true,
      allowHolidayWork: true,
      allowApprovedOvertime: true,
      minWorkedHours: "4",
      halfDayHours: "4",
      fullDayHours: "8",
      maxCreditDaysPerRequest: "2",
      maxAccrualBalance: "12",
      expiryDays: "60",
      preExpiryAlertDays: "7",
      allowCarryForward: false,
      maxBackdateDays: "30",
      branchId: "all",
      departmentId: "all",
      applicableCategoriesText: "",
      approvalMode: "MANAGER_THEN_HR",
      allowEssSubmission: true,
      requireAttendanceProof: false,
      requireApprovedOvertime: true,
      effectiveFrom: `${currentYear}-01-01`,
      effectiveTo: "",
    });
    setCompOffConfigModalOpen(true);
  };

  const openEditCompOffConfigModal = (cfg: any) => {
    setEditingCompOffConfigId(cfg.id);
    setCompOffCfgForm({
      name: cfg.name || "",
      code: cfg.code || "",
      enabled: Boolean(cfg.enabled ?? cfg.isEnabled ?? true),
      leaveTypeId: cfg.leaveTypeId || "",
      allowWeeklyOffWork: Boolean(cfg.allowWeeklyOffWork ?? true),
      allowHolidayWork: Boolean(cfg.allowHolidayWork ?? true),
      allowApprovedOvertime: Boolean(cfg.allowApprovedOvertime ?? true),
      minWorkedHours: String(cfg.minWorkedHours ?? 4),
      halfDayHours: String(cfg.halfDayHours ?? 4),
      fullDayHours: String(cfg.fullDayHours ?? 8),
      maxCreditDaysPerRequest: String(cfg.maxCreditDaysPerRequest ?? 2),
      maxAccrualBalance: String(cfg.maxAccrualBalance ?? 12),
      expiryDays: String(cfg.expiryDays ?? 60),
      preExpiryAlertDays: String(cfg.preExpiryAlertDays ?? 7),
      allowCarryForward: Boolean(cfg.allowCarryForward ?? false),
      maxBackdateDays: String(cfg.maxBackdateDays ?? 30),
      branchId: cfg.branchId || "all",
      departmentId: cfg.departmentId || "all",
      applicableCategoriesText: Array.isArray(cfg.applicableCategories)
        ? cfg.applicableCategories.join(", ")
        : "",
      approvalMode: cfg.approvalMode || "MANAGER_THEN_HR",
      allowEssSubmission: Boolean(cfg.allowEssSubmission ?? cfg.allowSelfService ?? true),
      requireAttendanceProof: Boolean(cfg.requireAttendanceProof ?? false),
      requireApprovedOvertime: Boolean(cfg.requireApprovedOvertime ?? true),
      effectiveFrom: cfg.effectiveFrom ? String(cfg.effectiveFrom).slice(0, 10) : `${currentYear}-01-01`,
      effectiveTo: cfg.effectiveTo ? String(cfg.effectiveTo).slice(0, 10) : "",
    });
    setCompOffConfigModalOpen(true);
  };

  const toggleLeaveTypeInEncashConfig = (ltId: string) => {
    setEncashCfgForm((prev) => {
      const exists = prev.eligibleLeaveTypeIds.includes(ltId);
      return {
        ...prev,
        eligibleLeaveTypeIds: exists
          ? prev.eligibleLeaveTypeIds.filter((id) => id !== ltId)
          : [...prev.eligibleLeaveTypeIds, ltId],
      };
    });
  };

  const canDecideRow = (rec: any) =>
    viewerAccess.canApproveRequests &&
    ["PENDING", "MANAGER_APPROVED", "HR_APPROVED", "CLARIFICATION_REQUESTED"].includes(
      String(rec.status || "").toUpperCase()
    );

  return (
    <div className="space-y-4 pb-12 max-w-full overflow-x-hidden">
      {/* 1. Page Header matching existing 4 Leave pages */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Leave Encashment &amp; Comp-Off
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage policy-driven leave encashments, payroll payout processing, compensatory-off earn requests, and FIFO ledger utilization.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleRefreshAll}
            disabled={isRefreshing}
            className="h-9 text-xs border-slate-200 dark:border-slate-700 rounded-lg font-medium flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#00a76f] ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          {viewerAccess.canCreateCompOff && (
            <Button
              type="button"
              variant="outline"
              onClick={openNewCompOffModal}
              className="h-9 text-xs border-[#00a76f]/40 text-[#00a76f] hover:bg-[#00a76f]/10 dark:border-[#00a76f]/50 rounded-lg font-medium flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Add Comp-Off Request
            </Button>
          )}

          {viewerAccess.canCreateEncashment && (
            <Button
              type="button"
              onClick={openNewEncashmentModal}
              className="bg-[#00a76f] hover:bg-[#008f5d] text-white font-medium rounded-lg px-3.5 h-9 text-xs shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Encashment Request
            </Button>
          )}
        </div>
      </div>

      {/* Metadata Error Banner */}
      {metadataError && (
        <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl p-3.5 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{extractLeaveErrorMessage(metadataError, "Unable to load module metadata.")}</span>
        </div>
      )}

      {/* 2. Six Dynamic Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {[
          {
            title: "Pending Encashments",
            value: isSummaryLoading ? "…" : summary?.pendingEncashmentRequests ?? 0,
            sub: "Awaiting approval",
            icon: Clock,
            accent: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40",
          },
          {
            title: "Approved Encashments",
            value: isSummaryLoading ? "…" : summary?.approvedEncashmentRequests ?? 0,
            sub: `${formatLeaveDays(summary?.approvedEncashmentDays ?? 0)} days approved`,
            icon: CheckCircle2,
            accent: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40",
          },
          {
            title: "Awaiting Payroll",
            value: isSummaryLoading ? "…" : summary?.awaitingPayrollProcessing ?? 0,
            sub: viewerAccess.canViewSalaryAmounts
              ? formatCurrencyDynamic(summary?.awaitingPayrollAmount ?? 0, currencyCode)
              : "Payroll queue",
            icon: Wallet,
            accent: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40",
          },
          {
            title: "Pending Comp-Offs",
            value: isSummaryLoading ? "…" : summary?.pendingCompOffRequests ?? 0,
            sub: "Verification & review",
            icon: CalendarClock,
            accent: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40",
          },
          {
            title: "Available Comp-Off Days",
            value: isSummaryLoading ? "…" : `${formatLeaveDays(summary?.availableCompOffDays ?? 0)}d`,
            sub: "Non-expired FIFO balance",
            icon: Coins,
            accent: "text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40",
          },
          {
            title: "Expiring Comp-Off Days",
            value: isSummaryLoading ? "…" : `${formatLeaveDays(summary?.expiringCompOffDays ?? 0)}d`,
            sub: `Next ${summary?.warningWindowDays ?? 14} days (${summary?.expiringCompOffLotsCount ?? 0} lots)`,
            icon: AlertTriangle,
            accent: "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40",
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3.5 shadow-xs flex items-start justify-between gap-2"
            >
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                  {card.title}
                </p>
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {card.value}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  {card.sub}
                </p>
              </div>
              <div className={`p-2 rounded-lg shrink-0 ${card.accent}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Four Operational Tabs Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-1.5 shadow-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1">
          {[
            { id: "encashment" as OperationalTab, label: "Encashment", icon: Banknote },
            { id: "comp-off" as OperationalTab, label: "Comp-Off", icon: Coins },
            { id: "transactions" as OperationalTab, label: "Transaction History", icon: History },
            { id: "configuration" as OperationalTab, label: "Configuration", icon: Settings2 },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  setPage(1);
                }}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  active
                    ? "bg-[#00a76f] text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Contextual Tab Actions */}
        {activeTab === "comp-off" && viewerAccess.canConfigurePolicies && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => expirySweepMutation.mutate()}
            disabled={expirySweepMutation.isPending}
            className="h-8 text-xs border-slate-200 dark:border-slate-700"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
            {expirySweepMutation.isPending ? "Sweeping…" : "Run Expiry Sweep"}
          </Button>
        )}

        {activeTab === "transactions" && (
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleExportTransactions("csv")}
              className="h-8 text-xs border-slate-200 dark:border-slate-700"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 text-[#00a76f]" />
              Export CSV
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleExportTransactions("json")}
              className="h-8 text-xs border-slate-200 dark:border-slate-700"
            >
              <FileJson className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
              Export JSON
            </Button>
          </div>
        )}
      </div>

      {/* 4. Server-Side Filter Bar (Tabs 1, 2, 3) */}
      {activeTab !== "configuration" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-2.5">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search code, employee, reason…"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="pl-8 h-9 text-xs border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>

            {/* Employee */}
            <Select
              value={employeeFilter}
              onValueChange={(v) => {
                setEmployeeFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 text-xs border-slate-200 dark:border-slate-700 rounded-lg">
                <SelectValue placeholder="All Employees" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value="all">All Employees</SelectItem>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName} ({emp.employeeCode})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Department */}
            <Select
              value={departmentFilter}
              onValueChange={(v) => {
                setDepartmentFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 text-xs border-slate-200 dark:border-slate-700 rounded-lg">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Branch */}
            <Select
              value={branchFilter}
              onValueChange={(v) => {
                setBranchFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 text-xs border-slate-200 dark:border-slate-700 rounded-lg">
                <SelectValue placeholder="All Branches" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value="all">All Branches</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Leave Type */}
            <Select
              value={leaveTypeFilter}
              onValueChange={(v) => {
                setLeaveTypeFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 text-xs border-slate-200 dark:border-slate-700 rounded-lg">
                <SelectValue placeholder="All Leave Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Leave Types</SelectItem>
                {leaveTypes.map((lt) => (
                  <SelectItem key={lt.id} value={lt.id}>
                    {lt.name} ({lt.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Request Status */}
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 text-xs border-slate-200 dark:border-slate-700 rounded-lg">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {REQUEST_STATUS_OPTIONS.map((st) => (
                  <SelectItem key={st.value} value={st.value}>
                    {st.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Secondary Filter Row: Date Range, Payroll Period, Transaction Type, Sorting */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-medium text-slate-500">From:</span>
                <Input
                  type="date"
                  value={startDateFilter}
                  onChange={(e) => {
                    setStartDateFilter(e.target.value);
                    setPage(1);
                  }}
                  className="h-8 text-xs w-36 border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-medium text-slate-500">To:</span>
                <Input
                  type="date"
                  value={endDateFilter}
                  onChange={(e) => {
                    setEndDateFilter(e.target.value);
                    setPage(1);
                  }}
                  className="h-8 text-xs w-36 border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>

              {(activeTab === "encashment" || activeTab === "transactions") && (
                <>
                  <Select
                    value={payrollMonthFilter}
                    onValueChange={(v) => {
                      setPayrollMonthFilter(v);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs w-36 border-slate-200 dark:border-slate-700 rounded-lg">
                      <SelectValue placeholder="Payroll Month" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Payroll Months</SelectItem>
                      {MONTH_OPTIONS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={payrollYearFilter}
                    onValueChange={(v) => {
                      setPayrollYearFilter(v);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs w-28 border-slate-200 dark:border-slate-700 rounded-lg">
                      <SelectValue placeholder="Payroll Year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Years</SelectItem>
                      {yearOptions.map((y) => (
                        <SelectItem key={y} value={String(y)}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}

              {activeTab === "transactions" && (
                <Select
                  value={transactionTypeFilter}
                  onValueChange={(v) => {
                    setTransactionTypeFilter(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 text-xs w-40 border-slate-200 dark:border-slate-700 rounded-lg">
                    <SelectValue placeholder="Transaction Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Transactions</SelectItem>
                    <SelectItem value="ENCASHMENT">Leave Encashment</SelectItem>
                    <SelectItem value="COMP_OFF">Comp-Off Credit</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Select
                value={sortBy}
                onValueChange={(v) => {
                  setSortBy(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 text-xs w-36 border-slate-200 dark:border-slate-700 rounded-lg">
                  <SelectValue placeholder="Sort By" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt">Created Date</SelectItem>
                  <SelectItem value="effectiveDate">Effective Date</SelectItem>
                  <SelectItem value="workedOnDate">Worked Date</SelectItem>
                  <SelectItem value="days">Days</SelectItem>
                  <SelectItem value="netPayableAmount">Amount</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
                className="h-8 text-xs px-2.5 border-slate-200 dark:border-slate-700"
              >
                <ArrowUpDown className="w-3.5 h-3.5 mr-1" />
                {sortOrder.toUpperCase()}
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="h-8 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
              >
                <X className="w-3.5 h-3.5 mr-1" />
                Reset
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 5A. TAB 1: LEAVE ENCASHMENT */}
      {activeTab === "encashment" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
          {encashError && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 border-b border-rose-200 dark:border-rose-800">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{extractLeaveErrorMessage(encashError, "Failed to load encashment requests")}</span>
            </div>
          )}

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/70 dark:bg-slate-800/50 text-[11px] uppercase tracking-wider">
                  <TableHead>Request</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Leave Type</TableHead>
                  <TableHead>Days &amp; Balance</TableHead>
                  <TableHead>Encashment Payout</TableHead>
                  <TableHead>Payroll &amp; Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isEncashLoading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <TableRow key={idx}>
                      <TableCell colSpan={7} className="py-4">
                        <div className="h-6 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : encashmentRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-14 text-center">
                      <Banknote className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                        No leave encashment requests found
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Adjust your filters or click &ldquo;Add Encashment Request&rdquo; to initiate a policy-validated payout.
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  encashmentRows.map((r: any) => {
                    const st = String(r.status || "").toUpperCase();
                    const payPeriod =
                      r.payrollMonth && r.payrollYear
                        ? `${String(r.payrollMonth).padStart(2, "0")}/${r.payrollYear}`
                        : null;
                    return (
                      <TableRow key={r.id} className="text-xs hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                        <TableCell>
                          <div className="font-mono font-semibold text-slate-800 dark:text-slate-100">
                            {r.requestCode || r.id.slice(0, 8)}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Eff: {formatDateDisplay(r.effectiveDate || r.createdAt)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <Avatar className="h-7 w-7">
                              <AvatarFallback className="text-[10px] bg-[#00a76f]/10 text-[#00a76f] font-semibold">
                                {(r.employee?.firstName?.[0] || "") + (r.employee?.lastName?.[0] || "")}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-semibold text-slate-900 dark:text-slate-100">
                                {r.employee?.firstName} {r.employee?.lastName}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {r.employee?.employeeCode}
                                {r.employee?.department?.name ? ` • ${r.employee.department.name}` : ""}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border border-slate-200 dark:border-slate-700"
                          >
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: r.leaveType?.color || "#00a76f" }}
                            />
                            {r.leaveType?.name || "Leave"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {formatLeaveDays(r.approvedDays ?? r.days)} days
                          </div>
                          {r.retainedBalanceSnapshot !== null && r.retainedBalanceSnapshot !== undefined && (
                            <div className="text-[11px] text-slate-500">
                              Retained: {formatLeaveDays(r.retainedBalanceSnapshot)}d
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {r.totalAmount !== null && r.totalAmount !== undefined ? (
                            <div>
                              <div className="font-semibold text-slate-900 dark:text-slate-100">
                                {formatCurrencyDynamic(r.totalAmount, r.currency || currencyCode)}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {formatCurrencyDynamic(r.unitDailyRate, r.currency || currencyCode)}/day
                              </div>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Restricted</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col items-start gap-1">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadgeClasses(
                                st
                              )}`}
                            >
                              {formatStatusLabel(st)}
                            </span>
                            {payPeriod && (
                              <span className="text-[11px] text-slate-500 font-mono">
                                Payroll: {payPeriod}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1 flex-wrap">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setDetailModalId(r.id)}
                              className="h-7 px-2 text-xs"
                              title="View Detail & Audit Trail"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>

                            {["DRAFT", "PENDING", "CLARIFICATION_REQUESTED"].includes(st) &&
                              viewerAccess.canCreateEncashment && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditEncashmentModal(r)}
                                  className="h-7 px-2 text-xs"
                                  title="Edit Request"
                                >
                                  <SquarePen className="w-3.5 h-3.5" />
                                </Button>
                              )}

                            {canDecideRow(r) && (
                              <>
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => openWorkflowDialog("approve", r)}
                                  className="h-7 px-2.5 text-[11px] bg-[#00a76f] hover:bg-[#008f5d] text-white"
                                >
                                  Approve
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openWorkflowDialog("reject", r)}
                                  className="h-7 px-2 text-[11px] text-rose-600 border-rose-200 hover:bg-rose-50"
                                >
                                  Reject
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openWorkflowDialog("clarify", r)}
                                  className="h-7 px-2 text-[11px]"
                                  title="Request Clarification"
                                >
                                  <MessageSquareWarning className="w-3.5 h-3.5 text-amber-600" />
                                </Button>
                              </>
                            )}

                            {viewerAccess.canProcessPayroll && ["APPROVED", "FAILED"].includes(st) && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => openWorkflowDialog("process_payroll", r)}
                                className="h-7 px-2.5 text-[11px] border-indigo-200 text-indigo-700 dark:text-indigo-300"
                              >
                                Queue Payroll
                              </Button>
                            )}

                            {viewerAccess.canProcessPayroll &&
                              ["PAYROLL_PENDING", "PAYROLL_PROCESSING"].includes(st) && (
                                <>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openWorkflowDialog("reconcile_paid", r)}
                                    className="h-7 px-2 text-[11px] border-emerald-200 text-emerald-700"
                                  >
                                    Mark Paid
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openWorkflowDialog("mark_failed", r)}
                                    className="h-7 px-2 text-[11px] text-rose-600"
                                  >
                                    Fail
                                  </Button>
                                </>
                              )}

                            {viewerAccess.canConfigurePolicies &&
                              ["APPROVED", "PAYROLL_PENDING", "FAILED"].includes(st) && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openWorkflowDialog("reverse", r)}
                                  className="h-7 px-2 text-[11px] text-amber-700"
                                  title="Reverse Encashment & Restore Ledger"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </Button>
                              )}

                            {["DRAFT", "PENDING", "CLARIFICATION_REQUESTED"].includes(st) && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => openWorkflowDialog("cancel", r)}
                                className="h-7 px-2 text-[11px] text-slate-500"
                                title="Cancel Request"
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Stacked Cards */}
          <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
            {isEncashLoading ? (
              <div className="p-4 space-y-3">
                <div className="h-20 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
                <div className="h-20 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
              </div>
            ) : encashmentRows.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No leave encashment requests found.
              </div>
            ) : (
              encashmentRows.map((r: any) => {
                const st = String(r.status || "").toUpperCase();
                return (
                  <div key={r.id} className="p-4 space-y-2.5 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {r.employee?.firstName} {r.employee?.lastName}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {r.requestCode || r.id.slice(0, 8)} • {r.leaveType?.name}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadgeClasses(
                          st
                        )}`}
                      >
                        {formatStatusLabel(st)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300">
                      <span>Days: {formatLeaveDays(r.approvedDays ?? r.days)}</span>
                      <span className="font-semibold">
                        {r.totalAmount !== null && r.totalAmount !== undefined
                          ? formatCurrencyDynamic(r.totalAmount, r.currency || currencyCode)
                          : "Restricted"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setDetailModalId(r.id)}
                        className="h-7 text-[11px]"
                      >
                        Details
                      </Button>
                      {canDecideRow(r) && (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => openWorkflowDialog("approve", r)}
                            className="h-7 text-[11px] bg-[#00a76f] text-white"
                          >
                            Approve
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openWorkflowDialog("reject", r)}
                            className="h-7 text-[11px] text-rose-600"
                          >
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 5B. TAB 2: COMP-OFF */}
      {activeTab === "comp-off" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
          {compOffError && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 border-b border-rose-200 dark:border-rose-800">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{extractLeaveErrorMessage(compOffError, "Failed to load Comp-Off requests")}</span>
            </div>
          )}

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/70 dark:bg-slate-800/50 text-[11px] uppercase tracking-wider">
                  <TableHead>Request &amp; Work Date</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Work Category &amp; Proof</TableHead>
                  <TableHead>Credited Days</TableHead>
                  <TableHead>FIFO Utilization</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isCompOffLoading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <TableRow key={idx}>
                      <TableCell colSpan={8} className="py-4">
                        <div className="h-6 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : compOffRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-14 text-center">
                      <Coins className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                        No Comp-Off requests found
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Submit a Comp-Off earn request for verified holiday, weekly-off, or approved overtime work.
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  compOffRows.map((r: any) => {
                    const st = String(r.status || "").toUpperCase();
                    return (
                      <TableRow key={r.id} className="text-xs hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                        <TableCell>
                          <div className="font-mono font-semibold text-slate-800 dark:text-slate-100">
                            {r.requestCode || r.id.slice(0, 8)}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Worked: {formatDateDisplay(r.workedOnDate)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {r.employee?.firstName} {r.employee?.lastName}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {r.employee?.employeeCode}
                            {r.employee?.department?.name ? ` • ${r.employee.department.name}` : ""}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] font-medium">
                            {formatStatusLabel(r.workType || "WEEKLY_OFF")}
                          </Badge>
                          {r.actualHoursWorked !== null && r.actualHoursWorked !== undefined && (
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {Number(r.actualHoursWorked).toFixed(1)} hrs verified
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-semibold text-slate-900 dark:text-slate-100">
                          {formatLeaveDays(r.creditedDays ?? r.approvedDays ?? r.days)} days
                        </TableCell>
                        <TableCell>
                          <div className="text-[11px] space-y-0.5">
                            <div>
                              Avail:{" "}
                              <span className="font-semibold text-[#00a76f]">
                                {formatLeaveDays(r.remainingDays ?? 0)}d
                              </span>
                            </div>
                            <div className="text-slate-500">
                              Used: {formatLeaveDays(r.usedDays ?? 0)}d
                              {Number(r.expiredDays || 0) > 0
                                ? ` • Exp: ${formatLeaveDays(r.expiredDays)}d`
                                : ""}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs">{formatDateDisplay(r.expiresAt)}</div>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadgeClasses(
                              st
                            )}`}
                          >
                            {formatStatusLabel(st)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1 flex-wrap">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setDetailModalId(r.id)}
                              className="h-7 px-2 text-xs"
                              title="View Detail"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>

                            {["DRAFT", "PENDING", "CLARIFICATION_REQUESTED"].includes(st) &&
                              viewerAccess.canCreateCompOff && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditCompOffModal(r)}
                                  className="h-7 px-2 text-xs"
                                >
                                  <SquarePen className="w-3.5 h-3.5" />
                                </Button>
                              )}

                            {canDecideRow(r) && (
                              <>
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => openWorkflowDialog("approve", r)}
                                  className="h-7 px-2.5 text-[11px] bg-[#00a76f] hover:bg-[#008f5d] text-white"
                                >
                                  Approve &amp; Credit
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openWorkflowDialog("reject", r)}
                                  className="h-7 px-2 text-[11px] text-rose-600 border-rose-200"
                                >
                                  Reject
                                </Button>
                              </>
                            )}

                            {["DRAFT", "PENDING", "CLARIFICATION_REQUESTED", "APPROVED"].includes(st) &&
                              Number(r.usedDays || 0) === 0 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openWorkflowDialog("cancel", r)}
                                  className="h-7 px-2 text-[11px] text-slate-500"
                                  title="Cancel Comp-Off"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                </Button>
                              )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
            {compOffRows.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No Comp-Off requests found.
              </div>
            ) : (
              compOffRows.map((r: any) => {
                const st = String(r.status || "").toUpperCase();
                return (
                  <div key={r.id} className="p-4 space-y-2 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {r.employee?.firstName} {r.employee?.lastName}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Worked {formatDateDisplay(r.workedOnDate)} • {formatStatusLabel(r.workType)}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadgeClasses(
                          st
                        )}`}
                      >
                        {formatStatusLabel(st)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300">
                      <span>Credit: {formatLeaveDays(r.creditedDays ?? r.days)}d</span>
                      <span>Remaining: {formatLeaveDays(r.remainingDays ?? 0)}d</span>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setDetailModalId(r.id)}
                        className="h-7 text-[11px]"
                      >
                        Details
                      </Button>
                      {canDecideRow(r) && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => openWorkflowDialog("approve", r)}
                          className="h-7 text-[11px] bg-[#00a76f] text-white"
                        >
                          Approve
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 5C. TAB 3: UNIFIED TRANSACTION HISTORY */}
      {activeTab === "transactions" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
          {txError && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 border-b border-rose-200 dark:border-rose-800">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{extractLeaveErrorMessage(txError, "Failed to load transaction history")}</span>
            </div>
          )}

          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/70 dark:bg-slate-800/50 text-[11px] uppercase tracking-wider">
                  <TableHead>Code &amp; Type</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Leave Category</TableHead>
                  <TableHead>Event Date</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Financial / Expiry</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Audit Trail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isTxLoading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <TableRow key={idx}>
                      <TableCell colSpan={8} className="py-4">
                        <div className="h-6 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : transactionRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-14 text-center">
                      <History className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                        No transactions match the selected filters
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  transactionRows.map((r: any) => {
                    const isCompOff = r.type === "COMP_OFF";
                    return (
                      <TableRow key={r.id} className="text-xs hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                        <TableCell>
                          <div className="font-mono font-semibold">{r.requestCode || r.id.slice(0, 8)}</div>
                          <Badge
                            variant="outline"
                            className={`mt-0.5 text-[10px] ${
                              isCompOff ? "border-teal-300 text-teal-700" : "border-indigo-300 text-indigo-700"
                            }`}
                          >
                            {isCompOff ? "COMP-OFF" : "ENCASHMENT"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {r.employee?.firstName} {r.employee?.lastName}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {r.employee?.employeeCode}
                            {r.employee?.department?.name ? ` • ${r.employee.department.name}` : ""}
                          </div>
                        </TableCell>
                        <TableCell>{r.leaveType?.name || "—"}</TableCell>
                        <TableCell>
                          {formatDateDisplay(isCompOff ? r.workedOnDate : r.effectiveDate || r.createdAt)}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatLeaveDays(r.approvedDays ?? r.days)}d
                        </TableCell>
                        <TableCell>
                          {isCompOff ? (
                            <span className="text-[11px] text-slate-600 dark:text-slate-300">
                              Exp: {formatDateDisplay(r.expiresAt)}
                            </span>
                          ) : r.totalAmount !== null && r.totalAmount !== undefined ? (
                            <span className="font-semibold">
                              {formatCurrencyDynamic(r.totalAmount, r.currency || currencyCode)}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Restricted</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadgeClasses(
                              r.status
                            )}`}
                          >
                            {formatStatusLabel(r.status)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setDetailModalId(r.id)}
                            className="h-7 text-[11px]"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            Audit Trail
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
            {transactionRows.map((r: any) => (
              <div key={r.id} className="p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-semibold">{r.requestCode || r.id.slice(0, 8)}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadgeClasses(
                      r.status
                    )}`}
                  >
                    {formatStatusLabel(r.status)}
                  </span>
                </div>
                <div className="font-medium">
                  {r.employee?.firstName} {r.employee?.lastName} • {r.type}
                </div>
                <div className="flex items-center justify-between">
                  <span>{formatLeaveDays(r.approvedDays ?? r.days)} days</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setDetailModalId(r.id)}
                    className="h-7 text-[11px]"
                  >
                    View Trail
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagination Footer for Tabs 1, 2, 3 */}
      {activeTab !== "configuration" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl px-4 py-3 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-slate-500 dark:text-slate-400">
            Total <span className="font-semibold text-slate-800 dark:text-slate-200">{activePagination.total || 0}</span>{" "}
            record(s) • Page{" "}
            <span className="font-semibold text-slate-800 dark:text-slate-200">{activePagination.page || 1}</span> of{" "}
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {Math.max(1, activePagination.totalPages || 1)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Select
              value={String(limit)}
              onValueChange={(v) => {
                setLimit(Number(v));
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-24 text-xs border-slate-200 dark:border-slate-700 rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 12, 20, 50].map((sz) => (
                  <SelectItem key={sz} value={String(sz)}>
                    {sz} / page
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-8 px-2.5 text-xs"
            >
              <ChevronLeft className="w-3.5 h-3.5 mr-1" />
              Prev
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= (activePagination.totalPages || 1)}
              onClick={() => setPage((p) => p + 1)}
              className="h-8 px-2.5 text-xs"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* 5D. TAB 4: CONFIGURATION (MODULE D) */}
      {activeTab === "configuration" && (
        <div className="space-y-4">
          {!viewerAccess.canConfigurePolicies && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 rounded-xl p-3.5 text-xs flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>
                Read-only view: Only HR Administrators can create, edit, or deactivate Leave Encashment and Comp-Off policy configurations.
              </span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={configSubTab === "encashment-policies" ? "default" : "outline"}
                size="sm"
                onClick={() => setConfigSubTab("encashment-policies")}
                className={
                  configSubTab === "encashment-policies"
                    ? "bg-[#00a76f] hover:bg-[#008f5d] text-white text-xs h-8"
                    : "text-xs h-8"
                }
              >
                Leave Encashment Policies ({encashConfigs.length})
              </Button>
              <Button
                type="button"
                variant={configSubTab === "compoff-policies" ? "default" : "outline"}
                size="sm"
                onClick={() => setConfigSubTab("compoff-policies")}
                className={
                  configSubTab === "compoff-policies"
                    ? "bg-[#00a76f] hover:bg-[#008f5d] text-white text-xs h-8"
                    : "text-xs h-8"
                }
              >
                Comp-Off Policies ({compOffConfigs.length})
              </Button>
            </div>

            {viewerAccess.canConfigurePolicies && (
              <Button
                type="button"
                onClick={
                  configSubTab === "encashment-policies"
                    ? openNewEncashConfigModal
                    : openNewCompOffConfigModal
                }
                className="bg-[#00a76f] hover:bg-[#008f5d] text-white text-xs h-8"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                {configSubTab === "encashment-policies"
                  ? "New Encashment Policy"
                  : "New Comp-Off Policy"}
              </Button>
            )}
          </div>

          {configSubTab === "encashment-policies" ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {isEncashCfgLoading ? (
                <div className="h-36 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
              ) : encashConfigs.length === 0 ? (
                <div className="col-span-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center">
                  <Settings2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold">No Leave Encashment Policies configured yet</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Create an encashment configuration to define eligible leave types, retained balance rules, and salary calculation divisors.
                  </p>
                </div>
              ) : (
                encashConfigs.map((cfg: any) => (
                  <div
                    key={cfg.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-3 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            {cfg.name}
                          </h3>
                          <Badge variant="outline" className="text-[10px]">
                            v{cfg.version || 1}
                          </Badge>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadgeClasses(
                              cfg.enabled ? "ACTIVE" : "CANCELLED"
                            )}`}
                          >
                            {cfg.enabled ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Effective: {formatDateDisplay(cfg.effectiveFrom)} —{" "}
                          {cfg.effectiveTo ? formatDateDisplay(cfg.effectiveTo) : "Ongoing"}
                        </p>
                      </div>

                      {viewerAccess.canConfigurePolicies && (
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openEditEncashConfigModal(cfg)}
                            className="h-7 text-[11px]"
                          >
                            <SquarePen className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                          {cfg.enabled && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => deactivateEncashConfigMutation.mutate(cfg.id)}
                              className="h-7 text-[11px] text-rose-600"
                            >
                              Deactivate
                            </Button>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                      <div>
                        <span className="text-slate-500">Salary Basis:</span>{" "}
                        <span className="font-semibold">{cfg.salaryBasisType}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Divisor:</span>{" "}
                        <span className="font-semibold">
                          {cfg.dailyRateDivisorMode === "CUSTOM"
                            ? cfg.dailyRateDivisor
                            : cfg.dailyRateDivisorMode}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">Frequency:</span>{" "}
                        <span className="font-semibold">{cfg.encashmentFrequency}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Max / Request:</span>{" "}
                        <span className="font-semibold">{formatLeaveDays(cfg.maxEncashableDaysPerRequest)}d</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Annual Cap:</span>{" "}
                        <span className="font-semibold">{formatLeaveDays(cfg.maxEncashableDaysPerYear)}d</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Min Retained:</span>{" "}
                        <span className="font-semibold">{formatLeaveDays(cfg.minRetainedBalance)}d</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Min Tenure:</span>{" "}
                        <span className="font-semibold">{cfg.minServiceMonths ?? 0} mo</span>
                      </div>
                      <div>
                        <span className="text-slate-500">ESS Allowed:</span>{" "}
                        <span className="font-semibold">{cfg.allowEssSubmission ? "Yes" : "HR Only"}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Payroll Mapping:</span>{" "}
                        <span className="font-semibold">
                          {cfg.payrollComponent?.name || cfg.salaryComponent?.name || "Default"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {isCompOffCfgLoading ? (
                <div className="h-36 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
              ) : compOffConfigs.length === 0 ? (
                <div className="col-span-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center">
                  <Coins className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold">No Comp-Off Policies configured yet</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Create a Comp-Off configuration to define weekly-off, holiday, and approved overtime conversion thresholds and expiry horizons.
                  </p>
                </div>
              ) : (
                compOffConfigs.map((cfg: any) => (
                  <div
                    key={cfg.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-3 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            {cfg.name}
                          </h3>
                          <Badge variant="outline" className="text-[10px]">
                            v{cfg.version || 1}
                          </Badge>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadgeClasses(
                              cfg.enabled ? "ACTIVE" : "CANCELLED"
                            )}`}
                          >
                            {cfg.enabled ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Leave Type: {cfg.leaveType?.name || "Comp-Off"} • Effective:{" "}
                          {formatDateDisplay(cfg.effectiveFrom)}
                        </p>
                      </div>

                      {viewerAccess.canConfigurePolicies && (
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openEditCompOffConfigModal(cfg)}
                            className="h-7 text-[11px]"
                          >
                            <SquarePen className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                          {cfg.enabled && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => deactivateCompOffConfigMutation.mutate(cfg.id)}
                              className="h-7 text-[11px] text-rose-600"
                            >
                              Deactivate
                            </Button>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                      <div>
                        <span className="text-slate-500">Half / Full Hrs:</span>{" "}
                        <span className="font-semibold">
                          {Number(cfg.halfDayHours)}h / {Number(cfg.fullDayHours)}h
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">Expiry Window:</span>{" "}
                        <span className="font-semibold">{cfg.expiryDays} days</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Accrual Cap:</span>{" "}
                        <span className="font-semibold">{formatLeaveDays(cfg.maxAccrualBalance)}d</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Weekly Off / Holiday:</span>{" "}
                        <span className="font-semibold">
                          {cfg.allowWeeklyOffWork ? "WO " : ""}
                          {cfg.allowHolidayWork ? "HOL " : ""}
                          {cfg.allowApprovedOvertime ? "OT" : ""}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">Backdate Limit:</span>{" "}
                        <span className="font-semibold">{cfg.maxBackdateDays} days</span>
                      </div>
                      <div>
                        <span className="text-slate-500">ESS Allowed:</span>{" "}
                        <span className="font-semibold">{cfg.allowEssSubmission ? "Yes" : "HR Only"}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================
          MODAL 1: CREATE / EDIT LEAVE ENCASHMENT REQUEST
      ======================================================================== */}
      <Dialog open={encashModalOpen} onOpenChange={setEncashModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {editingEncashId ? "Edit Leave Encashment Request" : "New Leave Encashment Request"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              All leave balances, retained thresholds, and daily-rate payouts are validated dynamically on the server.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Employee *</Label>
                <Select
                  value={encashForm.employeeId}
                  onValueChange={(val) => setEncashForm((p) => ({ ...p, employeeId: val }))}
                  disabled={Boolean(editingEncashId)}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName} ({emp.employeeCode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Effective Date *</Label>
                <Input
                  type="date"
                  value={encashForm.effectiveDate}
                  onChange={(e) => setEncashForm((p) => ({ ...p, effectiveDate: e.target.value }))}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Eligible Leave Type *</Label>
                <Select
                  value={encashForm.leaveTypeId}
                  onValueChange={(val) => setEncashForm((p) => ({ ...p, leaveTypeId: val }))}
                  disabled={isLoadingEligibleTypes || eligibleEncashTypes.length === 0}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue
                      placeholder={
                        isLoadingEligibleTypes
                          ? "Checking policy eligibility…"
                          : eligibleEncashTypes.length === 0
                          ? "No eligible leave types"
                          : "Select leave type"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {eligibleEncashTypes.map((lt) => (
                      <SelectItem key={lt.leaveTypeId} value={lt.leaveTypeId}>
                        {lt.leaveTypeName} — Avail: {formatLeaveDays(lt.availableBalance)}d (Max:{" "}
                        {formatLeaveDays(lt.maxRequestableNow)}d)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Requested Days *</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={encashForm.requestedDays}
                  onChange={(e) => setEncashForm((p) => ({ ...p, requestedDays: e.target.value }))}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {ineligibleEncashTypes.length > 0 && eligibleEncashTypes.length === 0 && (
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-2.5 text-[11px] text-amber-800 dark:text-amber-300">
                No leave types are currently eligible for encashment for this employee (e.g.,{" "}
                {ineligibleEncashTypes[0]?.leaveTypeName}: {ineligibleEncashTypes[0]?.reason}).
              </div>
            )}

            {/* Live Server Calculation Preview */}
            {isEncashPreviewLoading ? (
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-500 animate-pulse">
                Calculating authoritative salary basis &amp; balance retention…
              </div>
            ) : encashPreview ? (
              encashPreview.valid ? (
                <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-2">
                  <div className="flex items-center justify-between font-semibold text-emerald-800 dark:text-emerald-300">
                    <span>Authoritative Encashment Calculation</span>
                    <span>
                      {formatCurrencyDynamic(
                        encashPreview.data?.netPayableAmount ?? encashPreview.data?.totalAmount,
                        encashPreview.data?.currency || currencyCode
                      )}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-700 dark:text-slate-300">
                    <div>
                      Available:{" "}
                      <span className="font-semibold">
                        {formatLeaveDays(encashPreview.data?.availableBalance)}d
                      </span>
                    </div>
                    <div>
                      Retained After:{" "}
                      <span className="font-semibold">
                        {formatLeaveDays(encashPreview.data?.retainedBalance)}d
                      </span>
                    </div>
                    <div>
                      Divisor:{" "}
                      <span className="font-semibold">
                        {encashPreview.data?.dailyRateDivisor ?? encashPreview.data?.divisor} (
                        {encashPreview.data?.divisorMode || "Policy"})
                      </span>
                    </div>
                    <div>
                      Salary Basis:{" "}
                      <span className="font-semibold">
                        {formatCurrencyDynamic(
                          encashPreview.data?.salaryBasisAmount ?? encashPreview.data?.eligibleSalaryBasis,
                          encashPreview.data?.currency || currencyCode
                        )}
                      </span>
                    </div>
                    <div>
                      Daily Rate:{" "}
                      <span className="font-semibold">
                        {formatCurrencyDynamic(
                          encashPreview.data?.dailyRate ?? encashPreview.data?.unitDailyRate,
                          encashPreview.data?.currency || currencyCode
                        )}
                      </span>
                    </div>
                    <div>
                      Payroll Head:{" "}
                      <span className="font-semibold">
                        {encashPreview.data?.salaryComponent?.name || "Encashment"}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-[11px] flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{encashPreview.error}</span>
                </div>
              )
            ) : null}

            <div className="space-y-1.5">
              <Label className="text-xs">Request Reason *</Label>
              <Textarea
                rows={3}
                placeholder="Provide reason for leave encashment request…"
                value={encashForm.reason}
                onChange={(e) => setEncashForm((p) => ({ ...p, reason: e.target.value }))}
                className="text-xs"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-2">
                <Label className="text-xs cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800">
                  <Paperclip className="w-3.5 h-3.5 text-[#00a76f]" />
                  <span>{isUploadingDoc ? "Uploading…" : "Attach Supporting Doc"}</span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => handleSupportingFileSelect(e.target.files?.[0], "encashment")}
                  />
                </Label>
                {encashForm.attachmentUrl && (
                  <span className="text-[11px] text-emerald-600 font-medium">Attached</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={encashForm.submitAsDraft}
                  onCheckedChange={(v) => setEncashForm((p) => ({ ...p, submitAsDraft: v }))}
                />
                <span className="text-xs text-slate-600 dark:text-slate-300">Save as Draft</span>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEncashModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={
                saveEncashmentMutation.isPending ||
                !encashForm.employeeId ||
                !encashForm.leaveTypeId ||
                !encashForm.reason.trim() ||
                (encashPreview && !encashPreview.valid)
              }
              onClick={() => saveEncashmentMutation.mutate()}
              className="bg-[#00a76f] hover:bg-[#008f5d] text-white"
            >
              {saveEncashmentMutation.isPending
                ? "Submitting…"
                : encashForm.submitAsDraft
                ? "Save Draft"
                : "Submit Encashment Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================
          MODAL 2: CREATE / EDIT COMP-OFF REQUEST
      ======================================================================== */}
      <Dialog open={compOffModalOpen} onOpenChange={setCompOffModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {editingCompOffId ? "Edit Comp-Off Earn Request" : "New Comp-Off Earn Request"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Verifies employee holiday calendar, shift weekly-off schedule, attendance logs, and approved overtime records.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Employee *</Label>
                <Select
                  value={compOffForm.employeeId}
                  onValueChange={(val) => setCompOffForm((p) => ({ ...p, employeeId: val }))}
                  disabled={Boolean(editingCompOffId)}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName} ({emp.employeeCode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Worked Date *</Label>
                <Input
                  type="date"
                  max={todayIso}
                  value={compOffForm.workedOnDate}
                  onChange={(e) => setCompOffForm((p) => ({ ...p, workedOnDate: e.target.value }))}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Work Category *</Label>
                <Select
                  value={compOffForm.workType}
                  onValueChange={(val) => setCompOffForm((p) => ({ ...p, workType: val }))}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WEEKLY_OFF">Weekly Off Work</SelectItem>
                    <SelectItem value="PUBLIC_HOLIDAY">Public Holiday Work</SelectItem>
                    <SelectItem value="OVERTIME">Approved Overtime</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Worked Hours (Optional Override)</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  placeholder="Auto from attendance"
                  value={compOffForm.actualHoursWorked}
                  onChange={(e) =>
                    setCompOffForm((p) => ({ ...p, actualHoursWorked: e.target.value }))
                  }
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Requested Days (Optional)</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="0.5"
                  placeholder="Auto from policy"
                  value={compOffForm.requestedDays}
                  onChange={(e) => setCompOffForm((p) => ({ ...p, requestedDays: e.target.value }))}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Live Comp-Off Verification Preview */}
            {isCompOffPreviewLoading ? (
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-500 animate-pulse">
                Verifying attendance punches, holiday calendar, and overtime approvals…
              </div>
            ) : compOffPreview ? (
              compOffPreview.valid && compOffPreview.data?.eligible !== false ? (
                <div className="p-3.5 rounded-xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 space-y-1.5">
                  <div className="flex items-center justify-between font-semibold text-teal-800 dark:text-teal-300">
                    <span>Verified Eligible Comp-Off Credit</span>
                    <span>
                      {formatLeaveDays(
                        compOffPreview.data?.recommendedDays ??
                          compOffPreview.data?.convertedDays ??
                          compOffPreview.data?.creditedDays ??
                          1
                      )}{" "}
                      day(s)
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-700 dark:text-slate-300">
                    <div>
                      Hours Verified:{" "}
                      <span className="font-semibold">
                        {compOffPreview.data?.verifiedHours ??
                          compOffPreview.data?.actualHoursWorked ??
                          "—"}
                        h
                      </span>
                    </div>
                    <div>
                      Projected Expiry:{" "}
                      <span className="font-semibold">
                        {formatDateDisplay(compOffPreview.data?.projectedExpiresAt)}
                      </span>
                    </div>
                    <div>
                      Leave Type:{" "}
                      <span className="font-semibold">
                        {compOffPreview.data?.leaveType?.name || "Comp-Off"}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-[11px] flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    {compOffPreview.error ||
                      compOffPreview.data?.ineligibilityReason ||
                      "Selected date is not eligible for Comp-Off."}
                  </span>
                </div>
              )
            ) : null}

            <div className="space-y-1.5">
              <Label className="text-xs">Work Justification / Reason *</Label>
              <Textarea
                rows={3}
                placeholder="Describe business deliverable or shift worked on weekly off / holiday / overtime…"
                value={compOffForm.reason}
                onChange={(e) => setCompOffForm((p) => ({ ...p, reason: e.target.value }))}
                className="text-xs"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-2">
                <Label className="text-xs cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800">
                  <Paperclip className="w-3.5 h-3.5 text-[#00a76f]" />
                  <span>{isUploadingDoc ? "Uploading…" : "Attach Proof"}</span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => handleSupportingFileSelect(e.target.files?.[0], "comp-off")}
                  />
                </Label>
                {compOffForm.attachmentUrl && (
                  <span className="text-[11px] text-emerald-600 font-medium">Attached</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={compOffForm.submitAsDraft}
                  onCheckedChange={(v) => setCompOffForm((p) => ({ ...p, submitAsDraft: v }))}
                />
                <span className="text-xs text-slate-600 dark:text-slate-300">Save as Draft</span>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCompOffModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={
                saveCompOffMutation.isPending ||
                !compOffForm.employeeId ||
                !compOffForm.workedOnDate ||
                !compOffForm.reason.trim() ||
                (compOffPreview && (!compOffPreview.valid || compOffPreview.data?.eligible === false))
              }
              onClick={() => saveCompOffMutation.mutate()}
              className="bg-[#00a76f] hover:bg-[#008f5d] text-white"
            >
              {saveCompOffMutation.isPending
                ? "Submitting…"
                : compOffForm.submitAsDraft
                ? "Save Draft"
                : "Submit Comp-Off Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================
          MODAL 3: CONTEXTUAL WORKFLOW ACTION DIALOG
      ======================================================================== */}
      <Dialog
        open={workflowModal.open}
        onOpenChange={(open) => setWorkflowModal((p) => ({ ...p, open }))}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold capitalize">
              {workflowModal.action.replace(/_/g, " ")} —{" "}
              {workflowModal.record?.requestCode || workflowModal.record?.id?.slice(0, 8)}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {workflowModal.record?.employee?.firstName}{" "}
              {workflowModal.record?.employee?.lastName} •{" "}
              {formatLeaveDays(workflowModal.record?.days)} day(s)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs">
            {workflowModal.action === "approve" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Approved Days</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={workflowApprovedDays}
                  onChange={(e) => setWorkflowApprovedDays(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            )}

            {workflowModal.action === "process_payroll" && (
              <>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Target Payroll Month *</Label>
                    <Select value={workflowPayrollMonth} onValueChange={setWorkflowPayrollMonth}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTH_OPTIONS.map((m) => (
                          <SelectItem key={m.value} value={m.value}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Target Payroll Year *</Label>
                    <Select value={workflowPayrollYear} onValueChange={setWorkflowPayrollYear}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {yearOptions.map((y) => (
                          <SelectItem key={y} value={String(y)}>
                            {y}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Link Draft Payroll Run (Optional)</Label>
                  <Select value={workflowPayrollRunId} onValueChange={setWorkflowPayrollRunId}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Queue for Period (Auto-Pickup)</SelectItem>
                      {payrollRuns.map((pr) => (
                        <SelectItem key={pr.id} value={pr.id}>
                          {String(pr.month).padStart(2, "0")}/{pr.year} ({pr.status})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Payroll Earning Component</Label>
                  <Select
                    value={workflowSalaryComponentId}
                    onValueChange={setWorkflowSalaryComponentId}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Policy Default Earning Head</SelectItem>
                      {salaryComponents.map((sc) => (
                        <SelectItem key={sc.id} value={sc.id}>
                          {sc.name} ({sc.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {workflowModal.action === "reconcile_paid" && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Verified Finalized Payroll Run</Label>
                  <Select value={workflowPayrollRunId} onValueChange={setWorkflowPayrollRunId}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Verify via External Voucher Ref</SelectItem>
                      {payrollRuns.map((pr) => (
                        <SelectItem key={pr.id} value={pr.id}>
                          {String(pr.month).padStart(2, "0")}/{pr.year} — {pr.status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Disbursement / Bank / Payslip Reference</Label>
                  <Input
                    placeholder="e.g., PAY-2026-11-UTR88291"
                    value={workflowPayrollRef}
                    onChange={(e) => setWorkflowPayrollRef(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">
                {["reject", "clarify", "mark_failed", "reverse"].includes(workflowModal.action)
                  ? "Mandatory Audit Reason / Note *"
                  : "Comments / Audit Note"}
              </Label>
              <Textarea
                rows={3}
                placeholder="Enter audit note…"
                value={workflowNote}
                onChange={(e) => setWorkflowNote(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setWorkflowModal((p) => ({ ...p, open: false }))}
            >
              Close
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={workflowActionMutation.isPending}
              onClick={() => workflowActionMutation.mutate()}
              className={
                ["reject", "mark_failed", "reverse"].includes(workflowModal.action)
                  ? "bg-rose-600 hover:bg-rose-700 text-white"
                  : "bg-[#00a76f] hover:bg-[#008f5d] text-white"
              }
            >
              {workflowActionMutation.isPending ? "Processing…" : "Confirm Action"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================
          MODAL 4: RICH TRANSACTION & AUDIT TRAIL DETAIL DIALOG
      ======================================================================== */}
      <Dialog
        open={Boolean(detailModalId)}
        onOpenChange={(open) => {
          if (!open) setDetailModalId(null);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <span>
                Transaction Detail — {detailRecord?.requestCode || detailModalId?.slice(0, 8)}
              </span>
              {detailRecord?.status && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadgeClasses(
                    detailRecord.status
                  )}`}
                >
                  {formatStatusLabel(detailRecord.status)}
                </span>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Complete approval history, calculation snapshot, payroll linkage, and immutable leave ledger entries.
            </DialogDescription>
          </DialogHeader>

          {isDetailLoading || !detailRecord ? (
            <div className="py-10 text-center text-xs text-slate-500">
              Loading transaction audit trail…
            </div>
          ) : (
            <div className="space-y-4 text-xs">
              {/* Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-slate-500 block">Employee</span>
                  <span className="font-semibold">
                    {detailRecord.employee?.firstName} {detailRecord.employee?.lastName} (
                    {detailRecord.employee?.employeeCode})
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Module Type</span>
                  <span className="font-semibold">{detailRecord.type}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Leave Type</span>
                  <span className="font-semibold">{detailRecord.leaveType?.name || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Requested / Approved</span>
                  <span className="font-semibold">
                    {formatLeaveDays(detailRecord.days)}d /{" "}
                    {detailRecord.approvedDays !== null && detailRecord.approvedDays !== undefined
                      ? `${formatLeaveDays(detailRecord.approvedDays)}d`
                      : "Pending"}
                  </span>
                </div>
                {detailRecord.type === "ENCASHMENT" ? (
                  <>
                    <div>
                      <span className="text-slate-500 block">Net Payable</span>
                      <span className="font-semibold">
                        {detailRecord.totalAmount !== null && detailRecord.totalAmount !== undefined
                          ? formatCurrencyDynamic(
                              detailRecord.totalAmount,
                              detailRecord.currency || currencyCode
                            )
                          : "Restricted"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Payroll Reference</span>
                      <span className="font-mono font-semibold">
                        {detailRecord.payrollRef ||
                          (detailRecord.payrollMonth && detailRecord.payrollYear
                            ? `${String(detailRecord.payrollMonth).padStart(2, "0")}/${detailRecord.payrollYear}`
                            : "Not Queued")}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <span className="text-slate-500 block">Worked On</span>
                      <span className="font-semibold">
                        {formatDateDisplay(detailRecord.workedOnDate)} (
                        {formatStatusLabel(detailRecord.workType)})
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">FIFO Remaining / Expiry</span>
                      <span className="font-semibold">
                        {formatLeaveDays(detailRecord.remainingDays ?? 0)}d • Exp:{" "}
                        {formatDateDisplay(detailRecord.expiresAt)}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {detailRecord.reason && (
                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase">Reason</span>
                  <p className="mt-1 text-slate-800 dark:text-slate-200">{detailRecord.reason}</p>
                </div>
              )}

              {/* Linked Immutable Leave Ledger Entries */}
              <div className="space-y-1.5">
                <h4 className="font-semibold text-slate-800 dark:text-slate-100">
                  Linked Leave Ledger Entries ({detailRecord.ledgerEntries?.length || 0})
                </h4>
                {Array.isArray(detailRecord.ledgerEntries) && detailRecord.ledgerEntries.length > 0 ? (
                  <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50 dark:bg-slate-800 text-[10px]">
                          <TableHead>Entry Type</TableHead>
                          <TableHead>Days</TableHead>
                          <TableHead>Year</TableHead>
                          <TableHead>Notes</TableHead>
                          <TableHead>Timestamp</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detailRecord.ledgerEntries.map((le: any) => (
                          <TableRow key={le.id} className="text-[11px]">
                            <TableCell className="font-mono font-semibold">{le.entryType}</TableCell>
                            <TableCell className="font-semibold">{formatLeaveDays(le.days)}d</TableCell>
                            <TableCell>{le.year}</TableCell>
                            <TableCell className="max-w-xs truncate">{le.notes || "—"}</TableCell>
                            <TableCell>{formatDateDisplay(le.createdAt)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500">
                    No ledger entries posted yet (entries are created atomically upon final approval).
                  </p>
                )}
              </div>

              {/* Comp-Off FIFO Leave Allocations */}
              {detailRecord.type === "COMP_OFF" &&
                Array.isArray(detailRecord.compOffAllocations) &&
                detailRecord.compOffAllocations.length > 0 && (
                  <div className="space-y-1.5">
                    <h4 className="font-semibold text-slate-800 dark:text-slate-100">
                      FIFO Leave Utilization Allocations
                    </h4>
                    <div className="space-y-1.5">
                      {detailRecord.compOffAllocations.map((al: any) => (
                        <div
                          key={al.id}
                          className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between text-[11px]"
                        >
                          <span>
                            Leave Request{" "}
                            <span className="font-mono">{al.leaveRequestId?.slice(0, 8)}</span>{" "}
                            {al.leaveRequest
                              ? `(${formatDateDisplay(al.leaveRequest.startDate)} – ${formatDateDisplay(
                                  al.leaveRequest.endDate
                                )})`
                              : ""}
                          </span>
                          <span className="font-semibold">
                            {formatLeaveDays(al.daysAllocated ?? al.allocatedDays)}d • {al.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Event Timeline */}
              <div className="space-y-1.5">
                <h4 className="font-semibold text-slate-800 dark:text-slate-100">
                  Approval &amp; Workflow Audit Timeline
                </h4>
                {Array.isArray(detailRecord.events) && detailRecord.events.length > 0 ? (
                  <div className="space-y-2 border-l-2 border-[#00a76f]/40 pl-3 ml-1">
                    {detailRecord.events.map((ev: any) => (
                      <div key={ev.id} className="text-[11px]">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-900 dark:text-slate-100">
                            {formatStatusLabel(ev.action)}
                          </span>
                          <span className="text-slate-500">{formatDateDisplay(ev.createdAt)}</span>
                        </div>
                        <div className="text-slate-500">
                          Actor: {ev.actorName || "System"} ({ev.actorRole || "system"})
                        </div>
                        {ev.notes && (
                          <div className="text-slate-700 dark:text-slate-300 mt-0.5">{ev.notes}</div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500">No timeline events recorded.</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================
          MODAL 5: ENCASHMENT POLICY CONFIGURATION CRUD MODAL
      ======================================================================== */}
      <Dialog open={encashConfigModalOpen} onOpenChange={setEncashConfigModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {editingEncashConfigId
                ? "Edit Leave Encashment Configuration"
                : "Create Leave Encashment Configuration"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Tenant-scoped versioned policy controlling encashment eligibility, balance retention, and daily-rate calculation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Policy Name *</Label>
                <Input
                  placeholder="e.g., Annual Earned Leave Encashment Policy"
                  value={encashCfgForm.name}
                  onChange={(e) => setEncashCfgForm((p) => ({ ...p, name: e.target.value }))}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Policy Code</Label>
                <Input
                  placeholder="e.g., ENC-STD-2026"
                  value={encashCfgForm.code}
                  onChange={(e) => setEncashCfgForm((p) => ({ ...p, code: e.target.value }))}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Eligible Leave Types *</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 max-h-36 overflow-y-auto">
                {leaveTypes.map((lt) => {
                  const checked = encashCfgForm.eligibleLeaveTypeIds.includes(lt.id);
                  return (
                    <label
                      key={lt.id}
                      className="flex items-center gap-2 cursor-pointer text-xs select-none"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleLeaveTypeInEncashConfig(lt.id)}
                        className="rounded border-slate-300"
                      />
                      <span className="truncate">
                        {lt.name} ({lt.code})
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Min Service (Mo)</Label>
                <Input
                  type="number"
                  min="0"
                  value={encashCfgForm.minServiceMonths}
                  onChange={(e) =>
                    setEncashCfgForm((p) => ({ ...p, minServiceMonths: e.target.value }))
                  }
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Min Balance Req</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  value={encashCfgForm.minRemainingBalance}
                  onChange={(e) =>
                    setEncashCfgForm((p) => ({ ...p, minRemainingBalance: e.target.value }))
                  }
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Min Retained Bal</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  value={encashCfgForm.minRetainedBalance}
                  onChange={(e) =>
                    setEncashCfgForm((p) => ({ ...p, minRetainedBalance: e.target.value }))
                  }
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Max Days / Req</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={encashCfgForm.maxEncashableDaysPerRequest}
                  onChange={(e) =>
                    setEncashCfgForm((p) => ({
                      ...p,
                      maxEncashableDaysPerRequest: e.target.value,
                    }))
                  }
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Annual Max Days</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={encashCfgForm.maxEncashableDaysPerYear}
                  onChange={(e) =>
                    setEncashCfgForm((p) => ({ ...p, maxEncashableDaysPerYear: e.target.value }))
                  }
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Encashment Frequency</Label>
                <Select
                  value={encashCfgForm.encashmentFrequency}
                  onValueChange={(v) => setEncashCfgForm((p) => ({ ...p, encashmentFrequency: v }))}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ANYTIME">Anytime</SelectItem>
                    <SelectItem value="YEARLY">Once Per Year</SelectItem>
                    <SelectItem value="HALF_YEARLY">Half-Yearly</SelectItem>
                    <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                    <SelectItem value="EXIT_ONLY">Exit / FnF Settlement Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Approval Workflow</Label>
                <Select
                  value={encashCfgForm.approvalMode}
                  onValueChange={(v) => setEncashCfgForm((p) => ({ ...p, approvalMode: v }))}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MANAGER_THEN_HR">Manager then HR</SelectItem>
                    <SelectItem value="HR_ONLY">HR Approval Only</SelectItem>
                    <SelectItem value="MANAGER_ONLY">Manager Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Salary Calculation Basis</Label>
                <Select
                  value={encashCfgForm.salaryBasisType}
                  onValueChange={(v) => setEncashCfgForm((p) => ({ ...p, salaryBasisType: v }))}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BASIC">Basic Salary</SelectItem>
                    <SelectItem value="GROSS">Gross Monthly Salary</SelectItem>
                    <SelectItem value="CUSTOM_COMPONENTS">Custom Salary Components</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Daily-Rate Divisor Mode</Label>
                <Select
                  value={encashCfgForm.dailyRateDivisorMode}
                  onValueChange={(v) =>
                    setEncashCfgForm((p) => ({ ...p, dailyRateDivisorMode: v }))
                  }
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CUSTOM">Configured Fixed Divisor</SelectItem>
                    <SelectItem value="CALENDAR_DAYS">Actual Calendar Days in Month</SelectItem>
                    <SelectItem value="WORKING_DAYS">Working Days in Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {encashCfgForm.dailyRateDivisorMode === "CUSTOM" && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Configured Divisor *</Label>
                  <Input
                    type="number"
                    min="1"
                    max="366"
                    value={encashCfgForm.dailyRateDivisor}
                    onChange={(e) =>
                      setEncashCfgForm((p) => ({ ...p, dailyRateDivisor: e.target.value }))
                    }
                    className="h-9 text-xs"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Payroll Earning Component</Label>
                <Select
                  value={encashCfgForm.payrollComponentId}
                  onValueChange={(v) => setEncashCfgForm((p) => ({ ...p, payrollComponentId: v }))}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unmapped / General Earning</SelectItem>
                    {salaryComponents.map((sc) => (
                      <SelectItem key={sc.id} value={sc.id}>
                        {sc.name} ({sc.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Branch Scope</Label>
                <Select
                  value={encashCfgForm.branchId}
                  onValueChange={(v) => setEncashCfgForm((p) => ({ ...p, branchId: v }))}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Branches</SelectItem>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Department Scope</Label>
                <Select
                  value={encashCfgForm.departmentId}
                  onValueChange={(v) => setEncashCfgForm((p) => ({ ...p, departmentId: v }))}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Effective From *</Label>
                <Input
                  type="date"
                  value={encashCfgForm.effectiveFrom}
                  onChange={(e) =>
                    setEncashCfgForm((p) => ({ ...p, effectiveFrom: e.target.value }))
                  }
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Effective To (Optional)</Label>
                <Input
                  type="date"
                  value={encashCfgForm.effectiveTo}
                  onChange={(e) =>
                    setEncashCfgForm((p) => ({ ...p, effectiveTo: e.target.value }))
                  }
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <Switch
                  checked={encashCfgForm.enabled}
                  onCheckedChange={(v) => setEncashCfgForm((p) => ({ ...p, enabled: v }))}
                />
                <span>Policy Enabled</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Switch
                  checked={encashCfgForm.allowEssSubmission}
                  onCheckedChange={(v) =>
                    setEncashCfgForm((p) => ({ ...p, allowEssSubmission: v }))
                  }
                />
                <span>Allow Employee Self-Service</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Switch
                  checked={encashCfgForm.requireSupportingDoc}
                  onCheckedChange={(v) =>
                    setEncashCfgForm((p) => ({ ...p, requireSupportingDoc: v }))
                  }
                />
                <span>Require Supporting Document</span>
              </label>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEncashConfigModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={
                saveEncashConfigMutation.isPending ||
                !encashCfgForm.name.trim() ||
                encashCfgForm.eligibleLeaveTypeIds.length === 0
              }
              onClick={() => saveEncashConfigMutation.mutate()}
              className="bg-[#00a76f] hover:bg-[#008f5d] text-white"
            >
              {saveEncashConfigMutation.isPending ? "Saving…" : "Save Encashment Policy"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================
          MODAL 6: COMP-OFF POLICY CONFIGURATION CRUD MODAL
      ======================================================================== */}
      <Dialog open={compOffConfigModalOpen} onOpenChange={setCompOffConfigModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {editingCompOffConfigId
                ? "Edit Comp-Off Policy Configuration"
                : "Create Comp-Off Policy Configuration"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure eligible holiday/weekly-off/overtime work categories, hour-to-day thresholds, and FIFO expiry horizon.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Policy Name *</Label>
                <Input
                  placeholder="e.g., Standard Holiday & Overtime Comp-Off Policy"
                  value={compOffCfgForm.name}
                  onChange={(e) => setCompOffCfgForm((p) => ({ ...p, name: e.target.value }))}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Comp-Off Leave Type *</Label>
                <Select
                  value={compOffCfgForm.leaveTypeId}
                  onValueChange={(v) => setCompOffCfgForm((p) => ({ ...p, leaveTypeId: v }))}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select Comp-Off leave type" />
                  </SelectTrigger>
                  <SelectContent>
                    {leaveTypes.map((lt) => (
                      <SelectItem key={lt.id} value={lt.id}>
                        {lt.name} ({lt.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Min Worked Hrs</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="1"
                  value={compOffCfgForm.minWorkedHours}
                  onChange={(e) =>
                    setCompOffCfgForm((p) => ({ ...p, minWorkedHours: e.target.value }))
                  }
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Half-Day Hrs (0.5d)</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="1"
                  value={compOffCfgForm.halfDayHours}
                  onChange={(e) =>
                    setCompOffCfgForm((p) => ({ ...p, halfDayHours: e.target.value }))
                  }
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Full-Day Hrs (1.0d)</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="1"
                  value={compOffCfgForm.fullDayHours}
                  onChange={(e) =>
                    setCompOffCfgForm((p) => ({ ...p, fullDayHours: e.target.value }))
                  }
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Expiry Horizon (Days)</Label>
                <Input
                  type="number"
                  min="1"
                  value={compOffCfgForm.expiryDays}
                  onChange={(e) =>
                    setCompOffCfgForm((p) => ({ ...p, expiryDays: e.target.value }))
                  }
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Max Accrual Cap (Days)</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={compOffCfgForm.maxAccrualBalance}
                  onChange={(e) =>
                    setCompOffCfgForm((p) => ({ ...p, maxAccrualBalance: e.target.value }))
                  }
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Max Backdate Days</Label>
                <Input
                  type="number"
                  min="1"
                  value={compOffCfgForm.maxBackdateDays}
                  onChange={(e) =>
                    setCompOffCfgForm((p) => ({ ...p, maxBackdateDays: e.target.value }))
                  }
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Approval Mode</Label>
                <Select
                  value={compOffCfgForm.approvalMode}
                  onValueChange={(v) => setCompOffCfgForm((p) => ({ ...p, approvalMode: v }))}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MANAGER_THEN_HR">Manager then HR</SelectItem>
                    <SelectItem value="HR_ONLY">HR Approval Only</SelectItem>
                    <SelectItem value="MANAGER_ONLY">Manager Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Effective From *</Label>
                <Input
                  type="date"
                  value={compOffCfgForm.effectiveFrom}
                  onChange={(e) =>
                    setCompOffCfgForm((p) => ({ ...p, effectiveFrom: e.target.value }))
                  }
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Effective To (Optional)</Label>
                <Input
                  type="date"
                  value={compOffCfgForm.effectiveTo}
                  onChange={(e) =>
                    setCompOffCfgForm((p) => ({ ...p, effectiveTo: e.target.value }))
                  }
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <Switch
                  checked={compOffCfgForm.allowWeeklyOffWork}
                  onCheckedChange={(v) =>
                    setCompOffCfgForm((p) => ({ ...p, allowWeeklyOffWork: v }))
                  }
                />
                <span>Weekly-Off Work</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Switch
                  checked={compOffCfgForm.allowHolidayWork}
                  onCheckedChange={(v) =>
                    setCompOffCfgForm((p) => ({ ...p, allowHolidayWork: v }))
                  }
                />
                <span>Public Holiday Work</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Switch
                  checked={compOffCfgForm.allowApprovedOvertime}
                  onCheckedChange={(v) =>
                    setCompOffCfgForm((p) => ({ ...p, allowApprovedOvertime: v }))
                  }
                />
                <span>Approved Overtime</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Switch
                  checked={compOffCfgForm.allowEssSubmission}
                  onCheckedChange={(v) =>
                    setCompOffCfgForm((p) => ({ ...p, allowEssSubmission: v }))
                  }
                />
                <span>Allow ESS Submission</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Switch
                  checked={compOffCfgForm.requireAttendanceProof}
                  onCheckedChange={(v) =>
                    setCompOffCfgForm((p) => ({ ...p, requireAttendanceProof: v }))
                  }
                />
                <span>Require Attendance Punch</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Switch
                  checked={compOffCfgForm.enabled}
                  onCheckedChange={(v) => setCompOffCfgForm((p) => ({ ...p, enabled: v }))}
                />
                <span>Policy Enabled</span>
              </label>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCompOffConfigModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={
                saveCompOffConfigMutation.isPending ||
                !compOffCfgForm.name.trim() ||
                !compOffCfgForm.leaveTypeId
              }
              onClick={() => saveCompOffConfigMutation.mutate()}
              className="bg-[#00a76f] hover:bg-[#008f5d] text-white"
            >
              {saveCompOffConfigMutation.isPending ? "Saving…" : "Save Comp-Off Policy"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
