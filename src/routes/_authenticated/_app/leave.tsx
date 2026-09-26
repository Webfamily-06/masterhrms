import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useCurrentProfile, useSession, hasRole } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  DialogFooter,
  DialogDescription,
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus,
  Check,
  X,
  CalendarCheck,
  Clock,
  UserX,
  Users,
  CalendarDays,
  LayoutGrid,
  List,
  Edit2,
  Trash2,
  Download,
  Search,
  Palmtree,
  Settings2,
  BarChart3,
  Calendar,
  Sparkles,
  ShieldCheck,
  Building2,
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_app/leave")({
  component: Leave,
  head: () => ({ meta: [{ title: "Leave & Holiday Management — Master HRMS" }] }),
});

function daysBetween(a: string, b: string, halfDay: boolean) {
  if (halfDay) return 0.5;
  const d1 = new Date(a);
  const d2 = new Date(b);
  return Math.max(1, Math.round((d2.getTime() - d1.getTime()) / 86400000) + 1);
}

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  approved: { label: "Approved", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
  cancelled: { label: "Cancelled", className: "bg-secondary text-muted-foreground" },
};

export type Holiday = {
  id: string;
  title: string;
  date: string;
  description?: string;
  type: "mandatory" | "optional" | "regional";
  status: "active" | "inactive";
};

const DEFAULT_HOLIDAYS: Holiday[] = [
  { id: "hol-1", title: "New Year's Day", date: "2026-01-01", description: "Global celebration of the new calendar year", type: "mandatory", status: "active" },
  { id: "hol-2", title: "Republic Day", date: "2026-01-26", description: "Constitution of India commemoration", type: "mandatory", status: "active" },
  { id: "hol-3", title: "Holi (Festival of Colors)", date: "2026-03-04", description: "Spring national festival", type: "mandatory", status: "active" },
  { id: "hol-4", title: "Good Friday", date: "2026-04-03", description: "Christian public holiday", type: "optional", status: "active" },
  { id: "hol-5", title: "Eid al-Fitr", date: "2026-03-20", description: "Islamic religious holiday", type: "mandatory", status: "active" },
  { id: "hol-6", title: "Independence Day", date: "2026-08-15", description: "National celebration", type: "mandatory", status: "active" },
  { id: "hol-7", title: "Gandhi Jayanti", date: "2026-10-02", description: "National holiday commemorating Mahatma Gandhi", type: "mandatory", status: "active" },
  { id: "hol-8", title: "Diwali (Deepavali)", date: "2026-11-08", description: "Festival of Lights", type: "mandatory", status: "active" },
  { id: "hol-9", title: "Christmas Day", date: "2026-12-25", description: "Worldwide public holiday", type: "mandatory", status: "active" },
];

