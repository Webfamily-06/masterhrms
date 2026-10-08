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
import { ShieldCheck, Clock, CheckCircle2, AlertTriangle, Calendar, UserCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/lifecycle/probation")({
  component: HrProbationPage,
});

export default function HrProbationPage() {
  const queryClient = useQueryClient();
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [isExtendOpen, setIsExtendOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [extendDays, setExtendDays] = useState("30");
  const [extendRemarks, setExtendRemarks] = useState("");
  const [confirmRating, setConfirmRating] = useState("Exceeds Expectations");
  const [confirmRemarks, setConfirmRemarks] = useState("");

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["hr-lifecycle-probation"],
    queryFn: async () => {
      const res = await api.get("/hr/lifecycle/probation");
      return res.data;
    },
  });

  const extendMutation = useMutation({
    mutationFn: async ({ id, days, remarks }: { id: string; days: number; remarks: string }) => {
      return await api.put(`/hr/lifecycle/probation/${id}/extend`, {
        extensionDays: days,
        remarks,
      });
    },
    onSuccess: () => {
      toast.success("Probation period extended successfully");
      queryClient.invalidateQueries({ queryKey: ["hr-lifecycle-probation"] });
      setIsExtendOpen(false);
      setSelectedRecord(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to extend probation");
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async ({ id, rating, remarks }: { id: string; rating: string; remarks: string }) => {
      return await api.put(`/hr/lifecycle/probation/${id}/confirm`, {
        performanceRating: rating,
        remarks,
      });
    },
    onSuccess: () => {
      toast.success("Employee confirmed successfully with lifecycle transition logged");
      queryClient.invalidateQueries({ queryKey: ["hr-lifecycle-probation"] });
      setIsConfirmOpen(false);
      setSelectedRecord(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to confirm probation");
    },
  });

  const now = new Date();
  const activeRecords = records.filter((r: any) => r.status === "active" || r.status === "extended");
  const confirmedRecords = records.filter((r: any) => r.status === "confirmed");
  
  const expiring30 = activeRecords.filter((r: any) => {
    const end = new Date(r.extendedUntil || r.endDate);
    const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 30;
  });

  const expiring15 = activeRecords.filter((r: any) => {
    const end = new Date(r.extendedUntil || r.endDate);
    const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 15;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Probation & Confirmation Management"
        description="Monitor probation durations, evaluate milestone reviews, extend trial periods, or issue permanent confirmations."
      />

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Active Probations"
          value={activeRecords.length.toString()}
          icon={<Clock className="h-5 w-5 text-amber-500" />}
          description="In evaluation period"
        />
        <StatCard
          title="Due within 30 Days"
          value={expiring30.length.toString()}
          icon={<AlertTriangle className="h-5 w-5 text-orange-500" />}
          description="Review window open"
        />
        <StatCard
          title="Due within 15 Days"
          value={expiring15.length.toString()}
          icon={<AlertTriangle className="h-5 w-5 text-red-500" />}
          description="Urgent action required"
        />
        <StatCard
          title="Confirmed"
          value={confirmedRecords.length.toString()}
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />}
          description="Permanent transitions logged"
        />
      </div>

      {/* PROBATION TABLE */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center justify-between">
            <span>Probation Evaluation Queue</span>
            <span className="text-sm font-normal text-muted-foreground">
              Total: {records.length} Records
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading probation records...</div>
          ) : records.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No probation records registered.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>Expected End Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Extended Until</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r: any) => {
                  const end = new Date(r.extendedUntil || r.endDate);
                  const daysRemaining = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                  const isExpiringSoon = r.status !== "confirmed" && daysRemaining <= 15;

                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">
                        <div>
                          <span>
                            {r.employee?.firstName} {r.employee?.lastName}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {r.employee?.employeeCode || r.employee?.email}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{r.employee?.department?.name || "General"}</TableCell>
                      <TableCell>{new Date(r.startDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span>{new Date(r.endDate).toLocaleDateString()}</span>
                          {r.status !== "confirmed" && (
                            <Badge variant={isExpiringSoon ? "destructive" : "outline"} className="text-xs">
                              {daysRemaining < 0 ? `${Math.abs(daysRemaining)}d overdue` : `${daysRemaining}d left`}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            r.status === "confirmed"
                              ? "default"
                              : r.status === "extended"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {r.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {r.extendedUntil ? new Date(r.extendedUntil).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell>{r.performanceRating || "—"}</TableCell>
                      <TableCell className="text-right space-x-2">
                        {r.status !== "confirmed" && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedRecord(r);
                                setIsExtendOpen(true);
                              }}
                            >
                              Extend
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => {
                                setSelectedRecord(r);
                                setIsConfirmOpen(true);
                              }}
                            >
                              Confirm
                            </Button>
                          </>
                        )}
                        {r.status === "confirmed" && (
                          <span className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Confirmed
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* EXTEND DIALOG */}
      <Dialog open={isExtendOpen} onOpenChange={setIsExtendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extend Probation Period</DialogTitle>
            <DialogDescription>
              Grant additional evaluation time for {selectedRecord?.employee?.firstName}{" "}
              {selectedRecord?.employee?.lastName}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div>
              <Label>Extension Days</Label>
              <Select value={extendDays} onValueChange={setExtendDays}>
                <SelectTrigger>
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 Days Extension</SelectItem>
                  <SelectItem value="30">30 Days Extension (Standard)</SelectItem>
                  <SelectItem value="60">60 Days Extension</SelectItem>
                  <SelectItem value="90">90 Days Extension</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Justification & Plan</Label>
              <Textarea
                placeholder="Detail areas needing improvement during the extended period..."
                value={extendRemarks}
                onChange={(e) => setExtendRemarks(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsExtendOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={extendMutation.isPending}
              onClick={() => {
                if (selectedRecord) {
                  extendMutation.mutate({
                    id: selectedRecord.id,
                    days: parseInt(extendDays),
                    remarks: extendRemarks,
                  });
                }
              }}
            >
              {extendMutation.isPending ? "Extending..." : "Confirm Extension"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONFIRM DIALOG */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Employee Appointment</DialogTitle>
            <DialogDescription>
              Mark probationary period complete and grant permanent status to{" "}
              {selectedRecord?.employee?.firstName} {selectedRecord?.employee?.lastName}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div>
              <Label>Performance Rating</Label>
              <Select value={confirmRating} onValueChange={setConfirmRating}>
                <SelectTrigger>
                  <SelectValue placeholder="Select rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Outstanding">5 - Outstanding</SelectItem>
                  <SelectItem value="Exceeds Expectations">4 - Exceeds Expectations</SelectItem>
                  <SelectItem value="Meets Expectations">3 - Meets Expectations</SelectItem>
                  <SelectItem value="Needs Improvement">2 - Needs Improvement</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Evaluation Remarks</Label>
              <Textarea
                placeholder="Summary of evaluation results, strengths and feedback..."
                value={confirmRemarks}
                onChange={(e) => setConfirmRemarks(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={confirmMutation.isPending}
              onClick={() => {
                if (selectedRecord) {
                  confirmMutation.mutate({
                    id: selectedRecord.id,
                    rating: confirmRating,
                    remarks: confirmRemarks,
                  });
                }
              }}
            >
              {confirmMutation.isPending ? "Processing..." : "Grant Confirmation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
