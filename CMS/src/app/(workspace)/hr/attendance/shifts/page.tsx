'use client';

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  CalendarDays,
  Clock,
  Plus,
  RefreshCw,
  Search,
  Sun,
  Moon,
  Users,
  Edit2,
  Trash2,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export default function HrAttendanceShiftsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "day" | "night">("all");

  // Modals
  const [createShiftModalOpen, setCreateShiftModalOpen] = useState(false);
  const [assignRosterModalOpen, setAssignRosterModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<any>(null);

  // Forms
  const [shiftForm, setShiftForm] = useState({
    name: "",
    code: "",
    startTime: "09:30",
    endTime: "18:30",
    breakMinutes: 60,
    isOvertimeEligible: true,
    color: "blue",
  });

  const [rosterForm, setRosterForm] = useState({
    employeeId: "",
    shiftId: "",
    rosterDate: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  // 1. Fetch Shifts
  const { data: shifts = [], isLoading: loadingShifts, refetch: refetchShifts } = useQuery({
    queryKey: ["hr-shifts"],
    queryFn: async () => {
      const res = await api.get("/api/v1/hr/attendance/shifts");
      return res.data;
    },
  });

  // 2. Fetch Employees for Roster Assignment
  const { data: employeesData } = useQuery({
    queryKey: ["hr-employees-lookup"],
    queryFn: async () => {
      const res = await api.get<{ data: any[] }>("/api/v1/hr/employees?limit=200");
      return res.data || [];
    },
  });

  // Helper: Detect if shift is a night/overnight shift
  const isNightShift = (startTime: string, endTime: string) => {
    const [startH] = startTime.split(":").map(Number);
    const [endH] = endTime.split(":").map(Number);
    return startH >= 19 || endH <= 8 || endH < startH;
  };

  // Helper: Calculate shift total working hours
  const calculateShiftWorkingHours = (startTime: string, endTime: string, breakMinutes: number) => {
    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);
    let startTotal = startH * 60 + startM;
    let endTotal = endH * 60 + endM;
    if (endTotal <= startTotal) {
      endTotal += 24 * 60; // Crosses midnight
    }
    const diffMinutes = Math.max(0, endTotal - startTotal - breakMinutes);
    return Math.round((diffMinutes / 60) * 10) / 10;
  };

  // Mutation: Create or Update Shift
  const saveShiftMutation = useMutation({
    mutationFn: async (payload: typeof shiftForm) => {
      if (editingShift?.id) {
        const res = await api.put(`/api/v1/hr/attendance/shifts/${editingShift.id}`, payload);
        return res.data;
      } else {
        const res = await api.post("/api/v1/hr/attendance/shifts", payload);
        return res.data;
      }
    },
    onSuccess: () => {
      toast.success(editingShift ? "Shift definition updated" : "Shift definition created successfully");
      queryClient.invalidateQueries({ queryKey: ["hr-shifts"] });
      setCreateShiftModalOpen(false);
      setEditingShift(null);
      setShiftForm({
        name: "",
        code: "",
        startTime: "09:30",
        endTime: "18:30",
        breakMinutes: 60,
        isOvertimeEligible: true,
        color: "blue",
      });
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Failed to save shift definition"),
  });

  // Mutation: Delete Shift
  const deleteShiftMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/api/v1/hr/attendance/shifts/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Shift definition deleted");
      queryClient.invalidateQueries({ queryKey: ["hr-shifts"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Failed to delete shift"),
  });

  // Mutation: Assign Roster
  const assignRosterMutation = useMutation({
    mutationFn: async (payload: typeof rosterForm) => {
      const res = await api.post("/api/v1/hr/attendance/shifts/rosters", payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Shift assigned to employee successfully");
      queryClient.invalidateQueries({ queryKey: ["hr-shift-rosters"] });
      queryClient.invalidateQueries({ queryKey: ["hr-attendance-matrix"] });
      setAssignRosterModalOpen(false);
      setRosterForm({
        employeeId: "",
        shiftId: "",
        rosterDate: new Date().toISOString().slice(0, 10),
        notes: "",
      });
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Failed to assign shift"),
  });

  const employees = employeesData || [];
  const nightShiftsCount = shifts.filter((s: any) => isNightShift(s.startTime, s.endTime)).length;
  const dayShiftsCount = shifts.length - nightShiftsCount;

  const filteredShifts = shifts.filter((s: any) => {
    const isNight = isNightShift(s.startTime, s.endTime);
    if (typeFilter === "day" && isNight) return false;
    if (typeFilter === "night" && !isNight) return false;
    if (searchTerm) {
      const name = (s.name || "").toLowerCase();
      const code = (s.code || "").toLowerCase();
      const st = searchTerm.toLowerCase();
      if (!name.includes(st) && !code.includes(st)) return false;
    }
    return true;
  });

  const handleOpenEdit = (shift: any) => {
    setEditingShift(shift);
    setShiftForm({
      name: shift.name,
      code: shift.code,
      startTime: shift.startTime,
      endTime: shift.endTime,
      breakMinutes: shift.breakMinutes || 60,
      isOvertimeEligible: shift.isOvertimeEligible !== false,
      color: shift.color || "blue",
    });
    setCreateShiftModalOpen(true);
  };

  const handleOpenAssign = (shiftId?: string) => {
    setRosterForm({
      employeeId: "",
      shiftId: shiftId || (shifts[0]?.id ?? ""),
      rosterDate: new Date().toISOString().slice(0, 10),
      notes: "",
    });
    setAssignRosterModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Shifts & Rosters"
        description="Shift timings, day/night classifications, overnight schedules, and employee roster assignments."
      >
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenAssign()}
            disabled={shifts.length === 0}
            className="gap-1.5 text-xs font-medium"
          >
            <Users className="w-4 h-4 text-primary" />
            Assign Shift
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setEditingShift(null);
              setShiftForm({
                name: "",
                code: "",
                startTime: "09:30",
                endTime: "18:30",
                breakMinutes: 60,
                isOvertimeEligible: true,
                color: "blue",
              });
              setCreateShiftModalOpen(true);
            }}
            className="gap-1.5 text-xs font-medium"
          >
            <Plus className="w-4 h-4" />
            New Shift
          </Button>
          <Button variant="ghost" size="icon" onClick={() => refetchShifts()} disabled={loadingShifts} className="h-9 w-9">
            <RefreshCw className={`w-4 h-4 ${loadingShifts ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </PageHeader>

      {/* KPI Summary Cards (Reference Screenshot 4) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Total Shifts"
          value={shifts.length}
          icon={<CalendarDays className="w-5 h-5 text-blue-500" />}
        />
        <StatCard
          label="Active Shifts"
          value={shifts.length}
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />}
          className="border-emerald-200 bg-emerald-50/20"
        />
        <StatCard
          label="Day Shifts"
          value={dayShiftsCount}
          icon={<Sun className="w-5 h-5 text-amber-500" />}
          className="border-amber-200 bg-amber-50/20"
        />
        <StatCard
          label="Night Shifts"
          value={nightShiftsCount}
          icon={<Moon className="w-5 h-5 text-indigo-500" />}
          className="border-indigo-200 bg-indigo-50/20"
        />
      </div>

      {/* Filters Toolbar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Search shift name or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-muted p-1 rounded-lg text-xs font-medium">
              {[
                { key: "all", label: "All Shifts", count: shifts.length },
                { key: "day", label: "Day Shifts", count: dayShiftsCount },
                { key: "night", label: "Night Shifts", count: nightShiftsCount },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setTypeFilter(tab.key as any)}
                  className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                    typeFilter === tab.key
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
        </CardContent>
      </Card>

      {/* Shift Cards Grid (Reference Screenshot 4) */}
      {loadingShifts ? (
        <div className="p-12 text-center text-muted-foreground">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
          Loading shift configurations...
        </div>
      ) : filteredShifts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No shifts found matching your filter criteria.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredShifts.map((shift: any) => {
            const isNight = isNightShift(shift.startTime, shift.endTime);
            const workingHours = calculateShiftWorkingHours(shift.startTime, shift.endTime, shift.breakMinutes || 60);

            return (
              <Card key={shift.id} className="overflow-hidden border shadow-xs hover:shadow-sm transition-shadow">
                <CardHeader className="p-4 pb-3 border-b bg-muted/15 flex flex-row items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isNight
                          ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                      }`}
                    >
                      {isNight ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-foreground">{shift.name}</h4>
                      <p className="text-[11px] text-muted-foreground font-mono">{shift.code}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Badge
                      variant="outline"
                      className={`text-[10px] gap-1 font-semibold ${
                        isNight
                          ? "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300"
                          : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300"
                      }`}
                    >
                      {isNight ? "Night Shift" : "Day Shift"}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="p-4 space-y-3.5 text-xs">
                  {/* Timings Block */}
                  <div className="p-3 rounded-lg border bg-card space-y-1">
                    <span className="text-[10px] text-muted-foreground uppercase font-medium block">
                      Shift Hours
                    </span>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-mono font-bold text-sm text-foreground">
                        <span>{shift.startTime}</span>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{shift.endTime}</span>
                      </div>
                      {isNight && (
                        <span className="text-[10px] text-indigo-600 font-medium bg-indigo-50 dark:bg-indigo-950/50 px-1.5 py-0.5 rounded">
                          Crosses Midnight (+1d)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded border bg-muted/20">
                      <p className="text-[10px] text-muted-foreground uppercase font-medium">Work Hours</p>
                      <p className="text-sm font-bold text-foreground mt-0.5">{workingHours} hrs</p>
                    </div>
                    <div className="p-2 rounded border bg-muted/20">
                      <p className="text-[10px] text-muted-foreground uppercase font-medium">Break</p>
                      <p className="text-sm font-bold text-foreground mt-0.5">{shift.breakMinutes || 60}m</p>
                    </div>
                    <div className="p-2 rounded border bg-muted/20">
                      <p className="text-[10px] text-muted-foreground uppercase font-medium">Overtime</p>
                      <p className="text-sm font-bold text-emerald-600 mt-0.5">
                        {shift.isOvertimeEligible !== false ? "Eligible" : "No"}
                      </p>
                    </div>
                  </div>

                  {/* Actions Toolbar */}
                  <div className="flex items-center justify-between pt-2 border-t text-xs">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenAssign(shift.id)}
                      className="h-8 gap-1.5 text-xs font-medium"
                    >
                      <Users className="h-3.5 w-3.5 text-primary" />
                      Assign
                    </Button>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(shift)}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteShiftMutation.mutate(shift.id)}
                        className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* MODAL: Create / Edit Shift */}
      <Dialog open={createShiftModalOpen} onOpenChange={setCreateShiftModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4 text-primary" />
              {editingShift ? "Edit Shift Definition" : "Create New Shift"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Define standard or overnight work hours and break policies.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">Shift Name *</label>
              <Input
                placeholder="e.g. Regular Day Shift, Night Support Shift..."
                value={shiftForm.name}
                onChange={(e) => setShiftForm({ ...shiftForm, name: e.target.value })}
                className="h-9 text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-foreground block mb-1">Shift Code</label>
              <Input
                placeholder="e.g. DAY-01, NGT-02..."
                value={shiftForm.code}
                onChange={(e) => setShiftForm({ ...shiftForm, code: e.target.value })}
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Start Time *</label>
                <Input
                  type="time"
                  value={shiftForm.startTime}
                  onChange={(e) => setShiftForm({ ...shiftForm, startTime: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">End Time *</label>
                <Input
                  type="time"
                  value={shiftForm.endTime}
                  onChange={(e) => setShiftForm({ ...shiftForm, endTime: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Break Duration (mins)</label>
                <Input
                  type="number"
                  min="0"
                  step="5"
                  value={shiftForm.breakMinutes}
                  onChange={(e) => setShiftForm({ ...shiftForm, breakMinutes: Number(e.target.value) })}
                  className="h-9 text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Color Theme</label>
                <select
                  value={shiftForm.color}
                  onChange={(e) => setShiftForm({ ...shiftForm, color: e.target.value })}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                >
                  <option value="blue">Blue</option>
                  <option value="emerald">Emerald</option>
                  <option value="purple">Purple</option>
                  <option value="amber">Amber</option>
                  <option value="indigo">Indigo</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="isOvertimeEligible"
                checked={shiftForm.isOvertimeEligible}
                onChange={(e) => setShiftForm({ ...shiftForm, isOvertimeEligible: e.target.checked })}
                className="rounded border-input text-primary focus:ring-primary h-4 w-4"
              />
              <label htmlFor="isOvertimeEligible" className="text-xs text-foreground font-medium">
                Eligible for Overtime calculation beyond standard working hours
              </label>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setCreateShiftModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => saveShiftMutation.mutate(shiftForm)}
              disabled={!shiftForm.name || !shiftForm.startTime || !shiftForm.endTime || saveShiftMutation.isPending}
            >
              {saveShiftMutation.isPending ? "Saving..." : editingShift ? "Update Shift" : "Create Shift"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Assign Shift to Employee */}
      <Dialog open={assignRosterModalOpen} onOpenChange={setAssignRosterModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-primary" />
              Assign Shift Roster
            </DialogTitle>
            <DialogDescription className="text-xs">
              Assign an employee to a scheduled work shift on a target date.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">Employee *</label>
              <select
                value={rosterForm.employeeId}
                onChange={(e) => setRosterForm({ ...rosterForm, employeeId: e.target.value })}
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

            <div>
              <label className="text-xs font-medium text-foreground block mb-1">Shift Definition *</label>
              <select
                value={rosterForm.shiftId}
                onChange={(e) => setRosterForm({ ...rosterForm, shiftId: e.target.value })}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
              >
                <option value="">Select Shift...</option>
                {shifts.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.startTime} - {s.endTime})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground block mb-1">Effective Date *</label>
              <Input
                type="date"
                value={rosterForm.rosterDate}
                onChange={(e) => setRosterForm({ ...rosterForm, rosterDate: e.target.value })}
                className="h-9 text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-foreground block mb-1">Assignment Notes</label>
              <Input
                placeholder="Optional notes for shift assignment..."
                value={rosterForm.notes}
                onChange={(e) => setRosterForm({ ...rosterForm, notes: e.target.value })}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setAssignRosterModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => assignRosterMutation.mutate(rosterForm)}
              disabled={!rosterForm.employeeId || !rosterForm.shiftId || !rosterForm.rosterDate || assignRosterMutation.isPending}
            >
              {assignRosterMutation.isPending ? "Assigning..." : "Assign Shift"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
