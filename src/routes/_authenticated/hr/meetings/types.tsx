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
import { CalendarDays, Plus, Palette, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/meetings/types")({
  component: HrMeetingTypesPage,
});

export default function HrMeetingTypesPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    color: "#6366f1",
    description: "",
  });

  const { data: types = [], isLoading } = useQuery({
    queryKey: ["hr-meeting-types"],
    queryFn: async () => {
      const res = await api.get("/hr/meetings/types");
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post("/hr/meetings/types", payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Meeting type created");
      queryClient.invalidateQueries({ queryKey: ["hr-meeting-types"] });
      setIsModalOpen(false);
      setFormData({ name: "", color: "#6366f1", description: "" });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to create meeting type");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/hr/meetings/types/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Meeting type deleted");
      queryClient.invalidateQueries({ queryKey: ["hr-meeting-types"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to delete");
    },
  });

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Meeting Types Master"
        description="Configure meeting classifications, agendas, and color-coded calendar labels."
      >
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Add Meeting Type
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-indigo-500" />
            Configured Meeting Types ({types.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type Name</TableHead>
                <TableHead>Color Tag</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Loading meeting types...
                  </TableCell>
                </TableRow>
              ) : types.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No meeting types found. Click "Add Meeting Type" to define one.
                  </TableCell>
                </TableRow>
              ) : (
                types.map((t: any) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: t.color || "#6366f1" }}
                      />
                      {t.name}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{t.color || "#6366f1"}</TableCell>
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Meeting Type</DialogTitle>
            <DialogDescription>Define a category for organizing recurring or one-off sessions.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Type Name</Label>
              <Input
                placeholder="e.g. Sprint Review, 1-on-1 Catchup, Townhall"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Label Color</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="h-9 w-12 rounded cursor-pointer border"
                />
                <Input
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="font-mono text-xs"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Typical agenda and scope..."
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
