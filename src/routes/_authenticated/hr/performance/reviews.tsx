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
import { Award, Plus, Star, CheckCircle2, Clock, Send, Eye } from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/performance/reviews")({
  component: HrPerformanceReviewsPage,
});

export default function HrPerformanceReviewsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: "",
    cycleId: "",
    reviewerId: "",
    overallScore: "4.0",
    strengths: "",
    areasOfImprovement: "",
    remarks: "",
    finalized: true,
  });

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["hr-performance-reviews"],
    queryFn: async () => {
      const res = await api.get("/hr/performance/reviews");
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

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await api.post("/hr/performance/reviews", {
        ...data,
        overallScore: parseFloat(data.overallScore) || 0,
        status: data.finalized ? "finalized" : "submitted",
      });
    },
    onSuccess: () => {
      toast.success("Performance review submitted and recorded");
      queryClient.invalidateQueries({ queryKey: ["hr-performance-reviews"] });
      setIsModalOpen(false);
      setFormData({
        employeeId: "",
        cycleId: "",
        reviewerId: "",
        overallScore: "4.0",
        strengths: "",
        areasOfImprovement: "",
        remarks: "",
        finalized: true,
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to submit review");
    },
  });

  const finalizedReviews = reviews.filter((r: any) => r.status === "finalized");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Appraisals & Performance Reviews"
        description="Comprehensive 360 evaluations, manager scores, mathematical rating calibrations, and confidential performance feedback."
        actions={
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Conduct Appraisal
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Total Appraisals"
          value={reviews.length.toString()}
          icon={<Award className="h-5 w-5 text-indigo-500" />}
          description="Across all cycles"
        />
        <StatCard
          title="Finalized Evaluations"
          value={finalizedReviews.length.toString()}
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />}
          description="Completed assessments"
        />
        <StatCard
          title="Pending / In Progress"
          value={(reviews.length - finalizedReviews.length).toString()}
          icon={<Clock className="h-5 w-5 text-amber-500" />}
          description="Drafts or awaiting manager review"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center justify-between">
            <span>Appraisal Evaluation Master List</span>
            <span className="text-sm font-normal text-muted-foreground">
              Total: {reviews.length} Evaluations
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading reviews...</div>
          ) : reviews.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No performance appraisals recorded. Click "Conduct Appraisal" to start one.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Cycle</TableHead>
                  <TableHead>Reviewer</TableHead>
                  <TableHead>Calibrated Score</TableHead>
                  <TableHead>Self Review</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">ESS Release</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviews.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      <div>
                        <span>
                          {r.employee?.firstName} {r.employee?.lastName}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {r.employee?.department?.name || "General"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{r.cycle?.title || "Annual Review"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.reviewer
                        ? `${r.reviewer.firstName} ${r.reviewer.lastName}`
                        : "HR Authority"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 font-medium">
                        <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                        <span className="font-mono text-sm">
                          {r.overallScore ? Number(r.overallScore).toFixed(1) : "—"} / 5.0
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {r.selfScore ? (
                        <span className="text-xs font-mono text-muted-foreground">
                          Self: {Number(r.selfScore).toFixed(1)}/5
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Pending</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          r.status === "finalized"
                            ? "default"
                            : r.status === "submitted"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {r.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={r.isReleased ? "outline" : "secondary"}>
                        {r.isReleased ? "PUBLISHED" : "CONCEALED"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Conduct Performance Appraisal</DialogTitle>
            <DialogDescription>
              Record an authoritative evaluation with 5-point mathematical scoring and narrative feedback.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Employee under Evaluation</Label>
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
                <Label>Appraisal Cycle</Label>
                <Select
                  value={formData.cycleId}
                  onValueChange={(val) => setFormData({ ...formData, cycleId: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select cycle..." />
                  </SelectTrigger>
                  <SelectContent>
                    {cycles.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Overall Score (1.0 - 5.0)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="1"
                  max="5"
                  value={formData.overallScore}
                  onChange={(e) => setFormData({ ...formData, overallScore: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Key Strengths</Label>
              <Textarea
                placeholder="Exemplary contributions, technical achievements, cultural impact..."
                value={formData.strengths}
                onChange={(e) => setFormData({ ...formData, strengths: e.target.value })}
              />
            </div>

            <div>
              <Label>Areas for Improvement</Label>
              <Textarea
                placeholder="Skills to develop, velocity targets, leadership opportunities..."
                value={formData.areasOfImprovement}
                onChange={(e) =>
                  setFormData({ ...formData, areasOfImprovement: e.target.value })
                }
              />
            </div>

            <div>
              <Label>Manager Remarks & Recommendation</Label>
              <Textarea
                placeholder="Final summary, promotion recommendation, bonus considerations..."
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={createMutation.isPending || !formData.employeeId || !formData.cycleId}
              onClick={() => createMutation.mutate(formData)}
            >
              {createMutation.isPending ? "Recording..." : "Finalize & Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
