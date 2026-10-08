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
import { GraduationCap, Plus, BookOpen, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/training/types")({
  component: HrTrainingTypesPage,
});

export default function HrTrainingTypesPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", description: "" });

  const { data: types = [], isLoading } = useQuery({
    queryKey: ["hr-training-types"],
    queryFn: async () => {
      const res = await api.get("/hr/training/types");
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: { name: string; description: string }) => {
      const res = await api.post("/hr/training/types", payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Training type created successfully");
      queryClient.invalidateQueries({ queryKey: ["hr-training-types"] });
      setIsModalOpen(false);
      setFormData({ name: "", description: "" });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to create training type");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/hr/training/types/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Training type deleted");
      queryClient.invalidateQueries({ queryKey: ["hr-training-types"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to delete");
    },
  });

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Training Types Master"
        description="Configure standardized training categories, classifications, and learning tracks."
      >
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Add Training Type
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-indigo-500" />
            Configured Training Types ({types.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Loading training types...
                  </TableCell>
                </TableRow>
              ) : types.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No training types defined yet. Click "Add Training Type" to create one.
                  </TableCell>
                </TableRow>
              ) : (
                types.map((t: any) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-primary" />
                      {t.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{t.description || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={t.isActive ? "default" : "secondary"}>
                        {t.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(t.id)}
                        className="text-red-500 hover:text-red-700"
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

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Training Type</DialogTitle>
            <DialogDescription>Define a category for organizing courses and sessions.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Type Name</Label>
              <Input
                placeholder="e.g. Compliance & Regulatory, Leadership Academy"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Brief description of the training type..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate(formData)}
              disabled={!formData.name || createMutation.isPending}
            >
              {createMutation.isPending ? "Saving..." : "Create Type"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
