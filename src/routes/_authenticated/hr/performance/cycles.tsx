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
import { Calendar, Plus, CheckCircle2, Send, Clock, Layers, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/performance/cycles")({
  component: HrPerformanceCyclesPage,
});

export default function HrPerformanceCyclesPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    selfReviewDeadline: "",
    managerReviewDeadline: "",
    description: "",
  });

  const { data: cycles = [], isLoading } = useQuery({
    queryKey: ["hr-performance-cycles"],
    queryFn: async () => {
      const res = await api.get("/hr/performance/cycles");
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await api.post("/hr/performance/cycles", data);
    },
    onSuccess: () => {
      toast.success("Appraisal cycle configured successfully");
      queryClient.invalidateQueries({ queryKey: ["hr-performance-cycles"] });
      setIsModalOpen(false);
      setFormData({
        title: "",
        startDate: new Date().toISOString().split("T")[0],
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        selfReviewDeadline: "",
        managerReviewDeadline: "",
        description: "",
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to create cycle");
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return await api.put(`/hr/performance/cycles/${id}/status`, { status });
    },
    onSuccess: () => {
      toast.success("Cycle stage updated");
      queryClient.invalidateQueries({ queryKey: ["hr-performance-cycles"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to update cycle status");
    },
  });

  const releaseMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.post(`/hr/performance/cycles/${id}/release`);
    },
    onSuccess: () => {
      toast.success("Appraisal results published to Employee Self-Service (ESS)");
      queryClient.invalidateQueries({ queryKey: ["hr-performance-cycles"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to release cycle reviews");
    },
  });

  const activeCycles = cycles.filter((c: any) => c.status === "active");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Appraisal Cycles"
        description="Schedule corporate review cycles, manage progression from goal-setting to calibration, and release final ratings to staff."
        actions={
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> New Cycle
          </Button>
        }
      />

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Total Configured Cycles"
          value={cycles.length.toString()}
          icon={<Calendar className="h-5 w-5 text-indigo-500" />}
          description="Historical & active cycles"
        />
        <StatCard
          title="Active Appraisal Cycles"
          value={activeCycles.length.toString()}
          icon={<Clock className="h-5 w-5 text-emerald-500" />}
          description="In progress"
        />
        <StatCard
          title="Completed / Released"
          value={cycles.filter((c: any) => c.status === "completed").length.toString()}
          icon={<CheckCircle2 className="h-5 w-5 text-blue-500" />}
          description="Finalized cycles"
        />
      </div>

      {/* TABLE */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center justify-between">
            <span>Cycle Registry</span>
            <span className="text-sm font-normal text-muted-foreground">
              Total: {cycles.length} Cycles
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading cycles...</div>
          ) : cycles.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No performance cycles configured. Click "New Cycle" to initialize one.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cycle Title</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Self Review Due</TableHead>
                  <TableHead>Manager Review Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reviews</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cycles.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      <div>
                        <span>{c.title}</span>
                        {c.description && (
                          <span className="block text-xs text-muted-foreground line-clamp-1">
                            {c.description}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(c.startDate).toLocaleDateString()} –{" "}
                      {new Date(c.endDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {c.selfReviewDeadline
                        ? new Date(c.selfReviewDeadline).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {c.managerReviewDeadline
                        ? new Date(c.managerReviewDeadline).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          c.status === "active"
                            ? "default"
                            : c.status === "completed"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {c.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>{c.reviews?.length || 0} evaluations</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Select
                        value={c.status}
                        onValueChange={(val) => updateStatusMutation.mutate({ id: c.id, status: val })}
                      >
                        <SelectTrigger className="w-[130px] inline-flex h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="planning">Planning</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="review">Review</SelectItem>
                          <SelectItem value="calibration">Calibration</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>

                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        disabled={releaseMutation.isPending}
                        onClick={() => releaseMutation.mutate(c.id)}
                        title="Release ratings and feedback to Employee Self-Service"
                      >
                        <Send className="h-3.5 w-3.5 mr-1" /> Release
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* CREATE MODAL */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Configure Appraisal Cycle</DialogTitle>
            <DialogDescription>
              Set up appraisal timelines, evaluation boundaries, and submission deadlines.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Cycle Title</Label>
              <Input
                placeholder="e.g. FY 2026 Annual Performance Review"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Self Review Deadline</Label>
                <Input
                  type="date"
                  value={formData.selfReviewDeadline}
                  onChange={(e) =>
                    setFormData({ ...formData, selfReviewDeadline: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Manager Review Deadline</Label>
                <Input
                  type="date"
                  value={formData.managerReviewDeadline}
                  onChange={(e) =>
                    setFormData({ ...formData, managerReviewDeadline: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <Label>Cycle Description / Guidelines</Label>
              <Textarea
                placeholder="Optional notes or evaluation guidelines for managers and staff..."
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
              disabled={createMutation.isPending || !formData.title}
              onClick={() => createMutation.mutate(formData)}
            >
              {createMutation.isPending ? "Creating..." : "Create Cycle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
