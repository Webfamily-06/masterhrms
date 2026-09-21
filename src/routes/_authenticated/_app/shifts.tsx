import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { api } from "@/lib/api";
import { useCurrentProfile, useSession } from "@/lib/session";
import { formatSystemAmount } from "@/lib/currency";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CalendarDays,
  Clock,
  ArrowLeftRight,
  Building2,
  Users,
  Plus,
  CheckCircle2,
  XCircle,
  Sun,
  Moon,
  Sunset,
  Sparkles,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Settings2,
  Calendar,
  Layers,
  DollarSign,
  AlertCircle,
  Filter,
  Search,
  Check,
  X,
  Trash2,
  Edit2,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_app/shifts")({
  component: ShiftsPage,
  head: () => ({ meta: [{ title: "Shift Rostering & Scheduling — Master HRMS" }] }),
});

const SHIFT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  blue: { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", border: "border-blue-500/30" },
  amber: { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", border: "border-amber-500/30" },
  purple: { bg: "bg-purple-500/10", text: "text-purple-600 dark:text-purple-400", border: "border-purple-500/30" },
  indigo: { bg: "bg-indigo-500/10", text: "text-indigo-600 dark:text-indigo-400", border: "border-indigo-500/30" },
  emerald: { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/30" },
  slate: { bg: "bg-muted/60", text: "text-muted-foreground", border: "border-border" },
};

function getMonday(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatDateISO(d: Date) {
  return d.toISOString().split("T")[0];
}

export function ShiftsPage() {
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);
  const tenantId = profile?.tenant_id;
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<string>("roster");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Week Navigation
  const [currentMonday, setCurrentMonday] = useState<Date>(() => getMonday(new Date()));

  // 7 Days Array for current week
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(currentMonday);
      d.setDate(currentMonday.getDate() + i);
      return d;
    });
  }, [currentMonday]);

  const startDateStr = formatDateISO(weekDays[0]);
  const endDateStr = formatDateISO(weekDays[6]);

  // Modals
  const [isSlotEditOpen, setIsSlotEditOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ employee: any; date: Date; currentRoster?: any } | null>(null);
  const [selectedShiftIdForSlot, setSelectedShiftIdForSlot] = useState("");

  const [isCreateShiftOpen, setIsCreateShiftOpen] = useState(false);
  const [isEditShiftOpen, setIsEditShiftOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<any>(null);

  const [isBulkRosterOpen, setIsBulkRosterOpen] = useState(false);
  const [isSwapRequestOpen, setIsSwapRequestOpen] = useState(false);

  // Forms
  const [shiftForm, setShiftForm] = useState({
    name: "",
    code: "",
    startTime: "09:30",
    endTime: "18:30",
    breakMinutes: "60",
    allowance: "0",
    color: "blue",
    isOvertimeEligible: true,
  });

  const [bulkForm, setBulkForm] = useState({
    departmentId: "all",
    shiftId: "",
    offShiftId: "",
    includeWeekendOff: true,
    daysCount: "7",
  });

  const [swapForm, setSwapForm] = useState({
    requesterEmployeeId: "",
    targetEmployeeId: "",
    shiftDate: formatDateISO(new Date()),
    reason: "",
  });

  // Queries
  const { data: sysConfig } = useQuery({
    queryKey: ["realtime-platform-settings"],
    queryFn: async () => {
      try {
        const page = await api.get("/cms/pages/system-platform-settings");
        return page?.content || null;
      } catch {
        return null;
      }
    },
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      try {
        const res = await api.get("/employees/departments");
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  const { data: shiftDefs = [] } = useQuery({
    queryKey: ["shift-definitions", tenantId],
    queryFn: async () => {
      try {
        const res = await api.get("/shifts");
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  const { data: rosterMatrix = [], isLoading: isRosterLoading } = useQuery({
    queryKey: ["shift-roster-matrix", tenantId, startDateStr, endDateStr, selectedDepartment],
    queryFn: async () => {
      try {
        const res = await api.get(`/shifts/roster?startDate=${startDateStr}&endDate=${endDateStr}&departmentId=${selectedDepartment}`);
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  const { data: shiftSwaps = [], isLoading: isSwapsLoading } = useQuery({
    queryKey: ["shift-swaps", tenantId],
    queryFn: async () => {
      try {
        const res = await api.get("/shifts/swaps");
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  // Mutations
  const assignSlotMut = useMutation({
    mutationFn: async (payload: { employeeId: string; shiftId: string; rosterDate: string }) =>
      api.post("/shifts/roster/assign", payload),
    onSuccess: () => {
      toast.success("Shift schedule updated!");
      qc.invalidateQueries({ queryKey: ["shift-roster-matrix"] });
      setIsSlotEditOpen(false);
    },
    onError: (e: any) => toast.error(e.message || "Failed to update shift"),
  });

  const bulkAssignMut = useMutation({
    mutationFn: async (payload: any) => api.post("/shifts/roster/bulk-assign", payload),
    onSuccess: (res: any) => {
      toast.success(res.message || "Shift roster generated successfully!");
      qc.invalidateQueries({ queryKey: ["shift-roster-matrix"] });
      setIsBulkRosterOpen(false);
    },
    onError: (e: any) => toast.error(e.message || "Failed to generate roster"),
  });

  const createShiftMut = useMutation({
    mutationFn: async (payload: any) => api.post("/shifts", payload),
    onSuccess: () => {
      toast.success("Shift definition created!");
      qc.invalidateQueries({ queryKey: ["shift-definitions"] });
      setIsCreateShiftOpen(false);
      resetShiftForm();
    },
    onError: (e: any) => toast.error(e.message || "Failed to create shift"),
  });

  const updateShiftMut = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => api.put(`/shifts/${id}`, data),
    onSuccess: () => {
      toast.success("Shift definition updated!");
      qc.invalidateQueries({ queryKey: ["shift-definitions"] });
      setIsEditShiftOpen(false);
    },
    onError: (e: any) => toast.error(e.message || "Failed to update shift"),
  });

  const deleteShiftMut = useMutation({
    mutationFn: async (id: string) => api.delete(`/shifts/${id}`),
    onSuccess: () => {
      toast.success("Shift definition deleted");
      qc.invalidateQueries({ queryKey: ["shift-definitions"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to delete shift"),
  });

  const createSwapMut = useMutation({
    mutationFn: async (payload: any) => api.post("/shifts/swaps", payload),
    onSuccess: () => {
      toast.success("Shift swap request submitted to peer!");
      qc.invalidateQueries({ queryKey: ["shift-swaps"] });
      setIsSwapRequestOpen(false);
      setSwapForm({ requesterEmployeeId: "", targetEmployeeId: "", shiftDate: formatDateISO(new Date()), reason: "" });
    },
    onError: (e: any) => toast.error(e.message || "Failed to create swap request"),
  });

  const peerActionMut = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "accept" | "decline" }) =>
      api.put(`/shifts/swaps/${id}/peer-action`, { action }),
    onSuccess: (res: any) => {
      toast.success(res.message || "Peer action recorded!");
      qc.invalidateQueries({ queryKey: ["shift-swaps"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to process peer action"),
  });

  const managerActionMut = useMutation({
    mutationFn: async ({ id, action, managerNotes }: { id: string; action: "approve" | "reject"; managerNotes?: string }) =>
      api.put(`/shifts/swaps/${id}/manager-action`, { action, managerNotes }),
    onSuccess: (res: any) => {
      toast.success(res.message || "Manager action processed!");
      qc.invalidateQueries({ queryKey: ["shift-swaps"] });
      qc.invalidateQueries({ queryKey: ["shift-roster-matrix"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to process manager action"),
  });

  function resetShiftForm() {
    setShiftForm({
      name: "",
      code: "",
      startTime: "09:30",
      endTime: "18:30",
      breakMinutes: "60",
      allowance: "0",
      color: "blue",
      isOvertimeEligible: true,
    });
  }

  function nextWeek() {
    const next = new Date(currentMonday);
    next.setDate(currentMonday.getDate() + 7);
    setCurrentMonday(next);
  }

  function prevWeek() {
    const prev = new Date(currentMonday);
    prev.setDate(currentMonday.getDate() - 7);
    setCurrentMonday(prev);
  }

  function thisWeek() {
    setCurrentMonday(getMonday(new Date()));
  }

  // Filtered Roster Employees
  const filteredRoster = useMemo(() => {
    return rosterMatrix.filter((emp: any) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        emp.firstName?.toLowerCase().includes(q) ||
        emp.lastName?.toLowerCase().includes(q) ||
        emp.employeeCode?.toLowerCase().includes(q) ||
        emp.position?.toLowerCase().includes(q);
      return matchesSearch;
    });
  }, [rosterMatrix, searchQuery]);

  // Aggregate Metrics
  const totalRosterSlots = useMemo(() => {
    return rosterMatrix.reduce((acc: number, emp: any) => acc + (emp.shiftRosters?.length || 0), 0);
  }, [rosterMatrix]);

  const pendingSwapsCount = shiftSwaps.filter((s: any) => ["pending_peer", "pending_manager"].includes(s.status)).length;

  return (
    <div className="space-y-6 max-w-full pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <Layers className="size-6 text-primary" /> Shift Rostering & Scheduling Engine
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage multi-shift rotas, differential allowances, peer swap workflows, and automated scheduling.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsSwapRequestOpen(true)}
            className="text-xs font-semibold h-8 shadow-2xs gap-1.5"
          >
            <ArrowLeftRight className="size-3.5 text-primary" />
            <span>Request Shift Swap</span>
          </Button>

          <Button
            size="sm"
            onClick={() => {
              const defGen = shiftDefs.find((s: any) => s.code === "GEN")?.id || shiftDefs[0]?.id || "";
              const defOff = shiftDefs.find((s: any) => s.code === "OFF")?.id || "";
              setBulkForm({
                departmentId: selectedDepartment,
                shiftId: defGen,
                offShiftId: defOff,
                includeWeekendOff: true,
                daysCount: "7",
              });
              setIsBulkRosterOpen(true);
            }}
            className="text-xs font-bold h-8 shadow-sm gap-1.5 bg-primary text-primary-foreground"
          >
            <Zap className="size-3.5" />
            <span>Auto-Schedule Roster</span>
          </Button>
        </div>
      </div>

      {/* Sneat Pro Shift Rostering KPI Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "Standard Shifts", value: `${shiftDefs.length} Shift Types`, desc: "Configured workplace rotas", icon: Clock, color: "text-primary bg-primary/10" },
          { title: "Scheduled Slots", value: `${totalRosterSlots} Assigned`, desc: "Active roster matrix", icon: CalendarDays, color: "text-[oklch(0.60_0.17_155)] bg-[oklch(0.60_0.17_155/0.10)]" },
          { title: "Swap Requests", value: `${pendingSwapsCount} Pending`, desc: "Peer-to-peer shift swaps", icon: ArrowLeftRight, color: "text-[oklch(0.73_0.16_75)] bg-[oklch(0.73_0.16_75/0.10)]" },
          { title: "Active Workforce", value: `${rosterMatrix.length} Staff`, desc: "Scheduled team members", icon: Users, color: "text-[oklch(0.60_0.20_200)] bg-[oklch(0.60_0.20_200/0.10)]" },
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

      {/* Main Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/40 p-1 rounded-xl border">
          <TabsList className="bg-transparent h-8 p-0 gap-1">
            <TabsTrigger value="roster" className="text-xs font-bold h-7 gap-1.5">
              <CalendarDays className="size-3.5" />
              <span>Weekly Roster Matrix</span>
            </TabsTrigger>
            <TabsTrigger value="definitions" className="text-xs font-bold h-7 gap-1.5">
              <Settings2 className="size-3.5" />
              <span>Shift Definitions ({shiftDefs.length})</span>
            </TabsTrigger>
            <TabsTrigger value="swaps" className="text-xs font-bold h-7 gap-1.5">
              <ArrowLeftRight className="size-3.5" />
              <span>Swap Requests ({shiftSwaps.length})</span>
            </TabsTrigger>
          </TabsList>

          {/* Quick Filters */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2 size-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search staff name..."
                className="h-7 text-xs pl-8 w-44 bg-background"
              />
            </div>

            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="h-7 text-xs w-40 bg-background">
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
          </div>
        </div>

        {/* ===================== TAB 1: WEEKLY ROSTER MATRIX ===================== */}
        <TabsContent value="roster" className="space-y-4 pt-1">
          {/* Week Date Navigator Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border shadow-2xs">
            <div className="flex items-center gap-2">
              <Button size="icon" variant="outline" className="size-7" onClick={prevWeek} title="Previous Week">
                <ChevronLeft className="size-4" />
              </Button>
              <Button size="sm" variant="outline" className="text-xs font-semibold h-7 px-2.5" onClick={thisWeek}>
                This Week
              </Button>
              <Button size="icon" variant="outline" className="size-7" onClick={nextWeek} title="Next Week">
                <ChevronRight className="size-4" />
              </Button>
              <span className="text-xs font-bold font-mono text-foreground ml-2">
                {weekDays[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} —{" "}
                {weekDays[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </div>

            {/* Shift Color Legends */}
            <div className="flex items-center gap-2 flex-wrap text-[10px]">
              {shiftDefs.slice(0, 5).map((s: any) => {
                const col = SHIFT_COLORS[s.color] || SHIFT_COLORS.blue;
                return (
                  <div key={s.id} className="flex items-center gap-1">
                    <span className={`px-1.5 py-0.5 rounded font-mono font-bold border ${col.bg} ${col.text} ${col.border}`}>
                      {s.code}
                    </span>
                    <span className="text-muted-foreground">{s.startTime}-{s.endTime}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Roster Table */}
          <Card className="border shadow-2xs">
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 text-xs">
                    <TableHead className="w-[200px] text-xs font-bold">Staff Member</TableHead>
                    {weekDays.map((d) => {
                      const isToday = formatDateISO(d) === formatDateISO(new Date());
                      return (
                        <TableHead
                          key={d.toISOString()}
                          className={`text-center text-xs font-bold min-w-[120px] ${
                            isToday ? "bg-primary/10 text-primary border-x" : ""
                          }`}
                        >
                          <div>{d.toLocaleDateString("en-US", { weekday: "short" })}</div>
                          <div className="font-mono text-[10px] text-muted-foreground font-normal">
                            {d.toLocaleDateString("en-US", { month: "numeric", day: "numeric" })}
                          </div>
                        </TableHead>
                      );
                    })}
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {isRosterLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-12 text-xs">
                        Loading roster schedule...
                      </TableCell>
                    </TableRow>
                  ) : filteredRoster.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-12 text-xs italic">
                        No employees found matching filter. Click "Auto-Schedule Roster" to generate schedules.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRoster.map((emp: any) => (
                      <TableRow key={emp.id} className="hover:bg-muted/20 text-xs">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="size-7 border">
                              <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                                {emp.firstName[0]}
                                {emp.lastName[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <span className="font-bold text-foreground block truncate">
                                {emp.firstName} {emp.lastName}
                              </span>
                              <span className="text-[10px] text-muted-foreground truncate block font-mono">
                                {emp.department?.name || "General"} · {emp.employeeCode}
                              </span>
                            </div>
                          </div>
                        </TableCell>

                        {weekDays.map((d) => {
                          const dateKey = formatDateISO(d);
                          const rosterItem = emp.shiftRosters?.find(
                            (r: any) => formatDateISO(new Date(r.rosterDate)) === dateKey
                          );
                          const shift = rosterItem?.shift;
                          const col = shift ? SHIFT_COLORS[shift.color] || SHIFT_COLORS.blue : null;
                          const isToday = dateKey === formatDateISO(new Date());

                          return (
                            <TableCell
                              key={dateKey}
                              onClick={() => {
                                setSelectedSlot({ employee: emp, date: d, currentRoster: rosterItem });
                                setSelectedShiftIdForSlot(shift?.id || shiftDefs[0]?.id || "");
                                setIsSlotEditOpen(true);
                              }}
                              className={`p-1.5 text-center cursor-pointer hover:bg-primary/5 transition-colors border-l ${
                                isToday ? "bg-primary/[0.02]" : ""
                              }`}
                            >
                              {shift ? (
                                <div
                                  className={`p-1.5 rounded-lg border text-left space-y-0.5 shadow-2xs ${col?.bg} ${col?.border}`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className={`font-mono font-black text-[11px] ${col?.text}`}>
                                      {shift.code}
                                    </span>
                                    {rosterItem.status === "swapped" && (
                                      <Badge variant="outline" className="text-[8px] px-1 py-0 bg-background/80">
                                        Swapped
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-[9px] text-muted-foreground font-mono">
                                    {shift.code === "OFF" ? "Weekly Off" : `${shift.startTime} - ${shift.endTime}`}
                                  </div>
                                </div>
                              ) : (
                                <div className="h-10 rounded border border-dashed grid place-items-center text-[10px] text-muted-foreground/40 hover:text-primary hover:border-primary/50">
                                  + Assign
                                </div>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===================== TAB 2: SHIFT DEFINITIONS STUDIO ===================== */}
        <TabsContent value="definitions" className="space-y-4 pt-1">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Settings2 className="size-4 text-primary" /> Workspace Shift Definitions & Allowances
              </h2>
              <p className="text-xs text-muted-foreground">
                Define timing bands, mandatory breaks, overtime eligibility, and shift differential compensation.
              </p>
            </div>

            <Button
              size="sm"
              onClick={() => {
                resetShiftForm();
                setIsCreateShiftOpen(true);
              }}
              className="text-xs font-bold h-8 gap-1.5"
            >
              <Plus className="size-3.5" />
              <span>Create Shift Type</span>
            </Button>
          </div>

          <Card className="border shadow-2xs">
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 text-xs">
                    <TableHead className="text-xs">Shift Code & Name</TableHead>
                    <TableHead className="text-xs">Working Hours</TableHead>
                    <TableHead className="text-xs">Break Duration</TableHead>
                    <TableHead className="text-xs">Differential Allowance</TableHead>
                    <TableHead className="text-xs">Overtime Eligible</TableHead>
                    <TableHead className="text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {shiftDefs.map((shift: any) => {
                    const col = SHIFT_COLORS[shift.color] || SHIFT_COLORS.blue;
                    return (
                      <TableRow key={shift.id} className="hover:bg-muted/20 text-xs">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded font-mono font-black border text-xs ${col.bg} ${col.text} ${col.border}`}>
                              {shift.code}
                            </span>
                            <div>
                              <span className="font-bold text-foreground block">{shift.name}</span>
                              <span className="text-[10px] text-muted-foreground capitalize">Color: {shift.color}</span>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="font-mono font-semibold">
                          {shift.code === "OFF" ? "No Fixed Hours" : `${shift.startTime} — ${shift.endTime}`}
                        </TableCell>

                        <TableCell className="font-mono text-muted-foreground">
                          {shift.breakMinutes} mins
                        </TableCell>

                        <TableCell className="font-mono font-bold text-emerald-600">
                          {Number(shift.allowance) > 0 ? (
                            formatSystemAmount(Number(shift.allowance), sysConfig?.currency) + " / shift"
                          ) : (
                            <span className="text-muted-foreground font-normal">None</span>
                          )}
                        </TableCell>

                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-bold ${
                              shift.isOvertimeEligible
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {shift.isOvertimeEligible ? "Yes (1.5x OT)" : "No"}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-7"
                              onClick={() => {
                                setEditingShift(shift);
                                setShiftForm({
                                  name: shift.name,
                                  code: shift.code,
                                  startTime: shift.startTime,
                                  endTime: shift.endTime,
                                  breakMinutes: String(shift.breakMinutes),
                                  allowance: String(shift.allowance),
                                  color: shift.color,
                                  isOvertimeEligible: shift.isOvertimeEligible,
                                });
                                setIsEditShiftOpen(true);
                              }}
                              title="Edit"
                            >
                              <Edit2 className="size-3.5 text-muted-foreground" />
                            </Button>

                            {shift.code !== "GEN" && shift.code !== "OFF" && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-7 text-rose-600 hover:bg-rose-50"
                                onClick={() => {
                                  if (confirm(`Delete shift "${shift.name}"?`)) {
                                    deleteShiftMut.mutate(shift.id);
                                  }
                                }}
                                title="Delete"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            )}
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

        {/* ===================== TAB 3: SHIFT SWAP PIPELINE ===================== */}
        <TabsContent value="swaps" className="space-y-4 pt-1">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <ArrowLeftRight className="size-4 text-amber-500" /> Peer Shift Swap Approval Pipeline
              </h2>
              <p className="text-xs text-muted-foreground">
                Staff can request reciprocal shift swaps. Once peer agrees, manager provides 1-click roster authorization.
              </p>
            </div>

            <Button
              size="sm"
              onClick={() => setIsSwapRequestOpen(true)}
              className="text-xs font-bold h-8 gap-1.5"
            >
              <Plus className="size-3.5" />
              <span>New Shift Swap</span>
            </Button>
          </div>

          <Card className="border shadow-2xs">
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 text-xs">
                    <TableHead className="text-xs">Requester Staff</TableHead>
                    <TableHead className="text-xs">Target Peer</TableHead>
                    <TableHead className="text-xs">Shift Date</TableHead>
                    <TableHead className="text-xs">Reason</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {isSwapsLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-10 text-xs">
                        Loading shift swap requests...
                      </TableCell>
                    </TableRow>
                  ) : shiftSwaps.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-10 text-xs italic">
                        No shift swap requests found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    shiftSwaps.map((swap: any) => (
                      <TableRow key={swap.id} className="hover:bg-muted/20 text-xs">
                        <TableCell>
                          <div className="space-y-0.5">
                            <span className="font-bold text-foreground block">
                              {swap.requesterEmployee?.firstName} {swap.requesterEmployee?.lastName}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {swap.requesterEmployee?.department?.name || "General"}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="space-y-0.5">
                            <span className="font-bold text-foreground block">
                              {swap.targetEmployee?.firstName} {swap.targetEmployee?.lastName}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {swap.targetEmployee?.department?.name || "General"}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="font-mono font-bold text-primary">
                          {new Date(swap.shiftDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </TableCell>

                        <TableCell className="max-w-[220px] truncate text-muted-foreground" title={swap.reason}>
                          {swap.reason}
                        </TableCell>

                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-bold capitalize ${
                              swap.status === "approved"
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                : swap.status === "pending_manager"
                                ? "bg-indigo-500/10 text-indigo-600 border-indigo-500/30"
                                : swap.status === "pending_peer"
                                ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                                : "bg-rose-500/10 text-rose-600 border-rose-500/30"
                            }`}
                          >
                            {swap.status.replace("_", " ")}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {swap.status === "pending_peer" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => peerActionMut.mutate({ id: swap.id, action: "accept" })}
                                  className="h-6 text-[10px] font-bold text-emerald-600 border-emerald-500/30"
                                >
                                  Peer Accept
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => peerActionMut.mutate({ id: swap.id, action: "decline" })}
                                  className="h-6 text-[10px] font-bold text-rose-600 border-rose-500/30"
                                >
                                  Decline
                                </Button>
                              </>
                            )}

                            {swap.status === "pending_manager" && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => managerActionMut.mutate({ id: swap.id, action: "approve" })}
                                  className="h-6 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                  Authorize Swap
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => managerActionMut.mutate({ id: swap.id, action: "reject" })}
                                  className="h-6 text-[10px] font-bold text-rose-600"
                                >
                                  Reject
                                </Button>
                              </>
                            )}

                            {swap.status === "approved" && (
                              <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                                <CheckCircle2 className="size-3" /> Executed
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── MODAL 1: INLINE SINGLE DAY SHIFT ASSIGNMENT ─── */}
      {selectedSlot && (
        <Dialog open={isSlotEditOpen} onOpenChange={setIsSlotEditOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Clock className="size-4 text-primary" />
                <span>Assign Shift for {selectedSlot.employee.firstName}</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Date: {selectedSlot.date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Select Shift Band</Label>
                <Select value={selectedShiftIdForSlot} onValueChange={setSelectedShiftIdForSlot}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {shiftDefs.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} ({s.code}) — {s.startTime} to {s.endTime}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="pt-2 border-t">
              <Button size="sm" variant="outline" onClick={() => setIsSlotEditOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  assignSlotMut.mutate({
                    employeeId: selectedSlot.employee.id,
                    shiftId: selectedShiftIdForSlot,
                    rosterDate: formatDateISO(selectedSlot.date),
                  })
                }
                disabled={assignSlotMut.isPending}
                className="text-xs font-bold"
              >
                Save Schedule
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ─── MODAL 2: BULK AUTO-ROSTER GENERATOR ─── */}
      <Dialog open={isBulkRosterOpen} onOpenChange={setIsBulkRosterOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Zap className="size-5 text-primary" />
              <span>Bulk Auto-Schedule Roster</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Generate weekly or monthly shift patterns across your team in 1-click.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const targetEmps =
                bulkForm.departmentId === "all"
                  ? rosterMatrix.map((e: any) => e.id)
                  : rosterMatrix.filter((e: any) => e.departmentId === bulkForm.departmentId).map((e: any) => e.id);

              if (targetEmps.length === 0) {
                toast.error("No employees found in target selection.");
                return;
              }

              bulkAssignMut.mutate({
                employeeIds: targetEmps,
                shiftId: bulkForm.shiftId,
                offShiftId: bulkForm.offShiftId,
                startDate: startDateStr,
                daysCount: bulkForm.daysCount,
                includeWeekendOff: bulkForm.includeWeekendOff,
              });
            }}
            className="space-y-3 py-2 text-xs"
          >
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Target Department</Label>
              <Select
                value={bulkForm.departmentId}
                onValueChange={(v) => setBulkForm({ ...bulkForm, departmentId: v })}
              >
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments ({rosterMatrix.length} Staff)</SelectItem>
                  {departments.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Working Shift</Label>
                <Select
                  value={bulkForm.shiftId}
                  onValueChange={(v) => setBulkForm({ ...bulkForm, shiftId: v })}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select Shift" /></SelectTrigger>
                  <SelectContent>
                    {shiftDefs.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>{s.name} ({s.code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Weekend Off Shift</Label>
                <Select
                  value={bulkForm.offShiftId}
                  onValueChange={(v) => setBulkForm({ ...bulkForm, offShiftId: v })}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Weekly Off" /></SelectTrigger>
                  <SelectContent>
                    {shiftDefs.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>{s.name} ({s.code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Start Date</Label>
                <Input
                  disabled
                  value={`${startDateStr} (${weekDays[0].toLocaleDateString("en-US", { weekday: "short" })})`}
                  className="h-8 text-xs font-mono bg-muted"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Duration</Label>
                <Select
                  value={bulkForm.daysCount}
                  onValueChange={(v) => setBulkForm({ ...bulkForm, daysCount: v })}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 Days (1 Week)</SelectItem>
                    <SelectItem value="14">14 Days (2 Weeks)</SelectItem>
                    <SelectItem value="30">30 Days (1 Month)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="p-3 rounded-lg border bg-muted/20 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="font-bold text-foreground block">Apply Weekend Off Rule</span>
                <span className="text-[10px] text-muted-foreground">Saturday & Sunday auto-assigned to Weekly Off</span>
              </div>
              <input
                type="checkbox"
                checked={bulkForm.includeWeekendOff}
                onChange={(e) => setBulkForm({ ...bulkForm, includeWeekendOff: e.target.checked })}
                className="size-4 text-primary rounded"
              />
            </div>

            <DialogFooter className="pt-2 border-t">
              <Button type="button" size="sm" variant="outline" onClick={() => setIsBulkRosterOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={bulkAssignMut.isPending} className="text-xs font-bold">
                Generate Schedule
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 3: CREATE / EDIT SHIFT DEFINITION ─── */}
      <Dialog open={isCreateShiftOpen || isEditShiftOpen} onOpenChange={(o) => {
        if (!o) {
          setIsCreateShiftOpen(false);
          setIsEditShiftOpen(false);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Clock className="size-5 text-primary" />
              <span>{isEditShiftOpen ? "Edit Shift Definition" : "Create Shift Definition"}</span>
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (isEditShiftOpen && editingShift) {
                updateShiftMut.mutate({ id: editingShift.id, data: shiftForm });
              } else {
                createShiftMut.mutate(shiftForm);
              }
            }}
            className="space-y-3 py-2 text-xs"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Shift Name *</Label>
                <Input
                  required
                  placeholder="e.g. Morning Shift"
                  value={shiftForm.name}
                  onChange={(e) => setShiftForm({ ...shiftForm, name: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Shift Code (2-6 chars) *</Label>
                <Input
                  required
                  maxLength={6}
                  placeholder="e.g. MORN"
                  value={shiftForm.code}
                  onChange={(e) => setShiftForm({ ...shiftForm, code: e.target.value.toUpperCase() })}
                  className="h-8 text-xs font-mono font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Start Time (HH:mm)</Label>
                <Input
                  type="time"
                  required
                  value={shiftForm.startTime}
                  onChange={(e) => setShiftForm({ ...shiftForm, startTime: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">End Time (HH:mm)</Label>
                <Input
                  type="time"
                  required
                  value={shiftForm.endTime}
                  onChange={(e) => setShiftForm({ ...shiftForm, endTime: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Break Duration (Mins)</Label>
                <Input
                  type="number"
                  value={shiftForm.breakMinutes}
                  onChange={(e) => setShiftForm({ ...shiftForm, breakMinutes: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Differential Allowance (₹)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 250"
                  value={shiftForm.allowance}
                  onChange={(e) => setShiftForm({ ...shiftForm, allowance: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Badge Color</Label>
              <Select value={shiftForm.color} onValueChange={(v) => setShiftForm({ ...shiftForm, color: v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="blue">Blue (Corporate Standard)</SelectItem>
                  <SelectItem value="amber">Amber (Morning / Sun)</SelectItem>
                  <SelectItem value="purple">Purple (Evening / Twilight)</SelectItem>
                  <SelectItem value="indigo">Indigo (Night Differential)</SelectItem>
                  <SelectItem value="emerald">Emerald (Special / Peak)</SelectItem>
                  <SelectItem value="slate">Slate (Weekly Off)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-2 border-t">
              <Button type="button" size="sm" variant="outline" onClick={() => {
                setIsCreateShiftOpen(false);
                setIsEditShiftOpen(false);
              }}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={createShiftMut.isPending || updateShiftMut.isPending} className="text-xs font-bold">
                {isEditShiftOpen ? "Update Shift" : "Create Shift"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 4: REQUEST SHIFT SWAP ─── */}
      <Dialog open={isSwapRequestOpen} onOpenChange={setIsSwapRequestOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <ArrowLeftRight className="size-5 text-amber-500" />
              <span>Request Peer Shift Swap</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Request a reciprocal shift exchange with a teammate for a specific scheduled date.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              createSwapMut.mutate(swapForm);
            }}
            className="space-y-3 py-2 text-xs"
          >
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Requester Employee *</Label>
              <Select
                required
                value={swapForm.requesterEmployeeId}
                onValueChange={(v) => setSwapForm({ ...swapForm, requesterEmployeeId: v })}
              >
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Choose Requester" /></SelectTrigger>
                <SelectContent>
                  {rosterMatrix.map((emp: any) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.employeeCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Target Peer Teammate *</Label>
              <Select
                required
                value={swapForm.targetEmployeeId}
                onValueChange={(v) => setSwapForm({ ...swapForm, targetEmployeeId: v })}
              >
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Choose Peer" /></SelectTrigger>
                <SelectContent>
                  {rosterMatrix
                    .filter((emp: any) => emp.id !== swapForm.requesterEmployeeId)
                    .map((emp: any) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName} ({emp.employeeCode})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Shift Date *</Label>
              <Input
                required
                type="date"
                value={swapForm.shiftDate}
                onChange={(e) => setSwapForm({ ...swapForm, shiftDate: e.target.value })}
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Reason for Swap *</Label>
              <Textarea
                required
                rows={2}
                placeholder="e.g. Urgent family commitment, doctor appointment..."
                value={swapForm.reason}
                onChange={(e) => setSwapForm({ ...swapForm, reason: e.target.value })}
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-2 border-t">
              <Button type="button" size="sm" variant="outline" onClick={() => setIsSwapRequestOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={createSwapMut.isPending} className="text-xs font-bold">
                Submit Swap Request
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
