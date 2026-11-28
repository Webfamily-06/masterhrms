'use client';

import { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import ExcelJS from "exceljs";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Check,
  X,
  Flag,
  Star,
  Ban,
  Circle,
  Clock,
  ArrowDownRight,
  Timer,
  Plus,
  SlidersHorizontal,
  RefreshCw,
  Calendar,
  Lock,
  Unlock,
  Download,
  ChevronDown,
  Search,
  Users,
  CheckSquare,
  Square,
  FileSpreadsheet,
  FileText,
  Settings2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export default function HrAttendanceRecordsPage() {
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getUTCMonth() + 1));
  const [selectedYear, setSelectedYear] = useState(String(new Date().getUTCFullYear()));
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("all");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("all");
  const [selectedBranchId, setSelectedBranchId] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [exportCycle, setExportCycle] = useState<"25_24" | "calendar">("25_24");

  // Multi-Employee Selection & Dropdown State
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(new Set());
  const [employeeSearchDropdownOpen, setEmployeeSearchDropdownOpen] = useState(false);
  const [employeeFilterSearch, setEmployeeFilterSearch] = useState("");
  const employeeDropdownRef = useRef<HTMLDivElement>(null);

  // Close employee search dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (employeeDropdownRef.current && !employeeDropdownRef.current.contains(event.target as Node)) {
        setEmployeeSearchDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Modals
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [lockModalOpen, setLockModalOpen] = useState(false);
  const [dayDetailModalOpen, setDayDetailModalOpen] = useState(false);
  const [selectedDayCell, setSelectedDayCell] = useState<{
    employee: any;
    dayData: any;
  } | null>(null);

  // Forms
  const [adjustForm, setAdjustForm] = useState({
    employeeId: "",
    date: new Date().toISOString().slice(0, 10),
    checkIn: "09:30",
    checkOut: "18:30",
    status: "present",
    hours: 9,
    notes: "",
  });

  const [bulkForm, setBulkForm] = useState({
    employeeIds: [] as string[],
    date: new Date().toISOString().slice(0, 10),
    checkIn: "09:30",
    checkOut: "18:30",
    status: "present",
    breakMinutes: 60,
    notes: "Bulk daily attendance entry",
    overwriteExisting: true,
  });
  const [bulkEmployeeSearch, setBulkEmployeeSearch] = useState("");
  const [bulkDepartmentFilter, setBulkDepartmentFilter] = useState("all");

  const [lockNotes, setLockNotes] = useState("");

  // 1. Fetch Month Lock Status
  const { data: lockStatus, refetch: refetchLock } = useQuery({
    queryKey: ["hr-attendance-lock", selectedYear, selectedMonth],
    queryFn: async () => {
      const res = await api.get<{ year: number; month: number; isLocked: boolean; lockedAt?: string; notes?: string }>(
        `/api/v1/hr/attendance/month-lock?year=${selectedYear}&month=${selectedMonth}`
      );
      return res;
    },
  });

  // 2. Fetch Attendance Matrix
  const { data: matrixData, isLoading: loadingMatrix } = useQuery({
    queryKey: ["hr-attendance-matrix", selectedYear, selectedMonth, selectedEmployeeId, selectedDepartmentId, searchTerm],
    queryFn: async () => {
      const res = await api.get<{
        year: number;
        month: number;
        daysInMonth: number;
        totalWorkingDays: number;
        summary: {
          totalEmployees: number;
          totalPresentDays: number;
          totalLateDays: number;
          totalHalfDays: number;
          totalLeaveDays: number;
          totalAbsentDays: number;
          totalOvertimeHours: number;
        };
        matrix: any[];
      }>(
        `/api/v1/hr/attendance/matrix?year=${selectedYear}&month=${selectedMonth}&employeeId=${selectedEmployeeId}&departmentId=${selectedDepartmentId}&search=${encodeURIComponent(
          searchTerm
        )}`
      );
      return res;
    },
  });

  // 3. Fetch Employees for filters
  const { data: employeesData } = useQuery({
    queryKey: ["hr-employees-lookup"],
    queryFn: async () => {
      const res = await api.get<any>("/api/v1/hr/employees?limit=200");
      return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
    },
  });

  // 4. Fetch Departments for filter modal
  const { data: departmentsData } = useQuery({
    queryKey: ["hr-departments-lookup"],
    queryFn: async () => {
      const res = await api.get<any>("/api/v1/hr/attendance/departments");
      return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
    },
  });

  // 5. Fetch Sandwich Policy Setting
  const { data: sandwichPolicyData, refetch: refetchSandwichPolicy } = useQuery({
    queryKey: ["hr-attendance-sandwich-policy"],
    queryFn: async () => {
      const res = await api.get<{ sandwichRuleEnabled: boolean; policyId?: string }>("/api/v1/hr/attendance/settings/sandwich-policy");
      return res;
    },
  });

  const toggleSandwichMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      return api.patch("/api/v1/hr/attendance/settings/sandwich-policy", { enabled });
    },
    onSuccess: (_, enabled) => {
      toast.success(`Sandwich Leave Policy ${enabled ? "Enabled" : "Disabled"}`);
      refetchSandwichPolicy();
      queryClient.invalidateQueries({ queryKey: ["hr-attendance-matrix"] });
    },
    onError: (err: any) => {
      toast.error("Failed to update sandwich policy: " + (err.message || err));
    },
  });

  // Mutation: Adjust Attendance Record
  const adjustMutation = useMutation({
    mutationFn: async (payload: typeof adjustForm) => {
      let inTime: string | null = null;
      let outTime: string | null = null;
      let calculatedHours = payload.hours;

      if (payload.checkIn) {
        const localIn = new Date(`${payload.date}T${payload.checkIn}:00`);
        inTime = localIn.toISOString();
      }
      if (payload.checkOut) {
        const localOut = new Date(`${payload.date}T${payload.checkOut}:00`);
        outTime = localOut.toISOString();
      }
      if (inTime && outTime) {
        const diffMs = new Date(outTime).getTime() - new Date(inTime).getTime();
        if (diffMs > 0) {
          calculatedHours = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;
        }
      }

      return api.post("/api/v1/hr/attendance/records", {
        ...payload,
        checkIn: inTime,
        checkOut: outTime,
        hours: calculatedHours,
      });
    },
    onSuccess: (savedRecord: any) => {
      toast.success("Attendance record adjusted successfully");
      queryClient.invalidateQueries({ queryKey: ["hr-attendance-matrix"] });
      setAdjustModalOpen(false);
      setDayDetailModalOpen(false);

      if (selectedDayCell && savedRecord) {
        setSelectedDayCell((prev: any) => {
          if (!prev) return null;
          return {
            ...prev,
            dayData: {
              ...prev.dayData,
              checkIn: savedRecord.checkIn,
              checkOut: savedRecord.checkOut,
              hours: savedRecord.hours,
              statusCode: String(savedRecord.status).toUpperCase(),
              notes: savedRecord.notes,
            },
          };
        });
      }

      setAdjustForm({
        employeeId: "",
        date: new Date().toISOString().slice(0, 10),
        checkIn: "09:30",
        checkOut: "18:30",
        status: "present",
        hours: 9,
        notes: "",
      });
    },
    onError: (err: any) => {
      if (err.status === 423 || (err?.status === 423 || err?.response?.status === 423)) {
        toast.error("Period is locked! Modifications prohibited.");
      } else {
        toast.error(err?.response?.data?.error || err?.message || "Failed to adjust record");
      }
    },
  });

  // Mutation: Bulk Attendance Entry
  const bulkAdjustMutation = useMutation({
    mutationFn: async (payload: typeof bulkForm) => {
      return api.post("/api/v1/hr/attendance/records/bulk", payload);
    },
    onSuccess: (res: any) => {
      toast.success(`Bulk attendance processed: ${res.succeeded} updated/created, ${res.skipped || 0} skipped`);
      queryClient.invalidateQueries({ queryKey: ["hr-attendance-matrix"] });
      setBulkModalOpen(false);
    },
    onError: (err: any) => {
      if (err.status === 423 || (err?.status === 423 || err?.response?.status === 423)) {
        toast.error("Period is locked! Modifications prohibited.");
      } else {
        toast.error(err?.response?.data?.error || err?.message || "Failed to process bulk attendance");
      }
    },
  });

  // Mutation: Lock / Unlock Month
  const lockMutation = useMutation({
    mutationFn: async ({ isLocked, notes }: { isLocked: boolean; notes?: string }) => {
      return api.post("/api/v1/hr/attendance/month-lock", {
        year: parseInt(selectedYear, 10),
        month: parseInt(selectedMonth, 10),
        isLocked,
        notes,
      });
    },
    onSuccess: (_, vars) => {
      toast.success(`Period ${selectedMonth}/${selectedYear} has been ${vars.isLocked ? "locked" : "unlocked"}`);
      refetchLock();
      setLockModalOpen(false);
      setLockNotes("");
    },
    onError: (err: any) => {
      toast.error((err?.response?.data?.error || err?.message) || "Failed to update period lock status");
    },
  });

  const isLocked = !!lockStatus?.isLocked;
  const employees = employeesData || [];
  const departments = departmentsData || [];
  const matrix = matrixData?.matrix || [];
  const daysInMonth = matrixData?.daysInMonth || 30;

  const monthName = new Date(Number(selectedYear), Number(selectedMonth) - 1).toLocaleString("default", {
    month: "long",
  });

  // Multi-employee selection helpers
  const toggleSelectEmployee = (id: string) => {
    setSelectedEmployeeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (matrix.length > 0 && matrix.every((r: any) => selectedEmployeeIds.has(r.employee.id))) {
      setSelectedEmployeeIds(new Set());
    } else {
      setSelectedEmployeeIds(new Set(matrix.map((r: any) => r.employee.id)));
    }
  };

  const clearSelection = () => {
    setSelectedEmployeeIds(new Set());
  };

  // Searchable employee lookup helpers
  const filteredLookupEmployees = useMemo(() => {
    if (!employeeFilterSearch) return employees;
    const q = employeeFilterSearch.toLowerCase();
    return employees.filter(
      (emp: any) =>
        `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(q) ||
        emp.employeeCode?.toLowerCase().includes(q)
    );
  }, [employees, employeeFilterSearch]);

  const selectedEmployeeName = useMemo(() => {
    if (selectedEmployeeId === "all") return "All Employees";
    const found = employees.find((e: any) => e.id === selectedEmployeeId);
    return found ? `${found.firstName} ${found.lastName}` : "Select Employee";
  }, [selectedEmployeeId, employees]);

  // Status Icon Renderer
  const renderStatusIcon = (day: any) => {
    switch (day.statusCode) {
      case "PRESENT":
        return <Check className="h-4 w-4 text-emerald-600 stroke-[3]" />;
      case "ABSENT":
        return <X className="h-4 w-4 text-rose-600 stroke-[3]" />;
      case "HALF_DAY":
        return <span className="text-xs font-bold text-amber-600">½</span>;
      case "ON_LEAVE":
        return <Flag className="h-3.5 w-3.5 text-rose-500 fill-rose-500" />;
      case "SANDWICH_LEAVE":
        return (
          <span className="inline-flex items-center justify-center px-1 py-0.5 text-[9px] font-bold rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            SL
          </span>
        );
      case "HOLIDAY":
        return <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />;
      case "WEEKLY_OFF":
        return <Ban className="h-3.5 w-3.5 text-muted-foreground/40" />;
      case "FUTURE":
        return <span className="text-muted-foreground/30 tabular-nums text-xs">-</span>;
      case "NOT_ADDED":
        return <Circle className="h-3.5 w-3.5 text-muted-foreground/30" />;
      default:
        return <Circle className="h-3.5 w-3.5 text-muted-foreground/30" />;
    }
  };

  const handleCellClick = (employee: any, dayData: any) => {
    setSelectedDayCell({ employee, dayData });
    setDayDetailModalOpen(true);
  };

  const handleEditFromCell = () => {
    if (!selectedDayCell) return;
    const { employee, dayData } = selectedDayCell;

    const parseTime = (dateStr?: string, defaultVal = "09:30") => {
      if (!dateStr) return defaultVal;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return defaultVal;
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      return `${hh}:${mm}`;
    };

    setAdjustForm({
      employeeId: employee.id,
      date: dayData.date,
      checkIn: parseTime(dayData.checkIn, "09:30"),
      checkOut: parseTime(dayData.checkOut, "18:30"),
      status:
        dayData.statusCode === "PRESENT"
          ? "present"
          : dayData.statusCode === "HALF_DAY"
          ? "half_day"
          : dayData.statusCode === "ON_LEAVE"
          ? "on_leave"
          : dayData.statusCode === "ABSENT"
          ? "absent"
          : "present",
      hours: dayData.hours || 9,
      notes: dayData.notes || "Manual correction from matrix",
    });
    setDayDetailModalOpen(false);
    setAdjustModalOpen(true);
  };

  // Advanced Database-Backed Export Download Helper
  const triggerDownload = async (url: string, defaultFilename: string) => {
    try {
      toast.info("Generating export from live database records...");
      await api.download(url, defaultFilename);
      toast.success("Export generated and downloaded successfully!");
    } catch (err: any) {
      toast.error("Export failed: " + (err.message || err));
    }
  };

  // 1. Monthly Attendance Excel (Matches reference workbook layout)
  const handleExportMonthlyExcel = (cycle: "25_24" | "calendar" = exportCycle, onlySelected = false) => {
    if (onlySelected && selectedEmployeeIds.size === 0) {
      toast.error("Please select at least one employee using the table checkboxes first.");
      return;
    }
    const params = new URLSearchParams({
      year: selectedYear,
      month: selectedMonth,
      cycle,
    });
    if (selectedBranchId !== "all") params.append("branchId", selectedBranchId);
    if (selectedDepartmentId !== "all") params.append("departmentId", selectedDepartmentId);
    if (onlySelected || selectedEmployeeIds.size > 0) {
      params.append("employeeIds", Array.from(selectedEmployeeIds).join(","));
    } else if (selectedEmployeeId !== "all") {
      params.append("employeeId", selectedEmployeeId);
    }

    const url = `/api/v1/hr/attendance/export/excel/monthly?${params.toString()}`;
    triggerDownload(url, `GET_Attendance_Record_${selectedYear}_${selectedMonth}_${cycle}.xlsx`);
  };

  // 2. Monthly Attendance PDF Report (Landscape print)
  const handleExportMonthlyPdf = (cycle: "25_24" | "calendar" = exportCycle, onlySelected = false) => {
    if (onlySelected && selectedEmployeeIds.size === 0) {
      toast.error("Please select at least one employee using the table checkboxes first.");
      return;
    }
    const params = new URLSearchParams({
      year: selectedYear,
      month: selectedMonth,
      cycle,
    });
    if (selectedBranchId !== "all") params.append("branchId", selectedBranchId);
    if (selectedDepartmentId !== "all") params.append("departmentId", selectedDepartmentId);
    if (onlySelected || selectedEmployeeIds.size > 0) {
      params.append("employeeIds", Array.from(selectedEmployeeIds).join(","));
    } else if (selectedEmployeeId !== "all") {
      params.append("employeeId", selectedEmployeeId);
    }

    const url = `/api/v1/hr/attendance/export/pdf/monthly?${params.toString()}`;
    triggerDownload(url, `GET_Attendance_Record_${selectedYear}_${selectedMonth}_${cycle}.pdf`);
  };

  // 3. Yearly Consolidated Attendance Excel (14 worksheets: Consolidated, Jan..Dec, Interns)
  const handleExportYearlyExcel = (cycle: "25_24" | "calendar" = exportCycle, onlySelected = false) => {
    if (onlySelected && selectedEmployeeIds.size === 0) {
      toast.error("Please select at least one employee using the table checkboxes first.");
      return;
    }
    const params = new URLSearchParams({
      year: selectedYear,
      cycle,
    });
    if (selectedBranchId !== "all") params.append("branchId", selectedBranchId);
    if (selectedDepartmentId !== "all") params.append("departmentId", selectedDepartmentId);
    if (onlySelected || selectedEmployeeIds.size > 0) {
      params.append("employeeIds", Array.from(selectedEmployeeIds).join(","));
    } else if (selectedEmployeeId !== "all") {
      params.append("employeeId", selectedEmployeeId);
    }

    const url = `/api/v1/hr/attendance/export/excel/yearly?${params.toString()}`;
    triggerDownload(url, `GET_Attendance_Consolidated_${selectedYear}_${cycle}.xlsx`);
  };

  // 4. Yearly Consolidated Attendance PDF (Landscape summary with Credits, Utilized, LOP)
  const handleExportYearlyPdf = (cycle: "25_24" | "calendar" = exportCycle, onlySelected = false) => {
    if (onlySelected && selectedEmployeeIds.size === 0) {
      toast.error("Please select at least one employee using the table checkboxes first.");
      return;
    }
    const params = new URLSearchParams({
      year: selectedYear,
      cycle,
    });
    if (selectedBranchId !== "all") params.append("branchId", selectedBranchId);
    if (selectedDepartmentId !== "all") params.append("departmentId", selectedDepartmentId);
    if (onlySelected || selectedEmployeeIds.size > 0) {
      params.append("employeeIds", Array.from(selectedEmployeeIds).join(","));
    } else if (selectedEmployeeId !== "all") {
      params.append("employeeId", selectedEmployeeId);
    }

    const url = `/api/v1/hr/attendance/export/pdf/yearly?${params.toString()}`;
    triggerDownload(url, `GET_Attendance_Consolidated_${selectedYear}_${cycle}.pdf`);
  };

  // Filtered employees for bulk selection
  const filteredBulkEmployees = employees.filter((emp: any) => {
    const matchesSearch =
      bulkEmployeeSearch === "" ||
      `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(bulkEmployeeSearch.toLowerCase()) ||
      emp.employeeCode?.toLowerCase().includes(bulkEmployeeSearch.toLowerCase());
    const matchesDept =
      bulkDepartmentFilter === "all" || emp.departmentId === bulkDepartmentFilter;
    return matchesSearch && matchesDept;
  });

  const handleSelectAllBulk = () => {
    const ids = filteredBulkEmployees.map((e: any) => e.id);
    setBulkForm({ ...bulkForm, employeeIds: ids });
  };

  const handleDeselectAllBulk = () => {
    setBulkForm({ ...bulkForm, employeeIds: [] });
  };

  const toggleBulkEmployee = (id: string) => {
    if (bulkForm.employeeIds.includes(id)) {
      setBulkForm({
        ...bulkForm,
        employeeIds: bulkForm.employeeIds.filter((empId) => empId !== id),
      });
    } else {
      setBulkForm({
        ...bulkForm,
        employeeIds: [...bulkForm.employeeIds, id],
      });
    }
  };

  return (
    <div className="space-y-4" style={{ fontFamily: "var(--font-sans)" }}>
      {/* A. Page Header (Strict Reference with Bulk and Export actions) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <Link href="/hr/dashboard" className="hover:text-foreground">
              Dashboard
            </Link>
            <span>&gt;</span>
            <span>Attendance</span>
            <span>&gt;</span>
            <span className="text-foreground font-medium">Attendance Records</span>
          </div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Attendance Records</h1>
          <p className="text-xs text-muted-foreground">View and manage monthly attendance records</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Export Dropdown */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExportMenuOpen(!exportMenuOpen)}
              className="h-9 px-3 text-xs font-semibold gap-1.5 border hover:bg-muted/60"
            >
              <Download className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Export</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-0.5" />
            </Button>

            {exportMenuOpen && (
              <div
                className="absolute right-0 mt-1 w-64 bg-popover text-popover-foreground border rounded-md shadow-lg z-50 py-1 text-xs divide-y divide-border/60"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                <div className="py-1">
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Monthly Exports ({exportCycle === "25_24" ? "25th–24th" : "Calendar"})
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setExportMenuOpen(false);
                      handleExportMonthlyExcel(exportCycle);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-muted/70 transition-colors"
                  >
                    <img src="/excel.svg" alt="Excel" className="h-4 w-4 shrink-0 object-contain" />
                    <div>
                      <p className="font-medium text-foreground">Export Monthly Excel (.xlsx)</p>
                      <p className="text-[10px] text-muted-foreground">
                        {selectedEmployeeIds.size > 0 ? `Selected ${selectedEmployeeIds.size} employees` : "All/filtered employees with formulas"}
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setExportMenuOpen(false);
                      handleExportMonthlyPdf(exportCycle);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-muted/70 transition-colors"
                  >
                    <img src="/pdf.svg" alt="PDF" className="h-4 w-4 shrink-0 object-contain" />
                    <div>
                      <p className="font-medium text-foreground">Export Monthly PDF (.pdf)</p>
                      <p className="text-[10px] text-muted-foreground">
                        {selectedEmployeeIds.size > 0 ? `Selected ${selectedEmployeeIds.size} employees` : "Printable landscape report"}
                      </p>
                    </div>
                  </button>
                </div>

                <div className="py-1">
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Yearly Consolidated ({selectedYear})
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setExportMenuOpen(false);
                      handleExportYearlyExcel(exportCycle);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-muted/70 transition-colors"
                  >
                    <img src="/excel.svg" alt="Excel" className="h-4 w-4 shrink-0 object-contain" />
                    <div>
                      <p className="font-medium text-foreground">Export Consolidated Excel (.xlsx)</p>
                      <p className="text-[10px] text-muted-foreground">14 worksheets: Consolidated, Jan..Dec, Interns</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setExportMenuOpen(false);
                      handleExportYearlyPdf(exportCycle);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-muted/70 transition-colors"
                  >
                    <img src="/pdf.svg" alt="PDF" className="h-4 w-4 shrink-0 object-contain" />
                    <div>
                      <p className="font-medium text-foreground">Export Consolidated PDF (.pdf)</p>
                      <p className="text-[10px] text-muted-foreground">Credits, Utilization & LOP ledger report</p>
                    </div>
                  </button>
                </div>

                <div className="py-1 bg-muted/30">
                  <button
                    type="button"
                    onClick={() => {
                      setExportMenuOpen(false);
                      setExportModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-primary hover:bg-muted font-medium transition-colors"
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                    <span>Advanced Export & Policy Settings...</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bulk Entry Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setBulkForm({
                employeeIds: employees.map((e: any) => e.id),
                date: new Date().toISOString().slice(0, 10),
                checkIn: "09:30",
                checkOut: "18:30",
                status: "present",
                breakMinutes: 60,
                notes: "Bulk daily attendance entry",
                overwriteExisting: true,
              });
              setBulkModalOpen(true);
            }}
            disabled={isLocked}
            className="h-9 px-3.5 text-xs font-semibold gap-1.5 border hover:bg-muted/60"
          >
            <Users className="h-3.5 w-3.5 text-emerald-600" />
            <span>Bulk Entry</span>
          </Button>

          {/* Individual Add Record Button */}
          <Button
            onClick={() => {
              setAdjustForm({
                employeeId: employees[0]?.id || "",
                date: new Date().toISOString().slice(0, 10),
                checkIn: "09:30",
                checkOut: "18:30",
                status: "present",
                hours: 9,
                notes: "",
              });
              setAdjustModalOpen(true);
            }}
            disabled={isLocked}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-9 px-4 rounded-md shadow-sm gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Add Record
          </Button>
        </div>
      </div>

      {/* B. Filter Panel (Single Compact Card) */}
      <div className="bg-card border rounded-lg p-3.5 shadow-sm space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Searchable Employee Dropdown */}
            <div className="relative w-64" ref={employeeDropdownRef}>
              <div
                onClick={() => setEmployeeSearchDropdownOpen(!employeeSearchDropdownOpen)}
                className="flex items-center justify-between w-full h-9 rounded-md border border-input bg-background px-3 text-xs cursor-pointer hover:bg-muted/40 transition-colors font-medium text-foreground"
              >
                <span className="truncate">{selectedEmployeeName}</span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0 ml-1.5" />
              </div>

              {employeeSearchDropdownOpen && (
                <div className="absolute left-0 top-full mt-1 w-72 bg-popover text-popover-foreground border rounded-md shadow-lg z-50 p-2 space-y-1.5">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search employee name or code..."
                      value={employeeFilterSearch}
                      onChange={(e) => setEmployeeFilterSearch(e.target.value)}
                      className="h-8 pl-8 text-xs"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto divide-y divide-border/40 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedEmployeeId("all");
                        setEmployeeSearchDropdownOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded hover:bg-muted font-medium transition-colors ${
                        selectedEmployeeId === "all"
                          ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : ""
                      }`}
                    >
                      All Employees ({employees.length})
                    </button>
                    {filteredLookupEmployees.map((emp: any) => (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => {
                          setSelectedEmployeeId(emp.id);
                          setEmployeeSearchDropdownOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded hover:bg-muted transition-colors flex items-center justify-between ${
                          selectedEmployeeId === emp.id
                            ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold"
                            : ""
                        }`}
                      >
                        <span className="truncate">
                          {emp.firstName} {emp.lastName}
                        </span>
                      </button>
                    ))}
                    {filteredLookupEmployees.length === 0 && (
                      <p className="p-3 text-center text-xs text-muted-foreground">No employees found.</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Month Dropdown */}
            <div className="w-40">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium text-foreground"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={String(i + 1)}>
                    {new Date(0, i).toLocaleString("default", { month: "long" })}
                  </option>
                ))}
              </select>
            </div>

            {/* Year Dropdown (Dynamic Range) */}
            <div className="w-28">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium text-foreground"
              >
                {Array.from({ length: 7 }, (_, i) => {
                  const y = new Date().getUTCFullYear() - 4 + i;
                  return (
                    <option key={y} value={String(y)}>
                      {y}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Filters Button Aligned Right */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilterModalOpen(true)}
            className="h-9 px-3.5 text-xs font-semibold gap-1.5 border hover:bg-muted/60"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
            Filters
          </Button>
        </div>

        {/* Active Month and Year filter chips underneath */}
        <div className="flex items-center gap-2 pt-2 border-t text-xs">
          <span className="text-[11px] text-muted-foreground font-medium">Active Filters:</span>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
            {monthName}
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
            {selectedYear}
          </span>
          {selectedEmployeeId !== "all" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800">
              Employee: {employees.find((e: any) => e.id === selectedEmployeeId)?.firstName || selectedEmployeeId}
              <button
                type="button"
                onClick={() => setSelectedEmployeeId("all")}
                className="hover:text-rose-600 ml-0.5"
              >
                ×
              </button>
            </span>
          )}
          {selectedDepartmentId !== "all" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-800 border border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800">
              Dept: {departments.find((d: any) => d.id === selectedDepartmentId)?.name || selectedDepartmentId}
              <button
                type="button"
                onClick={() => setSelectedDepartmentId("all")}
                className="hover:text-rose-600 ml-0.5"
              >
                ×
              </button>
            </span>
          )}
          {searchTerm && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
              &quot;{searchTerm}&quot;
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="hover:text-rose-600 ml-0.5"
              >
                ×
              </button>
            </span>
          )}
        </div>
      </div>

      {/* C. Attendance Legend (Horizontal Icon-Based Arrangement) */}
      <div className="bg-card border rounded-lg p-2.5 shadow-sm overflow-x-auto">
        <div className="flex items-center gap-x-5 gap-y-1.5 text-xs whitespace-nowrap min-w-max text-muted-foreground font-medium">
          <div className="flex items-center gap-1.5 text-foreground">
            <Check className="h-4 w-4 text-emerald-600 stroke-[3]" />
            <span>Present</span>
          </div>
          <div className="flex items-center gap-1.5 text-foreground">
            <X className="h-4 w-4 text-rose-600 stroke-[3]" />
            <span>Absent</span>
          </div>
          <div className="flex items-center gap-1.5 text-foreground">
            <span className="text-amber-500 font-bold text-xs">½</span>
            <span>Half Day</span>
          </div>
          <div className="flex items-center gap-1.5 text-foreground">
            <Flag className="h-3.5 w-3.5 text-rose-500 fill-rose-500" />
            <span>On Leave</span>
          </div>
          <div className="flex items-center gap-1.5 text-foreground">
            <span className="inline-flex items-center justify-center px-1 py-0.5 text-[9px] font-bold rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
              SL
            </span>
            <span>Sandwich Leave</span>
          </div>
          <div className="flex items-center gap-1.5 text-foreground">
            <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
            <span>Holiday</span>
          </div>
          <div className="flex items-center gap-1.5 text-foreground">
            <Ban className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Day Off</span>
          </div>
          <div className="flex items-center gap-1.5 text-foreground">
            <span className="text-muted-foreground tabular-nums font-bold">-</span>
            <span>Future</span>
          </div>
          <div className="flex items-center gap-1.5 text-foreground">
            <Circle className="h-3.5 w-3.5 text-muted-foreground/60" />
            <span>Attendance Not Added</span>
          </div>
          <div className="flex items-center gap-1.5 text-foreground">
            <Clock className="h-3.5 w-3.5 text-amber-500" />
            <span>Late</span>
          </div>
          <div className="flex items-center gap-1.5 text-foreground">
            <ArrowDownRight className="h-3.5 w-3.5 text-rose-500 stroke-[2.5]" />
            <span>Early Departure</span>
          </div>
          <div className="flex items-center gap-1.5 text-foreground">
            <Timer className="h-3.5 w-3.5 text-blue-500" />
            <span>Overtime</span>
          </div>
        </div>
      </div>

      {/* Multi-Employee Selection Count Banner */}
      {selectedEmployeeIds.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-emerald-900 dark:text-emerald-200">
              {selectedEmployeeIds.size} of {matrix.length} employee(s) selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearSelection}
              className="h-7 text-xs px-2.5 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
            >
              Clear Selection
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => handleExportMonthlyExcel(exportCycle, true)}
              className="h-7 text-xs px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
            >
              <img src="/excel.svg" alt="Excel" className="h-3.5 w-3.5 object-contain" />
              <span>Export Selected (Excel)</span>
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => handleExportMonthlyPdf(exportCycle, true)}
              className="h-7 text-xs px-2.5 bg-rose-600 hover:bg-rose-700 text-white gap-1"
            >
              <img src="/pdf.svg" alt="PDF" className="h-3.5 w-3.5 object-contain" />
              <span>Export Selected (PDF)</span>
            </Button>
          </div>
        </div>
      )}

      {/* D. Monthly Attendance Matrix (Strict Reference Table Structure) */}
      <div className="border rounded-lg bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-muted/40 border-b text-[11px] font-semibold text-muted-foreground uppercase sticky top-0 z-10">
              {/* First header row: Employee | Month Year centered | Total */}
              <tr className="border-b">
                <th
                  rowSpan={2}
                  className="px-4 py-3 sticky left-0 bg-muted/90 z-20 w-72 min-w-[260px] border-r shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)] align-middle font-bold text-foreground"
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={matrix.length > 0 && matrix.every((r: any) => selectedEmployeeIds.has(r.employee.id))}
                      onChange={toggleSelectAll}
                      title="Select all displayed employees"
                      className="rounded border-input text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5 cursor-pointer shrink-0"
                    />
                    <span>Employee</span>
                  </div>
                </th>
                <th
                  colSpan={daysInMonth}
                  className="py-2 text-center border-r font-bold text-foreground tracking-wide bg-muted/60"
                >
                  {monthName} {selectedYear}
                </th>
                <th
                  rowSpan={2}
                  className="px-4 py-3 text-center align-middle font-bold text-foreground w-24 min-w-[90px]"
                >
                  Total
                </th>
              </tr>

              {/* Second header row: Days 1..N with Day of Week underneath */}
              <tr className="bg-muted/30">
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const dayNum = i + 1;
                  const d = new Date(Date.UTC(Number(selectedYear), Number(selectedMonth) - 1, dayNum));
                  const dayOfWeek = d.toLocaleDateString("en-US", { weekday: "narrow", timeZone: "UTC" });
                  const isWeekend = d.getUTCDay() === 0 || d.getUTCDay() === 6;

                  return (
                    <th
                      key={dayNum}
                      className={`p-1.5 text-center border-r min-w-[34px] ${
                        isWeekend ? "bg-muted/60 text-muted-foreground" : "text-foreground"
                      }`}
                    >
                      <div className="font-bold text-xs">{dayNum < 10 ? `0${dayNum}` : dayNum}</div>
                      <div className="text-[10px] text-muted-foreground font-normal">{dayOfWeek}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {loadingMatrix ? (
                <tr>
                  <td colSpan={daysInMonth + 2} className="px-6 py-12 text-center text-muted-foreground text-sm">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-emerald-600" />
                    Loading attendance matrix...
                  </td>
                </tr>
              ) : matrix.length === 0 ? (
                <tr>
                  <td colSpan={daysInMonth + 2} className="px-6 py-12 text-center text-muted-foreground text-sm">
                    No employees found matching filter criteria.
                  </td>
                </tr>
              ) : (
                matrix.map((row: any) => {
                  const emp = row.employee;
                  return (
                    <tr key={emp.id} className="hover:bg-muted/20 transition-colors">
                      {/* Sticky Employee Identity Column */}
                      <td className="sticky left-0 bg-background z-10 px-4 py-2.5 border-r shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]">
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={selectedEmployeeIds.has(emp.id)}
                            onChange={() => toggleSelectEmployee(emp.id)}
                            className="rounded border-input text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5 cursor-pointer shrink-0"
                          />
                          {emp.avatarUrl ? (
                            <img
                              src={emp.avatarUrl}
                              alt={emp.name}
                              className="w-8 h-8 rounded-full object-cover border shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-300 dark:border-emerald-800">
                              {emp.name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="truncate min-w-0">
                            <p className="font-semibold text-xs text-foreground truncate">{emp.name}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{emp.designation}</p>
                          </div>
                        </div>
                      </td>

                      {/* Daily Attendance Columns */}
                      {row.days.map((day: any) => {
                        const d = new Date(day.date);
                        const isWeekend = d.getUTCDay() === 0 || d.getUTCDay() === 6;
                        return (
                          <td
                            key={day.day}
                            onClick={() => handleCellClick(emp, day)}
                            className={`p-1 text-center border-r cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors ${
                              isWeekend ? "bg-muted/30" : ""
                            }`}
                            title={`Day ${day.day}: ${day.statusCode} (${day.hours || 0} hrs)`}
                          >
                            <div className="flex flex-col items-center justify-center min-h-[36px]">
                              {/* Primary Status Icon */}
                              {renderStatusIcon(day)}

                              {/* Indicators beneath */}
                              {(day.isLate || day.isEarlyOut || day.isOvertime) && (
                                <div className="flex items-center justify-center gap-0.5 mt-0.5">
                                  {day.isLate && (
                                    <span title={`Late: ${day.lateMinutes}m`}>
                                      <Clock className="h-2.5 w-2.5 text-amber-500" />
                                    </span>
                                  )}
                                  {day.isEarlyOut && (
                                    <span title={`Early departure: ${day.earlyOutMinutes}m`}>
                                      <ArrowDownRight className="h-2.5 w-2.5 text-rose-500 stroke-[2.5]" />
                                    </span>
                                  )}
                                  {day.isOvertime && (
                                    <span title={`Overtime: ${day.overtimeMinutes}m`}>
                                      <Timer className="h-2.5 w-2.5 text-blue-500" />
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      })}

                      {/* Single Total Column (Strict Reference Format e.g. 17/21) */}
                      <td className="px-3 py-2.5 text-center font-bold text-xs text-foreground bg-muted/10">
                        {row.summary.attendanceScore}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Day Details View Modal */}
      <Dialog open={dayDetailModalOpen} onOpenChange={setDayDetailModalOpen}>
        <DialogContent className="sm:max-w-md" style={{ fontFamily: "var(--font-sans)" }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <Calendar className="h-4 w-4 text-emerald-600" />
              Day Attendance Details
            </DialogTitle>
            <DialogDescription className="text-xs">
              {selectedDayCell?.employee?.name} ({selectedDayCell?.employee?.code}) — {selectedDayCell?.dayData?.date}
            </DialogDescription>
          </DialogHeader>

          {selectedDayCell && (
            <div className="space-y-3 py-2 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-muted/40 rounded-lg">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Status</span>
                  <span className="font-semibold text-foreground flex items-center gap-1.5 mt-0.5">
                    {renderStatusIcon(selectedDayCell.dayData)}
                    {selectedDayCell.dayData.statusCode}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Total Hours</span>
                  <span className="font-semibold text-foreground text-sm">
                    {selectedDayCell.dayData.hours ? `${selectedDayCell.dayData.hours} hrs` : "0 hrs"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Check-In</span>
                  <span className="font-semibold text-foreground">
                    {selectedDayCell.dayData.checkIn
                      ? new Date(selectedDayCell.dayData.checkIn).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Check-Out</span>
                  <span className="font-semibold text-foreground">
                    {selectedDayCell.dayData.checkOut
                      ? new Date(selectedDayCell.dayData.checkOut).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </span>
                </div>
              </div>

              {(selectedDayCell.dayData.isLate ||
                selectedDayCell.dayData.isEarlyOut ||
                selectedDayCell.dayData.isOvertime) && (
                <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-md text-[11px] space-y-1">
                  {selectedDayCell.dayData.isLate && (
                    <p className="text-amber-800 dark:text-amber-300">
                      • Late arrival by {selectedDayCell.dayData.lateMinutes || 0} minutes
                    </p>
                  )}
                  {selectedDayCell.dayData.isEarlyOut && (
                    <p className="text-rose-800 dark:text-rose-300">
                      • Early departure by {selectedDayCell.dayData.earlyOutMinutes || 0} minutes
                    </p>
                  )}
                  {selectedDayCell.dayData.isOvertime && (
                    <p className="text-blue-800 dark:text-blue-300">
                      • Overtime logged: {selectedDayCell.dayData.overtimeMinutes || 0} minutes
                    </p>
                  )}
                </div>
              )}

              {selectedDayCell.dayData.notes && (
                <div className="p-2.5 bg-muted/20 border rounded-md">
                  <span className="text-muted-foreground block text-[10px] font-semibold uppercase">Notes</span>
                  <p className="text-foreground mt-0.5">{selectedDayCell.dayData.notes}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDayDetailModalOpen(false)}
            >
              Close
            </Button>
            <Button
              size="sm"
              disabled={isLocked}
              onClick={handleEditFromCell}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Adjust Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: Add / Adjust Attendance Record Dialog */}
      <Dialog open={adjustModalOpen} onOpenChange={setAdjustModalOpen}>
        <DialogContent className="sm:max-w-md" style={{ fontFamily: "var(--font-sans)" }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <Plus className="h-4 w-4 text-emerald-600" />
              Add / Adjust Attendance Record
            </DialogTitle>
            <DialogDescription className="text-xs">
              Manually correct or insert an attendance record. Reason is mandatory for audit trail.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              adjustMutation.mutate(adjustForm);
            }}
            className="space-y-3.5 py-2 text-xs"
          >
            <div>
              <label className="block text-[11px] font-semibold text-foreground mb-1">
                Employee <span className="text-rose-500">*</span>
              </label>
              <select
                value={adjustForm.employeeId}
                onChange={(e) => setAdjustForm({ ...adjustForm, employeeId: e.target.value })}
                required
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
              >
                <option value="">Select Employee</option>
                {employees.map((emp: any) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-foreground mb-1">
                  Date <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="date"
                  value={adjustForm.date}
                  onChange={(e) => setAdjustForm({ ...adjustForm, date: e.target.value })}
                  required
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-foreground mb-1">
                  Status <span className="text-rose-500">*</span>
                </label>
                <select
                  value={adjustForm.status}
                  onChange={(e) => setAdjustForm({ ...adjustForm, status: e.target.value })}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                >
                  <option value="present">Present</option>
                  <option value="half_day">Half Day</option>
                  <option value="on_leave">On Leave</option>
                  <option value="absent">Absent</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-foreground mb-1">Check-In</label>
                <Input
                  type="time"
                  value={adjustForm.checkIn}
                  onChange={(e) => setAdjustForm({ ...adjustForm, checkIn: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-foreground mb-1">Check-Out</label>
                <Input
                  type="time"
                  value={adjustForm.checkOut}
                  onChange={(e) => setAdjustForm({ ...adjustForm, checkOut: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-foreground mb-1">Hours</label>
                <Input
                  type="number"
                  step="0.5"
                  value={adjustForm.hours}
                  onChange={(e) => setAdjustForm({ ...adjustForm, hours: parseFloat(e.target.value) || 0 })}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-foreground mb-1">
                Reason / Remarks <span className="text-rose-500">*</span>
              </label>
              <Input
                placeholder="Reason for manual adjustment (mandatory for audit)..."
                value={adjustForm.notes}
                onChange={(e) => setAdjustForm({ ...adjustForm, notes: e.target.value })}
                required
                className="h-9 text-xs"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAdjustModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={adjustMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {adjustMutation.isPending ? "Saving..." : "Save Record"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: Bulk Attendance Entry Dialog */}
      <Dialog open={bulkModalOpen} onOpenChange={setBulkModalOpen}>
        <DialogContent className="sm:max-w-2xl" style={{ fontFamily: "var(--font-sans)" }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <Users className="h-4 w-4 text-emerald-600" />
              Bulk Attendance Entry
            </DialogTitle>
            <DialogDescription className="text-xs">
              Simultaneously apply attendance for multiple employees. Transaction safety and period lock asserted.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (bulkForm.employeeIds.length === 0) {
                toast.error("Please select at least one employee");
                return;
              }
              bulkAdjustMutation.mutate(bulkForm);
            }}
            className="space-y-3.5 py-2 text-xs"
          >
            {/* Common date and status settings */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-muted/30 rounded-lg">
              <div>
                <label className="block text-[11px] font-semibold text-foreground mb-1">
                  Attendance Date <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="date"
                  value={bulkForm.date}
                  onChange={(e) => setBulkForm({ ...bulkForm, date: e.target.value })}
                  required
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-foreground mb-1">
                  Status <span className="text-rose-500">*</span>
                </label>
                <select
                  value={bulkForm.status}
                  onChange={(e) => setBulkForm({ ...bulkForm, status: e.target.value })}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                >
                  <option value="present">Present</option>
                  <option value="half_day">Half Day</option>
                  <option value="on_leave">On Leave</option>
                  <option value="absent">Absent</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-foreground mb-1">Break Duration (Mins)</label>
                <Input
                  type="number"
                  value={bulkForm.breakMinutes}
                  onChange={(e) => setBulkForm({ ...bulkForm, breakMinutes: parseInt(e.target.value, 10) || 0 })}
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-foreground mb-1">Common Check-In</label>
                <Input
                  type="time"
                  value={bulkForm.checkIn}
                  onChange={(e) => setBulkForm({ ...bulkForm, checkIn: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-foreground mb-1">Common Check-Out</label>
                <Input
                  type="time"
                  value={bulkForm.checkOut}
                  onChange={(e) => setBulkForm({ ...bulkForm, checkOut: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={bulkForm.overwriteExisting}
                    onChange={(e) => setBulkForm({ ...bulkForm, overwriteExisting: e.target.checked })}
                    className="rounded border-input text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Overwrite existing records</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-foreground mb-1">
                Reason / Remarks <span className="text-rose-500">*</span>
              </label>
              <Input
                placeholder="Reason for bulk entry (e.g., On-site client project attendance)..."
                value={bulkForm.notes}
                onChange={(e) => setBulkForm({ ...bulkForm, notes: e.target.value })}
                required
                className="h-9 text-xs"
              />
            </div>

            {/* Employee Selection Section */}
            <div className="border rounded-lg p-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-foreground">Select Employees:</span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    {bulkForm.employeeIds.length} of {employees.length} selected
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAllBulk}
                    className="h-7 text-[11px] px-2.5"
                  >
                    Select All
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDeselectAllBulk}
                    className="h-7 text-[11px] px-2.5"
                  >
                    Clear Selection
                  </Button>
                </div>
              </div>

              {/* In-Modal Search & Department filter */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Input
                  placeholder="Filter employees by name or code..."
                  value={bulkEmployeeSearch}
                  onChange={(e) => setBulkEmployeeSearch(e.target.value)}
                  className="h-8 text-xs"
                />
                <select
                  value={bulkDepartmentFilter}
                  onChange={(e) => setBulkDepartmentFilter(e.target.value)}
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                >
                  <option value="all">All Departments</option>
                  {departments.map((d: any) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Scrollable multi-select list */}
              <div className="max-h-48 overflow-y-auto divide-y border rounded-md">
                {filteredBulkEmployees.length === 0 ? (
                  <p className="p-4 text-center text-xs text-muted-foreground">No employees found.</p>
                ) : (
                  filteredBulkEmployees.map((emp: any) => {
                    const isSelected = bulkForm.employeeIds.includes(emp.id);
                    return (
                      <div
                        key={emp.id}
                        onClick={() => toggleBulkEmployee(emp.id)}
                        className={`flex items-center justify-between p-2 hover:bg-muted/50 cursor-pointer transition-colors ${
                          isSelected ? "bg-emerald-50/50 dark:bg-emerald-950/20" : ""
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          {isSelected ? (
                            <CheckSquare className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <Square className="h-4 w-4 text-muted-foreground" />
                          )}
                          <div>
                            <p className="font-medium text-foreground">
                              {emp.firstName} {emp.lastName}
                            </p>
                            <p className="text-[10px] text-muted-foreground">{emp.department?.name || "General"}</p>
                          </div>
                        </div>
                        <span className="text-[11px] text-muted-foreground">{emp.branch?.name || "HQ"}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setBulkModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={bulkAdjustMutation.isPending || bulkForm.employeeIds.length === 0}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {bulkAdjustMutation.isPending
                  ? "Processing..."
                  : `Apply for ${bulkForm.employeeIds.length} Employee(s)`}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: Advanced Filter Dialog */}
      <Dialog open={filterModalOpen} onOpenChange={setFilterModalOpen}>
        <DialogContent className="sm:max-w-md" style={{ fontFamily: "var(--font-sans)" }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <SlidersHorizontal className="h-4 w-4 text-emerald-600" />
              Filter Attendance Records
            </DialogTitle>
            <DialogDescription className="text-xs">
              Refine matrix display by search query or department.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-foreground mb-1">Search Employee</label>
              <Input
                placeholder="Search by employee name or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-foreground mb-1">Department</label>
              <select
                value={selectedDepartmentId}
                onChange={(e) => setSelectedDepartmentId(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
              >
                <option value="all">All Departments</option>
                {departments.map((dept: any) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm("");
                setSelectedDepartmentId("all");
                setSelectedEmployeeId("all");
                setFilterModalOpen(false);
              }}
            >
              Reset Filters
            </Button>
            <Button
              size="sm"
              onClick={() => setFilterModalOpen(false)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Apply Filters
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 5: Lock / Unlock Period Dialog (Preserved) */}
      <Dialog open={lockModalOpen} onOpenChange={setLockModalOpen}>
        <DialogContent className="sm:max-w-md" style={{ fontFamily: "var(--font-sans)" }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              {isLocked ? <Unlock className="h-4 w-4 text-emerald-600" /> : <Lock className="h-4 w-4 text-rose-600" />}
              {isLocked ? "Unlock Attendance Period" : "Lock Attendance Period"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {isLocked
                ? `Unlocking period ${monthName} ${selectedYear} will re-enable manual edits and regularization processing.`
                : `Locking period ${monthName} ${selectedYear} will finalize records and block further modifications.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-foreground mb-1">
                Audit Notes / Reason
              </label>
              <Input
                placeholder="Reason for locking or unlocking this period..."
                value={lockNotes}
                onChange={(e) => setLockNotes(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setLockModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={lockMutation.isPending}
              onClick={() => lockMutation.mutate({ isLocked: !isLocked, notes: lockNotes })}
              className={isLocked ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-rose-600 hover:bg-rose-700 text-white"}
            >
              {lockMutation.isPending ? "Updating..." : isLocked ? "Unlock Period" : "Lock Period"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 6: Advanced Export & Policy Settings Dialog */}
      <Dialog open={exportModalOpen} onOpenChange={setExportModalOpen}>
        <DialogContent className="sm:max-w-lg" style={{ fontFamily: "var(--font-sans)" }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Settings2 className="h-4 w-4 text-primary" />
              Advanced Export & Period Cycle Options
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure attendance cycle cutoff rules, sandwich leave policy, and download multi-worksheet enterprise exports.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3 text-xs">
            {/* Period Cycle Selector */}
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
              <label className="block text-[11px] font-bold text-foreground">
                Attendance Period Cycle
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setExportCycle("25_24")}
                  className={`flex flex-col text-left p-2.5 rounded border text-xs transition-colors ${
                    exportCycle === "25_24"
                      ? "border-primary bg-primary/10 font-semibold text-primary"
                      : "border-border bg-card text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  <span className="font-bold">25th to 24th Cutoff</span>
                  <span className="text-[10px] opacity-80">Reference workbook standard (e.g. 25-Jul to 24-Aug)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setExportCycle("calendar")}
                  className={`flex flex-col text-left p-2.5 rounded border text-xs transition-colors ${
                    exportCycle === "calendar"
                      ? "border-primary bg-primary/10 font-semibold text-primary"
                      : "border-border bg-card text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  <span className="font-bold">Calendar Month</span>
                  <span className="text-[10px] opacity-80">1st of month to end of month (e.g. 1-Aug to 31-Aug)</span>
                </button>
              </div>
            </div>

            {/* Sandwich Leave Policy Toggle */}
            <div className="rounded-lg border bg-muted/30 p-3 flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="font-bold text-foreground text-xs">Sandwich Leave Policy</p>
                <p className="text-[11px] text-muted-foreground">
                  Deduct intervening weekends & holidays between approved leaves
                </p>
              </div>
              <Button
                variant={sandwichPolicyData?.sandwichRuleEnabled ? "default" : "outline"}
                size="sm"
                onClick={() => toggleSandwichMutation.mutate(!sandwichPolicyData?.sandwichRuleEnabled)}
                disabled={toggleSandwichMutation.isPending}
                className={`h-7 px-2.5 text-xs font-semibold ${
                  sandwichPolicyData?.sandwichRuleEnabled ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""
                }`}
              >
                {sandwichPolicyData?.sandwichRuleEnabled ? "Enabled" : "Disabled"}
              </Button>
            </div>

            {/* Direct Export Buttons Grid */}
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-foreground">
                Download Reports ({exportCycle === "25_24" ? "25th–24th" : "Calendar"})
              </label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    handleExportMonthlyExcel(exportCycle);
                  }}
                  className="h-10 justify-start gap-2 border text-xs font-medium hover:bg-muted"
                >
                  <img src="/excel.svg" alt="Excel" className="h-4 w-4 shrink-0 object-contain" />
                  <div className="text-left leading-tight">
                    <p className="font-semibold text-foreground">Monthly Excel</p>
                    <p className="text-[10px] text-muted-foreground">GET Attendance ({selectedMonth}/{selectedYear})</p>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    handleExportMonthlyPdf(exportCycle);
                  }}
                  className="h-10 justify-start gap-2 border text-xs font-medium hover:bg-muted"
                >
                  <img src="/pdf.svg" alt="PDF" className="h-4 w-4 shrink-0 object-contain" />
                  <div className="text-left leading-tight">
                    <p className="font-semibold text-foreground">Monthly PDF</p>
                    <p className="text-[10px] text-muted-foreground">Landscape Sheet</p>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    handleExportYearlyExcel(exportCycle);
                  }}
                  className="h-10 justify-start gap-2 border text-xs font-medium hover:bg-muted"
                >
                  <img src="/excel.svg" alt="Excel" className="h-4 w-4 shrink-0 object-contain" />
                  <div className="text-left leading-tight">
                    <p className="font-semibold text-foreground">Yearly Excel</p>
                    <p className="text-[10px] text-muted-foreground">14-Worksheet Consolidated</p>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    handleExportYearlyPdf(exportCycle);
                  }}
                  className="h-10 justify-start gap-2 border text-xs font-medium hover:bg-muted"
                >
                  <img src="/pdf.svg" alt="PDF" className="h-4 w-4 shrink-0 object-contain" />
                  <div className="text-left leading-tight">
                    <p className="font-semibold text-foreground">Yearly PDF</p>
                    <p className="text-[10px] text-muted-foreground">Consolidated Ledger</p>
                  </div>
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setExportModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
