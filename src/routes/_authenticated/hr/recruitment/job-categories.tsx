import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Tag, Plus, Trash2, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/recruitment/job-categories")({
  component: JobCategoriesPage,
});

export default function JobCategoriesPage() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", code: "", description: "" });

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["hr-job-categories"],
    queryFn: async () => {
      const res = await api.get<any[]>("/hr/recruitment/job-categories");
      return Array.isArray(res) ? res : (res as any)?.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post("/hr/recruitment/job-categories", payload);
    },
    onSuccess: () => {
      toast.success("Job category created");
      queryClient.invalidateQueries({ queryKey: ["hr-job-categories"] });
      setIsDialogOpen(false);
      setFormData({ name: "", code: "", description: "" });
    },
    onError: (err: any) => toast.error(err.message || "Failed to create category"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/hr/recruitment/job-categories/${id}`);
    },
    onSuccess: () => {
      toast.success("Job category deleted");
      queryClient.invalidateQueries({ queryKey: ["hr-job-categories"] });
    },
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Job Categories"
          description="Taxonomy classification for job openings (e.g. Engineering, Sales, Product, G&A)."
        />
        <Button onClick={() => setIsDialogOpen(true)} className="gap-2 bg-primary">
          <Plus className="h-4 w-4" /> Add Category
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Total Categories"
          value={categories.length.toString()}
          description="Active requisition taxonomies"
          icon={<Tag className="h-5 w-5 text-blue-600" />}
        />
        <StatCard
          title="Active Status"
          value={categories.filter((c: any) => c.isActive !== false).length.toString()}
          description="Available in dropdowns"
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Categories Directory</CardTitle>
          <CardDescription>All job categories configured for this tenant.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No job categories created yet.
                  </TableCell>
                </TableRow>
              ) : (
                categories.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-semibold">{c.name}</TableCell>
                    <TableCell className="font-mono text-xs">{c.code}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.description || "--"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-emerald-600 border-emerald-500/30">
                        Active
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(c.id)}
                        className="text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Job Category</DialogTitle>
            <DialogDescription>Define a functional job family category.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-sm">
            <div>
              <Label>Category Name *</Label>
              <Input
                placeholder="e.g. Engineering"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Code</Label>
              <Input
                placeholder="e.g. ENG"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!formData.name.trim() || createMutation.isPending}
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
