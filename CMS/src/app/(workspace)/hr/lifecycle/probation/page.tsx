'use client';
import {  createFileRoute  } from "@/src/lib/router-compat";
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
import {
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileCheck2,
  Calendar,
  UserCheck,
  FileText,
  AlertCircle,
  Eye,
} from "lucide-react";

export default function HrProbationPage() {
  const queryClient = useQueryClient();
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [viewRecord, setViewRecord] = useState<any>(null);
  const [isExtendOpen, setIsExtendOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [extendDays, setExtendDays] = useState("30");
  const [extendRemarks, setExtendRemarks] = useState("");
  const [confirmRating, setConfirmRating] = useState("Exceeds Expectations");
  const [confirmRemarks, setConfirmRemarks] = useState("");
  const [activeTab, setActiveTab] = useState<string>("ALL");

  const { data: overview } = useQuery({
    queryKey: ["hr-lifecycle-probation-overview"],
    queryFn: async () => {
      try {
        const res = await api.get("/hr/lifecycle/probation/overview");
        return (res as any)?.data ?? res;
      } catch (e) {
        return null;
      }
    },
  });

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["hr-lifecycle-probation"],
    queryFn: async () => {
      const res = await api.get("/hr/lifecycle/probation");
      return (res as any)?.data ?? res;
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
      queryClient.invalidateQueries({ queryKey: ["hr-lifecycle-probation-overview"] });
      setIsExtendOpen(false);
      setSelectedRecord(null);
    },
    onError: (err: any) => {
      toast.error((err?.response?.data?.error || err?.message) || "Failed to extend probation");
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async ({ id, rating, remarks }: { id: string; rating: string; remarks: string }) => {
      return await api.put(`/hr/lifecycle/probation/${id}/confirm`, {
        performanceRating: rating,
        remarks,
      });
    },
    onSuccess: (res: any) => {
      const letterNotice = res.data?.confirmationLetter
        ? ` Official confirmation letter (#${res.data.confirmationLetter.letterNumber}) generated.`
        : "";
      toast.success(`Employee confirmed successfully with lifecycle transition logged.${letterNotice}`);
      queryClient.invalidateQueries({ queryKey: ["hr-lifecycle-probation"] });
      queryClient.invalidateQueries({ queryKey: ["hr-lifecycle-probation-overview"] });
      setIsConfirmOpen(false);
      setSelectedRecord(null);
    },
    onError: (err: any) => {
      toast.error((err?.response?.data?.error || err?.message) || "Failed to confirm probation");
    },
  });

  const now = new Date();

  // Metrics from overview or calculated
  const totalCount = overview?.counts?.total ?? records.length;
  const activeCount = overview?.counts?.active ?? records.filter((r: any) => r.status === "active" || r.status === "extended").length;
  const ending30Count = overview?.counts?.ending30Days ?? records.filter((r: any) => {
    if (r.status === "confirmed") return false;
    const end = new Date(r.extendedUntil || r.endDate);
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff <= 30;
  }).length;
  const overdueCount = overview?.counts?.overdueDecision ?? records.filter((r: any) => {
    if (r.status === "confirmed") return false;
    const end = new Date(r.extendedUntil || r.endDate);
    return end.getTime() < now.getTime();
  }).length;
  const confirmedCount = overview?.counts?.confirmed ?? records.filter((r: any) => r.status === "confirmed").length;

  const filteredRecords = records.filter((r: any) => {
    const end = new Date(r.extendedUntil || r.endDate);
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (activeTab === "ACTIVE") return r.status === "active" || r.status === "extended";
    if (activeTab === "ENDING_SOON") return r.status !== "confirmed" && diff >= 0 && diff <= 30;
    if (activeTab === "OVERDUE") return r.status !== "confirmed" && diff < 0;
    if (activeTab === "CONFIRMED") return r.status === "confirmed";
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Probation & Confirmation Management"
        description="Monitor probation durations, evaluate milestone reviews, extend trial periods (up to 180 days), and issue automated confirmation letters."
      />

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <StatCard
          title="Total Evaluations"
          value={totalCount.toString()}
          icon={<Clock className="h-5 w-5 text-blue-500" />}
          description="Registered records"
        />
        <StatCard
          title="Active Probations"
          value={activeCount.toString()}
          icon={<Clock className="h-5 w-5 text-amber-500" />}
          description="In evaluation window"
        />
        <StatCard
          title="Due in 30 Days"
          value={ending30Count.toString()}
          icon={<AlertTriangle className="h-5 w-5 text-orange-500" />}
          description="Requires manager review"
        />
        <StatCard
          title="Overdue Decision"
          value={overdueCount.toString()}
          icon={<AlertCircle className="h-5 w-5 text-red-500" />}
          description="End date surpassed"
        />
        <StatCard
          title="Confirmed"
          value={confirmedCount.toString()}
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />}
          description="Letters archived"
        />
      </div>

      {/* PROBATION TABLE */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <FileCheck2 className="h-5 w-5 text-indigo-500" />
              <span>Probation Evaluation Queue</span>
            </CardTitle>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: "ALL", label: `All (${records.length})` },
                { id: "ACTIVE", label: `Active (${activeCount})` },
                { id: "ENDING_SOON", label: `Ending Soon (${ending30Count})` },
                { id: "OVERDUE", label: `Overdue (${overdueCount})` },
                { id: "CONFIRMED", label: `Confirmed (${confirmedCount})` },
              ].map((tab) => (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveTab(tab.id)}
                  className="h-8 text-xs"
                >
                  {tab.label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading probation records...</div>
          ) : filteredRecords.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No probation records match the selected filter.
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
                  <TableHead>Extended Days</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((r: any) => {
                  const end = new Date(r.extendedUntil || r.endDate);
                  const daysRemaining = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                  const isExpiringSoon = r.status !== "confirmed" && daysRemaining <= 15 && daysRemaining >= 0;
                  const isOverdue = r.status !== "confirmed" && daysRemaining < 0;

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
                            <Badge
                              variant={isOverdue ? "destructive" : isExpiringSoon ? "secondary" : "outline"}
                              className="text-xs"
                            >
                              {daysRemaining < 0
                                ? `${Math.abs(daysRemaining)}d overdue`
                                : `${daysRemaining}d left`}
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
                        {r.extendedUntil ? (
                          <div className="text-xs">
                            <span className="font-medium">{new Date(r.extendedUntil).toLocaleDateString()}</span>
                            <span className="block text-muted-foreground">({r.probationPeriodDays}d total)</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">{r.probationPeriodDays}d</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {r.performanceRating ? (
                          <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                            {r.performanceRating}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">Pending</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        {r.notes && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewRecord(r)}
                            title="View Record Details & Notes"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
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
                          <span className="text-xs text-muted-foreground inline-flex items-center justify-end gap-1">
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
              {selectedRecord?.employee?.lastName}. Maximum cumulative probation allowed is 180 days.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="rounded-md bg-amber-50 p-3 text-xs text-amber-800 border border-amber-200">
              Current Duration: <strong>{selectedRecord?.probationPeriodDays || 0} days</strong>. With proposed{" "}
              <strong>{extendDays} days</strong> extension, new duration will be{" "}
              <strong>{(selectedRecord?.probationPeriodDays || 0) + parseInt(extendDays || "0")} / 180 days</strong>.
            </div>
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
              <Label>Justification & Improvement Plan</Label>
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
              disabled={
                extendMutation.isPending ||
                (selectedRecord?.probationPeriodDays || 0) + parseInt(extendDays || "0") > 180
              }
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
            <div className="rounded-md bg-emerald-50 p-3 text-xs text-emerald-800 border border-emerald-200 flex items-start gap-2">
              <FileText className="h-4 w-4 mt-0.5 text-emerald-600 shrink-0" />
              <span>
                <strong>Automated Letter Generation:</strong> Upon confirmation approval, an official Appointment
                Confirmation Letter will be generated, uniquely numbered, and archived into the employee's document
                history.
              </span>
            </div>
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
              {confirmMutation.isPending ? "Issuing Confirmation..." : "Grant Confirmation & Generate Letter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* VIEW NOTES / DETAILS DIALOG */}
      <Dialog open={!!viewRecord} onOpenChange={(open) => !open && setViewRecord(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Probation Record Details</DialogTitle>
            <DialogDescription>
              Review history and notes for {viewRecord?.employee?.firstName} {viewRecord?.employee?.lastName}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-3 text-sm">
            <div className="grid grid-cols-2 gap-2 pb-2 border-b">
              <div>
                <span className="text-muted-foreground text-xs block">Employee Code</span>
                <span className="font-medium">{viewRecord?.employee?.employeeCode || "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground text-xs block">Current Status</span>
                <Badge variant="outline">{viewRecord?.status?.toUpperCase()}</Badge>
              </div>
              <div>
                <span className="text-muted-foreground text-xs block">Total Duration</span>
                <span>{viewRecord?.probationPeriodDays} Days</span>
              </div>
              <div>
                <span className="text-muted-foreground text-xs block">Performance Rating</span>
                <span>{viewRecord?.performanceRating || "Not rated yet"}</span>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Evaluation Notes & Audit Log</Label>
              <div className="mt-1 p-3 bg-muted rounded-md text-xs whitespace-pre-wrap tabular-nums max-h-60 overflow-y-auto">
                {viewRecord?.notes || "No additional evaluation notes recorded."}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewRecord(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
