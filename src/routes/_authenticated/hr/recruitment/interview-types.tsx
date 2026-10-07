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
import { Video, Plus, Trash2, Clock, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/recruitment/interview-types")({
  component: InterviewTypesPage,
});

export default function InterviewTypesPage() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    defaultDuration: 45,
  });

  const { data: interviewTypes = [], isLoading } = useQuery({
    queryKey: ["hr-interview-types"],
    queryFn: async () => {
      const res = await api.get<any[]>("/hr/recruitment/interview-types");
      return Array.isArray(res) ? res : (res as any)?.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post("/hr/recruitment/interview-types", payload);
    },
    onSuccess: () => {
      toast.success("Interview type created");
      queryClient.invalidateQueries({ queryKey: ["hr-interview-types"] });
      setIsDialogOpen(false);
      setFormData({ name: "", code: "", description: "", defaultDuration: 45 });
    },
    onError: (err: any) => toast.error(err.message || "Failed to create interview type"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/hr/recruitment/interview-types/${id}`);
    },
    onSuccess: () => {
      toast.success("Interview type deleted");
      queryClient.invalidateQueries({ queryKey: ["hr-interview-types"] });
    },
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Interview Types"
          description="Evaluation methodologies (Technical Round, System Design, HR Culture Fit, Bar Raiser, Executive Chat)."
        />
        <Button onClick={() => setIsDialogOpen(true)} className="gap-2 bg-primary">
          <Plus className="h-4 w-4" /> Add Interview Type
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Interview Types"
          value={interviewTypes.length.toString()}
          description="Configured evaluation formats"
          icon={<Video className="h-5 w-5 text-blue-600" />}
        />
        <StatCard
          title="Active Formats"
          value={interviewTypes.filter((t: any) => t.isActive !== false).length.toString()}
          description="Available for scheduling"
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Interview Types Directory</CardTitle>
          <CardDescription>Methodologies with default durations and scoring profiles.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Default Duration</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {interviewTypes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No interview types configured yet.
                  </TableCell>
                </TableRow>
              ) : (
                interviewTypes.map((t: any) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-semibold">{t.name}</TableCell>
                    <TableCell className="font-mono text-xs">{t.code}</TableCell>
                    <TableCell className="text-sm">
                      <Clock className="inline h-3 w-3 mr-1 text-muted-foreground" />
                      {t.defaultDurationMinutes || 45} mins
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{t.description || "--"}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(t.id)}
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
            <DialogTitle>Add Interview Type</DialogTitle>
            <DialogDescription>Define an assessment methodology and duration.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-sm">
            <div>
              <Label>Interview Type Name *</Label>
              <Input
                placeholder="e.g. System Design Round"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Code</Label>
                <Input
                  placeholder="e.g. SYS-DSN"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                />
              </div>
              <div>
                <Label>Default Duration (Mins)</Label>
                <Input
                  type="number"
                  value={formData.defaultDuration}
                  onChange={(e) => setFormData({ ...formData, defaultDuration: Number(e.target.value) })}
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
              {createMutation.isPending ? "Saving..." : "Save Interview Type"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
