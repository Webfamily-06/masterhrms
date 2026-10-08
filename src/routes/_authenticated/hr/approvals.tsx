import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard, StatsOverviewGrid } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  FileCheck,
  Search,
  Filter,
  Check,
  X,
  History,
  ShieldCheck,
  UserCheck,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/hr/approvals")({
  component: HrApprovalsPage,
  head: () => ({ meta: [{ title: "Workplace Approvals & Queue — Master HRMS" }] }),
});

export function HrApprovalsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("PENDING");
  const [search, setSearch] = useState("");

  const [decisionModal, setDecisionModal] = useState<{
    isOpen: boolean;
    action: "approve" | "reject";
    id: string;
    title: string;
  }>({
    isOpen: false,
    action: "approve",
    id: "",
    title: "",
  });
  const [decisionComments, setDecisionComments] = useState("");

  const { data: approvalsRes, isLoading } = useQuery({
    queryKey: ["hr-approvals-queue", statusFilter],
    queryFn: async () => {
      try {
        const res: any = await api.get("/api/v1/hr/approvals", {
          params: statusFilter !== "ALL" ? { status: statusFilter } : {},
        });
        return res?.requests || [];
      } catch {
        return [];
      }
    },
  });

  const requests: any[] = approvalsRes || [];

  const decisionMutation = useMutation({
    mutationFn: async ({ id, action, comments }: { id: string; action: "approve" | "reject"; comments?: string }) => {
      return await api.post(`/api/v1/shared/approvals/${id}/${action}`, { comments });
    },
    onSuccess: (_, vars) => {
      toast.success(vars.action === "approve" ? "Request approved" : "Request rejected");
      queryClient.invalidateQueries({ queryKey: ["hr-approvals-queue"] });
      closeDecisionModal();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to process decision");
    },
  });

  function openDecisionModal(action: "approve" | "reject", id: string, title: string) {
    setDecisionModal({ isOpen: true, action, id, title });
    setDecisionComments("");
  }

  function closeDecisionModal() {
    setDecisionModal({ isOpen: false, action: "approve", id: "", title: "" });
    setDecisionComments("");
  }

  function handleExecuteDecision() {
    decisionMutation.mutate({
      id: decisionModal.id,
      action: decisionModal.action,
      comments: decisionComments,
    });
  }

  const filteredRequests = requests.filter((r) => {
    if (!search) return true;
    const matchType = r.entityType?.toLowerCase().includes(search.toLowerCase());
    const matchNotes = r.notes?.toLowerCase().includes(search.toLowerCase());
    return matchType || matchNotes;
  });

  const pendingCount = requests.filter((r) => r.status === "PENDING").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organization Approvals & Policy Sign-Offs"
        description="Enterprise multi-step approval queue for leaves, expenses, promotions, transfers, and policy exceptions."
      />

      <StatsOverviewGrid>
        <StatCard
          title="Pending in Queue"
          value={pendingCount}
          icon={Clock}
          description="Awaiting HR or Executive action"
        />
        <StatCard
          title="Active Workflows"
          value={requests.length}
          icon={FileCheck}
          description="Total tracked requests"
        />
        <StatCard
          title="Compliance SLA"
          value="98.5%"
          icon={ShieldCheck}
          description="Turnaround within policy limits"
        />
        <StatCard
          title="Multi-Level Stages"
          value="4 Steps"
          icon={UserCheck}
          description="Maximum approval depth"
        />
      </StatsOverviewGrid>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base">Approval Requests Queue</CardTitle>
              <CardDescription>
                Filter and action pending requests across all departments and subsidiaries.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Filter requests..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs border rounded-md px-2.5 py-2 bg-background"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending Only</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredRequests.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
              <p className="font-medium text-foreground">No requests found in this queue</p>
              <p className="text-xs">Adjust your search or status filter to see other workflow items.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request Type</TableHead>
                  <TableHead>Current Step</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-xs capitalize">
                          {req.entityType || "Workflow Request"}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          ID: #{req.entityId?.slice(0, 8) || req.id?.slice(0, 8)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[11px]">
                        Step {req.currentStep} of {req.totalSteps || req.currentStep}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          req.status === "PENDING" && "bg-amber-500/10 text-amber-600 border-amber-500/20",
                          req.status === "APPROVED" && "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
                          req.status === "REJECTED" && "bg-rose-500/10 text-rose-600 border-rose-500/20"
                        )}
                      >
                        {req.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {req.createdAt ? format(new Date(req.createdAt), "MMM d, yyyy") : "Recent"}
                    </TableCell>
                    <TableCell className="text-right">
                      {req.status === "PENDING" ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 h-7 text-xs px-2"
                            onClick={() =>
                              openDecisionModal(
                                "reject",
                                req.id,
                                `${req.entityType || "Request"} #${req.entityId?.slice(0, 8)}`
                              )
                            }
                          >
                            <X className="h-3.5 w-3.5 mr-1" />
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-xs px-2"
                            onClick={() =>
                              openDecisionModal(
                                "approve",
                                req.id,
                                `${req.entityType || "Request"} #${req.entityId?.slice(0, 8)}`
                              )
                            }
                          >
                            <Check className="h-3.5 w-3.5 mr-1" />
                            Approve
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Settled</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Decision Dialog */}
      <Dialog open={decisionModal.isOpen} onOpenChange={(open) => !open && closeDecisionModal()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {decisionModal.action === "approve" ? "Confirm Approval" : "Confirm Rejection"}
            </DialogTitle>
            <DialogDescription>
              {decisionModal.title}. Provide administrative notes for this workflow step.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {decisionModal.action === "approve" ? "Approval Remarks (Optional)" : "Rejection Reason (Required)"}
            </label>
            <Textarea
              rows={3}
              placeholder={
                decisionModal.action === "approve"
                  ? "e.g., Approved in accordance with company policy"
                  : "e.g., Exceeds department budget or documentation missing"
              }
              value={decisionComments}
              onChange={(e) => setDecisionComments(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDecisionModal} disabled={decisionMutation.isPending}>
              Cancel
            </Button>
            <Button
              className={
                decisionModal.action === "approve"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-rose-600 hover:bg-rose-700 text-white"
              }
              onClick={handleExecuteDecision}
              disabled={decisionMutation.isPending || (decisionModal.action === "reject" && !decisionComments.trim())}
            >
              {decisionMutation.isPending ? "Executing..." : decisionModal.action === "approve" ? "Authorize Approval" : "Reject Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default HrApprovalsPage;
