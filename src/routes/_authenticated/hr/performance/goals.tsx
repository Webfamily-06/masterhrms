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
import { Progress } from "@/components/ui/progress";
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
import { Target, Plus, CheckCircle2, Clock, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/performance/goals")({
  component: HrPerformanceGoalsPage,
});

export default function HrPerformanceGoalsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: "",
    cycleId: "",
    goalType: "Strategic",
    title: "",
    description: "",
    targetValue: "100",
    unit: "%",
    weight: "20",
    startDate: new Date().toISOString().split("T")[0],
    dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  });

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ["hr-performance-goals"],
    queryFn: async () => {
      const res = await api.get("/hr/performance/goals");
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

  const { data: cycles = [] } = useQuery({
    queryKey: ["hr-performance-cycles"],
    queryFn: async () => {
      const res = await api.get("/hr/performance/cycles");
      return res.data;
    },
  });

  const { data: goalTypes = [] } = useQuery({
    queryKey: ["hr-performance-goal-types"],
    queryFn: async () => {
      const res = await api.get("/hr/performance/goal-types");
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await api.post("/hr/performance/goals", {
        ...data,
        targetValue: parseFloat(data.targetValue) || 100,
        weight: parseFloat(data.weight) || 0,
      });
    },
    onSuccess: () => {
      toast.success("Goal successfully configured and assigned");
      queryClient.invalidateQueries({ queryKey: ["hr-performance-goals"] });
      setIsModalOpen(false);
      setFormData({
        employeeId: "",
        cycleId: "",
        goalType: "Strategic",
        title: "",
        description: "",
        targetValue: "100",
        unit: "%",
        weight: "20",
        startDate: new Date().toISOString().split("T")[0],
        dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to create goal");
    },
  });

  const completedGoals = goals.filter((g: any) => g.status === "completed");
  const inProgressGoals = goals.filter((g: any) => g.status === "in_progress" || g.status === "active");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Goal Tracking & OKRs"
        description="Oversee company-wide objectives, key results, weight allocations, and achievement metrics across departments."
        actions={
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Assign New Goal
          </Button>
        }
      />

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Total Assigned Goals"
          value={goals.length.toString()}
          icon={<Target className="h-5 w-5 text-indigo-500" />}
          description="Across all appraisal cycles"
        />
        <StatCard
          title="In Progress"
          value={inProgressGoals.length.toString()}
          icon={<Clock className="h-5 w-5 text-amber-500" />}
          description="Active execution phase"
        />
        <StatCard
          title="Goals Achieved"
          value={completedGoals.length.toString()}
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />}
          description="100% completion marked"
        />
      </div>

      {/* TABLE */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center justify-between">
            <span>Corporate Goals & OKRs Registry</span>
            <span className="text-sm font-normal text-muted-foreground">
              Total: {goals.length} Goals
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading corporate goals...</div>
          ) : goals.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No goals registered. Click "Assign New Goal" to begin setting OKRs.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Goal Title & Type</TableHead>
                  <TableHead>Cycle</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {goals.map((g: any) => {
                  const percent = Math.min(100, Math.round(Number(g.progressPercent || 0)));
                  return (
                    <TableRow key={g.id}>
                      <TableCell className="font-medium">
                        <div>
                          <span>
                            {g.employee?.firstName} {g.employee?.lastName}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {g.employee?.department?.name || "General"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <span className="font-medium text-sm">{g.title}</span>
                          <div className="flex items-center gap-1.5">
                            <Badge variant="outline" className="text-[10px] py-0">
                              {g.goalType}
                            </Badge>
                            {g.unit && (
                              <span className="text-xs text-muted-foreground">
                                Target: {g.targetValue} {g.unit}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{g.cycle?.title || "Continuous"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-mono">
                          {g.weight}%
                        </Badge>
                      </TableCell>
                      <TableCell className="w-[180px]">
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span>{percent}%</span>
                            <span className="text-muted-foreground">
                              {g.currentValue ?? 0}/{g.targetValue}
                            </span>
                          </div>
                          <Progress value={percent} className="h-1.5" />
                        </div>
                      </TableCell>
                      <TableCell>{new Date(g.dueDate).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={
                            g.status === "completed"
                              ? "default"
                              : g.status === "in_progress"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {g.status?.replace("_", " ").toUpperCase()}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* CREATE GOAL MODAL */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Assign Goal / OKR</DialogTitle>
            <DialogDescription>
              Assign a structured objective to an employee with progress weighting and target metric.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Select Employee</Label>
              <Select
                value={formData.employeeId}
                onValueChange={(val) => setFormData({ ...formData, employeeId: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose employee..." />
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
                <Label>Appraisal Cycle</Label>
                <Select
                  value={formData.cycleId}
                  onValueChange={(val) => setFormData({ ...formData, cycleId: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Continuous / Annual" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Continuous (No Cycle)</SelectItem>
                    {cycles.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Goal Type</Label>
                <Select
                  value={formData.goalType}
                  onValueChange={(val) => setFormData({ ...formData, goalType: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Strategic">Strategic</SelectItem>
                    <SelectItem value="Departmental">Departmental</SelectItem>
                    <SelectItem value="Individual">Individual</SelectItem>
                    <SelectItem value="Development">Professional Development</SelectItem>
                    {goalTypes.map((gt: any) => (
                      <SelectItem key={gt.id} value={gt.name}>
                        {gt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Goal Title / Objective</Label>
              <Input
                placeholder="e.g. Deliver Real-Time Payroll Integration"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Target Value</Label>
                <Input
                  type="number"
                  value={formData.targetValue}
                  onChange={(e) => setFormData({ ...formData, targetValue: e.target.value })}
                />
              </div>
              <div>
                <Label>Unit of Measure</Label>
                <Input
                  placeholder="%, Units, $"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                />
              </div>
              <div>
                <Label>Weight (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                />
              </div>
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
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Objective Details & Key Results</Label>
              <Textarea
                placeholder="Key result milestones and measurable success criteria..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={createMutation.isPending || !formData.employeeId || !formData.title}
              onClick={() => createMutation.mutate(formData)}
            >
              {createMutation.isPending ? "Assigning..." : "Assign Goal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
