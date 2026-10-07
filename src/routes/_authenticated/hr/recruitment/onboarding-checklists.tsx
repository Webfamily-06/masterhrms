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
import { CheckSquare, Plus, Trash2, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/recruitment/onboarding-checklists")({
  component: OnboardingChecklistsPage,
});

export default function OnboardingChecklistsPage() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "Standard Employee Pre-Joining Checklist",
    code: "CHK-STD",
    description: "Standard document intake, background verification, laptop allocation, and email setup.",
  });

  const { data: checklists = [], isLoading } = useQuery({
    queryKey: ["hr-onboarding-checklists"],
    queryFn: async () => {
      const res = await api.get<any[]>("/hr/recruitment/onboarding-checklists");
      return Array.isArray(res) ? res : (res as any)?.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post("/hr/recruitment/onboarding-checklists", {
        ...payload,
        items: [
          { title: "National Identity & Address Proof", category: "document", dueOffsetDays: 3, isMandatory: true },
          { title: "Previous Employment Relieving & Payslips", category: "document", dueOffsetDays: 3, isMandatory: true },
          { title: "Background Verification Verification Form", category: "verification", dueOffsetDays: 7, isMandatory: true },
          { title: "Corporate Laptop & Email Provisioning", category: "equipment", dueOffsetDays: 1, isMandatory: true },
        ],
      });
    },
    onSuccess: () => {
      toast.success("Checklist template created with default verification tasks");
      queryClient.invalidateQueries({ queryKey: ["hr-onboarding-checklists"] });
      setIsDialogOpen(false);
    },
    onError: (err: any) => toast.error(err.message || "Failed to create checklist template"),
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Onboarding Checklist Templates"
          description="Reusable onboarding workflows triggered automatically upon candidate offer acceptance."
        />
        <Button onClick={() => setIsDialogOpen(true)} className="gap-2 bg-primary">
          <Plus className="h-4 w-4" /> Add Checklist Template
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Templates Configured"
          value={checklists.length.toString()}
          description="Standardized onboarding workflows"
          icon={<CheckSquare className="h-5 w-5 text-blue-600" />}
        />
        <StatCard
          title="Automated Assignment"
          value="Active"
          description="Runs on Offer Acceptance"
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Checklist Templates</CardTitle>
          <CardDescription>Templates contain collections of pre-joining check items.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Tasks Included</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {checklists.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No onboarding checklists created yet.
                  </TableCell>
                </TableRow>
              ) : (
                checklists.map((chk: any) => (
                  <TableRow key={chk.id}>
                    <TableCell>
                      <div className="font-semibold">{chk.name}</div>
                      <div className="text-xs text-muted-foreground">{chk.description}</div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{chk.code}</TableCell>
                    <TableCell className="text-sm">
                      <Badge variant="secondary">{chk.items?.length || 4} check items</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-emerald-600 border-emerald-500/30">
                        Active
                      </Badge>
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
            <DialogTitle>Add Onboarding Checklist</DialogTitle>
            <DialogDescription>Define a reusable onboarding template.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-sm">
            <div>
              <Label>Template Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Code</Label>
              <Input
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
              {createMutation.isPending ? "Saving..." : "Save Checklist"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
