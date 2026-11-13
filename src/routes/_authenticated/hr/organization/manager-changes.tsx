import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
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
  GitFork,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Eye,
  UserCheck,
  UserX,
  RotateCcw,
  Search,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/organization/manager-changes" as any)({
  component: HrManagerChangesPage,
  head: () => ({
    meta: [{ title: "Reporting Manager Changes — Master HRMS" }],
  }),
});

export default function HrManagerChangesPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isActionOpen, setIsActionOpen] = useState(false);
  const [viewRecord, setViewRecord] = useState<any>(null);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [actionType, setActionType] = useState<"APPROVE" | "REJECT" | "REQUEST_CORRECTION">("APPROVE");
  const [actionComments, setActionComments] = useState("");

  const [formData, setFormData] = useState({
    employeeId: "",
    newManagerId: "",
    effectiveDate: new Date().toISOString().split("T")[0],
    reason: "",
  });

  const { data: overview } = useQuery({
    queryKey: ["hr-manager-changes-overview"],
    queryFn: async () => {
      try {
        const res = await api.get("/hr/organization/manager-changes/overview");
        return res.data;
      } catch {
        return null;
      }
    },
  });

  const { data: requestsData, isLoading } = useQuery({
    queryKey: ["hr-manager-changes-list", activeTab, searchTerm],
    queryFn: async () => {
      const params: any = { limit: 100 };
      if (activeTab !== "ALL") params.status = activeTab;
      if (searchTerm) params.search = searchTerm;
      const res = await api.get("/hr/organization/manager-changes", { params });
      return res.data;
    },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["hr-employees-picker-manager-changes"],
    queryFn: async () => {
      const res = await api.get("/hr/employees");
      return res.data?.items || res.data || [];
    },
  });

  const requests = requestsData?.items || [];

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post("/hr/organization/manager-change-request", payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Reporting manager change request submitted successfully");
      queryClient.invalidateQueries({ queryKey: ["hr-manager-changes-list"] });
      queryClient.invalidateQueries({ queryKey: ["hr-manager-changes-overview"] });
      setIsCreateOpen(false);
      setFormData({
        employeeId: "",
        newManagerId: "",
        effectiveDate: new Date().toISOString().split("T")[0],
        reason: "",
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to submit manager change request");
    },
  });

  const actionMutation = useMutation({
    mutationFn: async ({ id, action, comments }: { id: string; action: string; comments: string }) => {
      const res = await api.post(`/hr/organization/manager-changes/${id}/action`, {
        action,
        comments,
      });
      return res.data;
    },
    onSuccess: (data: any) => {
      const appliedNotice = data?.applied ? " Changes applied immediately to reporting hierarchy." : "";
      toast.success(`Request ${actionType.toLowerCase()}d successfully.${appliedNotice}`);
      queryClient.invalidateQueries({ queryKey: ["hr-manager-changes-list"] });
      queryClient.invalidateQueries({ queryKey: ["hr-manager-changes-overview"] });
      setIsActionOpen(false);
      setSelectedRecord(null);
      setActionComments("");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to process review action");
    },
  });

  const openActionDialog = (record: any, type: "APPROVE" | "REJECT" | "REQUEST_CORRECTION") => {
    setSelectedRecord(record);
    setActionType(type);
    setActionComments("");
    setIsActionOpen(true);
  };

  const now = new Date();
  const totalCount = overview?.counts?.total ?? requests.length;
  const pendingCount = overview?.counts?.pending ?? 0;
  const correctionCount = overview?.counts?.correctionRequested ?? 0;
  const approvedAwaitingCount = overview?.counts?.approvedAwaitingDate ?? 0;
  const completedCount = overview?.counts?.completed ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reporting Manager Change Requests"
        description="Review, validate circular hierarchy constraints, approve reporting manager transitions, and track career movement."
      >
        <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Request Manager Change
        </Button>
      </PageHeader>

      {/* KPI STAT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <StatCard
          title="Total Requests"
          value={totalCount.toString()}
          icon={<GitFork className="h-5 w-5 text-blue-500" />}
          description="All time submissions"
        />
        <StatCard
          title="Pending Approval"
          value={pendingCount.toString()}
          icon={<Clock className="h-5 w-5 text-amber-500" />}
          description="Awaiting HR review"
        />
        <StatCard
          title="Correction Req."
          value={correctionCount.toString()}
          icon={<RotateCcw className="h-5 w-5 text-orange-500" />}
          description="Returned for revision"
        />
        <StatCard
          title="Approved (Future)"
          value={approvedAwaitingCount.toString()}
          icon={<Clock className="h-5 w-5 text-indigo-500" />}
          description="Awaiting effective date"
        />
        <StatCard
          title="Applied / Completed"
          value={completedCount.toString()}
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />}
          description="Active in hierarchy"
        />
      </div>

      {/* REQUESTS TABLE */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <GitFork className="h-5 w-5 text-indigo-500" />
              <span>Manager Change Queue</span>
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-48 sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search employee..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>
              <div className="flex flex-wrap gap-1">
                {[
                  { id: "ALL", label: `All` },
                  { id: "PENDING", label: `Pending (${pendingCount})` },
                  { id: "CORRECTION_REQUESTED", label: `Correction` },
                  { id: "APPROVED", label: `Approved` },
                  { id: "COMPLETED", label: `Completed` },
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
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading manager change requests...</div>
          ) : requests.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No reporting manager change requests found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Current Manager</TableHead>
                  <TableHead>Proposed Manager</TableHead>
                  <TableHead>Effective Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((r: any) => {
                  const eff = new Date(r.effectiveDate);
                  const isFuture = eff.getTime() > now.getTime();

                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">
                        <div>
                          <span>{r.employee?.firstName} {r.employee?.lastName}</span>
                          <span className="block text-xs text-muted-foreground">
                            {r.employee?.employeeCode} • {r.employee?.department?.name || "General"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {r.oldManager ? (
                          <div>
                            <span>{r.oldManager.firstName} {r.oldManager.lastName}</span>
                            <span className="block text-xs text-muted-foreground">{r.oldManager.employeeCode}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">Top Executive (None)</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {r.newManager ? (
                          <div className="flex items-center gap-1.5 font-medium text-indigo-600">
                            <ArrowRight className="h-3.5 w-3.5" />
                            <span>{r.newManager.firstName} {r.newManager.lastName}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">Top Executive (None)</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-xs">
                          <span>{new Date(r.effectiveDate).toLocaleDateString()}</span>
                          {isFuture && r.status === "APPROVED" && (
                            <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700 border-indigo-200">
                              Future
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            r.status === "COMPLETED"
                              ? "default"
                              : r.status === "APPROVED"
                              ? "secondary"
                              : r.status === "REJECTED"
                              ? "destructive"
                              : r.status === "CORRECTION_REQUESTED"
                              ? "outline"
                              : "secondary"
                          }
                        >
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewRecord(r)}
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {(r.status === "PENDING" || r.status === "SUBMITTED" || r.status === "CORRECTION_REQUESTED") && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs text-amber-600 hover:text-amber-700"
                              onClick={() => openActionDialog(r, "REQUEST_CORRECTION")}
                            >
                              Correction
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs text-red-600 hover:text-red-700"
                              onClick={() => openActionDialog(r, "REJECT")}
                            >
                              Reject
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              className="text-xs bg-emerald-600 hover:bg-emerald-700"
                              onClick={() => openActionDialog(r, "APPROVE")}
                            >
                              Approve
                            </Button>
                          </>
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

      {/* CREATE MANAGER CHANGE DIALOG */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Reporting Manager Change</DialogTitle>
            <DialogDescription>
              Initiate a formal workflow to update an employee's reporting manager. Circular reporting is strictly prevented.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Target Employee</Label>
              <Select
                value={formData.employeeId}
                onValueChange={(val) => setFormData({ ...formData, employeeId: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
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
              <Label>Proposed New Manager</Label>
              <Select
                value={formData.newManagerId}
                onValueChange={(val) => setFormData({ ...formData, newManagerId: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose new manager (or Top Executive)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Promote to Top Executive / CEO)</SelectItem>
                  {employees
                    .filter((emp: any) => emp.id !== formData.employeeId)
                    .map((emp: any) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName} ({emp.employeeCode || emp.email})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Effective Date</Label>
              <Input
                type="date"
                value={formData.effectiveDate}
                onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Business Justification & Reason</Label>
              <Textarea
                placeholder="Reason for reporting line reassignment (e.g. reorganization, department realignment)..."
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!formData.employeeId || !formData.reason || createMutation.isPending}
              onClick={() => {
                createMutation.mutate({
                  employeeId: formData.employeeId,
                  newManagerId: formData.newManagerId === "none" ? null : formData.newManagerId,
                  effectiveDate: formData.effectiveDate,
                  reason: formData.reason,
                });
              }}
            >
              {createMutation.isPending ? "Submitting..." : "Submit Change Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* REVIEW ACTION DIALOG */}
      <Dialog open={isActionOpen} onOpenChange={setIsActionOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {actionType === "APPROVE"
                ? "Approve Manager Change"
                : actionType === "REJECT"
                ? "Reject Manager Change"
                : "Request Correction"}
            </DialogTitle>
            <DialogDescription>
              Action request for {selectedRecord?.employee?.firstName} {selectedRecord?.employee?.lastName}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="rounded-md bg-muted p-3 text-xs space-y-1">
              <div><strong>Current Manager:</strong> {selectedRecord?.oldManager ? `${selectedRecord.oldManager.firstName} ${selectedRecord.oldManager.lastName}` : "Top Executive (None)"}</div>
              <div><strong>Proposed Manager:</strong> {selectedRecord?.newManager ? `${selectedRecord.newManager.firstName} ${selectedRecord.newManager.lastName}` : "Top Executive (None)"}</div>
              <div><strong>Effective Date:</strong> {selectedRecord?.effectiveDate ? new Date(selectedRecord.effectiveDate).toLocaleDateString() : "—"}</div>
            </div>
            <div className="space-y-2">
              <Label>
                {actionType === "APPROVE" ? "Approval Remarks (Optional)" : "Justification Comments (Mandatory)"}
              </Label>
              <Textarea
                placeholder={actionType === "APPROVE" ? "Add optional remarks..." : "Provide clear explanation..."}
                value={actionComments}
                onChange={(e) => setActionComments(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsActionOpen(false)}>Cancel</Button>
            <Button
              className={
                actionType === "APPROVE"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : actionType === "REJECT"
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-amber-600 hover:bg-amber-700"
              }
              disabled={
                actionMutation.isPending ||
                ((actionType === "REJECT" || actionType === "REQUEST_CORRECTION") && !actionComments.trim())
              }
              onClick={() => {
                if (selectedRecord) {
                  actionMutation.mutate({
                    id: selectedRecord.id,
                    action: actionType,
                    comments: actionComments,
                  });
                }
              }}
            >
              {actionMutation.isPending ? "Processing..." : `Confirm ${actionType}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* VIEW DETAILS DIALOG */}
      <Dialog open={!!viewRecord} onOpenChange={(open) => !open && setViewRecord(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Reporting Manager Change Details</DialogTitle>
            <DialogDescription>
              Detailed view and historical audit trail for request #{viewRecord?.id?.slice(0, 8)}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3 text-sm">
            <div className="grid grid-cols-2 gap-3 pb-3 border-b">
              <div>
                <span className="text-xs text-muted-foreground block">Employee</span>
                <span className="font-medium">{viewRecord?.employee?.firstName} {viewRecord?.employee?.lastName}</span>
                <span className="text-xs text-muted-foreground block">{viewRecord?.employee?.employeeCode}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Request Status</span>
                <Badge variant="outline">{viewRecord?.status}</Badge>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Current Reporting Manager</span>
                <span>{viewRecord?.oldManager ? `${viewRecord.oldManager.firstName} ${viewRecord.oldManager.lastName}` : "Top Executive (None)"}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Proposed Reporting Manager</span>
                <span className="text-indigo-600 font-medium">{viewRecord?.newManager ? `${viewRecord.newManager.firstName} ${viewRecord.newManager.lastName}` : "Top Executive (None)"}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Effective Date</span>
                <span>{viewRecord?.effectiveDate ? new Date(viewRecord.effectiveDate).toLocaleDateString() : "—"}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Submitted At</span>
                <span>{viewRecord?.createdAt ? new Date(viewRecord.createdAt).toLocaleString() : "—"}</span>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Reason & Audit Trail</Label>
              <div className="mt-1 p-3 bg-muted rounded-md text-xs whitespace-pre-wrap font-mono max-h-48 overflow-y-auto">
                {viewRecord?.reason || "No comments provided."}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewRecord(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
