'use client';

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, unwrapArray } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  Edit,
  Trash2,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";

interface TimesheetEntry {
  id: string;
  employeeId: string;
  date: string;
  hours: number;
  projectId?: string | null;
  description?: string | null;
  status: string;
  reviewNotes?: string | null;
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    department?: { name: string } | null;
    designation?: { name: string } | null;
    user?: { profile?: { avatarUrl?: string | null } | null } | null;
  };
}

function getWeekDays(offsetWeeks: number) {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const distanceToMonday = (dayOfWeek + 6) % 7;
  const monday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - distanceToMonday + offsetWeeks * 7
  );
  const todayYmd = format(now, "yyyy-MM-dd");

  const days: Array<{
    ymd: string;
    weekday: string;
    dayNum: string;
    monthShort: string;
    isToday: boolean;
  }> = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    const ymd = format(d, "yyyy-MM-dd");
    days.push({
      ymd,
      weekday: format(d, "EEE").toUpperCase(),
      dayNum: format(d, "d"),
      monthShort: format(d, "MMM"),
      isToday: ymd === todayYmd,
    });
  }
  return {
    monthLabel: format(monday, "MMMM yyyy"),
    days,
  };
}

function parseProjectAndDesc(rawDesc?: string | null, projectId?: string | null) {
  const text = (rawDesc || "").trim();
  const match = text.match(/^\[Project:\s*([^\]]+)\]\s*([\s\S]*)$/);
  if (match) {
    return { project: match[1].trim(), description: match[2].trim() };
  }
  return { project: projectId || "", description: text };
}

