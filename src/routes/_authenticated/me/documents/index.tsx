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
  FileText,
  Download,
  Calendar,
  ShieldCheck,
  ShieldAlert,
  Clock,
  AlertTriangle,
  UploadCloud,
  CheckCircle2,
  XCircle,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/me/documents/")({
  component: MeDocumentsPage,
});

export default function MeDocumentsPage() {
  const queryClient = useQueryClient();
  const [selectedDocForRenew, setSelectedDocForRenew] = useState<any | null>(null);
  const [renewalForm, setRenewalForm] = useState({
    fileName: "",
    fileUrl: "",
    expiryDate: "",
    notes: "",
  });

  // 1. Fetch My Documents
  const { data: documents = [], isLoading: isDocsLoading } = useQuery({
    queryKey: ["me-company-documents"],
    queryFn: async () => {
      const res = await api.get("/me/documents");
      return res.data;
    },
  });

  // 2. Fetch My Compliance Status & Checklist
  const { data: compliance, isLoading: isComplianceLoading } = useQuery({
    queryKey: ["me-document-compliance"],
    queryFn: async () => {
      const res = await api.get("/me/documents/compliance");
      return res.data;
    },
  });

  // 3. Renew Mutation
  const renewMutation = useMutation({
    mutationFn: async ({ docId, payload }: { docId: string; payload: any }) => {
      const res = await api.post(`/me/documents/${docId}/renew`, payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Document renewal submitted successfully for HR verification!");
      setSelectedDocForRenew(null);
      setRenewalForm({ fileName: "", fileUrl: "", expiryDate: "", notes: "" });
      queryClient.invalidateQueries({ queryKey: ["me-company-documents"] });
      queryClient.invalidateQueries({ queryKey: ["me-document-compliance"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to submit document renewal.");
    },
  });

  const complianceRate = compliance?.complianceRate ?? 100;
  const now = new Date();

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Documents & Compliance Vault"
        description="Access company handbooks, personal employment credentials, and track your mandatory compliance obligations."
      />

      {/* Compliance Health Banner */}
      {compliance && (
        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-500" />
                  Your Mandatory Document Compliance
                </CardTitle>
                <CardDescription>
                  Fulfilled {compliance.compliantCount} of {compliance.totalRequired} required credentials.
                </CardDescription>
              </div>
              <div className="text-2xl font-bold text-emerald-600">
                {complianceRate}%
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={complianceRate} className="h-2" />

            {/* Checklist Chips */}
            {compliance.checklist && compliance.checklist.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                {compliance.checklist.map((item: any) => {
                  let badge = null;
                  if (item.fulfillmentStatus === "COMPLIANT") {
                    badge = (
                      <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-200 gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Compliant
                      </Badge>
                    );
                  } else if (item.fulfillmentStatus === "EXPIRING_SOON") {
                    badge = (
                      <Badge className="bg-amber-500 hover:bg-amber-600 text-white gap-1">
                        <Clock className="h-3 w-3" /> Expiring Soon
                      </Badge>
                    );
                  } else if (item.fulfillmentStatus === "EXPIRED") {
                    badge = (
                      <Badge variant="destructive" className="gap-1">
                        <XCircle className="h-3 w-3" /> Expired
                      </Badge>
                    );
                  } else if (item.fulfillmentStatus === "PENDING_VERIFICATION") {
                    badge = (
                      <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 gap-1">
                        <Clock className="h-3 w-3" /> In Review
                      </Badge>
                    );
                  } else {
                    badge = (
                      <Badge variant="outline" className="text-rose-600 border-rose-200 gap-1">
                        <AlertTriangle className="h-3 w-3" /> Missing
                      </Badge>
                    );
                  }

                  return (
                    <div
                      key={item.documentTypeId}
                      className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/30 text-xs"
                    >
                      <div className="truncate mr-2">
                        <div className="font-semibold text-foreground truncate">{item.documentTypeName}</div>
                        <div className="text-muted-foreground">{item.documentTypeCode}</div>
                      </div>
                      {badge}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Documents Vault Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-500" />
            My Documents & Credentials ({documents.length})
          </CardTitle>
          <CardDescription>
            Personal files, signed agreements, and uploaded identification documents.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Expiry Status</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isDocsLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Loading documents...
                  </TableCell>
                </TableRow>
              ) : documents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No documents currently recorded in your profile.
                  </TableCell>
                </TableRow>
              ) : (
                documents.map((d: any) => {
                  let expiryBadge = null;
                  let isExpiringOrExpired = false;

                  if (d.expiryDate) {
                    const exp = new Date(d.expiryDate);
                    const diffDays = Math.round((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

                    if (diffDays < 0) {
                      isExpiringOrExpired = true;
                      expiryBadge = (
                        <Badge variant="destructive" className="gap-1">
                          <ShieldAlert className="h-3 w-3" /> Expired ({exp.toLocaleDateString()})
                        </Badge>
                      );
                    } else if (diffDays <= 30) {
                      isExpiringOrExpired = true;
                      expiryBadge = (
                        <Badge className="bg-amber-500 hover:bg-amber-600 text-white gap-1">
                          <Clock className="h-3 w-3" /> Expires in {diffDays}d
                        </Badge>
                      );
                    } else {
                      expiryBadge = (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" /> {exp.toLocaleDateString()}
                        </span>
                      );
                    }
                  } else {
                    expiryBadge = <span className="text-xs text-muted-foreground">No Expiry</span>;
                  }

                  return (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">
                        <div>{d.title}</div>
                        <div className="text-xs text-muted-foreground font-mono">{d.documentCode}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{d.category}</Badge>
                      </TableCell>
                      <TableCell>{expiryBadge}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={
                            d.status === "verified"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : d.status === "pending_verification"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : d.status === "rejected"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : d.status === "superseded"
                              ? "bg-gray-100 text-gray-400"
                              : ""
                          }
                        >
                          {d.status.replace(/_/g, " ").toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {d.fileUrl && (
                            <a href={d.fileUrl} target="_blank" rel="noreferrer" download>
                              <Button variant="outline" size="sm" className="gap-1">
                                <Download className="h-3.5 w-3.5" /> View
                              </Button>
                            </a>
                          )}

                          {isExpiringOrExpired && d.status !== "superseded" && (
                            <Button
                              size="sm"
                              className="gap-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                              onClick={() => {
                                setSelectedDocForRenew(d);
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
                          )}
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
              Submit an updated credential for <strong>{selectedDocForRenew?.title}</strong> ({selectedDocForRenew?.documentCode}).
              Once submitted, HR will review and verify your updated document.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="employee-renew-fileName">File Name *</Label>
              <Input
                id="employee-renew-fileName"
                placeholder="e.g. passport-renewal-2027.pdf"
                value={renewalForm.fileName}
                onChange={(e) => setRenewalForm({ ...renewalForm, fileName: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="employee-renew-fileUrl">Uploaded Document URL *</Label>
              <Input
                id="employee-renew-fileUrl"
                placeholder="https://storage.masterhrms.com/..."
                value={renewalForm.fileUrl}
                onChange={(e) => setRenewalForm({ ...renewalForm, fileUrl: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="employee-renew-expiryDate">New Expiration Date *</Label>
              <Input
                id="employee-renew-expiryDate"
                type="date"
                value={renewalForm.expiryDate}
                onChange={(e) => setRenewalForm({ ...renewalForm, expiryDate: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="employee-renew-notes">Notes for HR (Optional)</Label>
              <Input
                id="employee-renew-notes"
                placeholder="e.g. Renewed passport received yesterday."
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
              {renewMutation.isPending ? "Submitting..." : "Submit for Verification"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
