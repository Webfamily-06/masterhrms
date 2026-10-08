import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { toast } from "sonner";
import { TrendingUp, Plus, CheckCircle2, AlertTriangle, Clock, XCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/performance/pip")({
  component: HrPerformancePipPage,
});

export default function HrPerformancePipPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPip, setSelectedPip] = useState<any>(null);
  const [isConcludeOpen, setIsConcludeOpen] = useState(false);
  const [concludeData, setConcludeData] = useState({
    outcome: "completed",
    notes: "",
  });

  const [formData, setFormData] = useState({
    employeeId: "",
    reason: "",
    actionPlan: "",
    checkpoints: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  });

  const { data: pips = [], isLoading } = useQuery({
    queryKey: ["hr-performance-pip"],
    queryFn: async () => {
      const res = await api.get("/hr/performance/pip");
      return res.data;
    },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["hr-employees-list-quick"],
    queryFn: async () => {
      const res = await api.get("/hr/employees?limit=200");
      return res.data?.data || res.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await api.post("/hr/performance/pip", data);
    },
    onSuccess: () => {
      toast.success("Performance Improvement Plan (PIP) initiated");
      queryClient.invalidateQueries({ queryKey: ["hr-performance-pip"] });
      setIsModalOpen(false);
      setFormData({
        employeeId: "",
        reason: "",
        actionPlan: "",
        checkpoints: "",
        startDate: new Date().toISOString().split("T")[0],
        endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to initiate PIP");
    },
  });

  const concludeMutation = useMutation({
    mutationFn: async ({ id, outcome, notes }: { id: string; outcome: string; notes: string }) => {
      return await api.put(`/hr/performance/pip/${id}/conclude`, { outcome, notes });
    },
    onSuccess: () => {
      toast.success("PIP concluded with lifecycle event recorded");
      queryClient.invalidateQueries({ queryKey: ["hr-performance-pip"] });
      setIsConcludeOpen(false);
      setSelectedPip(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to conclude PIP");
    },
  });

  const activePips = pips.filter((p: any) => p.status === "active");
  const successfulPips = pips.filter((p: any) => p.status === "completed");
  const failedPips = pips.filter((p: any) => p.status === "failed");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Performance Improvement Plans (PIP)"
        description="Structured performance coaching, objective milestones, checkpoint monitoring, and formal closure workflows."
        actions={
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Initiate PIP
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Active Improvement Plans"
          value={activePips.length.toString()}
          icon={<Clock className="h-5 w-5 text-amber-500" />}
          description="In progress"
        />
        <StatCard
          title="Successfully Completed"
          value={successfulPips.length.toString()}
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />}
          description="Performance recovered"
        />
        <StatCard
          title="Escalated / Unresolved"
          value={failedPips.length.toString()}
          icon={<XCircle className="h-5 w-5 text-rose-500" />}
          description="Further action required"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center justify-between">
            <span>PIP Tracking Registry</span>
            <span className="text-sm font-normal text-muted-foreground">
              Total: {pips.length} Plans
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading PIP records...</div>
          ) : pips.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No performance improvement plans registered.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Milestones / Action Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pips.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      <div>
                        <span>
                          {p.employee?.firstName} {p.employee?.lastName}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {p.employee?.department?.name || "General"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {new Date(p.startDate).toLocaleDateString()} –{" "}
                      {new Date(p.endDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate" title={p.reason}>
                      {p.reason}
                    </TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate" title={p.actionPlan}>
                      {p.actionPlan}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          p.status === "completed"
                            ? "default"
                            : p.status === "active"
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {p.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {p.status === "active" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedPip(p);
                            setIsConcludeOpen(true);
                          }}
                        >
                          Conclude PIP
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">Concluded</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* CREATE PIP DIALOG */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Initiate Performance Improvement Plan</DialogTitle>
            <DialogDescription>
              Assign a structured plan with measurable objectives and review checkpoints.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Employee</Label>
              <Select
                value={formData.employeeId}
                onValueChange={(val) => setFormData({ ...formData, employeeId: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee..." />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp: any) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.employeeCode || emp.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Performance Gaps / Reason</Label>
              <Textarea
                placeholder="Identify specific performance metrics not being achieved..."
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              />
            </div>

            <div>
              <Label>Action Plan & Required Milestones</Label>
              <Textarea
                placeholder="List required deliverables, training, and target outputs..."
                value={formData.actionPlan}
                onChange={(e) => setFormData({ ...formData, actionPlan: e.target.value })}
              />
            </div>

            <div>
              <Label>Review Checkpoints</Label>
              <Input
                placeholder="e.g. Bi-weekly 1:1 check-in every alternate Friday"
                value={formData.checkpoints}
                onChange={(e) => setFormData({ ...formData, checkpoints: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={createMutation.isPending || !formData.employeeId || !formData.reason}
              onClick={() => createMutation.mutate(formData)}
            >
              {createMutation.isPending ? "Initiating..." : "Initiate PIP"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONCLUDE PIP DIALOG */}
      <Dialog open={isConcludeOpen} onOpenChange={setIsConcludeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Conclude Performance Improvement Plan</DialogTitle>
            <DialogDescription>
              Record the outcome and evaluation for {selectedPip?.employee?.firstName}{" "}
              {selectedPip?.employee?.lastName}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Final Outcome</Label>
              <Select
                value={concludeData.outcome}
                onValueChange={(val) => setConcludeData({ ...concludeData, outcome: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="completed">Completed - Performance Restored</SelectItem>
                  <SelectItem value="failed">Failed - Unsuccessful Improvement</SelectItem>
                  <SelectItem value="extended">Extended - Further Trial Required</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Closing Evaluation & Notes</Label>
              <Textarea
                placeholder="Detail final assessment results and next organizational steps..."
                value={concludeData.notes}
                onChange={(e) => setConcludeData({ ...concludeData, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConcludeOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={concludeMutation.isPending}
              onClick={() => {
                if (selectedPip) {
                  concludeMutation.mutate({
                    id: selectedPip.id,
                    outcome: concludeData.outcome,
                    notes: concludeData.notes,
                  });
                }
              }}
            >
              {concludeMutation.isPending ? "Concluding..." : "Finalize Outcome"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
