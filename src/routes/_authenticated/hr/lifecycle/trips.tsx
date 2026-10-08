import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
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
import { toast } from "sonner";
import { Plane, CheckCircle2, Clock, DollarSign, MapPin, Calendar } from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/lifecycle/trips")({
  component: HrTripsPage,
});

export default function HrTripsPage() {
  const queryClient = useQueryClient();
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [approvalRemarks, setApprovalRemarks] = useState("");

  const { data: trips = [], isLoading } = useQuery({
    queryKey: ["hr-lifecycle-trips"],
    queryFn: async () => {
      const res = await api.get("/hr/lifecycle/trips");
      return res.data;
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, remarks }: { id: string; remarks: string }) => {
      return await api.put(`/hr/lifecycle/trips/${id}/approve`, { remarks });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-lifecycle-trips"] });
      toast.success("Business trip approved.");
      setSelectedTrip(null);
      setApprovalRemarks("");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to approve trip.");
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Business Travel & Expense Authorizations"
        description="Review official travel requests, approve cash advances, and verify return expense settlements."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total Travel Requests" value={String(trips.length)} icon={Plane} description="Company travel records" />
        <StatCard
          title="Pending Approval"
          value={String(trips.filter((t: any) => t.status === "pending").length)}
          icon={Clock}
          description="Awaiting authorization"
        />
        <StatCard
          title="Total Cash Advances"
          value={`₹${trips.reduce((sum: number, t: any) => sum + Number(t.advanceAmount || 0), 0).toLocaleString()}`}
          icon={DollarSign}
          description="Approved travel advances"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Travel Authorizations</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Advance Requested</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Loading travel requests...
                  </TableCell>
                </TableRow>
              ) : trips.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No business travel requests on record.
                  </TableCell>
                </TableRow>
              ) : (
                trips.map((t: any) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">
                      {t.employee?.firstName} {t.employee?.lastName}
                      <span className="block text-xs text-muted-foreground">{t.employee?.position || "Staff"}</span>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 font-medium">
                        <MapPin className="h-3.5 w-3.5 text-primary" /> {t.destination}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">
                      {new Date(t.fromDate).toLocaleDateString()} – {new Date(t.toDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs">{t.purpose}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {Number(t.advanceAmount) > 0 ? `₹${Number(t.advanceAmount).toLocaleString()}` : "No advance"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={t.status === "approved" ? "default" : "secondary"} className="capitalize">
                        {t.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {t.status === "pending" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedTrip(t)}
                        >
                          Approve
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={!!selectedTrip} onOpenChange={(open) => !open && setSelectedTrip(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Approve Business Trip</DialogTitle>
            <DialogDescription>Authorize travel dates and advance disbursement.</DialogDescription>
          </DialogHeader>
          {selectedTrip && (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-muted rounded-lg text-xs space-y-1">
                <p>
                  <strong>Employee:</strong> {selectedTrip.employee?.firstName} {selectedTrip.employee?.lastName}
                </p>
                <p>
                  <strong>Destination:</strong> {selectedTrip.destination} ({selectedTrip.travelMode})
                </p>
                <p>
                  <strong>Advance:</strong> ₹{Number(selectedTrip.advanceAmount || 0).toLocaleString()}
                </p>
              </div>
              <div>
                <Label>Approval Remarks</Label>
                <Input
                  placeholder="e.g. Approved as per client meeting schedule"
                  value={approvalRemarks}
                  onChange={(e) => setApprovalRemarks(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedTrip(null)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                approveMutation.mutate({
                  id: selectedTrip.id,
                  remarks: approvalRemarks,
                })
              }
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending ? "Approving..." : "Confirm Approval"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
