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
import { toast } from "sonner";
import { Tags, Plus, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/performance/indicator-categories")({
  component: HrIndicatorCategoriesPage,
});

export default function HrIndicatorCategoriesPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["hr-performance-indicator-categories"],
    queryFn: async () => {
      const res = await api.get("/hr/performance/indicator-categories");
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await api.post("/hr/performance/indicator-categories", data);
    },
    onSuccess: () => {
      toast.success("Indicator category created successfully");
      queryClient.invalidateQueries({ queryKey: ["hr-performance-indicator-categories"] });
      setIsModalOpen(false);
      setFormData({ name: "", description: "" });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to create category");
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Indicator Categories"
        description="Organize performance competencies by operational domains such as Technical Proficiency, Leadership, Culture, and Communication."
        actions={
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add Category
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard
          title="Total Indicator Domains"
          value={categories.length.toString()}
          icon={<Tags className="h-5 w-5 text-indigo-500" />}
          description="Competency clusters"
        />
        <StatCard
          title="Active Domains"
          value={categories.filter((c: any) => c.isActive !== false).length.toString()}
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />}
          description="Available in evaluation rubric"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center justify-between">
            <span>Competency Category Catalog</span>
            <span className="text-sm font-normal text-muted-foreground">
              Total: {categories.length}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading categories...</div>
          ) : categories.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No custom indicator categories defined yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((cat: any) => (
                  <TableRow key={cat.id}>
                    <TableCell className="font-medium">{cat.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {cat.description || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={cat.isActive ? "default" : "secondary"}>
                        {cat.isActive ? "ACTIVE" : "INACTIVE"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {new Date(cat.createdAt).toLocaleDateString()}
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
            <DialogTitle>Add Indicator Category</DialogTitle>
            <DialogDescription>
              Cluster performance metrics by functional competency.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Category Name</Label>
              <Input
                placeholder="e.g. Leadership & Strategic Thinking"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                placeholder="Describe what behaviours and standards belong here..."
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
              disabled={createMutation.isPending || !formData.name}
              onClick={() => createMutation.mutate(formData)}
            >
              {createMutation.isPending ? "Saving..." : "Save Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
