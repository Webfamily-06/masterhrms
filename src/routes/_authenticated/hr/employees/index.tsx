import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useMasterList } from "@/hooks/use-master-list";
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  UserPlus,
  UploadCloud,
  Eye,
  EyeOff,
  Edit,
  KeyRound,
  Lock,
  Unlock,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  UserX,
  Calendar,
  Filter,
  List,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Search,
  ArrowUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/hr/employees/")({
  component: EmployeesDirectoryPage,
  head: () => ({
    meta: [{ title: "Employee Directory — Master HRMS" }],
  }),
});

export interface EmployeeItem {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  position?: string | null;
  employmentType: "full_time" | "part_time" | "contract" | "intern" | string;
  status: "active" | "on_leave" | "terminated" | string;
  joinedAt?: string | null;
  avatarUrl?: string | null;
  loginStatus?: "active" | "inactive" | string;
  userId?: string | null;
  department?: { id: string; name: string } | null;
  branch?: { id: string; name: string; code?: string } | null;
  designation?: { id: string; name: string } | null;
  manager?: { id: string; firstName: string; lastName: string; employeeCode: string } | null;
  allowedActions?: string[];
}

export function formatEmploymentType(type?: string): string {
  if (!type) return "—";
  switch (type.toLowerCase()) {
    case "full_time":
      return "Full Time";
    case "part_time":
      return "Part Time";
    case "contract":
      return "Contract";
    case "intern":
      return "Intern";
    default:
      return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

export function getPaginationDisplayRange(page: number, limit: number, total: number): string {
  if (total === 0) return "Showing 0–0 of 0 employees";
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);
  return `Showing ${start}–${end} of ${total} employees`;
}

export function getStatusBadge(status?: string) {
  const norm = (status || "").toLowerCase();
  switch (norm) {
    case "active":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
          Active
        </span>
      );
    case "probation":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
          Probation
        </span>
      );
    case "on_leave":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
          On Leave
        </span>
      );
    case "terminated":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
          Terminated
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 capitalize">
          {status || "Inactive"}
        </span>
      );
  }
}

export function getLoginStatusBadge(loginStatus?: string, userId?: string | null) {
  const isActive = loginStatus === "active" || (!loginStatus && Boolean(userId));
  if (isActive) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
        Active
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
      Inactive
    </span>
  );
}

