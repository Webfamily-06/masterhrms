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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { LogOut, Calendar, CheckCircle2, Clock, UserCheck, XCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/lifecycle/resignations")({
  component: HrResignationsPage,
});

export default function HrResignationsPage() {
  const queryClient = useQueryClient();
  const [selectedExit, setSelectedExit] = useState<any>(null);
  const [reviewData, setReviewData] = useState({
    status: "clearance_pending",
    acceptedLastWorkingDay: "",
    notes: "",
  });

  const { data: resignations = [], isLoading } = useQuery({
    queryKey: ["hr-lifecycle-resignations"],
    queryFn: async () => {
      const res = await api.get("/hr/lifecycle/resignations");
      return res.data;
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      return await api.put(`/hr/lifecycle/resignations/${id}/review`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-lifecycle-resignations"] });
      toast.success("Resignation review recorded.");
      setSelectedExit(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to update resignation.");
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resignations & Notice Periods"
        description="Review incoming employee resignations, manage notice periods, calculate policy last working days, and schedule exit clearances."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Active Notices" value={String(resignations.length)} icon={LogOut} description="Serving notice period" />
        <StatCard
          title="Clearances Pending"
          value={String(resignations.filter((r: any) => r.status === "clearance_pending").length)}
          icon={Clock}
          description="Awaiting department sign-offs"
        />
        <StatCard
          title="Withdrawn"
          value={String(resignations.filter((r: any) => r.status === "withdrawn").length)}
          icon={UserCheck}
          description="Retained team members"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Notice Period Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Notice Date</TableHead>
                <TableHead>Last Working Day</TableHead>
                <TableHead>Notice Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Loading resignations...
                  </TableCell>
                </TableRow>
              ) : resignations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No active resignation notices on record.
                  </TableCell>
                </TableRow>
              ) : (
                resignations.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      {r.employee?.firstName} {r.employee?.lastName}
                      <span className="block text-xs text-muted-foreground">{r.employee?.position || "Staff"}</span>
                    </TableCell>
                    <TableCell>{new Date(r.resignationDate).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium">
                      {new Date(r.lastWorkingDay).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{r.noticePeriodDays} days</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {r.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                      {r.reason}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedExit(r);
                          setReviewData({
                            status: r.status,
                            acceptedLastWorkingDay: new Date(r.lastWorkingDay).toISOString().split("T")[0],
                            notes: r.exitInterviewNotes || "",
                          });
                        }}
                      >
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Review Resignation Dialog */}
      <Dialog open={!!selectedExit} onOpenChange={(open) => !open && setSelectedExit(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Review Resignation</DialogTitle>
            <DialogDescription>
              Accept notice, calibrate the last working day, or initiate the exit clearance checklist.
            </DialogDescription>
          </DialogHeader>
          {selectedExit && (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-muted rounded-lg text-xs space-y-1">
                <p>
                  <strong>Employee:</strong> {selectedExit.employee?.firstName} {selectedExit.employee?.lastName}
                </p>
                <p>
                  <strong>Stated Reason:</strong> {selectedExit.reason}
                </p>
                <p>
                  <strong>Notice Start:</strong> {new Date(selectedExit.resignationDate).toLocaleDateString()}
                </p>
              </div>

              <div>
                <Label>Decision / Stage *</Label>
                <Select
                  value={reviewData.status}
                  onValueChange={(val) => setReviewData({ ...reviewData, status: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="serving_notice">Serving Notice Period</SelectItem>
                    <SelectItem value="clearance_pending">Accept & Initiate Clearance</SelectItem>
                    <SelectItem value="withdrawn">Mark As Retained / Withdrawn</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Approved Last Working Day (LWD)</Label>
                <Input
                  type="date"
                  value={reviewData.acceptedLastWorkingDay}
                  onChange={(e) => setReviewData({ ...reviewData, acceptedLastWorkingDay: e.target.value })}
                />
              </div>

              <div>
                <Label>Exit Interview & Retention Notes</Label>
                <Textarea
                  placeholder="Record retention discussions, handover timeline, or interview comments..."
                  value={reviewData.notes}
                  onChange={(e) => setReviewData({ ...reviewData, notes: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedExit(null)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                reviewMutation.mutate({
                  id: selectedExit.id,
                  payload: reviewData,
                })
              }
              disabled={reviewMutation.isPending}
            >
              {reviewMutation.isPending ? "Updating..." : "Save Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
