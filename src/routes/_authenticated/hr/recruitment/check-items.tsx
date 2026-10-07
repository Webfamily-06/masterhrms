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
import { ListChecks, Plus, Trash2, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/recruitment/check-items")({
  component: CheckItemsPage,
});

export default function CheckItemsPage() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    templateId: "",
    category: "document",
    dueOffsetDays: 3,
    isMandatory: true,
  });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["hr-check-items"],
    queryFn: async () => {
      const res = await api.get<any[]>("/hr/recruitment/check-items");
      return Array.isArray(res) ? res : (res as any)?.data || [];
    },
  });

  const { data: checklists = [] } = useQuery({
    queryKey: ["hr-onboarding-checklists"],
    queryFn: async () => {
      const res = await api.get<any[]>("/hr/recruitment/onboarding-checklists");
      return Array.isArray(res) ? res : (res as any)?.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post("/hr/recruitment/check-items", payload);
    },
    onSuccess: () => {
      toast.success("Check item added to template");
      queryClient.invalidateQueries({ queryKey: ["hr-check-items"] });
      setIsDialogOpen(false);
      setFormData({
        title: "",
        templateId: checklists[0]?.id || "",
        category: "document",
        dueOffsetDays: 3,
        isMandatory: true,
      });
    },
    onError: (err: any) => toast.error(err.message || "Failed to create check item"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/hr/recruitment/check-items/${id}`);
    },
    onSuccess: () => {
      toast.success("Check item deleted");
      queryClient.invalidateQueries({ queryKey: ["hr-check-items"] });
    },
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Onboarding Check Items Master"
          description="Granular verification tasks: document uploads, ID verification, equipment allocation, and system provisioning."
        />
        <Button onClick={() => setIsDialogOpen(true)} className="gap-2 bg-primary">
          <Plus className="h-4 w-4" /> Add Check Item
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Total Check Items"
          value={items.length.toString()}
          description="Pre-boarding action items"
          icon={<ListChecks className="h-5 w-5 text-blue-600" />}
        />
        <StatCard
          title="Mandatory Items"
          value={items.filter((it: any) => it.isMandatory).length.toString()}
          description="Required before Day 1"
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Check Items Directory</CardTitle>
          <CardDescription>Items linked to onboarding checklist templates.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Due Offset</TableHead>
                <TableHead>Mandatory</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No individual check items created yet.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((it: any) => (
                  <TableRow key={it.id}>
                    <TableCell className="font-semibold">{it.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{it.category}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">Day -{it.dueOffsetDays || 0}</TableCell>
                    <TableCell>
                      {it.isMandatory ? (
                        <Badge className="bg-rose-500/10 text-rose-600">Required</Badge>
                      ) : (
                        <Badge variant="secondary">Optional</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(it.id)}
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
            <DialogTitle>Add Check Item</DialogTitle>
            <DialogDescription>Define a specific onboarding task or document.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-sm">
            <div>
              <Label>Template *</Label>
              <Select
                value={formData.templateId}
                onValueChange={(val) => setFormData({ ...formData, templateId: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select checklist template..." />
                </SelectTrigger>
                <SelectContent>
                  {checklists.map((chk: any) => (
                    <SelectItem key={chk.id} value={chk.id}>
                      {chk.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Task Title *</Label>
              <Input
                placeholder="e.g. Upload PF Nomination Form"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(val) => setFormData({ ...formData, category: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="document">Document</SelectItem>
                    <SelectItem value="verification">Verification</SelectItem>
                    <SelectItem value="equipment">Equipment</SelectItem>
                    <SelectItem value="account">IT Account</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Due Offset (Days)</Label>
                <Input
                  type="number"
                  value={formData.dueOffsetDays}
                  onChange={(e) => setFormData({ ...formData, dueOffsetDays: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!formData.title.trim() || !formData.templateId || createMutation.isPending}
              onClick={() => createMutation.mutate(formData)}
            >
              {createMutation.isPending ? "Saving..." : "Save Check Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