export function EmployeesDirectoryPage() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [selectedDept, setSelectedDept] = useState("all");
  const [selectedDesignation, setSelectedDesignation] = useState("all");
  const [selectedEmploymentType, setSelectedEmploymentType] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  // Action Dialog States
  const [passwordTargetEmployee, setPasswordTargetEmployee] = useState<EmployeeItem | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [statusTargetEmployee, setStatusTargetEmployee] = useState<EmployeeItem | null>(null);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  const handleOpenPasswordModal = (emp: EmployeeItem) => {
    setPasswordTargetEmployee(emp);
    setNewPassword("");
    setConfirmPassword("");
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setPasswordError(null);
  };

  const handleClosePasswordModal = () => {
    setPasswordTargetEmployee(null);
    setNewPassword("");
    setConfirmPassword("");
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setPasswordError(null);
  };

  const handleSubmitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordTargetEmployee) return;

    if (!newPassword.trim()) {
      setPasswordError("New password is required.");
      return;
    }
    if (newPassword.trim().length < 6) {
      setPasswordError("Password must be at least 6 characters long.");
      return;
    }
    if (!confirmPassword.trim()) {
      setPasswordError("Please confirm your new password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    try {
      setIsChangingPassword(true);
      setPasswordError(null);

      const res = await api.post(`/hr/employees/${passwordTargetEmployee.id}/password`, {
        newPassword: newPassword.trim(),
        confirmPassword: confirmPassword.trim(),
      });

      toast.success(res?.message || `Password successfully changed for ${passwordTargetEmployee.firstName} ${passwordTargetEmployee.lastName}.`);
      handleClosePasswordModal();
      queryClient.invalidateQueries({ queryKey: ["hr-employees-list"] });
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || "Failed to update employee password.";
      setPasswordError(msg);
      toast.error(msg);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!statusTargetEmployee) return;

    try {
      setIsTogglingStatus(true);
      const res = await api.post(`/hr/employees/${statusTargetEmployee.id}/toggle-account-status`);
      toast.success(res?.message || "Employee account status updated successfully.");
      setStatusTargetEmployee(null);
      queryClient.invalidateQueries({ queryKey: ["hr-employees-list"] });
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || "Failed to update account status.";
      toast.error(msg);
    } finally {
      setIsTogglingStatus(false);
    }
  };

  // Fetch branches, departments, and designations for filter toolbars
  const { data: branches = [] } = useQuery({
    queryKey: ["filter-branches"],
    queryFn: async () => {
      const res = await api.get("/hr/organization/branches", { params: { limit: 100 } });
      return res?.items || res?.data || (Array.isArray(res) ? res : []);
    },
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["filter-departments"],
    queryFn: async () => {
      const res = await api.get("/hr/organization/departments", { params: { limit: 100 } });
      return res?.items || res?.data || (Array.isArray(res) ? res : []);
    },
  });

  const { data: designations = [] } = useQuery({
    queryKey: ["filter-designations"],
    queryFn: async () => {
      const res = await api.get("/hr/organization/designations", { params: { limit: 100 } });
      return res?.items || res?.data || (Array.isArray(res) ? res : []);
    },
  });

  const {
    data: employees,
    total,
    totalPages,
    statusCounts,
    page,
    limit,
    setPage,
    setLimit,
    search,
    setSearch,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    isLoading,
    isError,
    refetch,
  } = useMasterList<EmployeeItem>({
    endpoint: "/hr/employees",
    queryKey: "hr-employees-list",
    defaultLimit: 10,
    defaultSortBy: "joinedAt",
    defaultSortOrder: "desc",
    extraParams: {
      branchId: selectedBranch !== "all" ? selectedBranch : undefined,
      departmentId: selectedDept !== "all" ? selectedDept : undefined,
      designationId: selectedDesignation !== "all" ? selectedDesignation : undefined,
      employmentType: selectedEmploymentType !== "all" ? selectedEmploymentType : undefined,
      status: selectedStatus !== "all" ? selectedStatus : undefined,
    },
  });

  const handleResetFilters = () => {
    setSelectedBranch("all");
    setSelectedDept("all");
    setSelectedDesignation("all");
    setSelectedEmploymentType("all");
    setSelectedStatus("all");
    setSearch("");
    setPage(1);
  };

  const startRow = total === 0 ? 0 : (page - 1) * limit + 1;
  const endRow = Math.min(page * limit, total);

  // Status counts from real database records
  const allCount = statusCounts?.all ?? total;
  const activeCount = statusCounts?.active ?? 0;
  const inactiveCount = statusCounts?.inactive ?? 0;
  const probationCount = statusCounts?.probation ?? 0;
  const termCount = statusCounts?.terminated ?? 0;

  return (
    <div className="space-y-6">
      {/* ── Breadcrumb Navigation ── */}
      <BreadcrumbNav />

      {/* ── Header Title & Actions ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Employees</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage employees and their information.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/hr/employees/import">
            <Button variant="outline" className="gap-2 h-9 text-xs">
              <UploadCloud className="h-4 w-4" />
              Import CSV / Excel
            </Button>
          </Link>
          <Link to="/hr/employees/new">
            <Button className="gap-2 h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs">
              <UserPlus className="h-4 w-4" />
              Add Employee
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Filter & Search Toolbar Container ── */}
      <div className="rounded-xl border bg-card p-4 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search..."
              className="pl-9 h-10 text-xs bg-background"
            />
          </div>

          {/* Quick Selects */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Branch Filter */}
            <Select
              value={selectedBranch}
              onValueChange={(val) => {
                setSelectedBranch(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[145px] h-10 text-xs bg-background">
                <SelectValue placeholder="All Branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {branches.map((b: any) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Department Filter */}
            <Select
              value={selectedDept}
              onValueChange={(val) => {
                setSelectedDept(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[160px] h-10 text-xs bg-background">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((d: any) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Designation Filter */}
            <Select
              value={selectedDesignation}
              onValueChange={(val) => {
                setSelectedDesignation(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[160px] h-10 text-xs bg-background">
                <SelectValue placeholder="All Designations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Designations</SelectItem>
                {designations.map((d: any) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Advanced Filters Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-10 text-xs gap-1.5 px-3 bg-background">
                  <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Filters</span>
                  {(selectedEmploymentType !== "all" || selectedStatus !== "all") && (
                    <span className="ml-1 h-2 w-2 rounded-full bg-emerald-500" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-4 space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <h4 className="font-semibold text-sm text-foreground">Advanced Filters</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
                    onClick={handleResetFilters}
                  >
                    <RotateCcw className="h-3 w-3" />
                    Reset
                  </Button>
                </div>
                <div className="space-y-3 text-xs">
                  <div className="space-y-1.5">
                    <label className="font-medium text-foreground">Employee Type</label>
                    <Select
                      value={selectedEmploymentType}
                      onValueChange={(val) => {
                        setSelectedEmploymentType(val);
                        setPage(1);
                      }}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="All Employee Types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Employee Types</SelectItem>
                        <SelectItem value="full_time">Full Time</SelectItem>
                        <SelectItem value="part_time">Part Time</SelectItem>
                        <SelectItem value="contract">Contract</SelectItem>
                        <SelectItem value="intern">Intern</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* View Mode Toggle Button Group */}
            <div className="flex items-center rounded-lg border bg-muted/40 p-0.5 gap-0.5">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                aria-label="List View"
                title="List View"
                className={cn(
                  "flex items-center justify-center h-9 w-9 rounded-md transition-colors",
                  viewMode === "list"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                aria-label="Grid View"
                title="Grid View"
                className={cn(
                  "flex items-center justify-center h-9 w-9 rounded-md transition-colors",
                  viewMode === "grid"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Status Tabs Row (Real Database Tallies) ── */}
        <div className="flex items-center gap-2 overflow-x-auto pt-1 scrollbar-none border-t border-border/50">
          {[
            { id: "all", label: "All", count: allCount, icon: LayoutGrid },
            { id: "active", label: "Active", count: activeCount, icon: CheckCircle2, color: "text-emerald-500" },
            { id: "inactive", label: "Inactive", count: inactiveCount, icon: XCircle, color: "text-slate-400" },
            { id: "probation", label: "Probation", count: probationCount, icon: Clock, color: "text-amber-500" },
            { id: "terminated", label: "Terminated", count: termCount, icon: UserX, color: "text-rose-500" },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = selectedStatus === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setSelectedStatus(tab.id);
                  setPage(1);
                }}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap",
                  isSelected
                    ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold ring-1 ring-emerald-500/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
              >
                <Icon className={cn("h-3.5 w-3.5", tab.color)} />
                <span>{tab.label}</span>
                <span
                  className={cn(
                    "px-2 py-0.5 rounded-full text-[11px] font-semibold transition-colors",
                    isSelected
                      ? "bg-emerald-600 text-white"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Error Banner State ── */}
      {isError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-center space-y-2">
          <p className="text-sm font-medium text-destructive">Failed to load employee records from backend.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="text-xs gap-1.5">
            <RotateCcw className="h-3 w-3" />
            Retry
          </Button>
        </div>
      )}

      {/* ── Data Display: List View vs Grid View ── */}
      {viewMode === "list" ? (
        <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-12 text-center text-xs font-semibold">#</TableHead>
                  <TableHead className="min-w-[220px]">
                    <button
                      type="button"
                      onClick={() => {
                        if (sortBy === "firstName") {
                          setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                        } else {
                          setSortBy("firstName");
                          setSortOrder("asc");
                        }
                      }}
                      className="flex items-center gap-1.5 hover:text-foreground text-xs font-semibold"
                    >
                      <span>Name</span>
                      <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </TableHead>
                  <TableHead className="text-xs font-semibold">Employee ID</TableHead>
                  <TableHead className="text-xs font-semibold">Department</TableHead>
                  <TableHead className="text-xs font-semibold">Designation</TableHead>
                  <TableHead className="text-xs font-semibold">Employee Type</TableHead>
                  <TableHead className="text-xs font-semibold">Branch</TableHead>
                  <TableHead className="text-xs font-semibold">Employee Status</TableHead>
                  <TableHead className="text-xs font-semibold">Joined</TableHead>
                  <TableHead className="text-xs font-semibold">Login Status</TableHead>
                  <TableHead className="text-right text-xs font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={11} className="py-16 text-center text-sm text-muted-foreground">
                      Loading employee workforce...
                    </TableCell>
                  </TableRow>
                ) : employees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="py-16 text-center text-sm text-muted-foreground">
                      <div className="space-y-3">
                        <Users className="mx-auto h-8 w-8 text-muted-foreground/60" />
                        <p className="font-medium text-foreground">No employees found matching the specified filters.</p>
                        <Button variant="outline" size="sm" onClick={handleResetFilters} className="text-xs gap-1.5">
                          <RotateCcw className="h-3 w-3" />
                          Reset Filters
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  employees.map((emp, index) => {
                    const rowNum = (page - 1) * limit + index + 1;
                    return (
                      <TableRow key={emp.id} className="hover:bg-muted/40 transition-colors">
                        <TableCell className="text-center font-mono text-xs text-muted-foreground">
                          {rowNum}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 shrink-0 ring-1 ring-border/50">
                              {emp.avatarUrl ? (
                                <AvatarImage src={emp.avatarUrl} alt={`${emp.firstName} ${emp.lastName}`} />
                              ) : null}
                              <AvatarFallback className="bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold text-xs">
                                {emp.firstName?.slice(0, 1)?.toUpperCase()}
                                {emp.lastName?.slice(0, 1)?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-semibold text-sm text-foreground">
                                {emp.firstName} {emp.lastName}
                              </div>
                              <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {emp.email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                            {emp.employeeCode}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm font-medium text-foreground">
                          {emp.department?.name || "—"}
                        </TableCell>
                        <TableCell className="text-sm text-foreground">
                          {emp.designation?.name || emp.position || "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground capitalize">
                          {formatEmploymentType(emp.employmentType)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {emp.branch?.name || "—"}
                        </TableCell>
                        <TableCell>{getStatusBadge(emp.status)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {emp.joinedAt ? (
                            <span className="inline-flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                              {format(new Date(emp.joinedAt), "yyyy-MM-dd")}
                            </span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>{getLoginStatusBadge(emp.loginStatus, emp.userId)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Link to="/hr/employees/$id" params={{ id: emp.id }}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                                aria-label={`View 360 profile for ${emp.firstName} ${emp.lastName}`}
                                title="View 360 Profile"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Link to="/hr/employees/$id/edit" params={{ id: emp.id }}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                                aria-label={`Edit ${emp.firstName} ${emp.lastName}`}
                                title="Edit Employee"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                              aria-label={`Change password for ${emp.firstName} ${emp.lastName}`}
                              title="Change Password"
                              onClick={() => handleOpenPasswordModal(emp)}
                            >
                              <KeyRound className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={cn(
                                "h-8 w-8 transition-colors",
                                emp.loginStatus === "active"
                                  ? "text-muted-foreground hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                                  : "text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                              )}
                              aria-label={
                                emp.loginStatus === "active"
                                  ? `Deactivate login account for ${emp.firstName} ${emp.lastName}`
                                  : `Activate login account for ${emp.firstName} ${emp.lastName}`
                              }
                              title={emp.loginStatus === "active" ? "Deactivate Account" : "Activate Account"}
                              onClick={() => setStatusTargetEmployee(emp)}
                            >
                              {emp.loginStatus === "active" ? (
                                <Lock className="h-4 w-4" />
                              ) : (
                                <Unlock className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : (
        /* ── Grid View: Responsive Card Grid ── */
        <div>
          {isLoading ? (
            <div className="py-24 text-center text-sm text-muted-foreground">
              Loading employee workforce...
            </div>
          ) : employees.length === 0 ? (
            <div className="rounded-xl border bg-card p-12 text-center space-y-3">
              <Users className="mx-auto h-8 w-8 text-muted-foreground/60" />
              <p className="font-medium text-foreground">No employees found matching the specified filters.</p>
              <Button variant="outline" size="sm" onClick={handleResetFilters} className="text-xs gap-1.5">
                <RotateCcw className="h-3 w-3" />
                Reset Filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {employees.map((emp) => (
                <Card
                  key={emp.id}
                  className="relative overflow-hidden hover:shadow-md transition-shadow border-border/80 flex flex-col justify-between bg-card"
                >
                  <CardContent className="p-5 flex flex-col items-center text-center">
                    {/* Top status badges */}
                    <div className="w-full flex items-center justify-between mb-3">
                      {getStatusBadge(emp.status)}
                      {getLoginStatusBadge(emp.loginStatus, emp.userId)}
                    </div>

                    {/* Avatar & Name */}
                    <Avatar className="h-16 w-16 mb-2.5 ring-2 ring-emerald-500/20">
                      {emp.avatarUrl ? (
                        <AvatarImage src={emp.avatarUrl} alt={`${emp.firstName} ${emp.lastName}`} />
                      ) : null}
                      <AvatarFallback className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 text-lg font-bold">
                        {emp.firstName?.slice(0, 1)?.toUpperCase()}
                        {emp.lastName?.slice(0, 1)?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <h3 className="font-bold text-base text-foreground leading-tight">
                      {emp.firstName} {emp.lastName}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5 max-w-full truncate">
                      {emp.email}
                    </p>

                    <div className="my-2.5">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                        {emp.employeeCode}
                      </span>
                    </div>

                    {/* Metadata summary */}
                    <div className="w-full border-t border-border/60 pt-3 mt-1 space-y-1.5 text-xs text-left">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Department:</span>
                        <span className="font-medium text-foreground truncate max-w-[140px] text-right">
                          {emp.department?.name || "—"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Designation:</span>
                        <span className="font-medium text-foreground truncate max-w-[140px] text-right">
                          {emp.designation?.name || emp.position || "—"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Branch:</span>
                        <span className="font-medium text-foreground truncate max-w-[140px] text-right">
                          {emp.branch?.name || "—"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Type:</span>
                        <span className="font-medium text-foreground text-right">
                          {formatEmploymentType(emp.employmentType)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Joined:</span>
                        <span className="font-medium text-foreground text-right">
                          {emp.joinedAt ? format(new Date(emp.joinedAt), "yyyy-MM-dd") : "—"}
                        </span>
                      </div>
                    </div>
                  </CardContent>

                  {/* Card Actions Footer */}
                  <div className="border-t bg-muted/20 px-3 py-2.5 flex items-center justify-between gap-1.5">
                    <Link to="/hr/employees/$id" params={{ id: emp.id }} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full text-xs h-8 gap-1 px-2">
                        <Eye className="h-3.5 w-3.5" />
                        View 360
                      </Button>
                    </Link>
                    <Link to="/hr/employees/$id/edit" params={{ id: emp.id }} className="flex-1">
                      <Button variant="ghost" size="sm" className="w-full text-xs h-8 gap-1 px-2 border border-transparent hover:border-border">
                        <Edit className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted shrink-0"
                      aria-label={`Change password for ${emp.firstName} ${emp.lastName}`}
                      title="Change Password"
                      onClick={() => handleOpenPasswordModal(emp)}
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className={cn(
                        "h-8 w-8 shrink-0 transition-colors",
                        emp.loginStatus === "active"
                          ? "text-muted-foreground hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                          : "text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                      )}
                      aria-label={
                        emp.loginStatus === "active"
                          ? `Deactivate login account for ${emp.firstName} ${emp.lastName}`
                          : `Activate login account for ${emp.firstName} ${emp.lastName}`
                      }
                      title={emp.loginStatus === "active" ? "Deactivate Account" : "Activate Account"}
                      onClick={() => setStatusTargetEmployee(emp)}
                    >
                      {emp.loginStatus === "active" ? (
                        <Lock className="h-3.5 w-3.5" />
                      ) : (
                        <Unlock className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Functional Pagination Footer (Section 4) ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t pt-4 text-xs text-muted-foreground">
        <div>
          <span>
            Showing <strong className="text-foreground">{startRow}</strong>–
            <strong className="text-foreground">{endRow}</strong> of{" "}
            <strong className="text-foreground">{total}</strong> employees
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Rows per page selector: 10, 20, 30 */}
          <div className="flex items-center gap-2">
            <span className="whitespace-nowrap">Rows per page:</span>
            <Select
              value={String(limit)}
              onValueChange={(val) => {
                setLimit(Number(val));
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-16 text-xs bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="30">30</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <span className="whitespace-nowrap">
            Page <strong className="text-foreground">{page}</strong> of{" "}
            <strong className="text-foreground">{totalPages}</strong>
          </span>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="h-8 text-xs gap-1 px-2.5 bg-background"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="h-8 text-xs gap-1 px-2.5 bg-background"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* ── Modal: Change Employee Password ── */}
      <Dialog
        open={Boolean(passwordTargetEmployee)}
        onOpenChange={(open) => {
          if (!open) handleClosePasswordModal();
        }}
      >
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-lg font-semibold tracking-tight text-foreground flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              Change Employee Password
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {passwordTargetEmployee && (
                <>
                  Set a new login password for{" "}
                  <span className="font-semibold text-foreground">
                    {passwordTargetEmployee.firstName} {passwordTargetEmployee.lastName}
                  </span>{" "}
                  ({passwordTargetEmployee.employeeCode}).
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitPassword} className="space-y-4 pt-2">
            {passwordError && (
              <div className="rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 p-2.5 text-xs text-rose-600 dark:text-rose-400">
                {passwordError}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center gap-1">
                New Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (passwordError) setPasswordError(null);
                  }}
                  placeholder="Enter new password (min. 6 characters)"
                  className="pr-10 text-xs h-9"
                  autoComplete="new-password"
                  disabled={isChangingPassword}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5"
                  tabIndex={-1}
                  aria-label={showNewPassword ? "Hide password" : "Show password"}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center gap-1">
                Confirm Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (passwordError) setPasswordError(null);
                  }}
                  placeholder="Confirm new password"
                  className="pr-10 text-xs h-9"
                  autoComplete="new-password"
                  disabled={isChangingPassword}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5"
                  tabIndex={-1}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <DialogFooter className="pt-2 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClosePasswordModal}
                disabled={isChangingPassword}
                className="text-xs h-9"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isChangingPassword || !newPassword || !confirmPassword}
                className="text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
              >
                {isChangingPassword ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Toggle Employee Account Status ── */}
      <Dialog
        open={Boolean(statusTargetEmployee)}
        onOpenChange={(open) => {
          if (!open && !isTogglingStatus) setStatusTargetEmployee(null);
        }}
      >
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-lg font-semibold tracking-tight text-foreground flex items-center gap-2">
              {statusTargetEmployee?.loginStatus === "active" ? (
                <>
                  <Lock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  Deactivate Employee Account
                </>
              ) : (
                <>
                  <Unlock className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  Activate Employee Account
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {statusTargetEmployee && (
                <>
                  {statusTargetEmployee.loginStatus === "active" ? (
                    <>
                      Are you sure you want to deactivate login account access for{" "}
                      <span className="font-semibold text-foreground">
                        {statusTargetEmployee.firstName} {statusTargetEmployee.lastName}
                      </span>{" "}
                      ({statusTargetEmployee.employeeCode})?
                    </>
                  ) : (
                    <>
                      Are you sure you want to activate login account access for{" "}
                      <span className="font-semibold text-foreground">
                        {statusTargetEmployee.firstName} {statusTargetEmployee.lastName}
                      </span>{" "}
                      ({statusTargetEmployee.employeeCode})?
                    </>
                  )}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {statusTargetEmployee && (
            <div className="space-y-3 pt-2">
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Employee:</span>
                  <span className="font-semibold text-foreground">
                    {statusTargetEmployee.firstName} {statusTargetEmployee.lastName}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Login Email:</span>
                  <span className="font-mono text-muted-foreground">{statusTargetEmployee.email}</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-border/60">
                  <span className="text-muted-foreground">Current Account Status:</span>
                  <span className="font-medium">
                    {statusTargetEmployee.loginStatus === "active" ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        Inactive
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">New Account Status:</span>
                  <span className="font-medium">
                    {statusTargetEmployee.loginStatus === "active" ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        Inactive
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        Active
                      </span>
                    )}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground">
                <span className="font-semibold text-foreground">Note:</span> This action only alters authentication and login portal access. Employment lifecycle records, payroll history, leave balances, and documents will remain fully intact.
              </p>
            </div>
          )}

          <DialogFooter className="pt-2 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setStatusTargetEmployee(null)}
              disabled={isTogglingStatus}
              className="text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              variant={statusTargetEmployee?.loginStatus === "active" ? "destructive" : "default"}
              disabled={isTogglingStatus}
              onClick={handleToggleStatus}
              className={cn(
                "text-xs h-9 gap-1.5",
                statusTargetEmployee?.loginStatus !== "active" && "bg-emerald-600 hover:bg-emerald-700 text-white"
              )}
            >
              {isTogglingStatus ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Updating...
                </>
              ) : statusTargetEmployee?.loginStatus === "active" ? (
                <>
                  <Lock className="h-3.5 w-3.5" />
                  Deactivate Account
                </>
              ) : (
                <>
                  <Unlock className="h-3.5 w-3.5" />
                  Activate Account
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
