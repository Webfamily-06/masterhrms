import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Clock,
  FileCheck,
  RefreshCw,
  Search,
  UploadCloud,
  FileX,
  Building2,
  ExternalLink,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/documents/compliance")({
  component: HrDocumentCompliancePage,
});

export default function HrDocumentCompliancePage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedDocForRenew, setSelectedDocForRenew] = useState<any | null>(null);
  const [selectedDocForReject, setSelectedDocForReject] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [renewalForm, setRenewalForm] = useState({
    fileName: "",
    fileUrl: "",
    expiryDate: "",
    notes: "",
  });

  // 1. Fetch Tenant Compliance Summary
  const { data: summary, isLoading: isSummaryLoading, refetch: refetchSummary } = useQuery({
    queryKey: ["hr-document-compliance-summary"],
    queryFn: async () => {
      const res = await api.get("/documents/compliance/summary");
      return res.data;
    },
  });

  // 2. Fetch Expiring & Non-Compliant Documents List
  const { data: expiringData, isLoading: isExpiringLoading, refetch: refetchExpiring } = useQuery({
    queryKey: ["hr-document-compliance-expiring", activeTab, searchTerm],
    queryFn: async () => {
      const params: any = { limit: 50 };
      if (activeTab !== "all") {
        params.stage = activeTab;
      }
      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }
      const res = await api.get("/documents/compliance/expiring", { params });
      return res.data;
    },
  });

  // 3. Verify Mutation
  const verifyMutation = useMutation({
    mutationFn: async (docId: string) => {
      const res = await api.post(`/documents/${docId}/verify`);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Document verified successfully!");
      queryClient.invalidateQueries({ queryKey: ["hr-document-compliance-summary"] });
      queryClient.invalidateQueries({ queryKey: ["hr-document-compliance-expiring"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to verify document.");
    },
  });

  // 4. Reject Mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ docId, reason }: { docId: string; reason: string }) => {
      const res = await api.post(`/documents/${docId}/reject`, { reason });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Document marked as rejected.");
      setSelectedDocForReject(null);
      setRejectionReason("");
      queryClient.invalidateQueries({ queryKey: ["hr-document-compliance-summary"] });
      queryClient.invalidateQueries({ queryKey: ["hr-document-compliance-expiring"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to reject document.");
    },
  });

  // 5. Renew Mutation
  const renewMutation = useMutation({
    mutationFn: async ({ docId, payload }: { docId: string; payload: any }) => {
      const res = await api.post(`/documents/${docId}/renew`, payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Document renewal submitted successfully!");
      setSelectedDocForRenew(null);
      setRenewalForm({ fileName: "", fileUrl: "", expiryDate: "", notes: "" });
      queryClient.invalidateQueries({ queryKey: ["hr-document-compliance-summary"] });
      queryClient.invalidateQueries({ queryKey: ["hr-document-compliance-expiring"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to submit document renewal.");
    },
  });

  const handleRefresh = () => {
    refetchSummary();
    refetchExpiring();
    toast.info("Compliance metrics refreshed.");
  };

  const complianceRate = summary?.complianceRate ?? 100;
  const statusCounts = summary?.statusCounts || {
    compliant: 0,
    expiring30: 0,
    expiring15: 0,
    expiring7: 0,
    expired: 0,
    pendingVerification: 0,
    rejected: 0,
    missingMandatory: 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <PageHeader
          title="Document Expiry & Compliance Automation"
          description="Real-time monitoring of workforce mandatory credentials, upcoming expiry milestones, and renewal audits."
        />
        <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-2 shrink-0">
          <RefreshCw className="h-4 w-4" /> Refresh Status
        </Button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Compliance Rate Card */}
        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              Overall Compliance Rate
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
            </CardDescription>
            <CardTitle className="text-3xl font-bold tracking-tight text-emerald-600">
              {isSummaryLoading ? "--%" : `${complianceRate}%`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={complianceRate} className="h-2 mb-2" />
            <p className="text-xs text-muted-foreground">
              {summary?.compliantObligations || 0} of {summary?.totalObligations || 0} required obligations fulfilled
            </p>
          </CardContent>
        </Card>

        {/* Expired Documents Card */}
        <Card className="border-l-4 border-l-rose-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              Expired Documents
              <ShieldAlert className="h-4 w-4 text-rose-500" />
            </CardDescription>
            <CardTitle className="text-3xl font-bold tracking-tight text-rose-600">
              {isSummaryLoading ? "--" : statusCounts.expired}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Past-due documents requiring immediate replacement & re-upload
            </p>
          </CardContent>
        </Card>

        {/* Expiring Soon Card */}
        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              Expiring Soon (&le; 30 Days)
              <Clock className="h-4 w-4 text-amber-500" />
            </CardDescription>
            <CardTitle className="text-3xl font-bold tracking-tight text-amber-600">
              {isSummaryLoading
                ? "--"
                : statusCounts.expiring7 + statusCounts.expiring15 + statusCounts.expiring30}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 text-xs">
              <span className="text-rose-600 font-medium">7d: {statusCounts.expiring7}</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-amber-600 font-medium">15d: {statusCounts.expiring15}</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-blue-600 font-medium">30d: {statusCounts.expiring30}</span>
            </div>
          </CardContent>
        </Card>

        {/* Pending HR Verification & Missing */}
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              Pending & Missing
              <AlertTriangle className="h-4 w-4 text-blue-500" />
            </CardDescription>
            <CardTitle className="text-3xl font-bold tracking-tight text-blue-600">
              {isSummaryLoading ? "--" : statusCounts.pendingVerification + statusCounts.missingMandatory}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 text-xs text-muted-foreground">
              <span>Pending Review: {statusCounts.pendingVerification}</span>
              <span>•</span>
              <span>Missing: {statusCounts.missingMandatory}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Department Compliance Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-5 w-5 text-indigo-500" />
            Department Compliance Distribution
          </CardTitle>
          <CardDescription>
            Mandatory document completion and risk distribution aggregated across organizational departments.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Department</TableHead>
                <TableHead className="text-center">Workforce</TableHead>
                <TableHead className="text-center">Mandatory Obligations</TableHead>
                <TableHead className="text-center">Compliant</TableHead>
                <TableHead className="text-center">Expired / Missing</TableHead>
                <TableHead className="w-48 text-right">Compliance Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isSummaryLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                    Calculating departmental metrics...
                  </TableCell>
                </TableRow>
              ) : summary?.departmentBreakdown?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                    No department data available.
                  </TableCell>
                </TableRow>
              ) : (
                summary?.departmentBreakdown?.map((dept: any, idx: number) => (
                  <TableRow key={dept.departmentId || idx}>
                    <TableCell className="font-medium text-foreground">
                      {dept.departmentName}
                    </TableCell>
                    <TableCell className="text-center text-sm">{dept.employeeCount}</TableCell>
                    <TableCell className="text-center text-sm">{dept.totalObligations}</TableCell>
                    <TableCell className="text-center text-sm text-emerald-600 font-medium">
                      {dept.compliantObligations}
                    </TableCell>
                    <TableCell className="text-center text-sm text-rose-600 font-medium">
                      {dept.expiredCount + dept.missingCount}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Progress value={dept.complianceRate} className="h-2 w-24" />
                        <span className="text-xs font-semibold w-12 text-right">
                          {dept.complianceRate}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Expiring and Actionable Documents Section */}
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-500" />
                Actionable Credentials & Expiry Queue
              </CardTitle>
              <CardDescription>
                Filter credentials requiring HR renewal review, verification, or expiration warnings.
              </CardDescription>
            </div>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employee or document..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 text-sm"
              />
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-2 sm:grid-cols-5 w-full max-w-2xl">
              <TabsTrigger value="all">All Actionable</TabsTrigger>
              <TabsTrigger value="7_days" className="text-rose-600">Urgent (&le; 7d)</TabsTrigger>
              <TabsTrigger value="15_days" className="text-amber-600">&le; 15 Days</TabsTrigger>
              <TabsTrigger value="30_days" className="text-blue-600">&le; 30 Days</TabsTrigger>
              <TabsTrigger value="expired" className="text-rose-700 font-semibold">Expired</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Document</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead>Timeline Status</TableHead>
                <TableHead>Lifecycle State</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isExpiringLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Loading expiring credentials...
                  </TableCell>
                </TableRow>
              ) : expiringData?.items?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No documents matching the selected filter.
                  </TableCell>
                </TableRow>
              ) : (
                expiringData?.items?.map((item: any) => {
                  const empName = item.employee
                    ? `${item.employee.firstName || ""} ${item.employee.lastName || ""}`.trim()
                    : "Unassigned";

                  const isExpired = item.isExpired;
                  const daysRemaining = item.daysRemaining;

                  let timelineBadge = null;
                  if (isExpired) {
                    timelineBadge = (
                      <Badge variant="destructive" className="gap-1">
                        <FileX className="h-3 w-3" /> Expired {Math.abs(daysRemaining || 0)}d ago
                      </Badge>
                    );
                  } else if (daysRemaining !== null && daysRemaining <= 7) {
                    timelineBadge = (
                      <Badge className="bg-rose-500 hover:bg-rose-600 text-white gap-1">
                        <AlertTriangle className="h-3 w-3" /> Expires in {daysRemaining}d
                      </Badge>
                    );
                  } else if (daysRemaining !== null && daysRemaining <= 15) {
                    timelineBadge = (
                      <Badge className="bg-amber-500 hover:bg-amber-600 text-white gap-1">
                        <Clock className="h-3 w-3" /> Expires in {daysRemaining}d
                      </Badge>
                    );
                  } else if (daysRemaining !== null) {
                    timelineBadge = (
                      <Badge variant="outline" className="text-blue-600 border-blue-200 gap-1">
                        <Clock className="h-3 w-3" /> Expires in {daysRemaining}d
                      </Badge>
                    );
                  }

                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        <div>{empName}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {item.employee?.employeeCode || "—"} • {item.employee?.department?.name || "General"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{item.title}</div>
                        <div className="text-xs text-muted-foreground font-mono">{item.documentCode}</div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell>{timelineBadge}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={
                            item.status === "verified"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : item.status === "pending_verification"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : item.status === "rejected"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-gray-100 text-gray-700"
                          }
                        >
                          {item.status.replace(/_/g, " ").toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {item.fileUrl && (
                            <a href={item.fileUrl} target="_blank" rel="noreferrer" title="View Document">
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <ExternalLink className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </a>
                          )}

                          {item.status === "pending_verification" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-emerald-600 hover:text-emerald-700 gap-1"
                                onClick={() => verifyMutation.mutate(item.id)}
                                disabled={verifyMutation.isPending}
                              >
                                <FileCheck className="h-3.5 w-3.5" /> Verify
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-rose-600 hover:text-rose-700"
                                onClick={() => {
                                  setSelectedDocForReject(item);
                                  setRejectionReason("");
                                }}
                              >
                                Reject
                              </Button>
                            </>
                          )}

                          <Button
                            size="sm"
                            variant="default"
                            className="h-8 gap-1"
                            onClick={() => {
                              setSelectedDocForRenew(item);
                              setRenewalForm({
                                fileName: "",
                                fileUrl: "",
                                expiryDate: "",
                                notes: "",
                              });
                            }}
                          >
                            <UploadCloud className="h-3.5 w-3.5" /> Renew
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Renew Document Modal */}
      <Dialog
        open={!!selectedDocForRenew}
        onOpenChange={(open) => !open && setSelectedDocForRenew(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UploadCloud className="h-5 w-5 text-indigo-600" />
              Renew Document
            </DialogTitle>
            <DialogDescription>
              Upload or attach the renewed document for{" "}
              <strong>{selectedDocForRenew?.title}</strong> ({selectedDocForRenew?.documentCode}).
              The existing document will be superseded and preserved in audit records.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="renew-fileName">Document File Name *</Label>
              <Input
                id="renew-fileName"
                placeholder="e.g. passport-2027-renewal.pdf"
                value={renewalForm.fileName}
                onChange={(e) => setRenewalForm({ ...renewalForm, fileName: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="renew-fileUrl">Document Storage URL *</Label>
              <Input
                id="renew-fileUrl"
                placeholder="https://storage.masterhrms.com/documents/..."
                value={renewalForm.fileUrl}
                onChange={(e) => setRenewalForm({ ...renewalForm, fileUrl: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="renew-expiryDate">New Expiry Date *</Label>
              <Input
                id="renew-expiryDate"
                type="date"
                value={renewalForm.expiryDate}
                onChange={(e) => setRenewalForm({ ...renewalForm, expiryDate: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="renew-notes">Renewal Notes (Optional)</Label>
              <Input
                id="renew-notes"
                placeholder="e.g. Renewed via official passport portal, verified physically."
                value={renewalForm.notes}
                onChange={(e) => setRenewalForm({ ...renewalForm, notes: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedDocForRenew(null)}>
              Cancel
            </Button>
            <Button
              disabled={
                (!renewalForm.fileUrl && !renewalForm.fileName) ||
                !renewalForm.expiryDate ||
                renewMutation.isPending
              }
              onClick={() => {
                if (!selectedDocForRenew) return;
                renewMutation.mutate({
                  docId: selectedDocForRenew.id,
                  payload: renewalForm,
                });
              }}
            >
              {renewMutation.isPending ? "Submitting..." : "Submit Renewal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Document Modal */}
      <Dialog
        open={!!selectedDocForReject}
        onOpenChange={(open) => !open && setSelectedDocForReject(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-rose-600 flex items-center gap-2">
              <FileX className="h-5 w-5" />
              Reject Document Verification
            </DialogTitle>
            <DialogDescription>
              Provide an explicit reason for rejecting document{" "}
              <strong>{selectedDocForReject?.documentCode}</strong>. The employee will receive an automated notification to upload a replacement.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <Label htmlFor="rejection-reason">Rejection Reason *</Label>
            <Input
              id="rejection-reason"
              placeholder="e.g. Scanned copy is illegible / expiration date mismatch."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedDocForReject(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectionReason.trim() || rejectMutation.isPending}
              onClick={() => {
                if (!selectedDocForReject) return;
                rejectMutation.mutate({
                  docId: selectedDocForReject.id,
                  reason: rejectionReason,
                });
              }}
            >
              {rejectMutation.isPending ? "Rejecting..." : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
