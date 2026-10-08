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
import { BarChart3, Plus, Star, Award, Layers } from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/performance/indicators")({
  component: HrPerformanceIndicatorsPage,
});

export default function HrPerformanceIndicatorsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    categoryId: "",
    designationId: "",
    departmentId: "",
    maxRating: "5",
    description: "",
  });

  const { data: indicators = [], isLoading } = useQuery({
    queryKey: ["hr-performance-indicators"],
    queryFn: async () => {
      const res = await api.get("/hr/performance/indicators");
      return res.data;
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["hr-performance-indicator-categories"],
    queryFn: async () => {
      const res = await api.get("/hr/performance/indicator-categories");
      return res.data;
    },
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["departments-quick"],
    queryFn: async () => {
      const res = await api.get("/hr/departments");
      return res.data?.data || res.data || [];
    },
  });

  const { data: designations = [] } = useQuery({
    queryKey: ["designations-quick"],
    queryFn: async () => {
      const res = await api.get("/hr/designations");
      return res.data?.data || res.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await api.post("/hr/performance/indicators", {
        ...data,
        maxRating: parseInt(data.maxRating) || 5,
        categoryId: data.categoryId || undefined,
        designationId: data.designationId || undefined,
        departmentId: data.departmentId || undefined,
      });
    },
    onSuccess: () => {
      toast.success("Competency indicator added to performance catalog");
      queryClient.invalidateQueries({ queryKey: ["hr-performance-indicators"] });
      setIsModalOpen(false);
      setFormData({
        title: "",
        categoryId: "",
        designationId: "",
        departmentId: "",
        maxRating: "5",
        description: "",
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to create indicator");
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Performance Indicators & Competencies"
        description="Establish 5-point evaluation criteria, behavioural competencies, and role-specific technical rubrics."
        actions={
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add Indicator
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Total Competencies"
          value={indicators.length.toString()}
          icon={<BarChart3 className="h-5 w-5 text-indigo-500" />}
          description="Standard rubric criteria"
        />
        <StatCard
          title="Rating Scale"
          value="1 to 5 Stars"
          icon={<Star className="h-5 w-5 text-amber-500" />}
          description="Standard 5-point mathematical engine"
        />
        <StatCard
          title="Categories"
          value={categories.length.toString()}
          icon={<Layers className="h-5 w-5 text-emerald-500" />}
          description="Competency clusters"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center justify-between">
            <span>Competency Rubric Matrix</span>
            <span className="text-sm font-normal text-muted-foreground">
              Total: {indicators.length}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading indicators...</div>
          ) : indicators.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No competency indicators defined yet. Add standard competencies for employee appraisal.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Competency Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Rating Scale</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {indicators.map((ind: any) => (
                  <TableRow key={ind.id}>
                    <TableCell className="font-medium">
                      <div>
                        <span>{ind.title}</span>
                        {ind.description && (
                          <span className="block text-xs text-muted-foreground line-clamp-1">
                            {ind.description}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {ind.category ? (
                        <Badge variant="outline">{ind.category.name}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">General</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {ind.department?.name || ind.designation?.title || "Company-Wide"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-amber-500">
                        <Star className="h-3.5 w-3.5 fill-current" />
                        <span className="text-xs font-mono font-medium text-foreground">
                          1 – {ind.maxRating}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={ind.isActive ? "default" : "secondary"}>
                        {ind.isActive ? "ACTIVE" : "INACTIVE"}
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Competency Indicator</DialogTitle>
            <DialogDescription>
              Create an evaluation rubric item to be scored by employees and managers.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Competency Title</Label>
              <Input
                placeholder="e.g. Code Quality & Architectural Integrity"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select
                value={formData.categoryId}
                onValueChange={(val) => setFormData({ ...formData, categoryId: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select competency domain..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">General Competency</SelectItem>
                  {categories.map((cat: any) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Department Scope</Label>
                <Select
                  value={formData.departmentId}
                  onValueChange={(val) => setFormData({ ...formData, departmentId: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Departments</SelectItem>
                    {departments.map((d: any) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Designation Scope</Label>
                <Select
                  value={formData.designationId}
                  onValueChange={(val) => setFormData({ ...formData, designationId: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Designations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Designations</SelectItem>
                    {designations.map((d: any) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.title || d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Description / Scoring Rubric</Label>
              <Textarea
                placeholder="Explain what qualifies as 1 star vs 5 stars..."
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
              {createMutation.isPending ? "Adding..." : "Add Indicator"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
