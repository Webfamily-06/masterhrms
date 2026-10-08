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
import { Layers, Plus, Tag } from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/assets/types")({
  component: HrAssetTypesPage,
});

export default function HrAssetTypesPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    prefix: "AST",
    description: "",
  });

  const { data: types = [], isLoading } = useQuery({
    queryKey: ["hr-assets-types-table"],
    queryFn: async () => {
      const res = await api.get("/hr/assets/types");
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post("/hr/assets/types", payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Asset category created");
      queryClient.invalidateQueries({ queryKey: ["hr-assets-types-table"] });
      setIsModalOpen(false);
      setFormData({ name: "", prefix: "AST", description: "" });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to create category");
    },
  });

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Asset Categories & Types"
        description="Configure hardware classifications, prefix serial patterns, and asset depreciation profiles."
      >
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Add Category
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Layers className="h-5 w-5 text-indigo-500" />
            Configured Asset Categories ({types.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category Name</TableHead>
                <TableHead>Tag Prefix</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Total Assets</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Loading asset categories...
                  </TableCell>
                </TableRow>
              ) : types.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No asset categories found. Click "Add Category" to create one.
                  </TableCell>
                </TableRow>
              ) : (
                types.map((t: any) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium flex items-center gap-2">
                      <Tag className="h-4 w-4 text-primary" />
                      {t.name}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{t.prefix || "AST"}</TableCell>
                    <TableCell className="text-muted-foreground">{t.description || "—"}</TableCell>
                    <TableCell>{t._count?.assets ?? 0}</TableCell>
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
            <DialogTitle>Add Asset Category</DialogTitle>
            <DialogDescription>Define a group for classifying devices and hardware items.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Category Name</Label>
              <Input
                placeholder="e.g. Laptops, Workstations, Mobile Devices"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Asset Tag Prefix</Label>
              <Input
                placeholder="e.g. LAP, MOB, DSK"
                value={formData.prefix}
                onChange={(e) => setFormData({ ...formData, prefix: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Details regarding warranty, replacement cycles, etc."
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
              {createMutation.isPending ? "Saving..." : "Create Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
