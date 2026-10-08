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
import { Layers, Plus, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/performance/goal-types")({
  component: HrPerformanceGoalTypesPage,
});

export default function HrPerformanceGoalTypesPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  const { data: goalTypes = [], isLoading } = useQuery({
    queryKey: ["hr-performance-goal-types"],
    queryFn: async () => {
      const res = await api.get("/hr/performance/goal-types");
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await api.post("/hr/performance/goal-types", data);
    },
    onSuccess: () => {
      toast.success("Goal type created successfully");
      queryClient.invalidateQueries({ queryKey: ["hr-performance-goal-types"] });
      setIsModalOpen(false);
      setFormData({ name: "", description: "" });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to create goal type");
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Goal Types"
        description="Configure standard organizational classifications for OKRs, business goals, and professional development milestones."
        actions={
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add Goal Type
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard
          title="Configured Types"
          value={goalTypes.length.toString()}
          icon={<Layers className="h-5 w-5 text-indigo-500" />}
          description="Taxonomy definitions"
        />
        <StatCard
          title="Active Classifications"
          value={goalTypes.filter((g: any) => g.isActive !== false).length.toString()}
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />}
          description="Available in goal builder"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center justify-between">
            <span>Goal Taxonomy Master</span>
            <span className="text-sm font-normal text-muted-foreground">
              Total: {goalTypes.length}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading goal types...</div>
          ) : goalTypes.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No custom goal types defined. Standard types: Strategic, Departmental, Individual.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {goalTypes.map((gt: any) => (
                  <TableRow key={gt.id}>
                    <TableCell className="font-medium">{gt.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {gt.description || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={gt.isActive ? "default" : "secondary"}>
                        {gt.isActive ? "ACTIVE" : "INACTIVE"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {new Date(gt.createdAt).toLocaleDateString()}
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
            <DialogTitle>Add Goal Type</DialogTitle>
            <DialogDescription>
              Define a new category of goals for corporate alignment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Type Name</Label>
              <Input
                placeholder="e.g. Core Competency Objective"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                placeholder="Explain the scope and criteria for this goal category..."
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
              {createMutation.isPending ? "Saving..." : "Save Type"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
