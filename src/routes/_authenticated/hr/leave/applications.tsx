import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, unwrapArray, unwrapData } from "@/lib/api";
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
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCw,
  Sparkles,
  Eye,
  Paperclip,
  X,
  Search,
  FileCheck,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/leave/applications")({
  component: HrLeaveApplicationsPage,
});

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

export default function HrLeaveApplicationsPage() {
  const queryClient = useQueryClient();

  // Navigation & Date State
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1); // 1 - 12
  const [weekOffset, setWeekOffset] = useState<number>(0);

  // Filters
  const [employeeFilter, setEmployeeFilter] = useState<string>("all");

  // Modal States
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<any>(null);

  // Add Form State
  const [formEmployeeId, setFormEmployeeId] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [formLeaveTypeId, setFormLeaveTypeId] = useState("");
  const [formStartDate, setFormStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [formEndDate, setFormEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [formHalfDay, setFormHalfDay] = useState(false);
  const [formHalfDaySession, setFormHalfDaySession] = useState<"first_half" | "second_half">("first_half");
  const [formReason, setFormReason] = useState("");
  const [formAttachmentUrl, setFormAttachmentUrl] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{ name: string; size: number; url: string; isImage: boolean } | null>(null);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

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

  // 1. Fetch Calendar Matrix Data
  const { data: matrixData, isLoading: isMatrixLoading } = useQuery({
    queryKey: ["hr-leave-matrix", selectedYear, selectedMonth, employeeFilter],
    queryFn: async () => {
      const res = await api.get("/api/v1/hr/leave/applications/matrix", {
        params: {
          year: selectedYear,
          month: selectedMonth,
          employeeId: employeeFilter,
        },
      });
      return res;
    },
  });

  const matrixDays: MatrixDay[] = matrixData?.days || matrixData?.data?.days || [];
  const matrixEmployees: MatrixEmployee[] = matrixData?.employees || matrixData?.data?.employees || [];
  const matrixLeaveTypes: any[] = matrixData?.leaveTypes || matrixData?.data?.leaveTypes || [];

  const windowDays = useMemo(() => {
    if (!matrixDays || matrixDays.length === 0) return [];
    const maxStart = Math.max(0, matrixDays.length - 7);
    const startIdx = Math.min(Math.max(0, weekOffset * 7), maxStart);
    return matrixDays.slice(startIdx, startIdx + 7);
  }, [matrixDays, weekOffset]);

  const canPrevWeek = weekOffset > 0;
  const canNextWeek = matrixDays.length > (weekOffset + 1) * 7;

  // 2. Fetch Active Employees for Add Modal & Dropdown
  const { data: allEmployees = [], isLoading: isLoadingEmployees } = useQuery({
    queryKey: ["hr-employees-list-all"],
    queryFn: async () => {
      const res = await api.get("/api/v1/hr/employees", { params: { status: "active", limit: 100 } }).catch(async () => {
        return await api.get("/api/employees", { params: { status: "active", limit: 100 } });
      });
      return unwrapArray(res);
    },
    staleTime: 60_000,
  });

  const filteredModalEmployees = useMemo(() => {
    if (!employeeSearch.trim()) return allEmployees;
    const q = employeeSearch.toLowerCase();
    return allEmployees.filter((e: any) =>
      `${e.firstName} ${e.lastName} ${e.employeeCode}`.toLowerCase().includes(q)
    );
  }, [allEmployees, employeeSearch]);

  // 3. Dry-Run Calculation Query for Add Form
  const { data: dryRunData } = useQuery({
    queryKey: ["hr-leave-dry-run", formEmployeeId, formLeaveTypeId, formStartDate, formEndDate, formHalfDay, formHalfDaySession],
    queryFn: async () => {
      if (!formEmployeeId || !formLeaveTypeId || !formStartDate || !formEndDate) return null;
      const res = await api.post("/api/v1/hr/leave/applications/dry-run", {
        employeeId: formEmployeeId,
        leaveTypeId: formLeaveTypeId,
        startDate: formStartDate,
        endDate: formEndDate,
        halfDay: formHalfDay,
        halfDaySession: formHalfDay ? formHalfDaySession : undefined,
      });
      return res.data;
    },
    enabled: Boolean(formEmployeeId && formLeaveTypeId && formStartDate && formEndDate && addModalOpen),
  });

  // Create Leave Application Mutation
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post("/api/v1/hr/leave/applications", payload);
      return res;
    },
    onSuccess: () => {
      toast.success("Leave application submitted successfully");
      queryClient.invalidateQueries({ queryKey: ["hr-leave-matrix"] });
      queryClient.invalidateQueries({ queryKey: ["hr-leave-applications"] });
      queryClient.invalidateQueries({ queryKey: ["hr-leave-balances"] });
      setAddModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err?.message || err?.response?.data?.error || "Failed to create leave application");
    },
  });

  // Approval / Rejection Decision Mutation
  const decisionMutation = useMutation({
    mutationFn: async ({ id, decision, comments, rejectionReason }: any) => {
      const res = await api.post(`/api/v1/hr/leave/applications/${id}/action`, {
        action: decision,
        comments: comments || rejectionReason,
      });
      return res;
    },
    onSuccess: (_, vars) => {
      toast.success(vars.decision === "approve" ? "Application approved successfully" : "Application rejected");
      queryClient.invalidateQueries({ queryKey: ["hr-leave-matrix"] });
      queryClient.invalidateQueries({ queryKey: ["hr-leave-applications"] });
      queryClient.invalidateQueries({ queryKey: ["hr-leave-balances"] });
      setDetailsModalOpen(false);
      setSelectedLeave(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || err?.response?.data?.error || "Failed to process application");
    },
  });

  // Cancellation Mutation
  const cancelMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await api.post(`/api/v1/hr/leave/applications/${id}/cancel`, { reason });
      return res;
    },
    onSuccess: () => {
      toast.success("Leave cancelled and compensatory ledger credit issued");
      queryClient.invalidateQueries({ queryKey: ["hr-leave-matrix"] });
      queryClient.invalidateQueries({ queryKey: ["hr-leave-applications"] });
      queryClient.invalidateQueries({ queryKey: ["hr-leave-balances"] });
      setDetailsModalOpen(false);
      setSelectedLeave(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || err?.response?.data?.error || "Failed to cancel leave application");
    },
  });

  const resetForm = () => {
    setFormEmployeeId("");
    setEmployeeSearch("");
    setFormLeaveTypeId("");
    setFormStartDate(new Date().toISOString().slice(0, 10));
    setFormEndDate(new Date().toISOString().slice(0, 10));
    setFormHalfDay(false);
    setFormHalfDaySession("first_half");
    setFormReason("");
    setFormAttachmentUrl("");
    setAttachedFile(null);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size exceeds 5MB limit");
      e.target.value = "";
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please upload a valid image (PNG, JPG, WebP) or PDF document");
      e.target.value = "";
      return;
    }

    try {
      setUploadingFile(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "tenant/leave-documents");
      const res: any = await api.upload("/api/v1/media/upload", formData);
      const url = res?.url || res?.data?.url || res?.publicUrl || URL.createObjectURL(file);
      setAttachedFile({
        name: file.name,
        size: file.size,
        url,
        isImage: file.type.startsWith("image/"),
      });
      setFormAttachmentUrl(url);
      toast.success("Attachment uploaded successfully");
    } catch {
      // Fallback: create object URL
      const fallbackUrl = URL.createObjectURL(file);
      setAttachedFile({
        name: file.name,
        size: file.size,
        url: fallbackUrl,
        isImage: file.type.startsWith("image/"),
      });
      setFormAttachmentUrl(fallbackUrl);
      toast.info("Attachment attached locally");
    } finally {
      setUploadingFile(false);
    }
  };

  const removeAttachment = () => {
    setAttachedFile(null);
    setFormAttachmentUrl("");
  };

  const handleOpenAdd = () => {
    resetForm();
    if (allEmployees.length > 0) {
      setFormEmployeeId(allEmployees[0].id);
    }
    if (matrixLeaveTypes.length > 0) {
      setFormLeaveTypeId(matrixLeaveTypes[0].id);
    }
    setAddModalOpen(true);
  };

  const openLeaveDetails = (leave: any, employee?: any) => {
    setSelectedLeave({
      ...leave,
      employee: employee || leave.employee,
    });
    setDetailsModalOpen(true);
  };

  const todayStr = new Date().toISOString().slice(0, 10);

  const getEmployeeLeaveOnDate = (emp: MatrixEmployee, dateStr: string) => {
    return emp.leaves.find((l) => {
      const start = l.startDate.slice(0, 10);
      const end = l.endDate.slice(0, 10);
      return dateStr >= start && dateStr <= end;
    });
  };

  const displayLegendTypes = useMemo(() => {
    if (matrixLeaveTypes && matrixLeaveTypes.length > 0) return matrixLeaveTypes;
    return [
      { id: "1", name: "Annual Leave", color: "#10b981", isPaid: true },
      { id: "2", name: "Sick Leave", color: "#ef4444", isPaid: true },
      { id: "3", name: "Emergency Leave", color: "#f59e0b", isPaid: true },
      { id: "4", name: "Compensatory Leave", color: "#06b6d4", isPaid: true },
      { id: "5", name: "Personal Leave", color: "#84cc16", isPaid: false },
      { id: "6", name: "Marriage Leave", color: "#f97316", isPaid: true },
      { id: "7", name: "Maternity Leave", color: "#e91e63", isPaid: true },
      { id: "8", name: "Paternity Leave", color: "#3b82f6", isPaid: true },
      { id: "9", name: "Bereavement Leave", color: "#64748b", isPaid: true },
      { id: "10", name: "Study Leave", color: "#8b5cf6", isPaid: false },
    ];
  }, [matrixLeaveTypes]);

  return (
    <div className="space-y-4 pb-12">
      {/* 1. Header with Title, Description, and + Add Leave Application Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Leave Applications</h1>
          <p className="text-xs text-slate-500 mt-0.5">View and manage leave applications.</p>
        </div>

        <Button
          onClick={handleOpenAdd}
          className="bg-[#00a76f] hover:bg-[#008f5d] text-white font-medium rounded-lg px-4 py-2 text-sm shadow-xs flex items-center gap-1.5 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Leave Application
        </Button>
      </div>

      {/* 2. Controls Toolbar: < November 2026 > and Employee Selector */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Left: Month Navigator */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handlePrevMonth}
            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-slate-800 px-3 min-w-[130px] text-center">
            {monthNames[selectedMonth - 1]} {selectedYear}
          </span>
          <button
            onClick={handleNextMonth}
            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors"
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Employee Filter */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="text-xs font-medium text-slate-500">Employee</span>
          <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
            <SelectTrigger className="w-56 h-9 rounded-lg border-slate-200 bg-white text-xs text-slate-700 font-medium">
              <SelectValue placeholder="All Employees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Employees</SelectItem>
              {allEmployees.map((emp: any) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName} ({emp.employeeCode})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 3. Dynamic Legend Bar Card */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-xs flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
          Legend:
        </span>
        
        {/* Today Legend Pill */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium bg-[#e8f7f0] border-[#a3e3c4] text-[#00a76f]">
          <span className="w-2 h-2 rounded-full border-2 border-[#00a76f] bg-white shrink-0" />
          <span>Today</span>
        </div>

        {/* Dynamic / Standard Leave Types */}
        {displayLegendTypes.map((lt: any) => (
          <div
            key={lt.id || lt.name}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-transform hover:scale-[1.02]"
            style={{
              backgroundColor: `${lt.color || "#3b82f6"}15`,
              borderColor: `${lt.color || "#3b82f6"}55`,
              color: lt.color || "#3b82f6",
            }}
          >
            <span
              className="w-2 h-2 rounded-full border-2 bg-white shrink-0"
              style={{ borderColor: lt.color || "#3b82f6" }}
            />
            <span>{lt.name}</span>
          </div>
        ))}
      </div>

      {/* 4. Calendar Matrix Grid (Spacious 7-Day View with Week Navigation) */}
      <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden">
        {isMatrixLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-[#00a76f]" />
            <span className="text-xs font-medium">Loading calendar matrix...</span>
          </div>
        ) : matrixEmployees.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <p className="font-semibold text-sm text-slate-700">No leave applications or records found</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting the selected employee or month.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs select-none">
              {/* Header Row */}
              <thead>
                <tr className="border-b border-slate-200/80">
                  {/* Sticky Employee Column */}
                  <th className="sticky left-0 z-20 bg-white py-3 px-4 text-left font-semibold text-xs text-slate-700 border-r border-slate-200/80 w-[240px] min-w-[240px]">
                    Employee
                  </th>

                  {/* Day Navigation & Columns */}
                  {windowDays.map((day, idx) => {
                    const isToday = day.date === todayStr;
                    return (
                      <th
                        key={day.date}
                        className={`py-2 px-3 text-center border-r border-slate-200/60 min-w-[120px] transition-colors relative ${
                          isToday ? "bg-[#e8f7f0] text-[#00a76f]" : "text-slate-800 bg-white"
                        }`}
                      >
                        {/* Week Navigation Left Arrow on first day */}
                        {idx === 0 && (
                          <button
                            onClick={() => setWeekOffset((prev) => Math.max(0, prev - 1))}
                            disabled={!canPrevWeek}
                            className={`absolute left-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-slate-700 ${
                              !canPrevWeek ? "opacity-30 cursor-not-allowed" : "cursor-pointer"
                            }`}
                            title="Previous 7 Days"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                        )}

                        <div className="flex flex-col items-center justify-center">
                          <span className={`text-sm font-bold ${isToday ? "text-[#00a76f]" : "text-slate-900"}`}>
                            {String(day.dayNumber).padStart(2, "0")}
                          </span>
                          <span className={`text-[11px] font-medium ${isToday ? "text-[#00a76f]" : "text-slate-500"}`}>
                            {day.dayName}
                          </span>
                        </div>

                        {/* Week Navigation Right Arrow on last day */}
                        {idx === windowDays.length - 1 && (
                          <button
                            onClick={() => setWeekOffset((prev) => prev + 1)}
                            disabled={!canNextWeek}
                            className={`absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-slate-700 ${
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

              {/* Body: Employees and Leave Spanning Bars */}
              <tbody>
                {matrixEmployees.map((emp) => (
                  <tr key={emp.id} className="border-b border-slate-200/70 hover:bg-slate-50/40 transition-colors">
                    {/* Sticky Employee Cell */}
                    <td className="sticky left-0 z-10 bg-white border-r border-slate-200/80 py-3 px-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-9 h-9 rounded-full shrink-0 border border-slate-200">
                          <AvatarImage src={emp.user?.profile?.avatarUrl || ""} alt={emp.firstName} />
                          <AvatarFallback className="bg-emerald-50 text-emerald-700 font-semibold text-xs">
                            {emp.firstName?.[0] || "E"}
                            {emp.lastName?.[0] || ""}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-xs text-slate-900 leading-tight truncate">
                            {emp.firstName} {emp.lastName}
                          </h4>
                          <p className="text-[11px] text-slate-500 font-normal leading-tight mt-0.5 truncate">
                            {emp.position || emp.department?.name || "Employee"}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Day Cells */}
                    {windowDays.map((day) => {
                      const isToday = day.date === todayStr;
                      const leave = getEmployeeLeaveOnDate(emp, day.date);

                      return (
                        <td
                          key={day.date}
                          className={`p-1.5 border-r border-slate-200/60 h-20 align-middle text-center relative ${
                            isToday ? "bg-[#f4fbf7]" : "bg-white"
                          }`}
                        >
                          {leave && (
                            <div
                              onClick={() => openLeaveDetails(leave, emp)}
                              className="w-full h-full rounded-lg p-2 flex flex-col justify-center text-left cursor-pointer transition-transform hover:scale-[1.02] shadow-xs"
                              style={{
                                backgroundColor: `${leave.color || "#10b981"}18`,
                                borderColor: `${leave.color || "#10b981"}60`,
                                borderWidth: "1px",
                              }}
                            >
                              <span
                                className="font-bold text-[11px] leading-tight truncate"
                                style={{ color: leave.color || "#00a76f" }}
                              >
                                {leave.leaveTypeName}
                              </span>
                              <span
                                className="text-[10px] font-medium leading-tight mt-0.5"
                                style={{ color: leave.color || "#00a76f" }}
                              >
                                {leave.isPaid ? "Paid Leave" : "Unpaid Leave"}
                              </span>
                            </div>
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

      {/* Floating Action Sparkle Button */}
      <div className="fixed bottom-6 right-6 z-30">
        <button
          onClick={handleOpenAdd}
          className="w-12 h-12 rounded-full bg-[#00a76f] hover:bg-[#008f5d] text-white flex items-center justify-center shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
          title="Create New Leave Request"
        >
          <Sparkles className="w-5 h-5 fill-current" />
        </button>
      </div>

      {/* 5. ADD LEAVE APPLICATION DIALOG */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#00a76f]" />
              New Leave Application
            </DialogTitle>
            <DialogDescription className="text-xs">
              Apply for leave on behalf of an employee with real-time balance and sandwich calculation.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate({
                employeeId: formEmployeeId,
                leaveTypeId: formLeaveTypeId,
                startDate: formStartDate,
                endDate: formEndDate,
                halfDay: formHalfDay,
                halfDaySession: formHalfDay ? formHalfDaySession : undefined,
                reason: formReason,
                attachmentUrl: formAttachmentUrl || undefined,
              });
            }}
            className="space-y-4 pt-2"
          >
            {/* Employee Selection */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Employee *</Label>
                {isLoadingEmployees && (
                  <span className="text-[10px] text-muted-foreground animate-pulse">Loading employees...</span>
                )}
              </div>
              <div className="space-y-1.5">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Search employee by name or code..."
                    value={employeeSearch}
                    onChange={(e) => setEmployeeSearch(e.target.value)}
                    className="pl-8 h-8 text-xs border-slate-200"
                  />
                </div>
                <Select value={formEmployeeId} onValueChange={setFormEmployeeId} required>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder={isLoadingEmployees ? "Loading employees..." : "Select employee"} />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    {filteredModalEmployees.length === 0 ? (
                      <div className="p-3 text-center text-xs text-muted-foreground">
                        {allEmployees.length === 0 ? "No active employees found" : "No matching employee"}
                      </div>
                    ) : (
                      filteredModalEmployees.map((emp: any) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{emp.firstName} {emp.lastName}</span>
                            <span className="text-[10px] font-mono text-muted-foreground">({emp.employeeCode})</span>
                            {emp.position && <span className="text-[10px] text-slate-400">• {emp.position}</span>}
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Leave Type Selection */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Leave Type *</Label>
              <Select value={formLeaveTypeId} onValueChange={setFormLeaveTypeId} required>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select leave category" />
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
                          ({lt.isPaid ? "Paid" : "Unpaid"})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Start Date *</Label>
                <Input
                  type="date"
                  value={formStartDate}
                  onChange={(e) => setFormStartDate(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">End Date *</Label>
                <Input
                  type="date"
                  value={formEndDate}
                  onChange={(e) => setFormEndDate(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>
            </div>

            {/* Half Day Option */}
            <div className="flex items-center justify-between p-2.5 rounded-lg border bg-slate-50/50">
              <div className="space-y-0.5">
                <Label className="text-xs font-medium cursor-pointer">Half Day Request</Label>
                <p className="text-[10px] text-muted-foreground">Applies for 0.5 day only</p>
              </div>
              <Switch checked={formHalfDay} onCheckedChange={setFormHalfDay} />
            </div>

            {/* Reason */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Reason *</Label>
              <Textarea
                rows={2}
                placeholder="State the purpose of this leave..."
                value={formReason}
                onChange={(e) => setFormReason(e.target.value)}
                className="text-xs"
                required
              />
            </div>

            {/* Supporting Document / Attachment Upload */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Attachment / Proof (Optional)</Label>
              {!attachedFile ? (
                <div className="border border-dashed border-slate-300 rounded-lg p-3 text-center hover:bg-slate-50 transition-colors">
                  <input
                    type="file"
                    id="leave-attachment-input"
                    accept=".pdf,.png,.jpg,.jpeg,.webp"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={uploadingFile}
                  />
                  <label
                    htmlFor="leave-attachment-input"
                    className="cursor-pointer flex flex-col items-center justify-center gap-1"
                  >
                    {uploadingFile ? (
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <RefreshCw className="w-4 h-4 animate-spin text-[#00a76f]" />
                        Uploading document...
                      </div>
                    ) : (
                      <>
                        <Paperclip className="w-4 h-4 text-slate-400" />
                        <span className="text-xs font-medium text-slate-700">Click to upload document or proof</span>
                        <span className="text-[10px] text-slate-400">PDF, PNG, JPG up to 5MB</span>
                      </>
                    )}
                  </label>
                </div>
              ) : (
                <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {attachedFile.isImage ? (
                      <img src={attachedFile.url} alt="Preview" className="w-9 h-9 rounded object-cover border" />
                    ) : (
                      <div className="w-9 h-9 rounded bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-[10px]">
                        PDF
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-800 truncate">{attachedFile.name}</p>
                      <p className="text-[10px] text-slate-400">{(attachedFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removeAttachment}
                    className="text-slate-400 hover:text-rose-600 h-7 w-7 p-0"
                    title="Remove attachment"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Live Calculation / Sandwich Rule Alert */}
            {dryRunData && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs space-y-1 text-emerald-800">
                <div className="flex items-center justify-between font-semibold">
                  <span>Calculated Deductible Days:</span>
                  <span className="text-sm font-bold text-[#00a76f]">{dryRunData.deductibleDays} Days</span>
                </div>
                {dryRunData.isSandwich && (
                  <p className="text-[11px] text-amber-700 font-medium">
                    ⓘ Sandwich leave rule applied: weekend/holiday days are counted toward deduction.
                  </p>
                )}
              </div>
            )}

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setAddModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createMutation.isPending || !formEmployeeId || !formLeaveTypeId}
                className="bg-[#00a76f] hover:bg-[#008f5d] text-white"
              >
                {createMutation.isPending ? "Submitting..." : "Submit Application"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 6. LEAVE DETAILS / APPROVAL & CANCELLATION DIALOG */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <Eye className="w-4 h-4 text-[#00a76f]" />
              Leave Application Details
            </DialogTitle>
          </DialogHeader>

          {selectedLeave && (
            <div className="space-y-4 pt-1 text-xs">
              <div className="p-3 rounded-lg border bg-slate-50/50 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Employee:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedLeave.employee?.firstName} {selectedLeave.employee?.lastName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Leave Type:</span>
                  <span className="font-semibold" style={{ color: selectedLeave.color || "#00a76f" }}>
                    {selectedLeave.leaveTypeName} ({selectedLeave.isPaid ? "Paid" : "Unpaid"})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Dates:</span>
                  <span className="font-medium text-slate-700">
                    {selectedLeave.startDate?.slice(0, 10)} to {selectedLeave.endDate?.slice(0, 10)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Days Deducted:</span>
                  <span className="font-bold text-slate-900">{selectedLeave.days} Days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status:</span>
                  <span className="font-bold uppercase text-[#00a76f]">{selectedLeave.status}</span>
                </div>
                {selectedLeave.reason && (
                  <div className="pt-1 border-t border-slate-200">
                    <span className="text-slate-500 block mb-0.5">Reason:</span>
                    <p className="text-slate-700 italic">{selectedLeave.reason}</p>
                  </div>
                )}
                {selectedLeave.attachmentUrl && (
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-slate-500">Attachment:</span>
                    <a
                      href={selectedLeave.attachmentUrl}
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

              {/* Action Buttons */}
              <DialogFooter className="gap-2 pt-2">
                {selectedLeave.status === "approved" && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (confirm("Are you sure you want to cancel this leave application? A compensatory credit will be issued.")) {
                        cancelMutation.mutate({ id: selectedLeave.id, reason: "Cancelled by HR Manager" });
                      }
                    }}
                    disabled={cancelMutation.isPending}
                  >
                    Cancel Leave & Restore Balance
                  </Button>
                )}

                {selectedLeave.status === "pending" && (
                  <>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() =>
                        decisionMutation.mutate({
                          id: selectedLeave.id,
                          decision: "reject",
                          rejectionReason: "Rejected by HR",
                        })
                      }
                      disabled={decisionMutation.isPending}
                    >
                      Reject
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="bg-[#00a76f] hover:bg-[#008f5d] text-white"
                      onClick={() =>
                        decisionMutation.mutate({
                          id: selectedLeave.id,
                          decision: "approve",
                        })
                      }
                      disabled={decisionMutation.isPending}
                    >
                      Approve Application
                    </Button>
                  </>
                )}

                <Button type="button" variant="outline" size="sm" onClick={() => setDetailsModalOpen(false)}>
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
