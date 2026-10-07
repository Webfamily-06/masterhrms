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
import { Layers, Plus, Trash2, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/recruitment/interview-rounds")({
  component: InterviewRoundsPage,
});

export default function InterviewRoundsPage() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", sequence: 1, description: "" });

  const { data: rounds = [], isLoading } = useQuery({
    queryKey: ["hr-interview-rounds"],
    queryFn: async () => {
      const res = await api.get<any[]>("/hr/recruitment/interview-rounds");
      return Array.isArray(res) ? res : (res as any)?.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post("/hr/recruitment/interview-rounds", payload);
    },
    onSuccess: () => {
      toast.success("Interview round template created");
      queryClient.invalidateQueries({ queryKey: ["hr-interview-rounds"] });
      setIsDialogOpen(false);
      setFormData({ name: "", sequence: rounds.length + 1, description: "" });
    },
    onError: (err: any) => toast.error(err.message || "Failed to create round"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/hr/recruitment/interview-rounds/${id}`);
    },
    onSuccess: () => {
      toast.success("Interview round deleted");
      queryClient.invalidateQueries({ queryKey: ["hr-interview-rounds"] });
    },
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Interview Rounds"
          description="Sequential hiring stages (e.g. Round 1: Screening, Round 2: Technical Deep Dive, Round 3: Leadership Fit)."
        />
        <Button onClick={() => setIsDialogOpen(true)} className="gap-2 bg-primary">
          <Plus className="h-4 w-4" /> Add Interview Round
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Total Standard Rounds"
          value={rounds.length.toString()}
          description="Configured round sequence"
          icon={<Layers className="h-5 w-5 text-blue-600" />}
        />
        <StatCard
          title="Active Progression"
          value={rounds.filter((r: any) => r.isActive !== false).length.toString()}
          description="Sequential round steps"
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Standard Round Sequence</CardTitle>
          <CardDescription>Default progression path for candidate evaluation panels.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sequence</TableHead>
                <TableHead>Round Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rounds.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No interview rounds configured yet.
                  </TableCell>
                </TableRow>
              ) : (
                rounds.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-semibold text-primary">#{r.sequence}</TableCell>
                    <TableCell className="font-semibold">{r.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.description || "--"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-emerald-600 border-emerald-500/30">
                        Active
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(r.id)}
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
            <DialogTitle>Add Interview Round</DialogTitle>
            <DialogDescription>Define a step in the interview progression sequence.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-sm">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Label>Round Name *</Label>
                <Input
                  placeholder="e.g. Technical Deep Dive"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Sequence</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.sequence}
                  onChange={(e) => setFormData({ ...formData, sequence: Number(e.target.value) })}
                />
              </div>
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
              {createMutation.isPending ? "Saving..." : "Save Round"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