function formatStatusBadge(status: string) {
  const s = (status || "pending").toLowerCase();
  if (s === "approved") {
    return (
      <Badge
        variant="outline"
        className="text-[10px] font-medium px-2 py-0 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
      >
        Approved
      </Badge>
    );
  }
  if (s === "rejected") {
    return (
      <Badge
        variant="outline"
        className="text-[10px] font-medium px-2 py-0 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
      >
        Rejected
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="text-[10px] font-medium px-2 py-0 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25"
    >
      Pending
    </Badge>
  );
}

export default function HrAttendanceTimesheetsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [weekOffset, setWeekOffset] = useState(0);

  // Modals
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimesheetEntry | null>(null);
  const [dayCellModal, setDayCellModal] = useState<{
    employeeName: string;
    dateYmd: string;
    entries: TimesheetEntry[];
  } | null>(null);
  const [viewEntry, setViewEntry] = useState<TimesheetEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TimesheetEntry | null>(null);

  const [form, setForm] = useState({
    employeeId: "",
    date: format(new Date(), "yyyy-MM-dd"),
    hours: "",
    project: "",
    description: "",
  });

  const { monthLabel, days: weekDays } = useMemo(() => getWeekDays(weekOffset), [weekOffset]);

  // 1. Fetch Employees (names only in dropdowns)
  const { data: employees = [] } = useQuery<any[]>({
    queryKey: ["hr-timesheet-employees"],
    queryFn: async () => {
      const res = await api.get("/hr/employees", { params: { limit: 200 } });
      return Array.isArray(res?.data) ? res.data : unwrapArray(res);
    },
  });

  // 2. Fetch Timesheets
  const { data: timesheets = [], isLoading } = useQuery<TimesheetEntry[]>({
    queryKey: ["hr-timesheets"],
    queryFn: async () => {
      const res = await api.get("/v1/hr/attendance/timesheets");
      return unwrapArray(res);
    },
  });

  const counts = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    for (const t of timesheets) {
      const s = (t.status || "pending").toLowerCase();
      if (s === "approved") approved++;
      else if (s === "rejected") rejected++;
      else pending++;
    }
    return { all: timesheets.length, pending, approved, rejected };
  }, [timesheets]);

  // Filtered entries
  const filteredEntries = useMemo(() => {
    return timesheets.filter((t) => {
      const s = (t.status || "pending").toLowerCase();
      if (statusFilter !== "all" && s !== statusFilter) return false;
      if (employeeFilter !== "all" && t.employeeId !== employeeFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const empName = `${t.employee?.firstName || ""} ${t.employee?.lastName || ""}`.toLowerCase();
        const desc = (t.description || "").toLowerCase();
        if (!empName.includes(q) && !desc.includes(q)) return false;
      }
      return true;
    });
  }, [timesheets, statusFilter, employeeFilter, search]);

  // Build rows for displayed employees
  const visibleEmployees = useMemo(() => {
    return employees.filter((emp: any) => {
      if (employeeFilter !== "all" && emp.id !== employeeFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const name = `${emp.firstName || ""} ${emp.lastName || ""}`.toLowerCase();
        const desig = (emp.designation?.name || emp.position || "").toLowerCase();
        const hasMatchingEntry = filteredEntries.some((e) => e.employeeId === emp.id);
        if (!name.includes(q) && !desig.includes(q) && !hasMatchingEntry) return false;
      }
      return true;
    });
  }, [employees, employeeFilter, search, filteredEntries]);

  // Map: employeeId -> ymd -> entries[]
  const cellMap = useMemo(() => {
    const map = new Map<string, Map<string, TimesheetEntry[]>>();
    for (const entry of filteredEntries) {
      const ymd = entry.date ? String(entry.date).slice(0, 10) : "";
      if (!ymd) continue;
      if (!map.has(entry.employeeId)) map.set(entry.employeeId, new Map());
      const empMap = map.get(entry.employeeId)!;
      if (!empMap.has(ymd)) empMap.set(ymd, []);
      empMap.get(ymd)!.push(entry);
    }
    return map;
  }, [filteredEntries]);

  // Keep open dayCellModal synced when data updates
  const activeModalEntries = useMemo(() => {
    if (!dayCellModal) return [];
    const empId = dayCellModal.entries[0]?.employeeId;
    if (!empId) return dayCellModal.entries;
    return timesheets.filter(
      (t) => t.employeeId === empId && String(t.date).slice(0, 10) === dayCellModal.dateYmd
    );
  }, [dayCellModal, timesheets]);

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async () => {
      const hrs = Number(form.hours);
      const combinedDesc = form.project.trim()
        ? `[Project: ${form.project.trim()}] ${form.description.trim()}`
        : form.description.trim();

      if (editingEntry) {
        return await api.put(`/v1/hr/attendance/timesheets/${editingEntry.id}`, {
          hours: hrs,
          description: combinedDesc,
        });
      }
      return await api.post("/v1/hr/attendance/timesheets", {
        employeeId: form.employeeId,
        date: form.date,
        hours: hrs,
        description: combinedDesc,
      });
    },
    onSuccess: () => {
      toast.success(editingEntry ? "Timesheet entry updated." : "Timesheet entry added.");
      setFormModalOpen(false);
      setEditingEntry(null);
      queryClient.invalidateQueries({ queryKey: ["hr-timesheets"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to save timesheet.");
    },
  });

  const actionMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "approve" | "reject" }) => {
      return await api.post(`/v1/hr/attendance/timesheets/${id}/action`, { action });
    },
    onSuccess: (_res, vars) => {
      toast.success(`Timesheet ${vars.action === "approve" ? "approved" : "rejected"}.`);
      queryClient.invalidateQueries({ queryKey: ["hr-timesheets"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to update timesheet status.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/v1/hr/attendance/timesheets/${id}`);
    },
    onSuccess: () => {
      toast.success("Timesheet entry deleted.");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["hr-timesheets"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Cannot delete timesheet entry.");
    },
  });

  const openAddModal = (prefillEmpId?: string, prefillDate?: string) => {
    setEditingEntry(null);
    setForm({
      employeeId: prefillEmpId || (employees[0]?.id ?? ""),
      date: prefillDate || format(new Date(), "yyyy-MM-dd"),
      hours: "",
      project: "",
      description: "",
    });
    setFormModalOpen(true);
  };

  const openEditModal = (entry: TimesheetEntry) => {
    const parsed = parseProjectAndDesc(entry.description, entry.projectId);
    setEditingEntry(entry);
    setForm({
      employeeId: entry.employeeId,
      date: String(entry.date).slice(0, 10),
      hours: String(entry.hours),
      project: parsed.project,
      description: parsed.description,
    });
    setFormModalOpen(true);
  };

  const handleResetFilters = () => {
    setSearch("");
    setEmployeeFilter("all");
    setStatusFilter("all");
    setWeekOffset(0);
  };

  return (
    <div className="w-full space-y-5 font-sans">
      {/* ── Page Header (Matches Screenshot 2) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Timesheet</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track and manage time sheets and work hours.
          </p>
        </div>
        <Button
          onClick={() => openAddModal()}
          className="h-9 px-4 gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
        >
          <Plus className="h-4 w-4" />
          Add Timesheet
        </Button>
      </div>

      {/* ── Filter Toolbar & Status Tabs Card ── */}
      <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
        <div className="p-3.5 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="pl-9 h-9 text-xs bg-background"
              />
            </div>

            <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
              <SelectTrigger className="w-[180px] h-9 text-xs bg-background">
                <SelectValue placeholder="All Employees" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {employees.map((emp: any) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleResetFilters}
            className="h-9 gap-1.5 text-xs"
          >
            <Filter className="h-3.5 w-3.5" />
            Filters
          </Button>
        </div>

        {/* Status Tabs */}
        <div className="px-3.5 border-t border-border/60 flex items-center gap-5 overflow-x-auto">
          {[
            { id: "all", label: "All", count: counts.all, icon: LayoutGrid },
            { id: "pending", label: "Pending", count: counts.pending, icon: Clock },
            { id: "approved", label: "Approved", count: counts.approved, icon: CheckCircle2 },
            { id: "rejected", label: "Rejected", count: counts.rejected, icon: XCircle },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id as any)}
                className={cn(
                  "inline-flex items-center gap-1.5 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer",
                  active
                    ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 font-semibold"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
                <span
                  className={cn(
                    "px-1.5 py-0.5 rounded-full text-[10px] font-semibold",
                    active ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
                  )}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Week Navigation Bar ── */}
      <div className="rounded-xl border border-border/80 bg-card px-3.5 py-2.5 shadow-xs flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => setWeekOffset((w) => w - 1)}
          aria-label="Previous week"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-bold text-foreground">{monthLabel}</span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => setWeekOffset((w) => w + 1)}
          aria-label="Next week"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* ── Weekly Timesheet Matrix Card ── */}
      <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border/80">
                <th className="text-left p-3.5 text-xs font-semibold text-muted-foreground min-w-[210px] border-r border-border/60">
                  Employee
                </th>
                {weekDays.map((day) => (
                  <th
                    key={day.ymd}
                    className={cn(
                      "p-3 text-center min-w-[115px] border-r border-border/50",
                      day.isToday && "bg-emerald-500/10"
                    )}
                  >
                    <div
                      className={cn(
                        "text-[10px] font-semibold tracking-wider uppercase",
                        day.isToday ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                      )}
                    >
                      {day.weekday}
                    </div>
                    <div
                      className={cn(
                        "text-sm font-bold mt-0.5",
                        day.isToday ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
                      )}
                    >
                      {day.dayNum}
                    </div>
                    <div className="text-[10px] text-muted-foreground">{day.monthShort}</div>
                  </th>
                ))}
                <th className="p-3.5 text-center text-xs font-semibold text-muted-foreground min-w-[90px]">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="h-32 text-center text-sm text-muted-foreground">
                    Loading timesheets...
                  </td>
                </tr>
              ) : visibleEmployees.length === 0 ? (
                <tr>
                  <td colSpan={9} className="h-32 text-center text-sm text-muted-foreground">
                    No employees found matching filters.
                  </td>
                </tr>
              ) : (
                visibleEmployees.map((emp: any) => {
                  const empDays = cellMap.get(emp.id);
                  const empName = `${emp.firstName || ""} ${emp.lastName || ""}`.trim();
                  const avatarUrl = emp.avatarUrl || emp.user?.profile?.avatarUrl || null;
                  let weekTotal = 0;

                  return (
                    <tr key={emp.id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-3.5 border-r border-border/60">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="h-9 w-9 shrink-0">
                            {avatarUrl ? <AvatarImage src={avatarUrl} alt={empName} /> : null}
                            <AvatarFallback className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                              {emp.firstName?.slice(0, 1)?.toUpperCase()}
                              {emp.lastName?.slice(0, 1)?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate">{empName}</p>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {emp.designation?.name || emp.position || emp.department?.name || "Employee"}
                            </p>
                          </div>
                        </div>
                      </td>

                      {weekDays.map((day) => {
                        const dayEntries = empDays?.get(day.ymd) || [];
                        const sumHours = dayEntries.reduce((acc, e) => acc + Number(e.hours || 0), 0);
                        weekTotal += sumHours;

                        const aggregateStatus = dayEntries.some((e) => e.status.toLowerCase() === "pending")
                          ? "pending"
                          : dayEntries.some((e) => e.status.toLowerCase() === "rejected")
                            ? "rejected"
                            : "approved";

                        return (
                          <td
                            key={day.ymd}
                            className={cn(
                              "p-2.5 text-center border-r border-border/50 align-middle",
                              day.isToday && "bg-emerald-500/5"
                            )}
                          >
                            {dayEntries.length === 0 ? (
                              <button
                                type="button"
                                onClick={() => openAddModal(emp.id, day.ymd)}
                                className="w-full py-2 text-xs text-muted-foreground/50 hover:text-primary hover:bg-muted/40 rounded-md transition-colors cursor-pointer"
                                title={`Add timesheet for ${empName} on ${day.ymd}`}
                              >
                                —
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  setDayCellModal({
                                    employeeName: empName,
                                    dateYmd: day.ymd,
                                    entries: dayEntries,
                                  })
                                }
                                className="w-full py-1.5 px-2 rounded-lg hover:bg-muted/60 transition-colors flex flex-col items-center gap-0.5 cursor-pointer"
                              >
                                <span className="text-xs font-bold text-primary">
                                  {Number(sumHours.toFixed(1))}h
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  {dayEntries.length} {dayEntries.length === 1 ? "entry" : "entries"}
                                </span>
                                <div className="mt-0.5">{formatStatusBadge(aggregateStatus)}</div>
                              </button>
                            )}
                          </td>
                        );
                      })}

                      <td className="p-3.5 text-center text-xs font-bold text-foreground">
                        {weekTotal > 0 ? `${Number(weekTotal.toFixed(1))}h` : "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal: Add / Edit Timesheet (Matches Screenshot 3) ── */}
      <Dialog open={formModalOpen} onOpenChange={(o) => !o && setFormModalOpen(false)}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader>
            <DialogTitle>{editingEntry ? "Edit Timesheet" : "Add New Timesheet"}</DialogTitle>
            <DialogDescription>
              Log work hours and task details for an employee.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!form.employeeId) {
                toast.error("Please select an employee.");
                return;
              }
              const hrs = Number(form.hours);
              if (!form.hours || isNaN(hrs) || hrs <= 0 || hrs > 24) {
                toast.error("Enter valid work hours between 0.25 and 24.");
                return;
              }
              if (!form.description.trim()) {
                toast.error("Description is required.");
                return;
              }
              saveMutation.mutate();
            }}
            className="space-y-4 pt-2"
          >
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Employee <span className="text-rose-500">*</span>
              </Label>
              <Select
                value={form.employeeId}
                disabled={Boolean(editingEntry)}
                onValueChange={(val) => setForm((p) => ({ ...p, employeeId: val }))}
              >
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp: any) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ts-date" className="text-xs font-semibold">
                Date <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="ts-date"
                type="date"
                disabled={Boolean(editingEntry)}
                value={form.date}
                onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                className="h-10 text-sm"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ts-hours" className="text-xs font-semibold">
                Hours <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="ts-hours"
                inputMode="decimal"
                value={form.hours}
                onChange={(e) =>
                  setForm((p) => ({ ...p, hours: e.target.value.replace(/[^\d.]/g, "") }))
                }
                placeholder="e.g. 8"
                className="h-10 text-sm"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ts-project" className="text-xs font-semibold">Project</Label>
              <Input
                id="ts-project"
                value={form.project}
                onChange={(e) => setForm((p) => ({ ...p, project: e.target.value }))}
                placeholder="e.g. Website Redesign"
                className="h-10 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ts-desc" className="text-xs font-semibold">
                Description <span className="text-rose-500">*</span>
              </Label>
              <Textarea
                id="ts-desc"
                rows={3}
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="e.g. Worked on frontend development and bug fixes..."
                className="text-sm"
                required
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setFormModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={saveMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 px-5"
              >
                {saveMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Day Entries List (Matches Screenshot 4) ── */}
      <Dialog open={Boolean(dayCellModal)} onOpenChange={(o) => !o && setDayCellModal(null)}>
        <DialogContent className="sm:max-w-lg p-6">
          <DialogHeader>
            <DialogTitle>
              {dayCellModal?.employeeName} -{" "}
              {dayCellModal?.dateYmd ? format(new Date(dayCellModal.dateYmd), "MM/dd/yyyy") : ""}
            </DialogTitle>
            <DialogDescription>
              Review, edit, approve, reject, or delete timesheet entries for this date.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 pt-2">
            {activeModalEntries.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-6">No entries remaining for this date.</p>
            ) : (
              activeModalEntries.map((entry) => {
                const parsed = parseProjectAndDesc(entry.description, entry.projectId);
                return (
                  <div
                    key={entry.id}
                    className="rounded-xl border border-border/80 bg-card p-4 flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-primary">
                          {Number(entry.hours).toFixed(2)}h
                        </span>
                        {formatStatusBadge(entry.status)}
                      </div>
                      {parsed.project && (
                        <p className="text-xs font-semibold text-foreground">{parsed.project}</p>
                      )}
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {parsed.description || "No description provided."}
                      </p>
                    </div>

                    {/* 5-Action Pill Bar matching Screenshot 4 */}
                    <div className="inline-flex items-center gap-0.5 rounded-lg border border-border/80 bg-background p-1 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        title="View Entry"
                        onClick={() => setViewEntry(entry)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        title="Edit Entry"
                        onClick={() => openEditModal(entry)}
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-emerald-600"
                        title="Approve"
                        disabled={actionMutation.isPending}
                        onClick={() => actionMutation.mutate({ id: entry.id, action: "approve" })}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-amber-600"
                        title="Reject"
                        disabled={actionMutation.isPending}
                        onClick={() => actionMutation.mutate({ id: entry.id, action: "reject" })}
                      >
                        <XCircle className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-rose-600"
                        title="Delete"
                        onClick={() => setDeleteTarget(entry)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── View Single Entry Dialog ── */}
      <Dialog open={Boolean(viewEntry)} onOpenChange={(o) => !o && setViewEntry(null)}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader>
            <DialogTitle>Timesheet Entry Details</DialogTitle>
            <DialogDescription>
              {viewEntry?.employee?.firstName} {viewEntry?.employee?.lastName} •{" "}
              {viewEntry?.date ? String(viewEntry.date).slice(0, 10) : ""}
            </DialogDescription>
          </DialogHeader>
          {viewEntry && (
            <div className="space-y-3 text-xs pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-muted-foreground">Hours</span>
                  <p className="font-bold text-primary mt-0.5">{Number(viewEntry.hours).toFixed(2)}h</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status</span>
                  <div className="mt-0.5">{formatStatusBadge(viewEntry.status)}</div>
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Project</span>
                <p className="font-semibold text-foreground mt-0.5">
                  {parseProjectAndDesc(viewEntry.description, viewEntry.projectId).project || "—"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Description</span>
                <p className="text-foreground mt-0.5 leading-relaxed">
                  {parseProjectAndDesc(viewEntry.description, viewEntry.projectId).description || "—"}
                </p>
              </div>
            </div>
          )}
          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setViewEntry(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ── */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader>
            <DialogTitle>Delete Timesheet Entry</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this timesheet entry? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
