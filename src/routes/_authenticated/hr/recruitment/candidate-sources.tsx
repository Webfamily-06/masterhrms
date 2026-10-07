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
import { UserPlus, Plus, Trash2, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/recruitment/candidate-sources")({
  component: CandidateSourcesPage,
});

export default function CandidateSourcesPage() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", code: "", type: "job_board" });

  const { data: sources = [], isLoading } = useQuery({
    queryKey: ["hr-candidate-sources"],
    queryFn: async () => {
      const res = await api.get<any[]>("/hr/recruitment/candidate-sources");
      return Array.isArray(res) ? res : (res as any)?.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post("/hr/recruitment/candidate-sources", payload);
    },
    onSuccess: () => {
      toast.success("Candidate source created");
      queryClient.invalidateQueries({ queryKey: ["hr-candidate-sources"] });
      setIsDialogOpen(false);
      setFormData({ name: "", code: "", type: "job_board" });
    },
    onError: (err: any) => toast.error(err.message || "Failed to create source"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/hr/recruitment/candidate-sources/${id}`);
    },
    onSuccess: () => {
      toast.success("Candidate source deleted");
      queryClient.invalidateQueries({ queryKey: ["hr-candidate-sources"] });
    },
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Candidate Sources"
          description="Inbound channel attribution (LinkedIn, Referral, Career Site, Agency, Campus, Direct)."
        />
        <Button onClick={() => setIsDialogOpen(true)} className="gap-2 bg-primary">
          <Plus className="h-4 w-4" /> Add Source
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Configured Channels"
          value={sources.length.toString()}
          description="Source attribution tracking"
          icon={<UserPlus className="h-5 w-5 text-blue-600" />}
        />
        <StatCard
          title="Active Channels"
          value={sources.filter((s: any) => s.isActive !== false).length.toString()}
          description="Live recruitment channels"
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sources Directory</CardTitle>
          <CardDescription>All recruitment sourcing channels configured for this tenant.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Channel Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sources.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No candidate sources created yet.
                  </TableCell>
                </TableRow>
              ) : (
                sources.map((src: any) => (
                  <TableRow key={src.id}>
                    <TableCell className="font-semibold">{src.name}</TableCell>
                    <TableCell className="font-mono text-xs">{src.code}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{src.type || "direct"}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-emerald-600 border-emerald-500/30">
                        Active
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(src.id)}
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
            <DialogTitle>Add Candidate Source</DialogTitle>
            <DialogDescription>Define an acquisition channel for ROI reporting.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-sm">
            <div>
              <Label>Source Name *</Label>
              <Input
                placeholder="e.g. LinkedIn Jobs"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Code</Label>
              <Input
                placeholder="e.g. LINKEDIN"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              />
            </div>
            <div>
              <Label>Channel Type</Label>
              <Select
                value={formData.type}
                onValueChange={(val) => setFormData({ ...formData, type: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="job_board">Job Board</SelectItem>
                  <SelectItem value="referral">Internal Referral</SelectItem>
                  <SelectItem value="career_site">Company Careers Site</SelectItem>
                  <SelectItem value="agency">Staffing Agency</SelectItem>
                  <SelectItem value="direct">Direct Sourcing / Outreach</SelectItem>
                </SelectContent>
              </Select>
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
              {createMutation.isPending ? "Saving..." : "Save Source"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