function Leave() {
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);
  const tenantId = profile?.tenant_id || "default";
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<"requests" | "types" | "holidays" | "reports">("requests");
  const [open, setOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [halfDay, setHalfDay] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<{ id: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const isHR = hasRole(profile, "hr_admin") || hasRole(profile, "super_admin");
  const isManager = hasRole(profile, "manager");

  // Leave Type Modals
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<any | null>(null);
  const [typeForm, setTypeForm] = useState({
    name: "",
    daysPerYear: 12,
    color: "#3B82F6",
  });

  // Holiday Modals & State
  const [holidays, setHolidays] = useState<Holiday[]>(() => {
    const saved = localStorage.getItem(`hrms_holidays_${tenantId}`);
    return saved ? JSON.parse(saved) : DEFAULT_HOLIDAYS;
  });
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [holidayForm, setHolidayForm] = useState({
    title: "",
    date: format(new Date(), "yyyy-MM-dd"),
    description: "",
    type: "mandatory" as Holiday["type"],
    status: "active" as Holiday["status"],
  });

  function saveHolidays(newHolidays: Holiday[]) {
    setHolidays(newHolidays);
    localStorage.setItem(`hrms_holidays_${tenantId}`, JSON.stringify(newHolidays));
  }

  // My employee record
  const { data: myEmployee } = useQuery({
    queryKey: ["my-employee", user?.id],
    enabled: !!user,
    queryFn: async () => {
      try {
        const res = await api.get("/employees");
        return Array.isArray(res) ? res.find((e: any) => e.userId === user?.id || e.email === user?.email) : null;
      } catch {
        return null;
      }
    },
  });

  // Leave types
  const { data: rawLeaveTypes = [] } = useQuery({
    queryKey: ["leave-types"],
    queryFn: async () => {
      try {
        const res = await api.get("/leave/types");
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  const leaveTypes = rawLeaveTypes.map((lt: any) => ({
    ...lt,
    id: lt.id,
    name: lt.name,
    days_per_year: lt.daysPerYear ?? lt.days_per_year ?? 12,
    color: lt.color ?? "#3B82F6",
  }));

  // All leave requests
  const { data: rawRequests = [] } = useQuery({
    queryKey: ["leave-requests"],
    queryFn: async () => {
      try {
        const res = await api.get("/leave/requests");
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  const requests = rawRequests.map((r: any) => ({
    ...r,
    id: r.id,
    employee_id: r.employeeId ?? r.employee_id,
    leave_type_id: r.leaveTypeId ?? r.leave_type_id,
    start_date: r.startDate ? String(r.startDate).slice(0, 10) : r.start_date,
    end_date: r.endDate ? String(r.endDate).slice(0, 10) : r.end_date,
    days: r.days,
    status: r.status,
    reason: r.reason,
    employees: r.employee ? {
      first_name: r.employee.firstName ?? r.employee.first_name,
      last_name: r.employee.lastName ?? r.employee.last_name,
      employee_code: r.employee.employeeCode ?? r.employee.employee_code,
    } : null,
    leave_types: r.leaveType ? {
      name: r.leaveType.name,
      color: r.leaveType.color,
      days_per_year: r.leaveType.daysPerYear ?? r.leaveType.days_per_year,
    } : null,
  }));

  // Calculate leave balances for my employee
  const leaveBalances = leaveTypes.map((lt: any) => {
    const used = requests
      .filter(
        (r: any) =>
          r.employee_id === myEmployee?.id &&
          r.leave_type_id === lt.id &&
          r.status === "approved",
      )
      .reduce((s: number, r: any) => s + Number(r.days), 0);
    return {
      ...lt,
      used,
      remaining: Math.max(0, lt.days_per_year - used),
    };
  });

  // Who's out today
  const today = new Date().toISOString().slice(0, 10);
  const whoIsOutToday = requests.filter(
    (r: any) =>
      r.status === "approved" && r.start_date <= today && r.end_date >= today,
  );

  // Filtered requests
  const filtered = requests.filter(
    (r: any) => statusFilter === "all" || r.status === statusFilter,
  );

  // Leave application form
  const [form, setForm] = useState({
    leave_type_id: "",
    start_date: today,
    end_date: today,
    reason: "",
  });

  // Apply mutation
  const applyMut = useMutation({
    mutationFn: async () => {
      const days = daysBetween(form.start_date, form.end_date, halfDay);
      return api.post("/leave/requests", {
        leaveTypeId: form.leave_type_id,
        startDate: form.start_date,
        endDate: form.end_date,
        days,
        reason: form.reason,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leave-requests"] });
      setOpen(false);
      setForm({ leave_type_id: "", start_date: today, end_date: today, reason: "" });
      setHalfDay(false);
      toast.success("Leave request submitted successfully.");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to submit leave request."),
  });

  // Approve mutation
  const approveMut = useMutation({
    mutationFn: async (id: string) => {
      return api.put(`/leave/requests/${id}`, { status: "approved" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leave-requests"] });
      toast.success("Leave request approved.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Reject mutation
  const rejectMut = useMutation({
    mutationFn: async () => {
      if (!rejectTarget) return;
      return api.put(`/leave/requests/${rejectTarget.id}`, {
        status: "rejected",
        rejectReason,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leave-requests"] });
      setRejectTarget(null);
      setRejectReason("");
      toast.success("Leave request rejected.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Create / Update Leave Type Mutation
  const saveTypeMut = useMutation({
    mutationFn: async () => {
      if (!typeForm.name.trim()) throw new Error("Leave type name is required");
      if (editingType) {
        return api.put(`/leave/types/${editingType.id}`, {
          name: typeForm.name.trim(),
          daysPerYear: Number(typeForm.daysPerYear),
          color: typeForm.color,
        });
      } else {
        return api.post("/leave/types", {
          name: typeForm.name.trim(),
          daysPerYear: Number(typeForm.daysPerYear),
          color: typeForm.color,
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leave-types"] });
      setIsTypeModalOpen(false);
      setEditingType(null);
      setTypeForm({ name: "", daysPerYear: 12, color: "#3B82F6" });
      toast.success(editingType ? "Leave type updated." : "New leave type created.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Delete Leave Type Mutation
  const deleteTypeMut = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/leave/types/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leave-types"] });
      toast.success("Leave type deleted.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Holiday Handlers
  function handleSaveHoliday() {
    if (!holidayForm.title.trim()) return toast.error("Holiday title is required.");
    if (editingHoliday) {
      const updated = holidays.map((h) =>
        h.id === editingHoliday.id
          ? { ...h, ...holidayForm, title: holidayForm.title.trim() }
          : h
      );
      saveHolidays(updated);
      toast.success("Holiday updated.");
    } else {
      const newHol: Holiday = {
        id: `hol-${Date.now()}`,
        ...holidayForm,
        title: holidayForm.title.trim(),
      };
      saveHolidays([...holidays, newHol]);
      toast.success("Holiday added to calendar.");
    }
    setIsHolidayModalOpen(false);
  }

  function handleDeleteHoliday(id: string) {
    saveHolidays(holidays.filter((h) => h.id !== id));
    toast.success("Holiday removed.");
  }

  return (
    <div className="space-y-6 max-w-full pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <Palmtree className="size-6 text-primary" /> Leave & Holiday Management
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage employee time off quotas, approval workflows, company holidays, and leave metrics.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {activeTab === "requests" && (
            <Button
              size="sm"
              onClick={() => setOpen(true)}
              className="gap-1.5 font-bold text-xs bg-primary text-primary-foreground shadow-xs"
            >
              <Plus className="size-4" /> Apply For Leave
            </Button>
          )}
          {activeTab === "types" && (
            <Button
              size="sm"
              onClick={() => {
                setEditingType(null);
                setTypeForm({ name: "", daysPerYear: 12, color: "#3B82F6" });
                setIsTypeModalOpen(true);
              }}
              className="gap-1.5 font-bold text-xs bg-primary text-primary-foreground shadow-xs"
            >
              <Plus className="size-4" /> Add Leave Type
            </Button>
          )}
          {activeTab === "holidays" && (
            <Button
              size="sm"
              onClick={() => {
                setEditingHoliday(null);
                setHolidayForm({
                  title: "",
                  date: format(new Date(), "yyyy-MM-dd"),
                  description: "",
                  type: "mandatory",
                  status: "active",
                });
                setIsHolidayModalOpen(true);
              }}
              className="gap-1.5 font-bold text-xs bg-primary text-primary-foreground shadow-xs"
            >
              <Plus className="size-4" /> Add Holiday
            </Button>
          )}
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full sm:w-auto h-10 bg-secondary/50 p-1 border">
          <TabsTrigger value="requests" className="text-xs font-bold gap-2">
            <CalendarCheck className="size-3.5" /> Leave Requests ({requests.length})
          </TabsTrigger>
          <TabsTrigger value="types" className="text-xs font-bold gap-2">
            <Settings2 className="size-3.5" /> Leave Types ({leaveTypes.length})
          </TabsTrigger>
          <TabsTrigger value="holidays" className="text-xs font-bold gap-2">
            <Calendar className="size-3.5" /> Holidays Calendar ({holidays.length})
          </TabsTrigger>
          <TabsTrigger value="reports" className="text-xs font-bold gap-2">
            <BarChart3 className="size-3.5" /> Leave Analytics
          </TabsTrigger>
        </TabsList>

        {/* ===================== TAB 1: LEAVE REQUESTS ===================== */}
        <TabsContent value="requests" className="space-y-6">
          {/* Leave Balance Cards */}
          {myEmployee && leaveBalances.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                My Leave Balances — {new Date().getFullYear()}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {leaveBalances.map((lb: any) => {
                  const pct = Math.min(100, Math.round((lb.used / lb.days_per_year) * 100));
                  return (
                    <Card key={lb.id} className="border border-border/70 shadow-xs">
                      <CardContent className="p-5 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className="size-3 rounded-full shrink-0"
                              style={{ backgroundColor: lb.color || "#7367F0" }}
                            />
                            <span className="text-xs font-bold truncate text-foreground">{lb.name}</span>
                          </div>
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {lb.used}/{lb.days_per_year} Used
                          </Badge>
                        </div>
                        <div className="flex items-end justify-between">
                          <div>
                            <div className="text-3xl font-bold tracking-tight text-foreground">{lb.remaining}</div>
                            <div className="text-[11px] text-muted-foreground font-medium">Days Remaining</div>
                          </div>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, backgroundColor: lb.color || "#7367F0" }}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Who's Out Today */}
          {whoIsOutToday.length > 0 && (
            <Card className="border border-border/70 shadow-xs">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="size-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                    <UserX className="size-4.5" />
                  </div>
                  <span className="font-bold text-sm text-foreground">Who's Out Today</span>
                  <Badge variant="secondary" className="text-[10px] font-medium">{format(new Date(), "dd MMM yyyy")}</Badge>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {whoIsOutToday.map((r: any) => (
                    <div key={r.id} className="flex items-center gap-2 bg-muted/40 border border-border/60 rounded-full px-3 py-1 text-xs">
                      <Avatar className="size-5.5">
                        <AvatarFallback className="text-[9px] font-bold bg-primary/10 text-primary">
                          {r.employees?.first_name?.[0]}{r.employees?.last_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-semibold text-foreground">
                        {r.employees?.first_name} {r.employees?.last_name}
                      </span>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-muted-foreground text-[11px]">{r.leave_types?.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Status Filter Tabs & View Toggle */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {["all", "pending", "approved", "rejected"].map((s) => {
                const count = s === "all" ? requests.length : requests.filter((r: any) => r.status === s).length;
                const isSelected = statusFilter === s;
                return (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={cn(
                      "px-4 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer",
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                        : "border-border/70 text-muted-foreground hover:border-primary/40 hover:text-foreground bg-card"
                    )}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                    <span className={cn("ml-1.5", isSelected ? "opacity-90" : "opacity-60")}>({count})</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center border rounded-lg p-0.5 bg-muted/40 shrink-0">
              <Button
                size="sm"
                variant={viewMode === "table" ? "secondary" : "ghost"}
                onClick={() => setViewMode("table")}
                className={cn("h-7 px-2.5 text-xs font-semibold gap-1", viewMode === "table" && "bg-background shadow-2xs text-foreground font-bold")}
              >
                <List className="size-3.5" /> Table
              </Button>
              <Button
                size="sm"
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                onClick={() => setViewMode("grid")}
                className={cn("h-7 px-2.5 text-xs font-semibold gap-1", viewMode === "grid" && "bg-background shadow-2xs text-foreground font-bold")}
              >
                <LayoutGrid className="size-3.5" /> Grid
              </Button>
            </div>
          </div>

          {/* Requests Table */}
          <Card>
            <CardContent className="p-0">
              {filtered.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground text-xs italic">
                  No leave requests found matching this filter.
                </div>
              ) : viewMode === "table" ? (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="text-xs font-bold">Employee</TableHead>
                      <TableHead className="text-xs font-bold">Leave Type</TableHead>
                      <TableHead className="text-xs font-bold">Duration</TableHead>
                      <TableHead className="text-xs font-bold">Days</TableHead>
                      <TableHead className="text-xs font-bold">Reason</TableHead>
                      <TableHead className="text-xs font-bold">Status</TableHead>
                      <TableHead className="text-xs font-bold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((r: any) => {
                      const st = STATUS_STYLE[r.status] || { label: r.status, className: "bg-secondary" };
                      return (
                        <TableRow key={r.id} className="hover:bg-muted/20 transition-colors">
                          <TableCell className="text-xs font-medium">
                            <div className="flex items-center gap-2">
                              <Avatar className="size-6">
                                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                  {r.employees?.first_name?.[0]}{r.employees?.last_name?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-bold text-foreground">
                                  {r.employees ? `${r.employees.first_name} ${r.employees.last_name}` : "—"}
                                </div>
                                <div className="text-[10px] text-muted-foreground font-mono">
                                  {r.employees?.employee_code}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="flex items-center gap-1.5">
                              <span
                                className="size-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: r.leave_types?.color || "#7367F0" }}
                              />
                              <span className="font-semibold text-foreground">{r.leave_types?.name || "Leave"}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground">
                            {r.start_date} → {r.end_date}
                          </TableCell>
                          <TableCell className="text-xs font-bold">
                            <Badge variant="outline" className="font-mono text-[11px]">
                              {r.days} {Number(r.days) === 1 ? "day" : "days"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                            {r.reason || "—"}
                          </TableCell>
                          <TableCell>
                            <span className={cn("px-2.5 py-0.5 rounded-full text-[11px] font-bold inline-flex items-center", st.className)}>
                              {st.label}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            {(isHR || isManager) && r.status === "pending" ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2.5 text-xs font-bold border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10 gap-1"
                                  onClick={() => approveMut.mutate(r.id)}
                                  disabled={approveMut.isPending}
                                >
                                  <Check className="size-3.5" /> Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2.5 text-xs font-bold border-rose-500/40 text-rose-600 hover:bg-rose-500/10 gap-1"
                                  onClick={() => setRejectTarget({ id: r.id, name: `${r.employees?.first_name} ${r.employees?.last_name}` })}
                                >
                                  <X className="size-3.5" /> Reject
                                </Button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-muted-foreground italic">Processed</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                /* Grid View */
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-4">
                  {filtered.map((r: any) => {
                    const st = STATUS_STYLE[r.status] || { label: r.status, className: "bg-secondary" };
                    return (
                      <Card key={r.id} className="p-4 space-y-3 border">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <Avatar className="size-8">
                              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                {r.employees?.first_name?.[0]}{r.employees?.last_name?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h4 className="font-bold text-xs">{r.employees ? `${r.employees.first_name} ${r.employees.last_name}` : "—"}</h4>
                              <p className="text-[10px] text-muted-foreground font-mono">{r.employees?.employee_code}</p>
                            </div>
                          </div>
                          <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold", st.className)}>
                            {st.label}
                          </span>
                        </div>

                        <div className="p-2.5 bg-muted/40 rounded-lg text-xs space-y-1 font-mono">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Type:</span>
                            <span className="font-bold text-foreground">{r.leave_types?.name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Dates:</span>
                            <span>{r.start_date} → {r.end_date}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Days:</span>
                            <span className="font-bold text-primary">{r.days} day(s)</span>
                          </div>
                        </div>

                        {r.reason && (
                          <p className="text-xs text-muted-foreground line-clamp-2 italic">"{r.reason}"</p>
                        )}

                        {(isHR || isManager) && r.status === "pending" && (
                          <div className="flex items-center gap-2 pt-2 border-t">
                            <Button
                              size="sm"
                              className="flex-1 h-7 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={() => approveMut.mutate(r.id)}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="flex-1 h-7 text-xs font-bold"
                              onClick={() => setRejectTarget({ id: r.id, name: `${r.employees?.first_name} ${r.employees?.last_name}` })}
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===================== TAB 2: LEAVE TYPES MANAGEMENT ===================== */}
        <TabsContent value="types" className="space-y-4">
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Settings2 className="size-4.5 text-primary" /> Leave Entitlements & Policy Configuration
              </CardTitle>
              <CardDescription className="text-xs">
                Configure yearly allocated quotas and distinctive color badges for every leave category.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-xs font-bold">Leave Type Name</TableHead>
                    <TableHead className="text-xs font-bold">Annual Allocation</TableHead>
                    <TableHead className="text-xs font-bold">Theme Color</TableHead>
                    <TableHead className="text-xs font-bold">Carry Forward</TableHead>
                    <TableHead className="text-xs font-bold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaveTypes.map((lt: any) => (
                    <TableRow key={lt.id}>
                      <TableCell className="text-xs font-bold flex items-center gap-2">
                        <span className="size-3 rounded-full shrink-0" style={{ backgroundColor: lt.color }} />
                        {lt.name}
                      </TableCell>
                      <TableCell className="text-xs font-mono font-semibold">
                        {lt.days_per_year} days / year
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="flex items-center gap-2 font-mono text-[11px]">
                          <span className="size-4 rounded border" style={{ backgroundColor: lt.color }} />
                          {lt.color}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-500/5">
                          Allowed (Max 5)
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7"
                            onClick={() => {
                              setEditingType(lt);
                              setTypeForm({
                                name: lt.name,
                                daysPerYear: lt.days_per_year,
                                color: lt.color || "#3B82F6",
                              });
                              setIsTypeModalOpen(true);
                            }}
                          >
                            <Edit2 className="size-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7 text-rose-500"
                            onClick={() => {
                              if (confirm(`Delete leave type "${lt.name}"?`)) deleteTypeMut.mutate(lt.id);
                            }}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===================== TAB 3: HOLIDAYS CALENDAR ===================== */}
        <TabsContent value="holidays" className="space-y-4">
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Calendar className="size-4.5 text-primary" /> Official Company Holidays {new Date().getFullYear()}
              </CardTitle>
              <CardDescription className="text-xs">
                Gazetted and restricted holidays observed across the organization.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-xs font-bold">Holiday Title</TableHead>
                    <TableHead className="text-xs font-bold">Date</TableHead>
                    <TableHead className="text-xs font-bold">Day of Week</TableHead>
                    <TableHead className="text-xs font-bold">Description</TableHead>
                    <TableHead className="text-xs font-bold">Type</TableHead>
                    <TableHead className="text-xs font-bold">Status</TableHead>
                    <TableHead className="text-xs font-bold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {holidays.map((hol) => {
                    let dayOfWeek = "—";
                    try {
                      dayOfWeek = format(parseISO(hol.date), "EEEE");
                    } catch {
                      dayOfWeek = "—";
                    }

                    return (
                      <TableRow key={hol.id}>
                        <TableCell className="text-xs font-bold text-foreground">
                          {hol.title}
                        </TableCell>
                        <TableCell className="text-xs font-mono font-semibold">
                          {hol.date}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-medium">
                          {dayOfWeek}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                          {hol.description || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] capitalize",
                              hol.type === "mandatory"
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                            )}
                          >
                            {hol.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[10px] text-emerald-600">
                            ● Active
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-7"
                              onClick={() => {
                                setEditingHoliday(hol);
                                setHolidayForm({
                                  title: hol.title,
                                  date: hol.date,
                                  description: hol.description || "",
                                  type: hol.type,
                                  status: hol.status,
                                });
                                setIsHolidayModalOpen(true);
                              }}
                            >
                              <Edit2 className="size-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-7 text-rose-500"
                              onClick={() => handleDeleteHoliday(hol.id)}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===================== TAB 4: LEAVE ANALYTICS & UTILIZATION ===================== */}
        <TabsContent value="reports" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4 space-y-1">
              <span className="text-xs text-muted-foreground">Total Leave Applications</span>
              <h3 className="text-2xl font-black text-foreground">{requests.length}</h3>
              <p className="text-[11px] text-emerald-600 font-semibold">● Active Workspace Records</p>
            </Card>
            <Card className="p-4 space-y-1">
              <span className="text-xs text-muted-foreground">Approved Time Off Days</span>
              <h3 className="text-2xl font-black text-emerald-600">
                {requests.filter((r: any) => r.status === "approved").reduce((s: number, r: any) => s + Number(r.days), 0)}
              </h3>
              <p className="text-[11px] text-muted-foreground">Total workforce days off</p>
            </Card>
            <Card className="p-4 space-y-1">
              <span className="text-xs text-muted-foreground">Pending Action</span>
              <h3 className="text-2xl font-black text-amber-600">
                {requests.filter((r: any) => r.status === "pending").length}
              </h3>
              <p className="text-[11px] text-amber-600 font-semibold">Requires manager review</p>
            </Card>
          </div>

          <Card className="p-5">
            <h4 className="font-bold text-sm mb-4">Department Leave Breakdown</h4>
            <div className="space-y-3">
              {["Engineering", "Human Resources", "Sales & Marketing", "Finance & Accounts", "Operations"].map((dept, i) => (
                <div key={dept} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>{dept}</span>
                    <span className="text-muted-foreground font-mono">{15 + i * 4}% utilization</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${15 + i * 4}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal: Apply for Leave */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarCheck className="size-5 text-primary" /> Apply for Leave
            </DialogTitle>
            <DialogDescription>
              Select your leave category and specify the date duration.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div>
              <Label className="text-xs font-bold">Leave Type *</Label>
              <Select
                value={form.leave_type_id}
                onValueChange={(val) => setForm({ ...form, leave_type_id: val })}
              >
                <SelectTrigger className="mt-1 text-xs">
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  {leaveTypes.map((lt: any) => (
                    <SelectItem key={lt.id} value={lt.id} className="text-xs">
                      {lt.name} ({lt.days_per_year} days/yr)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold">Start Date</Label>
                <Input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  className="mt-1 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-bold">End Date</Label>
                <Input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  className="mt-1 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Checkbox id="halfDay" checked={halfDay} onCheckedChange={(v) => setHalfDay(!!v)} />
              <Label htmlFor="halfDay" className="text-xs cursor-pointer">
                Half Day Request (0.5 day)
              </Label>
            </div>

            <div>
              <Label className="text-xs font-bold">Reason for Leave</Label>
              <Textarea
                rows={3}
                placeholder="Please describe the purpose of time off..."
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                className="mt-1 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => applyMut.mutate()}
              disabled={applyMut.isPending || !form.leave_type_id}
              className="font-bold"
            >
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Add/Edit Leave Type */}
      <Dialog open={isTypeModalOpen} onOpenChange={setIsTypeModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="size-5 text-primary" />
              {editingType ? "Edit Leave Type" : "Add New Leave Type"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div>
              <Label className="text-xs font-bold">Leave Name *</Label>
              <Input
                placeholder="e.g. Wellness Leave"
                value={typeForm.name}
                onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
                className="mt-1 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold">Days Per Year *</Label>
                <Input
                  type="number"
                  value={typeForm.daysPerYear}
                  onChange={(e) => setTypeForm({ ...typeForm, daysPerYear: Number(e.target.value) })}
                  className="mt-1 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-bold">Badge Color</Label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="color"
                    value={typeForm.color}
                    onChange={(e) => setTypeForm({ ...typeForm, color: e.target.value })}
                    className="size-8 rounded cursor-pointer border"
                  />
                  <Input
                    value={typeForm.color}
                    onChange={(e) => setTypeForm({ ...typeForm, color: e.target.value })}
                    className="text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsTypeModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={() => saveTypeMut.mutate()} disabled={saveTypeMut.isPending} className="font-bold">
              Save Leave Type
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Add/Edit Holiday */}
      <Dialog open={isHolidayModalOpen} onOpenChange={setIsHolidayModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="size-5 text-primary" />
              {editingHoliday ? "Edit Holiday" : "Add Company Holiday"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div>
              <Label className="text-xs font-bold">Holiday Title *</Label>
              <Input
                placeholder="e.g. Diwali Festival"
                value={holidayForm.title}
                onChange={(e) => setHolidayForm({ ...holidayForm, title: e.target.value })}
                className="mt-1 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold">Date *</Label>
                <Input
                  type="date"
                  value={holidayForm.date}
                  onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })}
                  className="mt-1 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-bold">Type</Label>
                <Select
                  value={holidayForm.type}
                  onValueChange={(v: any) => setHolidayForm({ ...holidayForm, type: v })}
                >
                  <SelectTrigger className="mt-1 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mandatory" className="text-xs">Mandatory (Paid)</SelectItem>
                    <SelectItem value="optional" className="text-xs">Optional / Restricted</SelectItem>
                    <SelectItem value="regional" className="text-xs">Regional Branch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs font-bold">Description (Optional)</Label>
              <Input
                placeholder="Brief description of the holiday..."
                value={holidayForm.description}
                onChange={(e) => setHolidayForm({ ...holidayForm, description: e.target.value })}
                className="mt-1 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsHolidayModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveHoliday} className="font-bold">
              Save Holiday
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Reject Leave Reason */}
      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <X className="size-5" /> Reject Leave Request
            </DialogTitle>
            <DialogDescription>
              Please provide a clear reason for declining the request from {rejectTarget?.name}.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <Label className="text-xs font-bold">Rejection Reason</Label>
            <Textarea
              rows={3}
              placeholder="e.g. Critical project milestone scheduled during this period..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="mt-1 text-xs"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => rejectMut.mutate()}
              disabled={rejectMut.isPending}
              className="font-bold"
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
