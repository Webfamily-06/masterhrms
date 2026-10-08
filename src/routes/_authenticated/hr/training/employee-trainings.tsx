import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { UserCheck, Plus, CheckCircle, Award } from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/training/employee-trainings")({
  component: HrEmployeeTrainingsPage,
});

export default function HrEmployeeTrainingsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: "",
    courseId: "",
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["hr-employees-list-training"],
    queryFn: async () => {
      const res = await api.get("/hr/employees");
      return res.data?.items || res.data || [];
    },
  });

  const { data: courses = [] } = useQuery({
    queryKey: ["hr-training-programs-list"],
    queryFn: async () => {
      const res = await api.get("/hr/training/programs");
      return res.data;
    },
  });

  const { data: enrollments = [], isLoading } = useQuery({
    queryKey: ["hr-employee-trainings"],
    queryFn: async () => {
      const res = await api.get("/hr/training/employee-trainings");
      return res.data;
    },
  });

  const assignMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post("/hr/training/employee-trainings", payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Training assigned to employee successfully");
      queryClient.invalidateQueries({ queryKey: ["hr-employee-trainings"] });
      setIsModalOpen(false);
      setFormData({ employeeId: "", courseId: "" });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to assign training");
    },
  });

  const markCompleteMutation = useMutation({
    mutationFn: async ({ id, progress }: { id: string; progress: number }) => {
      const res = await api.patch(`/hr/training/employee-trainings/${id}/progress`, {
        progress,
        score: 95,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Training progress updated");
      queryClient.invalidateQueries({ queryKey: ["hr-employee-trainings"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to update progress");
    },
  });

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Employee Training Assignments"
        description="Track employee curriculum enrollments, completion milestones, and issued certificates."
      >
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Assign Training
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-indigo-500" />
            Active Enrollments ({enrollments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Assigned Program</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Certificate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Loading enrollments...
                  </TableCell>
                </TableRow>
              ) : enrollments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No employee enrollments found. Click "Assign Training" to assign courses.
                  </TableCell>
                </TableRow>
              ) : (
                enrollments.map((e: any) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">
                      <div>{e.employee?.firstName} {e.employee?.lastName}</div>
                      <div className="text-xs text-muted-foreground">{e.employee?.employeeCode}</div>
                    </TableCell>
                    <TableCell>{e.course?.title}</TableCell>
                    <TableCell className="w-[180px]">
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>{e.progressPercent}%</span>
                        </div>
                        <Progress value={e.progressPercent} className="h-2" />
                      </div>
                    </TableCell>
                    <TableCell>
                      {e.certificateId ? (
                        <span className="flex items-center gap-1 text-xs font-mono font-semibold text-emerald-600">
                          <Award className="h-3.5 w-3.5" />
                          {e.certificateId}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={e.status === "completed" ? "default" : "secondary"}>
                        {e.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {e.status !== "completed" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => markCompleteMutation.mutate({ id: e.id, progress: 100 })}
                          className="gap-1 text-emerald-600 hover:text-emerald-700"
                        >
                          <CheckCircle className="h-3.5 w-3.5" /> Mark Completed
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Training to Employee</DialogTitle>
            <DialogDescription>Assign a curriculum to an employee's learning path.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Employee</Label>
              <Select
                value={formData.employeeId}
                onValueChange={(val) => setFormData({ ...formData, employeeId: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose employee" />
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
            <div className="space-y-2">
              <Label>Select Training Program</Label>
              <Select
                value={formData.courseId}
                onValueChange={(val) => setFormData({ ...formData, courseId: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button
              onClick={() => assignMutation.mutate(formData)}
              disabled={!formData.employeeId || !formData.courseId || assignMutation.isPending}
            >
              {assignMutation.isPending ? "Assigning..." : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
