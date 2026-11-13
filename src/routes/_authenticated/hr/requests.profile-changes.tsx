import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  FileText,
  User,
  MapPin,
  PhoneCall,
  CreditCard,
  ShieldAlert,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Send,
  Eye,
  Check,
  RotateCcw,
  RefreshCw,
  Search,
  FileCheck,
  Building,
  ArrowRight,
  Shield,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/requests/profile-changes")({
  component: HRProfileChangeRequestsPage,
  head: () => ({
    meta: [{ title: "Profile Change Requests Queue — Master HRMS" }],
  }),
});

interface ChangeRequestQueueItem {
  id: string;
  tenantId: string;
  employeeId: string;
  fieldCategory: string;
  fieldKey: string;
  status: "DRAFT" | "SUBMITTED" | "PENDING" | "CORRECTION_REQUESTED" | "APPROVED" | "REJECTED" | "CANCELLED";
  reason?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  proofMediaId?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewComments?: string;
  createdAt: string;
  employee?: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    email: string;
    department?: { id: string; name: string };
    designation?: { id: string; name: string };
    branch?: { id: string; name: string };
  };
  proofMedia?: {
    id: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    url: string;
  };
}

export function HRProfileChangeRequestsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  // Review Dialog State
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ChangeRequestQueueItem | null>(null);
  const [reviewComments, setReviewComments] = useState("");
  const [reviewAction, setReviewAction] = useState<"approve" | "reject" | "request_correction">("approve");

  // Query summary metrics
  const { data: summaryData } = useQuery({
    queryKey: ["hr-profile-change-requests-summary"],
    queryFn: async () => {
      const res = await api.get("/hr/requests/profile-changes/summary");
      return res.data?.data || res.data || res;
    },
  });

  // Query queue requests
  const { data: queueResponse, isLoading, refetch } = useQuery({
    queryKey: ["hr-profile-change-requests", activeTab, selectedCategory, searchQuery, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeTab !== "ALL") params.append("status", activeTab);
      if (selectedCategory !== "ALL") params.append("category", selectedCategory);
      if (searchQuery) params.append("search", searchQuery);
      params.append("page", String(page));
      params.append("limit", "20");
      const res = await api.get(`/hr/requests/profile-changes?${params.toString()}`);
      return res.data || res;
    },
  });

  const requests: ChangeRequestQueueItem[] = queueResponse?.data || [];
  const pagination = queueResponse?.pagination || { total: 0, page: 1, pageSize: 20, totalPages: 1 };

  // Action mutation
  const actionMutation = useMutation({
    mutationFn: async ({ id, action, comments }: { id: string; action: string; comments?: string }) => {
      return await api.post(`/hr/requests/profile-changes/${id}/action`, {
        action,
        reviewComments: comments,
      });
    },
    onSuccess: (data: any) => {
      toast.success(data?.message || "Review decision recorded successfully.");
      setIsReviewOpen(false);
      setReviewComments("");
      queryClient.invalidateQueries({ queryKey: ["hr-profile-change-requests"] });
      queryClient.invalidateQueries({ queryKey: ["hr-profile-change-requests-summary"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to process review decision");
    },
  });

  const handleOpenReview = (item: ChangeRequestQueueItem) => {
    setSelectedRequest(item);
    setReviewComments("");
    setReviewAction("approve");
    setIsReviewOpen(true);
  };

  const handleExecuteReview = (action: "approve" | "reject" | "request_correction") => {
    if (!selectedRequest) return;

    if ((action === "reject" || action === "request_correction") && !reviewComments.trim()) {
      toast.error(`Please provide comments explaining why you are ${action === "reject" ? "rejecting" : "requesting correction on"} this request.`);
      return;
    }

    actionMutation.mutate({
      id: selectedRequest.id,
      action,
      comments: reviewComments.trim(),
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <Badge variant="default" className="bg-emerald-500/15 text-emerald-700 border-emerald-300">Approved</Badge>;
      case "PENDING":
      case "SUBMITTED":
        return <Badge variant="outline" className="bg-amber-500/15 text-amber-700 border-amber-300">Pending Review</Badge>;
      case "CORRECTION_REQUESTED":
        return <Badge variant="outline" className="bg-purple-500/15 text-purple-700 border-purple-300 animate-pulse">Correction Requested</Badge>;
      case "REJECTED":
        return <Badge variant="destructive" className="bg-rose-500/15 text-rose-700 border-rose-300">Rejected</Badge>;
      case "DRAFT":
        return <Badge variant="secondary" className="bg-slate-500/15 text-slate-700 border-slate-300">Draft</Badge>;
      case "CANCELLED":
        return <Badge variant="outline" className="text-muted-foreground border-border">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case "banking":
      case "bank":
        return <CreditCard className="h-4 w-4 text-blue-600" />;
      case "address":
        return <MapPin className="h-4 w-4 text-emerald-600" />;
      case "emergency_contact":
      case "emergency":
        return <PhoneCall className="h-4 w-4 text-rose-600" />;
      case "tax_identity":
      case "statutory":
        return <ShieldAlert className="h-4 w-4 text-purple-600" />;
      default:
        return <User className="h-4 w-4 text-indigo-600" />;
    }
  };

  const summary = summaryData || {
    total: 0,
    pending: 0,
    correctionRequested: 0,
    approved: 0,
    rejected: 0,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profile Change Requests Queue"
        description="Review, verify, and approve employee profile change submissions across the organization."
        breadcrumbs={[
          { label: "HR Workspace", href: "/hr" },
          { label: "Approval", href: "/hr/approvals" },
          { label: "Profile Change Requests" },
        ]}
        actions={
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Total Submissions" value={summary.total || 0} variant="default" />
        <StatCard label="Pending Approval" value={summary.pending || 0} variant="warning" />
        <StatCard label="Needs Correction" value={summary.correctionRequested || 0} variant="purple" />
        <StatCard label="Approved" value={summary.approved || 0} variant="success" />
        <StatCard label="Rejected" value={summary.rejected || 0} variant="rose" />
      </div>

      {/* Filter Toolbar */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <Button
              variant={activeTab === "ALL" ? "default" : "outline"}
              size="sm"
              onClick={() => { setActiveTab("ALL"); setPage(1); }}
            >
              All
            </Button>
            <Button
              variant={activeTab === "PENDING" ? "default" : "outline"}
              size="sm"
              onClick={() => { setActiveTab("PENDING"); setPage(1); }}
            >
              Pending ({summary.pending || 0})
            </Button>
            <Button
              variant={activeTab === "CORRECTION_REQUESTED" ? "default" : "outline"}
              size="sm"
              onClick={() => { setActiveTab("CORRECTION_REQUESTED"); setPage(1); }}
            >
              Needs Correction ({summary.correctionRequested || 0})
            </Button>
            <Button
              variant={activeTab === "APPROVED" ? "default" : "outline"}
              size="sm"
              onClick={() => { setActiveTab("APPROVED"); setPage(1); }}
            >
              Approved ({summary.approved || 0})
            </Button>
            <Button
              variant={activeTab === "REJECTED" ? "default" : "outline"}
              size="sm"
              onClick={() => { setActiveTab("REJECTED"); setPage(1); }}
            >
              Rejected ({summary.rejected || 0})
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <Select
              value={selectedCategory}
              onValueChange={(val) => { setSelectedCategory(val); setPage(1); }}
            >
              <SelectTrigger className="w-full sm:w-[180px] h-9">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Categories</SelectItem>
                <SelectItem value="personal">Personal Info</SelectItem>
                <SelectItem value="address">Address</SelectItem>
                <SelectItem value="emergency_contact">Emergency Contact</SelectItem>
                <SelectItem value="banking">Banking Details</SelectItem>
                <SelectItem value="tax_identity">Tax & Statutory</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employee..."
                className="pl-8 h-9 w-full"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requests Data Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Review Queue</CardTitle>
          <CardDescription>
            Click "Review" on any pending request to view original vs requested diffs and take action.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground uppercase text-xs border-b">
                <tr>
                  <th className="px-6 py-3">Employee</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">Requested Changes</th>
                  <th className="px-6 py-3">Document Proof</th>
                  <th className="px-6 py-3">Submitted Date</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-muted-foreground">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                      Loading change requests queue...
                    </td>
                  </tr>
                ) : requests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-muted-foreground">
                      <FileText className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                      No change requests matching the selected filters.
                    </td>
                  </tr>
                ) : (
                  requests.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-foreground">
                          {item.employee ? `${item.employee.firstName} ${item.employee.lastName}` : "Unknown"}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                          <span>{item.employee?.employeeCode || "—"}</span>
                          <span>•</span>
                          <span>{item.employee?.department?.name || "General"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="p-1.5 rounded-md bg-muted border border-border">
                            {getCategoryIcon(item.fieldCategory)}
                          </span>
                          <span className="capitalize font-medium">{item.fieldCategory.replace("_", " ")}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 max-w-xs truncate">
                        {item.newValues && Object.keys(item.newValues).length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(item.newValues).slice(0, 3).map(([k, v]) => (
                              <span key={k} className="inline-block bg-muted/60 text-xs px-2 py-0.5 rounded border border-border">
                                <span className="font-medium text-foreground">{k}:</span> {String(v)}
                              </span>
                            ))}
                            {Object.keys(item.newValues).length > 3 && (
                              <span className="text-xs text-muted-foreground">+{Object.keys(item.newValues).length - 3} more</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic">No fields</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.proofMediaId ? (
                          <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
                            <FileCheck className="h-3 w-3 mr-1" />
                            Attached
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">None</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(item.createdAt), "MMM d, yyyy")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(item.status)}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <Button
                          size="sm"
                          variant={item.status === "PENDING" ? "default" : "outline"}
                          onClick={() => handleOpenReview(item)}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          {item.status === "PENDING" ? "Review" : "View"}
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t text-xs text-muted-foreground">
              <div>
                Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total requests)
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog with Side-by-Side Diff */}
      {selectedRequest && (
        <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="capitalize">{selectedRequest.fieldCategory.replace("_", " ")} Change Review</span>
                  {getStatusBadge(selectedRequest.status)}
                </div>
              </DialogTitle>
              <DialogDescription>
                Submitted by {selectedRequest.employee?.firstName} {selectedRequest.employee?.lastName} ({selectedRequest.employee?.employeeCode}) on {format(new Date(selectedRequest.createdAt), "MMMM d, yyyy 'at' h:mm a")}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              {/* Employee Summary Card */}
              <div className="p-3 rounded-lg border bg-muted/30 grid grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground block">Employee:</span>
                  <span className="font-semibold text-foreground">
                    {selectedRequest.employee?.firstName} {selectedRequest.employee?.lastName}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Department / Branch:</span>
                  <span className="font-semibold text-foreground">
                    {selectedRequest.employee?.department?.name || "—"} / {selectedRequest.employee?.branch?.name || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Email:</span>
                  <span className="font-semibold text-foreground">
                    {selectedRequest.employee?.email || "—"}
                  </span>
                </div>
              </div>

              {/* Employee Reason */}
              {selectedRequest.reason && (
                <div className="text-xs p-3 rounded-lg bg-blue-50/50 border border-blue-200 text-blue-900">
                  <span className="font-semibold block mb-0.5">Employee's Stated Reason:</span>
                  <p>{selectedRequest.reason}</p>
                </div>
              )}

              {/* Side-by-side Before & After comparison card */}
              <div>
                <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Field-Level Comparison</h4>
                <div className="grid grid-cols-2 gap-4 border rounded-lg p-4 bg-muted/20">
                  <div>
                    <h5 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      Original Official Record (Snapshot)
                    </h5>
                    {selectedRequest.oldValues && Object.keys(selectedRequest.oldValues).length > 0 ? (
                      <div className="space-y-2 text-xs">
                        {Object.entries(selectedRequest.oldValues).map(([k, v]) => (
                          <div key={k} className="p-2 rounded border bg-background">
                            <span className="text-muted-foreground font-medium block text-[11px] uppercase tracking-wider">{k}</span>
                            <span className="font-mono text-foreground font-medium">{String(v ?? "—")}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground italic p-4 text-center">
                        No previous record on file
                      </div>
                    )}
                  </div>

                  <div>
                    <h5 className="text-xs font-semibold text-primary mb-2 flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Proposed Changes (Requested)
                    </h5>
                    {selectedRequest.newValues && Object.keys(selectedRequest.newValues).length > 0 ? (
                      <div className="space-y-2 text-xs">
                        {Object.entries(selectedRequest.newValues).map(([k, v]) => (
                          <div key={k} className="p-2 rounded border border-primary/30 bg-primary/5">
                            <span className="text-primary font-medium block text-[11px] uppercase tracking-wider">{k}</span>
                            <span className="font-mono text-primary font-semibold">{String(v ?? "—")}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground italic p-4 text-center">
                        No fields provided
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Proof Document Reference */}
              {selectedRequest.proofMediaId && (
                <div className="text-xs p-3 rounded-lg border bg-muted/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCheck className="h-4 w-4 text-blue-600" />
                    <span>Supporting Document Proof Attached</span>
                  </div>
                  <code className="font-mono text-[11px] bg-background px-2 py-0.5 rounded border">
                    {selectedRequest.proofMediaId}
                  </code>
                </div>
              )}

              {/* Existing feedback if present */}
              {selectedRequest.reviewComments && (
                <div className="text-xs p-3 rounded-lg border bg-muted/40">
                  <span className="font-semibold text-muted-foreground block mb-1">Previous Review Notes:</span>
                  <p>{selectedRequest.reviewComments}</p>
                </div>
              )}

              {/* Review Decision Inputs (Only for PENDING or SUBMITTED) */}
              {(selectedRequest.status === "PENDING" || selectedRequest.status === "SUBMITTED") && (
                <div className="space-y-3 pt-3 border-t">
                  <Label className="text-xs font-semibold">Review Comments & Justification</Label>
                  <Textarea
                    rows={3}
                    placeholder="Provide review notes or explain required corrections..."
                    value={reviewComments}
                    onChange={(e) => setReviewComments(e.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Required when rejecting or requesting corrections from the employee.
                  </p>
                </div>
              )}
            </div>

            <DialogFooter className="flex items-center justify-between gap-3">
              <Button variant="outline" size="sm" onClick={() => setIsReviewOpen(false)}>
                Close
              </Button>

              {(selectedRequest.status === "PENDING" || selectedRequest.status === "SUBMITTED") && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={actionMutation.isPending}
                    onClick={() => handleExecuteReview("reject")}
                  >
                    <XCircle className="h-4 w-4 mr-1.5" />
                    Reject
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-purple-300 text-purple-700 hover:bg-purple-50"
                    disabled={actionMutation.isPending}
                    onClick={() => handleExecuteReview("request_correction")}
                  >
                    <RotateCcw className="h-4 w-4 mr-1.5" />
                    Request Correction
                  </Button>
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={actionMutation.isPending}
                    onClick={() => handleExecuteReview("approve")}
                  >
                    <Check className="h-4 w-4 mr-1.5" />
                    Approve & Update Profile
                  </Button>
                </div>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default HRProfileChangeRequestsPage;
