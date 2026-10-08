import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Laptop, Plus, UserPlus, RotateCcw } from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/assets/")({
  component: HrAssetsListPage,
});

export default function HrAssetsListPage() {
  const queryClient = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);

  const [newAsset, setNewAsset] = useState({
    name: "",
    assetTag: "",
    categoryId: "",
    serialNumber: "",
    purchasePrice: 50000,
    usefulLifeMonths: 36,
    salvageValue: 5000,
  });

  const [assignData, setAssignData] = useState({
    employeeId: "",
    conditionOnAssign: "good",
    notes: "",
  });

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ["hr-assets-list"],
    queryFn: async () => {
      const res = await api.get("/hr/assets");
      return res.data;
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["hr-asset-types-list"],
    queryFn: async () => {
      const res = await api.get("/hr/assets/types");
      return res.data;
    },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["hr-employees-picker"],
    queryFn: async () => {
      const res = await api.get("/hr/employees");
      return res.data?.items || res.data || [];
    },
  });

  const createAssetMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post("/hr/assets", payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Asset added to registry");
      queryClient.invalidateQueries({ queryKey: ["hr-assets-list"] });
      setIsAddModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to create asset");
    },
  });

  const assignMutation = useMutation({
    mutationFn: async ({ assetId, payload }: { assetId: string; payload: any }) => {
      const res = await api.post(`/hr/assets/${assetId}/assign`, payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Asset assigned to employee");
      queryClient.invalidateQueries({ queryKey: ["hr-assets-list"] });
      setIsAssignModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to assign asset");
    },
  });

  const returnMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      const res = await api.post(`/hr/assets/assignments/${assignmentId}/return`, {
        returnCondition: "good",
        returnNotes: "Returned by HR administrator",
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Asset returned to inventory");
      queryClient.invalidateQueries({ queryKey: ["hr-assets-list"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to return asset");
    },
  });

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Asset Registry"
        description="Comprehensive list of company assets, serial tracking, ownership, and operational state."
      >
        <Button onClick={() => setIsAddModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Add Asset
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Laptop className="h-5 w-5 text-indigo-500" />
            Hardware & Peripherals Registry ({assets.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset Name & Tag</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Serial Number</TableHead>
                <TableHead>Current Assignee</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Loading assets...
                  </TableCell>
                </TableRow>
              ) : assets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No assets recorded in registry. Click "Add Asset" to start tracking inventory.
                  </TableCell>
                </TableRow>
              ) : (
                assets.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">
                      <div>{a.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{a.assetTag}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{a.categoryRel?.name || "General"}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{a.serialNumber || "—"}</TableCell>
                    <TableCell>
                      {a.assignedEmployee ? (
                        <span className="text-sm font-medium">
                          {a.assignedEmployee.firstName} {a.assignedEmployee.lastName}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          a.status === "available"
                            ? "default"
                            : a.status === "assigned"
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {a.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {a.status === "available" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedAsset(a);
                            setIsAssignModalOpen(true);
                          }}
                          className="gap-1"
                        >
                          <UserPlus className="h-3.5 w-3.5" /> Assign
                        </Button>
                      ) : a.status === "assigned" && a.assignments?.[0] ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => returnMutation.mutate(a.assignments[0].id)}
                          className="gap-1 text-amber-600 hover:text-amber-700"
                        >
                          <RotateCcw className="h-3.5 w-3.5" /> Return
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Asset Dialog */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Asset to Registry</DialogTitle>
            <DialogDescription>Register hardware, laptop, or peripheral equipment.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Asset Name</Label>
              <Input
                placeholder="e.g. MacBook Pro M3 16-inch"
                value={newAsset.name}
                onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Asset Tag</Label>
                <Input
                  placeholder="AST-2026-001"
                  value={newAsset.assetTag}
                  onChange={(e) => setNewAsset({ ...newAsset, assetTag: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={newAsset.categoryId}
                  onValueChange={(val) => setNewAsset({ ...newAsset, categoryId: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Serial Number</Label>
                <Input
                  placeholder="SN-XXXX-YYYY"
                  value={newAsset.serialNumber}
                  onChange={(e) => setNewAsset({ ...newAsset, serialNumber: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Cost (₹)</Label>
                <Input
                  type="number"
                  value={newAsset.purchasePrice}
                  onChange={(e) => setNewAsset({ ...newAsset, purchasePrice: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createAssetMutation.mutate(newAsset)}
              disabled={!newAsset.name || createAssetMutation.isPending}
            >
              {createAssetMutation.isPending ? "Saving..." : "Add to Registry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Asset Dialog */}
      <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Asset: {selectedAsset?.name}</DialogTitle>
            <DialogDescription>Assign this equipment to an active employee.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Employee</Label>
              <Select
                value={assignData.employeeId}
                onValueChange={(val) => setAssignData({ ...assignData, employeeId: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp: any) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.employeeCode || emp.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Condition on Assignment</Label>
              <Select
                value={assignData.conditionOnAssign}
                onValueChange={(val) => setAssignData({ ...assignData, conditionOnAssign: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">Brand New</SelectItem>
                  <SelectItem value="good">Good / Working</SelectItem>
                  <SelectItem value="fair">Fair / Used</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignModalOpen(false)}>Cancel</Button>
            <Button
              onClick={() =>
                assignMutation.mutate({
                  assetId: selectedAsset?.id,
                  payload: assignData,
                })
              }
              disabled={!assignData.employeeId || assignMutation.isPending}
            >
              {assignMutation.isPending ? "Assigning..." : "Confirm Assignment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
