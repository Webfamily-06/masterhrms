import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
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
import { toast } from "sonner";
import { BookOpen, Plus, Clock, Award, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/training/programs")({
  component: HrTrainingProgramsPage,
});

export default function HrTrainingProgramsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    category: "Compliance & Security",
    instructor: "Internal Academy",
    durationHours: 4,
    isMandatory: false,
    passingScore: 80,
    description: "",
  });

  const { data: programs = [], isLoading } = useQuery({
    queryKey: ["hr-training-programs"],
    queryFn: async () => {
      const res = await api.get("/hr/training/programs");
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post("/hr/training/programs", payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Training program created successfully");
      queryClient.invalidateQueries({ queryKey: ["hr-training-programs"] });
      setIsModalOpen(false);
      setFormData({
        title: "",
        category: "Compliance & Security",
        instructor: "Internal Academy",
        durationHours: 4,
        isMandatory: false,
        passingScore: 80,
        description: "",
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to create program");
    },
  });

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Training Programs & Courses"
        description="Manage the enterprise learning catalog, compliance curriculums, and certifications."
      >
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Create Program
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-indigo-500" />
            Curriculum Catalog ({programs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Program Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Instructor</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Requirement</TableHead>
                <TableHead>Passing Score</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Loading training programs...
                  </TableCell>
                </TableRow>
              ) : programs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No programs created yet. Click "Create Program" to publish your first course.
                  </TableCell>
                </TableRow>
              ) : (
                programs.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      <div>{p.title}</div>
                      {p.description && (
                        <div className="text-xs text-muted-foreground line-clamp-1">{p.description}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{p.category}</Badge>
                    </TableCell>
                    <TableCell>{p.instructor || "—"}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-sm">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        {p.durationHours} hrs
                      </span>
                    </TableCell>
                    <TableCell>
                      {p.isMandatory ? (
                        <Badge variant="destructive" className="gap-1">
                          <ShieldAlert className="h-3 w-3" /> Mandatory
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Elective</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-sm font-semibold">
                        <Award className="h-3.5 w-3.5 text-amber-500" />
                        {p.passingScore}%
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.status === "published" ? "default" : "secondary"}>
                        {p.status}
                      </Badge>
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
            <DialogTitle>Create Training Program</DialogTitle>
            <DialogDescription>Add a new curriculum or certification course to the academy.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Program Title</Label>
              <Input
                placeholder="e.g. Cybersecurity Essentials, Managerial Excellence"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Input
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Instructor / Academy</Label>
                <Input
                  value={formData.instructor}
                  onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duration (Hours)</Label>
                <Input
                  type="number"
                  value={formData.durationHours}
                  onChange={(e) => setFormData({ ...formData, durationHours: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Passing Score (%)</Label>
                <Input
                  type="number"
                  value={formData.passingScore}
                  onChange={(e) => setFormData({ ...formData, passingScore: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isMandatory"
                checked={formData.isMandatory}
                onChange={(e) => setFormData({ ...formData, isMandatory: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-primary"
              />
              <Label htmlFor="isMandatory" className="cursor-pointer">
                Mark as Mandatory for All Employees
              </Label>
            </div>
            <div className="space-y-2">
              <Label>Description & Learning Objectives</Label>
              <Textarea
                placeholder="Key outcomes, syllabus, and target audience..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate(formData)}
              disabled={!formData.title || createMutation.isPending}
            >
              {createMutation.isPending ? "Creating..." : "Create Program"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
