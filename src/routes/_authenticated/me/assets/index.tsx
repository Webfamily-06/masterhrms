import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Laptop, PenTool, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/me/assets/")({
  component: MeAssetsListPage,
});

export default function MeAssetsListPage() {
  const queryClient = useQueryClient();
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ["me-assigned-assets-list"],
    queryFn: async () => {
      const res = await api.get("/me/assets");
      return res.data;
    },
  });

  const acknowledgeMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      const res = await api.post(`/me/assets/assignments/${assignmentId}/acknowledge`, {
        signatureDataUrl: "DIGITALLY_SIGNED_PORTAL",
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Asset receipt digitally acknowledged");
      queryClient.invalidateQueries({ queryKey: ["me-assigned-assets-list"] });
      queryClient.invalidateQueries({ queryKey: ["me-assets-dashboard"] });
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to acknowledge asset");
    },
  });

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="My Hardware & Equipment Registry"
        description="Review all devices currently allocated to you and sign pending handover acknowledgements."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Laptop className="h-5 w-5 text-indigo-500" />
            Allocated Devices ({assignments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset Name</TableHead>
                <TableHead>Asset Tag</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Assigned Date</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Loading your assigned hardware...
                  </TableCell>
                </TableRow>
              ) : assignments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    You have no hardware equipment currently checked out.
                  </TableCell>
                </TableRow>
              ) : (
                assignments.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">
                      <div>{a.asset?.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{a.asset?.serialNumber}</div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{a.asset?.assetTag}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{a.asset?.categoryRel?.name || "General"}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(a.assignedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{a.conditionOnAssign}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={a.acknowledgedAt ? "default" : "destructive"}>
                        {a.acknowledgedAt ? "Verified" : "Pending Sign-off"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {!a.acknowledgedAt ? (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedAssignment(a);
                            setIsModalOpen(true);
                          }}
                          className="gap-1.5"
                        >
                          <PenTool className="h-3.5 w-3.5" /> Sign Handover
                        </Button>
                      ) : (
                        <span className="flex items-center justify-end gap-1 text-xs text-emerald-600 font-medium">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Signed
                        </span>
                      )}
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
            <DialogTitle>Digital Asset Handover Sign-off</DialogTitle>
            <DialogDescription>
              Confirm receipt of <strong>{selectedAssignment?.asset?.name}</strong> (Tag: {selectedAssignment?.asset?.assetTag}).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4 text-sm text-muted-foreground">
            <p>
              By clicking "Confirm & Sign", you certify that you have received this hardware device in{" "}
              <strong>{selectedAssignment?.conditionOnAssign}</strong> condition, and agree to the company IT security policy.
            </p>
            <div className="p-3 bg-muted rounded border text-xs">
              Handover Date: {selectedAssignment ? new Date(selectedAssignment.assignedAt).toLocaleDateString() : ""}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button
              onClick={() => acknowledgeMutation.mutate(selectedAssignment?.id)}
              disabled={acknowledgeMutation.isPending}
            >
              {acknowledgeMutation.isPending ? "Signing..." : "Confirm & Sign Receipt"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
