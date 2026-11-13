'use client';

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, unwrapArray } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Search,
  FileSpreadsheet,
  Plus,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Briefcase,
  User,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export default function HrAttendanceTimesheetsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedWeekOffset, setSelectedWeekOffset] = useState(0);

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [actionType, setActionType] = useState<"approve" | "reject">("approve");
  const [reviewNotes, setReviewNotes] = useState("");

  // Form State
  const [entryForm, setEntryForm] = useState({
    employeeId: "",
    date: new Date().toISOString().slice(0, 10),
    hours: 8,
    description: "",
  });

  // Calculate Start & End of Selected Week (Monday to Sunday)
  const getWeekDates = (offsetWeeks: number) => {
    const now = new Date();
    const dayOfWeek = now.getUTCDay(); // 0 is Sunday, 1 is Monday
    const distanceToMonday = (dayOfWeek + 6) % 7;
    const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - distanceToMonday + offsetWeeks * 7));
    
    const weekDays: { date: string; dayName: string; dayNum: number; isToday: boolean }[] = [];
    const todayStr = new Date().toISOString().slice(0, 10);

    for (let i = 0; i < 7; i++) {
      const d = new Date(Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate() + i));
      const dateStr = d.toISOString().slice(0, 10);
      weekDays.push({
        date: dateStr,
        dayName: d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }),
        dayNum: d.getUTCDate(),
        isToday: dateStr === todayStr,
      });
    }
    return { monday, weekDays };
  };

  const { weekDays } = getWeekDates(selectedWeekOffset);
  const startWeekStr = weekDays[0].date;
  const endWeekStr = weekDays[6].date;

  // 1. Fetch Timesheets
  const { data: timesheets = [], isLoading, refetch } = useQuery({
    queryKey: ["hr-timesheets"],
    queryFn: async () => {
      const res = await api.get("/api/v1/hr/attendance/timesheets");
      return unwrapArray(res);
    },
  });

  // 2. Fetch Employees for Add Entry Modal
  const { data: employeesData } = useQuery({
    queryKey: ["hr-employees-lookup"],
    queryFn: async () => {
      const res = await api.get<{ data: any[] }>("/api/v1/hr/employees?limit=200");
      return res.data || [];
    },
  });

  // Mutation: Approve / Reject
  const actionMutation = useMutation({
    mutationFn: async ({ id, action, reviewNotes }: { id: string; action: "approve" | "reject"; reviewNotes?: string }) => {
      const res = await api.post(`/api/v1/hr/attendance/timesheets/${id}/action`, { action, reviewNotes });
      return res.data;
    },
    onSuccess: (_, vars) => {
      toast.success(`Timesheet entry ${vars.action === "approve" ? "approved" : "rejected"} successfully`);
      queryClient.invalidateQueries({ queryKey: ["hr-timesheets"] });
      setActionModalOpen(false);
      setSelectedItem(null);
      setReviewNotes("");
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Failed to update timesheet"),
  });

  // Mutation: Create Timesheet Entry
  const createMutation = useMutation({
    mutationFn: async (payload: typeof entryForm) => {
      const res = await api.post("/api/v1/hr/attendance/timesheets", payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Timesheet entry submitted successfully");
      queryClient.invalidateQueries({ queryKey: ["hr-timesheets"] });
      setAddModalOpen(false);
      setEntryForm({
        employeeId: "",
        date: new Date().toISOString().slice(0, 10),
        hours: 8,
        description: "",
      });
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Failed to submit timesheet"),
  });

  const employees = employeesData || [];
  const pendingCount = timesheets.filter((t: any) => t.status === "pending").length;
  const approvedCount = timesheets.filter((t: any) => t.status === "approved").length;
  const rejectedCount = timesheets.filter((t: any) => t.status === "rejected").length;
  const totalHours = timesheets.reduce((acc: number, t: any) => acc + Number(t.hours || 0), 0);

  const filtered = timesheets.filter((t: any) => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (searchTerm) {
      const name = `${t.employee?.firstName || ""} ${t.employee?.lastName || ""}`.toLowerCase();
      const code = (t.employee?.employeeCode || "").toLowerCase();
      const proj = (t.project?.name || "").toLowerCase();
      const s = searchTerm.toLowerCase();
      if (!name.includes(s) && !code.includes(s) && !proj.includes(s)) return false;
    }
    return true;
  });

  // Group by employee for Weekly Matrix
  const employeeMap = new Map<string, { employee: any; entriesByDate: Map<string, any[]>; totalHours: number }>();
  for (const item of filtered) {
    const empId = item.employeeId;
    if (!employeeMap.has(empId)) {
      employeeMap.set(empId, {
        employee: item.employee || { id: empId, firstName: "Staff", lastName: "", employeeCode: "EMP" },
        entriesByDate: new Map(),
        totalHours: 0,
      });
    }
    const group = employeeMap.get(empId)!;
    const dateStr = new Date(item.date).toISOString().slice(0, 10);
    if (!group.entriesByDate.has(dateStr)) {
      group.entriesByDate.set(dateStr, []);
    }
    group.entriesByDate.get(dateStr)!.push(item);
    group.totalHours += Number(item.hours || 0);
  }

  const employeeRows = Array.from(employeeMap.values());

  const openActionDialog = (item: any, type: "approve" | "reject") => {
    setSelectedItem(item);
    setActionType(type);
    setReviewNotes("");
    setActionModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Timesheet Records"
        description="Weekly timesheet calendar, project task hour tracking, and manager approvals."
      >
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setAddModalOpen(true)} className="gap-1.5 text-xs">
            <Plus className="w-4 h-4" />
            Add Timesheet
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading} className="text-xs">
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </PageHeader>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Timesheets" value={timesheets.length} icon={<FileSpreadsheet className="w-5 h-5 text-blue-500" />} />
        <StatCard label="Pending Review" value={pendingCount} icon={<AlertCircle className="w-5 h-5 text-amber-500" />} className="border-amber-200 bg-amber-50/20" />
        <StatCard label="Approved" value={approvedCount} icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />} className="border-emerald-200 bg-emerald-50/20" />
        <StatCard label="Total Logged Hours" value={`${totalHours} hrs`} icon={<Clock className="w-5 h-5 text-purple-500" />} />
      </div>

      {/* Filter and Period Toolbar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Search and Tabs */}
            <div className="flex flex-1 flex-wrap items-center gap-3">
              <div className="relative min-w-[200px] max-w-xs">
                <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input
                  placeholder="Search employee or task..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-9 text-xs"
                />
              </div>

              {/* Status Tabs with real database counts */}
              <div className="flex items-center gap-1 bg-muted p-1 rounded-lg text-xs font-medium">
                {[
                  { key: "all", label: "All", count: timesheets.length },
                  { key: "pending", label: "Pending", count: pendingCount },
                  { key: "approved", label: "Approved", count: approvedCount },
                  { key: "rejected", label: "Rejected", count: rejectedCount },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setStatusFilter(tab.key)}
                    className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                      statusFilter === tab.key
                        ? "bg-background text-foreground shadow-sm font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted-foreground/15">
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Week Navigation Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSelectedWeekOffset((prev) => prev - 1)}
                className="h-8 w-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="px-3 py-1 rounded-md border bg-muted/30 text-xs font-medium text-center">
                <span className="text-foreground font-semibold">
                  {startWeekStr} → {endWeekStr}
                </span>
                {selectedWeekOffset === 0 && (
                  <Badge variant="secondary" className="ml-2 text-[10px] py-0 px-1.5">
                    Current Week
                  </Badge>
                )}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSelectedWeekOffset((prev) => prev + 1)}
                className="h-8 w-8"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              {selectedWeekOffset !== 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedWeekOffset(0)}
                  className="text-xs h-8 px-2"
                >
                  Today
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Timesheet Matrix (Screenshot 2 Reference) */}
      <Card className="overflow-hidden border shadow-sm">
        <CardHeader className="px-6 py-4 border-b bg-muted/20">
          <CardTitle className="text-base font-semibold">Weekly Timesheet Matrix</CardTitle>
          <CardDescription className="text-xs">
            Project work hours recorded across days for review and authorization.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-muted/50 border-b text-[11px] font-semibold text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-3 min-w-[200px] border-r">Employee</th>
                  {weekDays.map((w) => (
                    <th
                      key={w.date}
                      className={`px-3 py-3 text-center min-w-[120px] border-r ${
                        w.isToday ? "bg-primary/5 text-primary font-bold" : ""
                      }`}
                    >
                      <div className="font-bold">{w.dayName}</div>
                      <div className="text-[10px] opacity-75 font-normal">{w.date.slice(5)}</div>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-center min-w-[90px] font-bold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-muted-foreground text-sm">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                      Loading timesheets...
                    </td>
                  </tr>
                ) : employeeRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-muted-foreground text-sm">
                      No timesheet records found for this period.
                    </td>
                  </tr>
                ) : (
                  employeeRows.map((row) => (
                    <tr key={row.employee.id} className="hover:bg-muted/20">
                      {/* Employee Cell */}
                      <td className="px-4 py-3 border-r bg-background font-medium">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                            {row.employee.firstName?.[0]}
                            {row.employee.lastName?.[0]}
                          </div>
                          <div className="truncate">
                            <p className="font-semibold text-foreground truncate">
                              {row.employee.firstName} {row.employee.lastName}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {row.employee.employeeCode}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Day Cells (Monday to Sunday) */}
                      {weekDays.map((w) => {
                        const entries = row.entriesByDate.get(w.date) || [];
                        const dayHours = entries.reduce((acc, e) => acc + Number(e.hours || 0), 0);

                        return (
                          <td
                            key={w.date}
                            className={`px-2 py-2 text-center border-r align-top ${
                              w.isToday ? "bg-primary/5" : ""
                            }`}
                          >
                            {entries.length === 0 ? (
                              <span className="text-muted-foreground/40 font-mono text-xs">—</span>
                            ) : (
                              <div className="space-y-1.5">
                                <span className="inline-block px-1.5 py-0.5 rounded text-[11px] font-bold bg-muted text-foreground">
                                  {dayHours} hrs
                                </span>
                                {entries.map((entry: any) => (
                                  <div
                                    key={entry.id}
                                    className={`p-1.5 rounded border text-[10px] text-left shadow-xs transition-colors ${
                                      entry.status === "approved"
                                        ? "bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800"
                                        : entry.status === "rejected"
                                        ? "bg-rose-50/50 border-rose-200 dark:bg-rose-950/20 dark:border-rose-800"
                                        : "bg-amber-50/50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="font-semibold truncate">
                                        {entry.project?.name || "General"}
                                      </span>
                                      <span
                                        className={`capitalize font-bold text-[9px] ${
                                          entry.status === "approved"
                                            ? "text-emerald-700 dark:text-emerald-300"
                                            : entry.status === "rejected"
                                            ? "text-rose-700 dark:text-rose-300"
                                            : "text-amber-700 dark:text-amber-300"
                                        }`}
                                      >
                                        {entry.status}
                                      </span>
                                    </div>
                                    {entry.description && (
                                      <p className="text-muted-foreground line-clamp-1 mt-0.5">
                                        {entry.description}
                                      </p>
                                    )}

                                    {/* Action buttons for pending items */}
                                    {entry.status === "pending" && (
                                      <div className="flex items-center gap-1 mt-1.5 pt-1 border-t border-border/40">
                                        <button
                                          type="button"
                                          onClick={() => openActionDialog(entry, "approve")}
                                          className="text-[10px] font-medium text-emerald-600 hover:text-emerald-700 underline"
                                        >
                                          Approve
                                        </button>
                                        <span className="text-muted-foreground/40">•</span>
                                        <button
                                          type="button"
                                          onClick={() => openActionDialog(entry, "reject")}
                                          className="text-[10px] font-medium text-rose-600 hover:text-rose-700 underline"
                                        >
                                          Reject
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        );
                      })}

                      {/* Total Weekly Hours */}
                      <td className="px-4 py-3 text-center border-l bg-muted/10 font-bold text-sm text-foreground">
                        {row.totalHours} hrs
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* MODAL: Add Timesheet Entry */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-primary" />
              Add Timesheet Entry
            </DialogTitle>
            <DialogDescription className="text-xs">
              Record employee work hours for project task logging.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">Employee *</label>
              <select
                value={entryForm.employeeId}
                onChange={(e) => setEntryForm({ ...entryForm, employeeId: e.target.value })}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
              >
                <option value="">Select Employee...</option>
                {employees.map((emp: any) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName} ({emp.employeeCode})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Work Date *</label>
                <Input
                  type="date"
                  value={entryForm.date}
                  onChange={(e) => setEntryForm({ ...entryForm, date: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Hours Logged *</label>
                <Input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="24"
                  value={entryForm.hours}
                  onChange={(e) => setEntryForm({ ...entryForm, hours: Number(e.target.value) })}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground block mb-1">Description / Task Notes</label>
              <Input
                placeholder="What was worked on during this period..."
                value={entryForm.description}
                onChange={(e) => setEntryForm({ ...entryForm, description: e.target.value })}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setAddModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => createMutation.mutate(entryForm)}
              disabled={!entryForm.employeeId || !entryForm.date || !entryForm.hours || createMutation.isPending}
            >
              {createMutation.isPending ? "Submitting..." : "Submit Entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Review Action (Approve / Reject) */}
      <Dialog open={actionModalOpen} onOpenChange={setActionModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              {actionType === "approve" ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : (
                <XCircle className="h-4 w-4 text-rose-500" />
              )}
              {actionType === "approve" ? "Approve Timesheet" : "Reject Timesheet"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {actionType === "approve"
                ? "Confirm authorization of these project hours."
                : "Rejection requires a reviewer comment describing required revisions."}
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 rounded-lg border bg-muted/40 space-y-1">
                <p className="font-semibold text-foreground">
                  Employee: {selectedItem.employee?.firstName} {selectedItem.employee?.lastName}
                </p>
                <p className="text-muted-foreground">
                  Date: {new Date(selectedItem.date).toISOString().slice(0, 10)} • Hours: <strong>{selectedItem.hours} hrs</strong>
                </p>
                {selectedItem.description && (
                  <p className="text-muted-foreground">Notes: {selectedItem.description}</p>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-foreground block mb-1">
                  Reviewer Comments {actionType === "reject" ? "*" : "(Optional)"}
                </label>
                <Input
                  placeholder={
                    actionType === "reject"
                      ? "Reason for timesheet rejection (required)..."
                      : "Optional remarks for approval audit log..."
                  }
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setActionModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={actionType === "approve" ? "default" : "destructive"}
              size="sm"
              onClick={() =>
                selectedItem &&
                actionMutation.mutate({
                  id: selectedItem.id,
                  action: actionType,
                  reviewNotes,
                })
              }
              disabled={
                actionMutation.isPending || (actionType === "reject" && !reviewNotes.trim())
              }
            >
              {actionMutation.isPending
                ? "Processing..."
                : actionType === "approve"
                ? "Confirm Approval"
                : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
