'use client';

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, unwrapArray, unwrapData } from "@/lib/api";
import {
  useDebouncedValue,
  formatLeaveDays,
  extractLeaveErrorMessage,
  uploadLeaveSupportingDocument,
  invalidateLeaveApplications,
} from "@/lib/leave-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Sparkles,
  Eye,
  Paperclip,
  X,
  Calendar,
  ListFilter,
  SquarePen,
  RotateCcw,
  Ban,
} from "lucide-react";

interface MatrixDay {
  dayNumber: number;
  date: string;
  dayName: string;
  isWeekend: boolean;
  isHoliday: boolean;
  holidayName: string | null;
}

interface MatrixLeave {
  id: string;
  leaveTypeId: string;
  leaveTypeName: string;
  color: string;
  isPaid: boolean;
  startDate: string;
  endDate: string;
  days: number;
  halfDay?: boolean;
  halfDaySession?: string | null;
  status: string;
  reason?: string;
  attachmentUrl?: string | null;
}

interface MatrixEmployee {
  id: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
  position?: string | null;
  department?: { name: string } | null;
  branch?: { name: string } | null;
  user?: { profile?: { avatarUrl?: string | null } } | null;
  leaves: MatrixLeave[];
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function HrLeaveApplicationsPage() {
  const queryClient = useQueryClient();
  const now = new Date();

  const [viewMode, setViewMode] = useState<"matrix" | "list">("matrix");
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [weekOffset, setWeekOffset] = useState<number>(0);

  // Filters
  const [employeeFilter, setEmployeeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [leaveTypeFilter, setLeaveTypeFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const debouncedSearch = useDebouncedValue(searchTerm, 300);
  const [listPage, setListPage] = useState<number>(1);
  const [listLimit] = useState<number>(15);

  // Modals
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingApplicationId, setEditingApplicationId] = useState<string | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedLeaveId, setSelectedLeaveId] = useState<string | null>(null);
  const [selectedLeavePreview, setSelectedLeavePreview] = useState<any | null>(null);

  // Form State
  const todayIso = new Date().toISOString().slice(0, 10);
  const [formEmployeeId, setFormEmployeeId] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [formLeaveTypeId, setFormLeaveTypeId] = useState("");
  const [formStartDate, setFormStartDate] = useState(todayIso);
  const [formEndDate, setFormEndDate] = useState(todayIso);
  const [formHalfDay, setFormHalfDay] = useState(false);
  const [formHalfDaySession, setFormHalfDaySession] = useState<"first_half" | "second_half">("first_half");
  const [formDurationMode, setFormDurationMode] = useState<"full_day" | "half_day" | "permission">("full_day");
  const [formPermissionFrom, setFormPermissionFrom] = useState("10:00");
  const [formPermissionTo, setFormPermissionTo] = useState("12:00");
  const [formUnpaidLeave, setFormUnpaidLeave] = useState(false);
  const [formReason, setFormReason] = useState("");
  const [formAttachmentUrl, setFormAttachmentUrl] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [attachedFileName, setAttachedFileName] = useState<string | null>(null);

  // Decision / Cancellation / Reversal Note
  const [decisionNote, setDecisionNote] = useState("");

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((prev) => prev - 1);
    } else {
      setSelectedMonth((prev) => prev - 1);
    }
    setWeekOffset(0);
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((prev) => prev + 1);
    } else {
      setSelectedMonth((prev) => prev + 1);
    }
    setWeekOffset(0);
  };

  // 1. Fetch Calendar Matrix Data (includes days, employees, leaveTypes, and allEmployees in 1 call)
  const { data: matrixData, isLoading: isMatrixLoading } = useQuery({
    queryKey: ["hr-leave-matrix", selectedYear, selectedMonth, employeeFilter, debouncedSearch],
    queryFn: async () => {
      return await api.get("/api/v1/hr/leave/applications/matrix", {
        params: {
          year: selectedYear,
          month: selectedMonth,
          employeeId: employeeFilter,
          search: debouncedSearch,
        },
      });
    },
    staleTime: 20_000,
  });

  const matrixDays: MatrixDay[] = matrixData?.days || [];
  const matrixEmployees: MatrixEmployee[] = matrixData?.employees || [];
  const matrixLeaveTypes: any[] = matrixData?.leaveTypes || [];
  const allEmployees: any[] = matrixData?.allEmployees || [];

  // 2. Fetch Paginated Applications List (when List View is active or for full status filtering)
  const { data: listPayload, isLoading: isListLoading } = useQuery({
    queryKey: [
      "hr-leave-applications",
      statusFilter,
      employeeFilter,
      leaveTypeFilter,
      debouncedSearch,
      listPage,
      listLimit,
    ],
    queryFn: async () => {
      return await api.get("/api/v1/hr/leave/applications", {
        params: {
          status: statusFilter,
          employeeId: employeeFilter,
          leaveTypeId: leaveTypeFilter,
          search: debouncedSearch,
          page: listPage,
          limit: listLimit,
        },
      });
    },
    enabled: viewMode === "list",
    staleTime: 15_000,
  });

  const listApplications: any[] = Array.isArray(listPayload?.data)
    ? listPayload.data
    : unwrapArray(listPayload);
  const listTotal = Number(listPayload?.meta?.total ?? listApplications.length);

  // 3. Authoritative Application Detail Query when modal is open
  const { data: detailData, isLoading: isDetailLoading } = useQuery({
    queryKey: ["hr-leave-application-detail", selectedLeaveId],
    queryFn: async () => {
      if (!selectedLeaveId) return null;
      const res = await api.get(`/api/v1/hr/leave/applications/${selectedLeaveId}`);
      return unwrapData(res);
    },
    enabled: Boolean(detailsModalOpen && selectedLeaveId),
  });

  const activeDetail = detailData || selectedLeavePreview;

  // 7-Day Window for Desktop Calendar Matrix
  const windowDays = useMemo(() => {
    if (!matrixDays || matrixDays.length === 0) return [];
    const maxStart = Math.max(0, matrixDays.length - 7);
    const startIdx = Math.min(Math.max(0, weekOffset * 7), maxStart);
    return matrixDays.slice(startIdx, startIdx + 7);
  }, [matrixDays, weekOffset]);

  const canPrevWeek = weekOffset > 0;
  const canNextWeek = matrixDays.length > (weekOffset + 1) * 7;

  const filteredModalEmployees = useMemo(() => {
    if (!employeeSearch.trim()) return allEmployees;
    const q = employeeSearch.toLowerCase();
    return allEmployees.filter((e: any) =>
      `${e.firstName} ${e.lastName} ${e.employeeCode}`.toLowerCase().includes(q)
    );
  }, [allEmployees, employeeSearch]);

  // 4. Live Server Dry-Run Calculation & Policy Validation
  const effectiveEndDate = formHalfDay ? formStartDate : formEndDate;
  const { data: dryRunData, isFetching: isCalculatingDryRun } = useQuery({
    queryKey: [
      "hr-leave-dry-run",
      formEmployeeId,
      formLeaveTypeId,
      formStartDate,
      effectiveEndDate,
      formHalfDay,
      formHalfDaySession,
      editingApplicationId,
    ],
    queryFn: async () => {
      if (!formEmployeeId || !formLeaveTypeId || !formStartDate || !effectiveEndDate) return null;
      const res = await api.post("/api/v1/hr/leave/applications/dry-run", {
        employeeId: formEmployeeId,
        leaveTypeId: formLeaveTypeId,
        startDate: formStartDate,
        endDate: effectiveEndDate,
        halfDay: formHalfDay,
        halfDaySession: formHalfDay ? formHalfDaySession : undefined,
        excludeRequestId: editingApplicationId || undefined,
      });
      return unwrapData(res);
    },
    enabled: Boolean(
      formModalOpen && formEmployeeId && formLeaveTypeId && formStartDate && effectiveEndDate
    ),
  });

  // 5. Create / Update Pending Application Mutation
  const saveApplicationMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editingApplicationId) {
        return await api.put(`/api/v1/hr/leave/applications/${editingApplicationId}`, payload);
      }
      return await api.post("/api/v1/hr/leave/applications", payload);
    },
    onSuccess: async () => {
      toast.success(
        editingApplicationId
          ? "Pending leave application updated successfully"
          : "Leave application submitted successfully"
      );
      await invalidateLeaveApplications(queryClient);
      setFormModalOpen(false);
      resetForm();
    },
    onError: (err: unknown) => {
      toast.error(extractLeaveErrorMessage(err, "Failed to save leave application"));
    },
  });

  // 6. Approve / Reject Decision Mutation
  const decisionMutation = useMutation({
    mutationFn: async ({ id, action, comments }: { id: string; action: "approve" | "reject"; comments?: string }) => {
      return await api.post(`/api/v1/hr/leave/applications/${id}/action`, {
        action,
        comments,
      });
    },
    onSuccess: async (_, vars) => {
      toast.success(
        vars.action === "approve"
          ? "Leave application approved and balance ledger updated"
          : "Leave application rejected"
      );
      await invalidateLeaveApplications(queryClient);
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      queryClient.invalidateQueries({ queryKey: ["hr-calendar-composite-events"] });
      setDetailsModalOpen(false);
      setSelectedLeaveId(null);
      setDecisionNote("");
    },
    onError: (err: unknown) => {
      toast.error(extractLeaveErrorMessage(err, "Failed to process leave decision"));
    },
  });

  // 7. Cancel Mutation
  const cancelMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      return await api.post(`/api/v1/hr/leave/applications/${id}/cancel`, { reason });
    },
    onSuccess: async () => {
      toast.success("Leave application cancelled and ledger balance reconciled");
      await invalidateLeaveApplications(queryClient);
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      queryClient.invalidateQueries({ queryKey: ["hr-calendar-composite-events"] });
      setDetailsModalOpen(false);
      setSelectedLeaveId(null);
      setDecisionNote("");
    },
    onError: (err: unknown) => {
      toast.error(extractLeaveErrorMessage(err, "Failed to cancel leave application"));
    },
  });

  // 8. Reverse Approved / Rejected Decision Mutation
  const reverseMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      return await api.post(`/api/v1/hr/leave/applications/${id}/reverse`, { reason });
    },
    onSuccess: async () => {
      toast.success("Leave decision reversed and audit/ledger state updated");
      await invalidateLeaveApplications(queryClient);
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      queryClient.invalidateQueries({ queryKey: ["hr-calendar-composite-events"] });
      setDetailsModalOpen(false);
      setSelectedLeaveId(null);
      setDecisionNote("");
    },
    onError: (err: unknown) => {
      toast.error(extractLeaveErrorMessage(err, "Failed to reverse leave decision"));
    },
  });

  const resetForm = () => {
    setEditingApplicationId(null);
    setFormEmployeeId("");
    setEmployeeSearch("");
    setFormLeaveTypeId("");
    setFormStartDate(todayIso);
    setFormEndDate(todayIso);
    setFormHalfDay(false);
    setFormHalfDaySession("first_half");
    setFormReason("");
    setFormAttachmentUrl("");
    setAttachedFileName(null);
  };

  const handleOpenAdd = (preselectedEmpId?: string) => {
    resetForm();
    setFormEmployeeId(preselectedEmpId || allEmployees[0]?.id || "");
    setFormLeaveTypeId(matrixLeaveTypes[0]?.id || "");
    setFormModalOpen(true);
  };

  const handleOpenEdit = (leave: any) => {
    setDetailsModalOpen(false);
    setEditingApplicationId(leave.id);
    setFormEmployeeId(leave.employeeId || leave.employee?.id || "");
    setFormLeaveTypeId(leave.leaveTypeId || leave.leaveType?.id || "");
    const startStr = String(leave.startDate || todayIso).slice(0, 10);
    const endStr = String(leave.endDate || startStr).slice(0, 10);
    setFormStartDate(startStr);
    setFormEndDate(endStr);
    setFormHalfDay(Boolean(leave.halfDay));
    setFormHalfDaySession(leave.halfDaySession === "second_half" ? "second_half" : "first_half");
    setFormReason(leave.reason || "");
    setFormAttachmentUrl(leave.attachmentUrl || "");
    setAttachedFileName(leave.attachmentUrl ? "Existing Attachment" : null);
    setFormModalOpen(true);
  };

  const openLeaveDetails = (leave: any, employee?: any) => {
    setSelectedLeaveId(leave.id);
    setSelectedLeavePreview({
      ...leave,
      employee: employee || leave.employee,
      leaveTypeName: leave.leaveTypeName || leave.leaveType?.name || "Leave",
      color: leave.color || leave.leaveType?.color || "#00a76f",
      isPaid: leave.isPaid ?? leave.leaveType?.isPaid ?? true,
    });
    setDecisionNote("");
    setDetailsModalOpen(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please upload a PDF, PNG, JPG, or WebP document");
      e.target.value = "";
      return;
    }

    try {
      setUploadingFile(true);
      const url = await uploadLeaveSupportingDocument(file);
      setFormAttachmentUrl(url);
      setAttachedFileName(`${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
      toast.success("Supporting document uploaded");
    } catch (err: unknown) {
      toast.error(extractLeaveErrorMessage(err, "Failed to upload supporting document"));
      e.target.value = "";
    } finally {
      setUploadingFile(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEmployeeId || !formLeaveTypeId) {
      toast.error("Please select both an employee and a leave type");
      return;
    }
    if (!formReason.trim()) {
      toast.error("Leave reason is required");
      return;
    }
    if (dryRunData && dryRunData.isValid === false) {
      toast.error(dryRunData.warnings?.[0] || "Selected leave dates violate policy rules");
      return;
    }

    const reasonPrefixes: string[] = [];
    if (formDurationMode === "permission") {
      reasonPrefixes.push(`[Permission: ${formPermissionFrom} - ${formPermissionTo}]`);
    }
    if (formUnpaidLeave) {
      reasonPrefixes.push("[Unpaid Leave]");
    }
    const finalReason =
      reasonPrefixes.length > 0
        ? `${reasonPrefixes.join(" ")} ${formReason.trim()}`
        : formReason.trim();

    saveApplicationMutation.mutate({
      employeeId: formEmployeeId,
      leaveTypeId: formLeaveTypeId,
      startDate: formStartDate,
      endDate: formDurationMode === "full_day" ? effectiveEndDate : formStartDate,
      halfDay: formDurationMode === "half_day" || formDurationMode === "permission",
      halfDaySession: formDurationMode === "half_day" ? formHalfDaySession : null,
      isUnpaid: formUnpaidLeave,
      reason: finalReason,
      attachmentUrl: formAttachmentUrl || null,
    });
  };

  const getEmployeeLeaveOnDate = (emp: MatrixEmployee, dateStr: string) => {
    return emp.leaves.find((l) => {
      const start = l.startDate.slice(0, 10);
      const end = l.endDate.slice(0, 10);
      return dateStr >= start && dateStr <= end;
    });
  };

  const renderStatusBadge = (status: string) => {
    const s = String(status || "pending").toLowerCase();
    if (s === "approved") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#e8f7f0] border border-[#a3e3c4] text-[#00a76f]">
          <CheckCircle2 className="w-3 h-3" /> Approved
        </span>
      );
    }
    if (s === "rejected") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 border border-rose-200 text-rose-700">
          <XCircle className="w-3 h-3" /> Rejected
        </span>
      );
    }
    if (s === "cancelled") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
          <Ban className="w-3 h-3" /> Cancelled
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 border border-amber-200 text-amber-700">
        <Clock className="w-3 h-3" /> Pending
      </span>
    );
  };

  return (
    <div className="space-y-4 pb-12 max-w-full overflow-x-hidden">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Leave Applications</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            View and manage leave applications.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={() => handleOpenAdd()}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg px-4 h-9 text-xs shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Leave Application
          </Button>
        </div>
      </div>

      {/* 2. Controls & Filters Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3.5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
              title="Previous Month"
              aria-label="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 min-w-[130px] text-center">
              {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
              title="Next Month"
              aria-label="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Employee</span>
            <Select
              value={employeeFilter}
              onValueChange={(val) => {
                setEmployeeFilter(val);
                setListPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-56 h-9 rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-300 font-medium">
                <SelectValue placeholder="All Employees" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value="all">All Employees</SelectItem>
                {allEmployees.map((emp: any) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* 3. Dynamic DB Legend Bar (No hardcoded mock leave types) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 shadow-xs flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-slate-500 mr-1">Legend:</span>

        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium bg-[#e8f7f0] border-[#a3e3c4] text-[#00a76f]">
          <span className="w-2 h-2 rounded-full border-2 border-[#00a76f] bg-white dark:bg-slate-900 shrink-0" />
          <span>Today</span>
        </div>

        {matrixLeaveTypes.map((lt: any) => (
          <div
            key={lt.id}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium"
            style={{
              backgroundColor: `${lt.color || "#3b82f6"}15`,
              borderColor: `${lt.color || "#3b82f6"}55`,
              color: lt.color || "#3b82f6",
            }}
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: lt.color || "#3b82f6" }}
            />
            <span>{lt.name}</span>
          </div>
        ))}
      </div>

      {/* 4A. CALENDAR MATRIX VIEW */}
      {viewMode === "matrix" ? (
        <>
          {/* Desktop 7-Day Matrix Table (>= md) */}
          <div className="hidden md:block bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
            {isMatrixLoading ? (
              <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-[#00a76f]" />
                <span className="text-xs font-medium">Loading calendar matrix...</span>
              </div>
            ) : matrixEmployees.length === 0 ? (
              <div className="text-center py-20 text-slate-400">
                <p className="font-semibold text-sm text-slate-700 dark:text-slate-300">No employees match your filter</p>
                <p className="text-xs text-slate-400 mt-1">Try resetting the employee search or filter.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs select-none">
                  <thead>
                    <tr className="border-b border-slate-200/80 dark:border-slate-800">
                      <th className="sticky left-0 z-20 bg-white dark:bg-slate-900 py-3 px-4 text-left font-semibold text-xs text-slate-700 dark:text-slate-300 border-r border-slate-200/80 dark:border-slate-800 w-[240px] min-w-[240px]">
                        Employee ({matrixEmployees.length})
                      </th>

                      {windowDays.map((day, idx) => {
                        const isToday = day.date === todayIso;
                        return (
                          <th
                            key={day.date}
                            className={`py-2 px-3 text-center border-r border-slate-200/60 min-w-[118px] relative ${
                              isToday
                                ? "bg-[#e8f7f0] text-[#00a76f]"
                                : day.isHoliday
                                ? "bg-amber-50/60 text-amber-900"
                                : day.isWeekend
                                ? "bg-slate-50 dark:bg-slate-800/60 text-slate-500"
                                : "text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900"
                            }`}
                          >
                            {idx === 0 && (
                              <button
                                type="button"
                                onClick={() => setWeekOffset((prev) => Math.max(0, prev - 1))}
                                disabled={!canPrevWeek}
                                className={`absolute left-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-slate-700 dark:text-slate-300 ${
                                  !canPrevWeek ? "opacity-30 cursor-not-allowed" : "cursor-pointer"
                                }`}
                                title="Previous 7 Days"
                              >
                                <ChevronLeft className="w-4 h-4" />
                              </button>
                            )}

                            <div className="flex flex-col items-center justify-center">
                              <span className={`text-sm font-bold ${isToday ? "text-[#00a76f]" : ""}`}>
                                {String(day.dayNumber).padStart(2, "0")}
                              </span>
                              <span className="text-[11px] font-medium opacity-80">{day.dayName}</span>
                              {day.isHoliday && (
                                <span className="text-[9px] font-semibold text-amber-700 truncate max-w-[95px]">
                                  {day.holidayName}
                                </span>
                              )}
                            </div>

                            {idx === windowDays.length - 1 && (
                              <button
                                type="button"
                                onClick={() => setWeekOffset((prev) => prev + 1)}
                                disabled={!canNextWeek}
                                className={`absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-slate-700 dark:text-slate-300 ${
                                  !canNextWeek ? "opacity-30 cursor-not-allowed" : "cursor-pointer"
                                }`}
                                title="Next 7 Days"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            )}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>

                  <tbody>
                    {matrixEmployees.map((emp) => (
                      <tr
                        key={emp.id}
                        className="border-b border-slate-200/70 hover:bg-slate-50/40 transition-colors"
                      >
                        <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 py-3 px-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-9 h-9 rounded-full shrink-0 border border-slate-200 dark:border-slate-700">
                              <AvatarImage src={emp.user?.profile?.avatarUrl || ""} alt={emp.firstName} />
                              <AvatarFallback className="bg-emerald-50 text-emerald-700 font-semibold text-xs">
                                {emp.firstName?.[0] || "E"}
                                {emp.lastName?.[0] || ""}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <h4 className="font-semibold text-xs text-slate-900 dark:text-slate-100 leading-tight truncate">
                                {emp.firstName} {emp.lastName}
                              </h4>
                              <p className="text-[11px] text-slate-500 leading-tight mt-0.5 truncate">
                                {emp.position || emp.department?.name || emp.employeeCode}
                              </p>
                            </div>
                          </div>
                        </td>

                        {windowDays.map((day) => {
                          const isToday = day.date === todayIso;
                          const leave = getEmployeeLeaveOnDate(emp, day.date);
                          const isPending = leave?.status === "pending";

                          return (
                            <td
                              key={day.date}
                              className={`p-1.5 border-r border-slate-200/60 h-20 align-middle text-center relative ${
                                isToday
                                  ? "bg-[#f4fbf7]"
                                  : day.isHoliday
                                  ? "bg-amber-50/30"
                                  : day.isWeekend
                                  ? "bg-slate-50/50 dark:bg-slate-800/40"
                                  : "bg-white dark:bg-slate-900"
                              }`}
                            >
                              {leave && (
                                <button
                                  type="button"
                                  onClick={() => openLeaveDetails(leave, emp)}
                                  className={`w-full h-full rounded-lg p-2 flex flex-col justify-center text-left cursor-pointer transition-transform hover:scale-[1.02] shadow-xs ${
                                    isPending ? "border-dashed" : "border-solid"
                                  }`}
                                  style={{
                                    backgroundColor: `${leave.color || "#10b981"}18`,
                                    borderColor: isPending ? "#f59e0b" : `${leave.color || "#10b981"}70`,
                                    borderWidth: isPending ? "1.5px" : "1px",
                                  }}
                                >
                                  <span
                                    className="font-bold text-[11px] leading-tight truncate w-full"
                                    style={{ color: leave.color || "#00a76f" }}
                                  >
                                    {leave.leaveTypeName}
                                  </span>
                                  <span className="text-[10px] font-medium leading-tight mt-0.5 flex items-center gap-1 text-slate-600 dark:text-slate-400">
                                    {isPending ? (
                                      <>
                                        <Clock className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                                        <span className="text-amber-700">Pending</span>
                                      </>
                                    ) : leave.halfDay ? (
                                      <span>0.5d Half-Day</span>
                                    ) : (
                                      <span>{leave.isPaid ? "Approved" : "Unpaid"}</span>
                                    )}
                                  </span>
                                </button>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Mobile Employee Leave Agenda Cards (< md: 360px - 767px) */}
          <div className="md:hidden space-y-3">
            {isMatrixLoading ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-8 text-center text-xs text-slate-400">
                Loading leave calendar...
              </div>
            ) : matrixEmployees.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-8 text-center text-xs text-slate-400">
                No employees found.
              </div>
            ) : (
              matrixEmployees.map((emp) => (
                <div
                  key={emp.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar className="w-9 h-9 rounded-full shrink-0 border border-slate-200 dark:border-slate-700">
                        <AvatarImage src={emp.user?.profile?.avatarUrl || ""} alt={emp.firstName} />
                        <AvatarFallback className="bg-emerald-50 text-emerald-700 font-semibold text-xs">
                          {emp.firstName?.[0] || "E"}
                          {emp.lastName?.[0] || ""}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
                          {emp.firstName} {emp.lastName}
                        </h4>
                        <p className="text-xs text-slate-500 truncate">
                          {emp.employeeCode}
                          {emp.department?.name ? ` • ${emp.department.name}` : ""}
                        </p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenAdd(emp.id)}
                      className="h-8 px-2.5 text-xs shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1 text-[#00a76f]" /> Apply
                    </Button>
                  </div>

                  {emp.leaves.length === 0 ? (
                    <p className="text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/60 rounded-lg px-3 py-2">
                      No active leave in {MONTH_NAMES[selectedMonth - 1]} {selectedYear}.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {emp.leaves.map((lv) => (
                        <button
                          key={lv.id}
                          type="button"
                          onClick={() => openLeaveDetails(lv, emp)}
                          className="w-full text-left rounded-lg border p-2.5 flex items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 dark:bg-slate-800/60 transition-colors cursor-pointer"
                          style={{ borderColor: `${lv.color || "#10b981"}60` }}
                        >
                          <div className="min-w-0">
                            <p
                              className="text-xs font-bold truncate"
                              style={{ color: lv.color || "#00a76f" }}
                            >
                              {lv.leaveTypeName} ({formatLeaveDays(lv.days)}d)
                            </p>
                            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                              {lv.startDate.slice(0, 10)} → {lv.endDate.slice(0, 10)}
                            </p>
                          </div>
                          {renderStatusBadge(lv.status)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        /* 4B. ALL REQUESTS LIST VIEW (Pending / Approved / Rejected / Cancelled) */
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800">
                  <TableHead className="py-3 px-4 text-xs font-semibold text-slate-700 dark:text-slate-300">Employee</TableHead>
                  <TableHead className="py-3 px-4 text-xs font-semibold text-slate-700 dark:text-slate-300">Leave Type</TableHead>
                  <TableHead className="py-3 px-4 text-xs font-semibold text-slate-700 dark:text-slate-300">Dates</TableHead>
                  <TableHead className="py-3 px-4 text-xs font-semibold text-slate-700 dark:text-slate-300">Days</TableHead>
                  <TableHead className="py-3 px-4 text-xs font-semibold text-slate-700 dark:text-slate-300">Status</TableHead>
                  <TableHead className="py-3 px-4 text-xs font-semibold text-slate-700 dark:text-slate-300">Reviewer</TableHead>
                  <TableHead className="py-3 px-4 text-xs font-semibold text-slate-700 dark:text-slate-300 text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isListLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center text-xs text-slate-400">
                      Loading leave applications...
                    </TableCell>
                  </TableRow>
                ) : listApplications.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center text-xs text-slate-400">
                      No leave applications found matching your selected filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  listApplications.map((app: any) => (
                    <TableRow
                      key={app.id}
                      className="hover:bg-slate-50/60 dark:bg-slate-800/50 transition-colors border-b border-slate-100 dark:border-slate-800"
                    >
                      <TableCell className="py-3 px-4 text-xs">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {app.employee?.firstName} {app.employee?.lastName}
                        </div>
                        <div className="text-[11px] text-slate-400 tabular-nums">
                          {app.employee?.employeeCode}
                        </div>
                      </TableCell>
                      <TableCell className="py-3 px-4 text-xs whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: app.leaveType?.color || "#3b82f6" }}
                          />
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {app.leaveType?.name || "Leave"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 px-4 text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {String(app.startDate).slice(0, 10)} → {String(app.endDate).slice(0, 10)}
                        {app.halfDay && (
                          <span className="block text-[10px] text-slate-500 capitalize">
                            Half-Day ({String(app.halfDaySession || "first_half").replace("_", " ")})
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-xs font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {formatLeaveDays(app.days)}d
                      </TableCell>
                      <TableCell className="py-3 px-4 whitespace-nowrap">
                        {renderStatusBadge(app.status)}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {app.approverName || "—"}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-right whitespace-nowrap">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => openLeaveDetails(app, app.employee)}
                          className="h-8 px-2.5 text-xs"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" /> Manage
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {listTotal > listLimit && (
            <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <span>
                Showing {(listPage - 1) * listLimit + 1} to{" "}
                {Math.min(listTotal, listPage * listLimit)} of {listTotal} applications
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={listPage === 1}
                  onClick={() => setListPage((p) => Math.max(1, p - 1))}
                  className="h-8 text-xs"
                >
                  Prev
                </Button>
                <span className="px-2.5 py-1 rounded bg-[#00a76f] text-white font-bold">
                  {listPage}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={listPage * listLimit >= listTotal}
                  onClick={() => setListPage((p) => p + 1)}
                  className="h-8 text-xs"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-30">
        <button
          type="button"
          onClick={() => handleOpenAdd()}
          className="w-12 h-12 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center shadow-lg hover:shadow-xl transition-all cursor-pointer"
          title="Create New Leave Request"
          aria-label="Create New Leave Request"
        >
          <Sparkles className="w-5 h-5 fill-current" />
        </button>
      </div>

      {/* 5. ADD / EDIT LEAVE APPLICATION DIALOG */}
      <Dialog open={formModalOpen} onOpenChange={setFormModalOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              {editingApplicationId ? (
                <>
                  <SquarePen className="w-4 h-4 text-[#00a76f]" />
                  Edit Pending Leave Application
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 text-[#00a76f]" />
                  New Leave Application
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Live server policy dry-run calculates working days, holidays, sandwich bridges, and available ledger balance.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleFormSubmit} className="space-y-4 pt-1">
            {/* Employee Search & Select */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Employee *</Label>
              {!editingApplicationId && (
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Filter employee by name or code..."
                    value={employeeSearch}
                    onChange={(e) => setEmployeeSearch(e.target.value)}
                    className="pl-8 h-8 text-xs border-slate-200 dark:border-slate-700"
                  />
                </div>
              )}
              <Select
                value={formEmployeeId}
                onValueChange={setFormEmployeeId}
                disabled={Boolean(editingApplicationId)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {filteredModalEmployees.map((emp: any) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Active Leave Type Select */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Leave Type *</Label>
              <Select value={formLeaveTypeId} onValueChange={setFormLeaveTypeId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select active leave type" />
                </SelectTrigger>
                <SelectContent>
                  {matrixLeaveTypes.map((lt: any) => (
                    <SelectItem key={lt.id} value={lt.id}>
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: lt.color || "#3b82f6" }}
                        />
                        <span>{lt.name}</span>
                        <span className="text-[10px] text-muted-foreground">
                          ({lt.isPaid ? "Paid" : "Unpaid"} • {formatLeaveDays(lt.daysPerYear)}d/yr)
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Start & End Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Start Date *</Label>
                <Input
                  type="date"
                  value={formStartDate}
                  onChange={(e) => {
                    const v = e.target.value;
                    setFormStartDate(v);
                    if (formHalfDay || formEndDate < v) {
                      setFormEndDate(v);
                    }
                  }}
                  className="h-9 text-xs"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">End Date *</Label>
                <Input
                  type="date"
                  value={effectiveEndDate}
                  min={formStartDate}
                  disabled={formHalfDay}
                  onChange={(e) => setFormEndDate(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>
            </div>

            {/* Leave Duration Mode: Full Day / Half Day Leave / Permission + Unpaid Leave */}
            <div className="p-3 rounded-lg border bg-slate-50/60 dark:bg-slate-800/50 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold block">Leave Duration / Mode</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { value: "full_day", label: "Full Day" },
                      { value: "half_day", label: "Half Day Leave" },
                      { value: "permission", label: "Permission" },
                    ] as const
                  ).map((mode) => (
                    <button
                      key={mode.value}
                      type="button"
                      onClick={() => {
                        setFormDurationMode(mode.value);
                        const isPartial = mode.value !== "full_day";
                        setFormHalfDay(isPartial);
                        if (isPartial) setFormEndDate(formStartDate);
                      }}
                      className={`h-8 rounded-md border text-xs font-medium transition-colors cursor-pointer ${
                        formDurationMode === mode.value
                          ? "bg-[#00a76f] text-white border-[#00a76f]"
                          : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              {formDurationMode === "half_day" && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {(
                    [
                      { value: "first_half", label: "First Half (Morning)" },
                      { value: "second_half", label: "Second Half (Afternoon)" },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFormHalfDaySession(opt.value)}
                      className={`h-8 rounded-md border text-xs font-medium transition-colors cursor-pointer ${
                        formHalfDaySession === opt.value
                          ? "bg-[#00a76f] text-white border-[#00a76f]"
                          : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}

              {formDurationMode === "permission" && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-medium">Permission From</Label>
                    <Input
                      type="time"
                      value={formPermissionFrom}
                      onChange={(e) => setFormPermissionFrom(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-medium">Permission To</Label>
                    <Input
                      type="time"
                      value={formPermissionTo}
                      onChange={(e) => setFormPermissionTo(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              )}

              {/* Unpaid Leave (LOP) Switch */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200/70 dark:border-slate-700/70">
                <div>
                  <Label className="text-xs font-medium block">Unpaid Leave (Loss of Pay)</Label>
                  <p className="text-[10px] text-muted-foreground">
                    Mark this leave application as unpaid
                  </p>
                </div>
                <Switch
                  checked={formUnpaidLeave}
                  onCheckedChange={setFormUnpaidLeave}
                  className="data-[state=checked]:bg-amber-500"
                />
              </div>
            </div>

            {/* Reason */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Reason *</Label>
              <Textarea
                rows={2}
                placeholder="Provide reason for leave application..."
                value={formReason}
                onChange={(e) => setFormReason(e.target.value)}
                className="text-xs"
                required
              />
            </div>

            {/* Supporting Attachment Upload */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Supporting Attachment (Optional)</Label>
              {!formAttachmentUrl ? (
                <div className="border border-dashed border-slate-300 rounded-lg p-3 text-center hover:bg-slate-50 dark:hover:bg-slate-800/60 dark:bg-slate-800/60 transition-colors">
                  <input
                    type="file"
                    id="hr-leave-attachment-input"
                    accept=".pdf,.png,.jpg,.jpeg,.webp"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={uploadingFile}
                  />
                  <label
                    htmlFor="hr-leave-attachment-input"
                    className="cursor-pointer flex flex-col items-center justify-center gap-1"
                  >
                    {uploadingFile ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#00a76f]" />
                        Uploading supporting document...
                      </span>
                    ) : (
                      <>
                        <Paperclip className="w-4 h-4 text-slate-400" />
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          Upload medical note or supporting proof
                        </span>
                        <span className="text-[10px] text-slate-400">PDF, PNG, JPG, WebP up to 10 MB</span>
                      </>
                    )}
                  </label>
                </div>
              ) : (
                <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-xs">
                  <a
                    href={formAttachmentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-[#00a76f] font-medium truncate hover:underline"
                  >
                    <Paperclip className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{attachedFileName || "Supporting Document"}</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setFormAttachmentUrl("");
                      setAttachedFileName(null);
                    }}
                    className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                    title="Remove attachment"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Authoritative Server Dry-Run Preview Card */}
            {isCalculatingDryRun ? (
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-500 flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#00a76f]" />
                Evaluating leave policy, holidays, and ledger balance...
              </div>
            ) : dryRunData ? (
              <div
                className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                  dryRunData.isValid
                    ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                    : "bg-rose-50/80 border-rose-200 text-rose-900"
                }`}
              >
                <div className="flex items-center justify-between font-semibold">
                  <span>Deductible Leave Days:</span>
                  <span className="text-sm font-bold">
                    {formatLeaveDays(dryRunData.totalDays)} Days
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] opacity-90">
                  <span>Available Balance: {formatLeaveDays(dryRunData.currentBalance)}d</span>
                  <span>•</span>
                  <span>Remaining After: {formatLeaveDays(dryRunData.projectedRemaining)}d</span>
                  {dryRunData.weekendDays > 0 && (
                    <>
                      <span>•</span>
                      <span>Weekends: {dryRunData.weekendDays}d</span>
                    </>
                  )}
                  {dryRunData.holidayDays > 0 && (
                    <>
                      <span>•</span>
                      <span>Holidays: {dryRunData.holidayDays}d</span>
                    </>
                  )}
                </div>
                {dryRunData.isSandwich && (
                  <p className="text-[11px] text-amber-800 font-medium">
                    ⓘ Sandwich rule active: {formatLeaveDays(dryRunData.sandwichDaysCount)} intervening weekend/holiday day(s) included.
                  </p>
                )}
                {Array.isArray(dryRunData.warnings) && dryRunData.warnings.length > 0 && (
                  <div className="pt-1 border-t border-rose-200/70 space-y-0.5">
                    {dryRunData.warnings.map((w: string, i: number) => (
                      <p key={i} className="text-[11px] font-medium flex items-start gap-1 text-rose-700">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>{w}</span>
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFormModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={
                  saveApplicationMutation.isPending ||
                  uploadingFile ||
                  !formEmployeeId ||
                  !formLeaveTypeId ||
                  (dryRunData && dryRunData.isValid === false)
                }
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {saveApplicationMutation.isPending
                  ? "Saving..."
                  : editingApplicationId
                  ? "Update Application"
                  : "Submit Application"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 6. VIEW DETAILS / APPROVE / REJECT / CANCEL / REVERSE DIALOG */}
      <Dialog
        open={detailsModalOpen}
        onOpenChange={(open) => {
          setDetailsModalOpen(open);
          if (!open) {
            setSelectedLeaveId(null);
            setDecisionNote("");
          }
        }}
      >
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <Eye className="w-4 h-4 text-[#00a76f]" />
              Leave Application Details
            </DialogTitle>
            <DialogDescription className="text-xs">
              Inspect leave request metadata, supporting proof, ledger entries, and workflow actions.
            </DialogDescription>
          </DialogHeader>

          {isDetailLoading && !activeDetail ? (
            <div className="py-10 text-center text-xs text-slate-400">Loading details...</div>
          ) : activeDetail ? (
            <div className="space-y-4 pt-1 text-xs">
              <div className="p-3.5 rounded-lg border bg-slate-50/60 dark:bg-slate-800/50 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500">Employee:</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {activeDetail.employee?.firstName} {activeDetail.employee?.lastName}{" "}
                    {activeDetail.employee?.employeeCode
                      ? `(${activeDetail.employee.employeeCode})`
                      : ""}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500">Leave Type:</span>
                  <span
                    className="font-semibold"
                    style={{
                      color:
                        activeDetail.leaveType?.color || activeDetail.color || "#00a76f",
                    }}
                  >
                    {activeDetail.leaveType?.name || activeDetail.leaveTypeName} (
                    {(activeDetail.leaveType?.isPaid ?? activeDetail.isPaid) ? "Paid" : "Unpaid"})
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500">Dates:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {String(activeDetail.startDate).slice(0, 10)} →{" "}
                    {String(activeDetail.endDate).slice(0, 10)}
                    {activeDetail.halfDay &&
                      ` (${String(activeDetail.halfDaySession || "first_half").replace("_", " ")})`}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500">Deductible Days:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {formatLeaveDays(activeDetail.days)} Days
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500">Status:</span>
                  {renderStatusBadge(activeDetail.status)}
                </div>

                {activeDetail.approverName && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500">Reviewed By:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {activeDetail.approverName}
                      {activeDetail.approvedAt
                        ? ` on ${String(activeDetail.approvedAt).slice(0, 10)}`
                        : ""}
                    </span>
                  </div>
                )}

                {activeDetail.reason && (
                  <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800">
                    <span className="text-slate-500 block mb-0.5">Employee Reason:</span>
                    <p className="text-slate-800 dark:text-slate-200">{activeDetail.reason}</p>
                  </div>
                )}

                {activeDetail.rejectionReason && (
                  <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800">
                    <span className="text-slate-500 block mb-0.5">Reviewer / Cancellation Note:</span>
                    <p className="text-rose-700 font-medium">{activeDetail.rejectionReason}</p>
                  </div>
                )}

                {activeDetail.attachmentUrl && (
                  <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-slate-500">Attachment:</span>
                    <a
                      href={activeDetail.attachmentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#00a76f] hover:underline"
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                      View Supporting Document
                    </a>
                  </div>
                )}
              </div>

              {/* Linked Ledger Entries */}
              {Array.isArray(activeDetail.ledgerTransactions) &&
                activeDetail.ledgerTransactions.length > 0 && (
                  <div className="rounded-lg border p-2.5 space-y-1.5 bg-white dark:bg-slate-900">
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block">
                      Linked Balance Ledger Entries:
                    </span>
                    {activeDetail.ledgerTransactions.map((tx: any) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between text-[11px] py-1 border-t first:border-t-0"
                      >
                        <span className="tabular-nums font-semibold">{tx.entryType}</span>
                        <span className="text-slate-500 truncate max-w-[220px]">{tx.notes}</span>
                        <span
                          className={
                            tx.entryType === "CREDIT"
                              ? "font-bold text-emerald-600"
                              : "font-bold text-rose-600"
                          }
                        >
                          {tx.entryType === "CREDIT" ? "+" : "-"}
                          {formatLeaveDays(tx.days)}d
                        </span>
                      </div>
                    ))}
                  </div>
                )}

              {/* Reviewer / Action Note Input */}
              {["pending", "approved", "rejected"].includes(activeDetail.status) && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    {activeDetail.status === "pending"
                      ? "Reviewer Comment / Rejection Reason"
                      : "Cancellation or Reversal Audit Reason *"}
                  </Label>
                  <Input
                    placeholder={
                      activeDetail.status === "pending"
                        ? "Optional approval note or rejection reason..."
                        : "Enter mandatory reason for cancelling or reversing..."
                    }
                    value={decisionNote}
                    onChange={(e) => setDecisionNote(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              )}

              {/* Action Buttons */}
              <DialogFooter className="flex-wrap gap-2 pt-1">
                {activeDetail.status === "pending" && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEdit(activeDetail)}
                    >
                      <SquarePen className="w-3.5 h-3.5 mr-1" />
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={cancelMutation.isPending}
                      onClick={() =>
                        cancelMutation.mutate({
                          id: activeDetail.id,
                          reason: decisionNote.trim() || "Cancelled by HR",
                        })
                      }
                    >
                      Cancel Request
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={decisionMutation.isPending}
                      onClick={() =>
                        decisionMutation.mutate({
                          id: activeDetail.id,
                          action: "reject",
                          comments: decisionNote.trim() || "Rejected by reviewer",
                        })
                      }
                    >
                      Reject
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="bg-primary hover:bg-primary/90 text-primary-foreground"
                      disabled={decisionMutation.isPending}
                      onClick={() =>
                        decisionMutation.mutate({
                          id: activeDetail.id,
                          action: "approve",
                          comments: decisionNote.trim() || undefined,
                        })
                      }
                    >
                      Approve
                    </Button>
                  </>
                )}

                {activeDetail.status === "approved" && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={reverseMutation.isPending}
                      onClick={() => {
                        if (!decisionNote.trim()) {
                          toast.error("Please enter an audit reason to reverse this approval");
                          return;
                        }
                        reverseMutation.mutate({
                          id: activeDetail.id,
                          reason: decisionNote.trim(),
                        });
                      }}
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1" />
                      Reverse Approval
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={cancelMutation.isPending}
                      onClick={() =>
                        cancelMutation.mutate({
                          id: activeDetail.id,
                          reason: decisionNote.trim() || "Cancelled by HR — balance restored",
                        })
                      }
                    >
                      Cancel & Restore Balance
                    </Button>
                  </>
                )}

                {activeDetail.status === "rejected" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={reverseMutation.isPending}
                    onClick={() => {
                      if (!decisionNote.trim()) {
                        toast.error("Please enter an audit reason to reopen this rejected request");
                        return;
                      }
                      reverseMutation.mutate({
                        id: activeDetail.id,
                        reason: decisionNote.trim(),
                      });
                    }}
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1" />
                    Reverse Rejection (Reopen)
                  </Button>
                )}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDetailsModalOpen(false)}
                >
                  Close
                </Button>
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
