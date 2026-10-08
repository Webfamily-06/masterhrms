import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { MapPin, Plus, Calendar, Building, ArrowRight, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/me/lifecycle/transfers")({
  component: MeTransfersPage,
});

export default function MeTransfersPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    toDepartmentId: "",
    toBranchId: "",
    reason: "",
  });

  const { data: transfers = [], isLoading } = useQuery({
    queryKey: ["me-lifecycle-transfers"],
    queryFn: async () => {
      const res = await api.get("/me/lifecycle/transfers");
      return res.data;
    },
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["departments-quick"],
    queryFn: async () => {
      const res = await api.get("/hr/departments");
      return res.data?.data || res.data || [];
    },
  });

  const { data: branches = [] } = useQuery({
    queryKey: ["branches-quick"],
    queryFn: async () => {
      const res = await api.get("/hr/branches");
      return res.data?.data || res.data || [];
    },
  });

  const requestMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await api.post("/me/lifecycle/transfers/request", data);
    },
    onSuccess: () => {
      toast.success("Transfer request submitted for HR approval");
      queryClient.invalidateQueries({ queryKey: ["me-lifecycle-transfers"] });
      setIsModalOpen(false);
      setFormData({ toDepartmentId: "", toBranchId: "", reason: "" });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to submit transfer request");
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Department & Branch Transfers"
        description="View your historical organizational relocations or submit a formal transfer request."
        actions={
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Request Relocation
          </Button>
        }
      />

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Loading transfer history...</div>
      ) : transfers.length === 0 ? (
        <Card className="py-12 text-center">
          <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-30" />
          <h3 className="text-base font-semibold">No Transfers on Record</h3>
          <p className="text-sm text-muted-foreground mt-1">
            You are currently working in your original assigned department and office.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {transfers.map((t: any) => (
            <Card key={t.id}>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-base">
                          {t.transferType || "Department Transfer"}
                        </span>
                        <Badge
                          variant={
                            t.status === "completed"
                              ? "default"
                              : t.status === "pending"
                              ? "outline"
                              : "secondary"
                          }
                        >
                          {t.status.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" /> Effective:{" "}
                          {new Date(t.transferDate).toLocaleDateString()}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Building className="h-3.5 w-3.5" />
                          {t.fromDepartment?.name || "Current"} <ArrowRight className="h-3 w-3" />{" "}
                          <strong className="text-foreground">{t.toDepartment?.name || "Target"}</strong>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {t.reason && (
                  <p className="text-sm text-muted-foreground mt-4 pt-3 border-t border-border">
                    {t.reason}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* REQUEST MODAL */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Internal Transfer</DialogTitle>
            <DialogDescription>
              Submit an internal mobility request for a new department or branch office.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Target Department</Label>
              <Select
                value={formData.toDepartmentId}
                onValueChange={(val) => setFormData({ ...formData, toDepartmentId: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select target department..." />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Target Branch (Optional)</Label>
              <Select
                value={formData.toBranchId}
                onValueChange={(val) => setFormData({ ...formData, toBranchId: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select branch (if changing location)..." />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Reason & Justification</Label>
              <Textarea
                placeholder="State your reasons for requesting this transfer..."
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={requestMutation.isPending || !formData.toDepartmentId || !formData.reason}
              onClick={() => requestMutation.mutate(formData)}
            >
              {requestMutation.isPending ? "Submitting..." : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
