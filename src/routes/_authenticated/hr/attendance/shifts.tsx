import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  CalendarDays,
  Clock,
  ArrowLeftRight,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/hr/attendance/shifts")({
  component: HrAttendanceShiftsPage,
});

export default function HrAttendanceShiftsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("shifts");
  const [createShiftModalOpen, setCreateShiftModalOpen] = useState(false);
  const [assignRosterModalOpen, setAssignRosterModalOpen] = useState(false);

  // Form states
  const [newShift, setNewShift] = useState({
    name: "",
    code: "",
    startTime: "09:30",
    endTime: "18:30",
    breakMinutes: 60,
    color: "blue",
  });

  const [rosterForm, setRosterForm] = useState({
    employeeId: "",
    shiftId: "",
    rosterDate: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  // Queries
  const { data: shifts = [], isLoading: loadingShifts, refetch: refetchShifts } = useQuery({
    queryKey: ["hr-shifts"],
    queryFn: async () => {
      const res = await api.get("/api/v1/hr/attendance/shifts");
      return res.data;
    },
  });

  const { data: rosters = [], isLoading: loadingRosters, refetch: refetchRosters } = useQuery({
    queryKey: ["hr-shift-rosters"],
    queryFn: async () => {
      const res = await api.get("/api/v1/hr/attendance/shifts/rosters");
      return res.data;
    },
  });

  const { data: swaps = [], isLoading: loadingSwaps, refetch: refetchSwaps } = useQuery({
    queryKey: ["hr-shift-swaps"],
    queryFn: async () => {
      const res = await api.get("/api/v1/hr/attendance/shifts/swaps");
      return res.data;
    },
  });

  // Mutations
  const createShiftMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post("/api/v1/hr/attendance/shifts", payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Shift definition created");
      queryClient.invalidateQueries({ queryKey: ["hr-shifts"] });
      setCreateShiftModalOpen(false);
      setNewShift({ name: "", code: "", startTime: "09:30", endTime: "18:30", breakMinutes: 60, color: "blue" });
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Failed to create shift"),
  });

  const assignRosterMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post("/api/v1/hr/attendance/shifts/rosters", payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Shift roster assigned successfully");
      queryClient.invalidateQueries({ queryKey: ["hr-shift-rosters"] });
      setAssignRosterModalOpen(false);
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Failed to assign roster"),
  });

  const swapActionMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "approve" | "reject" }) => {
      const res = await api.post(`/api/v1/hr/attendance/shifts/swaps/${id}/action`, { action });
      return res.data;
    },
    onSuccess: (_, vars) => {
      toast.success(`Shift swap ${vars.action === "approve" ? "approved" : "rejected"}`);
      queryClient.invalidateQueries({ queryKey: ["hr-shift-swaps"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Failed to process shift swap"),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shift Master & Rosters"
        description="Configure shift timings, plan monthly rosters, and manage employee swap requests."
      >
        <div className="flex items-center gap-2">
          {activeTab === "shifts" && (
            <Button size="sm" onClick={() => setCreateShiftModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Shift
            </Button>
          )}
          {activeTab === "rosters" && (
            <Button size="sm" onClick={() => setAssignRosterModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Assign Shift
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchShifts();
              refetchRosters();
              refetchSwaps();
            }}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Shift Types" value={shifts.length} icon={<Clock className="w-5 h-5 text-blue-500" />} />
        <StatCard label="Active Rosters" value={rosters.length} icon={<CalendarDays className="w-5 h-5 text-emerald-500" />} />
        <StatCard label="Swap Requests" value={swaps.filter((s: any) => s.status === "pending_manager" || s.status === "pending_peer").length} icon={<ArrowLeftRight className="w-5 h-5 text-amber-500" />} />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="shifts">Shift Definitions</TabsTrigger>
          <TabsTrigger value="rosters">Shift Roster</TabsTrigger>
          <TabsTrigger value="swaps">Shift Swaps</TabsTrigger>
        </TabsList>

        {/* Tab 1: Shift Definitions */}
        <TabsContent value="shifts" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {shifts.map((shift: any) => (
              <Card key={shift.id} className="relative overflow-hidden">
                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-base">{shift.name}</h3>
                    <Badge variant="outline" className="font-mono text-xs uppercase">
                      {shift.code}
                    </Badge>
                  </div>
                  <div className="text-2xl font-bold font-mono tracking-tight text-primary">
                    {shift.startTime} - {shift.endTime}
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>Break: {shift.breakMinutes} mins</div>
                    <div>Overtime Eligible: {shift.isOvertimeEligible ? "Yes" : "No"}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tab 2: Shift Roster */}
        <TabsContent value="rosters">
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-semibold">Active Employee Rosters</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs font-medium text-muted-foreground border-b">
                    <tr>
                      <th className="py-3 px-4 text-left">Employee</th>
                      <th className="py-3 px-4 text-left">Roster Date</th>
                      <th className="py-3 px-4 text-left">Shift Assigned</th>
                      <th className="py-3 px-4 text-left">Timings</th>
                      <th className="py-3 px-4 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rosters.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-muted-foreground">
                          No roster schedules found for this period
                        </td>
                      </tr>
                    ) : (
                      rosters.map((r: any) => (
                        <tr key={r.id} className="hover:bg-muted/30">
                          <td className="py-3 px-4">
                            <div className="font-medium">{r.employee?.firstName} {r.employee?.lastName}</div>
                            <div className="text-xs text-muted-foreground font-mono">{r.employee?.employeeCode}</div>
                          </td>
                          <td className="py-3 px-4 font-mono text-xs">
                            {new Date(r.rosterDate).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="secondary">{r.shift?.name || "General Shift"}</Badge>
                          </td>
                          <td className="py-3 px-4 font-mono text-xs">
                            {r.shift?.startTime} - {r.shift?.endTime}
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="outline" className="capitalize text-xs">
                              {r.status}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Shift Swaps */}
        <TabsContent value="swaps">
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-semibold">Shift Swap Requests</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs font-medium text-muted-foreground border-b">
                    <tr>
                      <th className="py-3 px-4 text-left">Requester</th>
                      <th className="py-3 px-4 text-left">Target Peer</th>
                      <th className="py-3 px-4 text-left">Shift Date</th>
                      <th className="py-3 px-4 text-left">Reason</th>
                      <th className="py-3 px-4 text-left">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {swaps.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-muted-foreground">
                          No swap requests submitted
                        </td>
                      </tr>
                    ) : (
                      swaps.map((s: any) => (
                        <tr key={s.id} className="hover:bg-muted/30">
                          <td className="py-3 px-4 font-medium">
                            {s.requesterEmployee?.firstName} {s.requesterEmployee?.lastName}
                          </td>
                          <td className="py-3 px-4">
                            {s.targetEmployee?.firstName} {s.targetEmployee?.lastName}
                          </td>
                          <td className="py-3 px-4 font-mono text-xs">
                            {new Date(s.shiftDate).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 text-xs text-muted-foreground max-w-xs truncate">
                            {s.reason}
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="secondary" className="capitalize text-xs">
                              {s.status.replace("_", " ")}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {s.status.includes("pending") && (
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  size="sm"
                                  className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
                                  onClick={() => swapActionMutation.mutate({ id: s.id, action: "approve" })}
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs text-rose-600 border-rose-200"
                                  onClick={() => swapActionMutation.mutate({ id: s.id, action: "reject" })}
                                >
                                  Reject
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal: Create Shift */}
      <Dialog open={createShiftModalOpen} onOpenChange={setCreateShiftModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Define New Shift</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold">Shift Name</label>
              <Input
                placeholder="e.g. Morning Shift"
                value={newShift.name}
                onChange={(e) => setNewShift({ ...newShift, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold">Start Time</label>
                <Input
                  type="time"
                  value={newShift.startTime}
                  onChange={(e) => setNewShift({ ...newShift, startTime: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold">End Time</label>
                <Input
                  type="time"
                  value={newShift.endTime}
                  onChange={(e) => setNewShift({ ...newShift, endTime: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateShiftModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createShiftMutation.mutate(newShift)}
              disabled={!newShift.name || createShiftMutation.isPending}
            >
              Save Shift
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
