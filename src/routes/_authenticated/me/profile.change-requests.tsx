import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
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
  Plus,
  Send,
  Eye,
  Edit,
  Trash2,
  UploadCloud,
  FileCheck,
  Building,
  RefreshCw,
  Info,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/me/profile/change-requests" as any)({
  component: ProfileChangeRequestsPage,
  head: () => ({
    meta: [{ title: "Profile Change Requests — Master HRMS" }],
  }),
});

interface ChangeRequestItem {
  id: string;
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
}

export function ProfileChangeRequestsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal states
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ChangeRequestItem | null>(null);

  // Form state
  const [formCategory, setFormCategory] = useState<string>("personal");
  const [formChanges, setFormChanges] = useState<Record<string, any>>({});
  const [formReason, setFormReason] = useState("");
  const [formProofMediaId, setFormProofMediaId] = useState("");
  const [formIsDraft, setFormIsDraft] = useState(false);
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);

  // Query change requests
  const { data: responseData, isLoading, refetch } = useQuery({
    queryKey: ["my-profile-change-requests", activeTab, selectedCategory],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeTab !== "ALL") params.append("status", activeTab);
      if (selectedCategory !== "ALL") params.append("category", selectedCategory);
      const res = await api.get(`/me/profile/change-requests?${params.toString()}`);
      return res.data || res;
    },
  });

  const requests: ChangeRequestItem[] = responseData?.data || responseData || [];

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editingRequestId) {
        return await api.put(`/me/profile/change-requests/${editingRequestId}`, payload);
      }
      return await api.post("/me/profile/change-requests", payload);
    },
    onSuccess: (data: any) => {
      toast.success(data?.message || "Change request processed successfully");
      setIsNewRequestOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["my-profile-change-requests"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to submit request");
    },
  });

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      return await api.delete(`/me/profile/change-requests/${id}`, { data: { reason } });
    },
    onSuccess: () => {
      toast.success("Request cancelled successfully");
      setIsDetailsOpen(false);
      queryClient.invalidateQueries({ queryKey: ["my-profile-change-requests"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to cancel request");
    },
  });

  const resetForm = () => {
    setFormCategory("personal");
    setFormChanges({});
    setFormReason("");
    setFormProofMediaId("");
    setFormIsDraft(false);
    setEditingRequestId(null);
  };

  const handleOpenNew = () => {
    resetForm();
    setIsNewRequestOpen(true);
  };

  const handleOpenEdit = (item: ChangeRequestItem) => {
    setEditingRequestId(item.id);
    setFormCategory(item.fieldCategory);
    setFormChanges(item.newValues || {});
    setFormReason(item.reason || "");
    setFormProofMediaId(item.proofMediaId || "");
    setIsNewRequestOpen(true);
  };

  const handleFieldChange = (field: string, value: any) => {
    setFormChanges((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (asDraft: boolean) => {
    if (Object.keys(formChanges).length === 0) {
      toast.error("Please fill in at least one field to request a change.");
      return;
    }

    submitMutation.mutate({
      category: formCategory,
      changes: formChanges,
      reason: formReason,
      proofMediaId: formProofMediaId || undefined,
      isDraft: asDraft,
      submitNow: !asDraft,
    });
  };

  // Metrics calculation
  const totalCount = requests.length;
  const pendingCount = requests.filter((r) => r.status === "PENDING" || r.status === "SUBMITTED").length;
  const correctionCount = requests.filter((r) => r.status === "CORRECTION_REQUESTED").length;
  const approvedCount = requests.filter((r) => r.status === "APPROVED").length;
  const draftCount = requests.filter((r) => r.status === "DRAFT").length;

  const filteredRequests = requests.filter((r) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesCat = r.fieldCategory.toLowerCase().includes(q);
      const matchesReason = r.reason?.toLowerCase().includes(q);
      return matchesCat || matchesReason;
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <Badge variant="default" className="bg-emerald-500/15 text-emerald-700 border-emerald-300">Approved</Badge>;
      case "PENDING":
      case "SUBMITTED":
        return <Badge variant="outline" className="bg-amber-500/15 text-amber-700 border-amber-300">Pending Review</Badge>;
      case "CORRECTION_REQUESTED":
        return <Badge variant="outline" className="bg-purple-500/15 text-purple-700 border-purple-300 animate-pulse">Action Required</Badge>;
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

  return (
    <div className="flex-1 space-y-6 p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Profile Change Requests"
        description="Submit and track self-service updates for personal, banking, address, and statutory information."
        breadcrumbs={[
          { label: "My Profile", href: "/me/profile" },
          { label: "Change Requests" },
        ]}
        actions={
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button size="sm" onClick={handleOpenNew} className="bg-primary text-primary-foreground">
              <Plus className="h-4 w-4 mr-2" />
              New Change Request
            </Button>
          </div>
        }
      />

      {/* Info notice about official master record governance */}
      <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 text-sm text-blue-900 flex items-start gap-3">
        <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold">Governance Notice:</span> Submitting a request does not immediately update your official employee master record. All submitted changes undergo verification by your Reporting Manager and HR before official records are updated atomically.
        </div>
      </div>

      {/* Stat KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Total Requests" value={totalCount} variant="default" />
        <StatCard label="Pending Review" value={pendingCount} variant="warning" />
        <StatCard label="Action Required" value={correctionCount} variant="purple" />
        <StatCard label="Approved" value={approvedCount} variant="success" />
        <StatCard label="Drafts" value={draftCount} variant="secondary" />
      </div>

      {/* Filter Toolbar */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <Button
              variant={activeTab === "ALL" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("ALL")}
            >
              All
            </Button>
            <Button
              variant={activeTab === "PENDING" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("PENDING")}
            >
              Pending ({pendingCount})
            </Button>
            <Button
              variant={activeTab === "CORRECTION_REQUESTED" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("CORRECTION_REQUESTED")}
              className={correctionCount > 0 ? "border-purple-500 text-purple-700" : ""}
            >
              Needs Correction ({correctionCount})
            </Button>
            <Button
              variant={activeTab === "APPROVED" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("APPROVED")}
            >
              Approved ({approvedCount})
            </Button>
            <Button
              variant={activeTab === "DRAFT" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("DRAFT")}
            >
              Drafts ({draftCount})
            </Button>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[180px] h-9">
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

            <Input
              placeholder="Search requests..."
              className="w-full md:w-64 h-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Requests Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Request History & Tracking</CardTitle>
          <CardDescription>View the status, approval trail, and comments on your requests.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground uppercase text-xs border-b">
                <tr>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">Proposed Changes</th>
                  <th className="px-6 py-3">Document Proof</th>
                  <th className="px-6 py-3">Submitted</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Feedback / Notes</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-muted-foreground">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                      Loading change requests...
                    </td>
                  </tr>
                ) : filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-muted-foreground">
                      <FileText className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                      No change requests found in this view.
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-medium whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="p-1.5 rounded-md bg-muted border border-border">
                            {getCategoryIcon(item.fieldCategory)}
                          </span>
                          <span className="capitalize">{item.fieldCategory.replace("_", " ")}</span>
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
                      <td className="px-6 py-4 text-xs max-w-xs truncate text-muted-foreground">
                        {item.reviewComments || item.reason || "—"}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedRequest(item);
                              setIsDetailsOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>

                          {(item.status === "DRAFT" || item.status === "CORRECTION_REQUESTED") && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenEdit(item)}
                              className="text-purple-700 border-purple-300"
                            >
                              <Edit className="h-3.5 w-3.5 mr-1" />
                              {item.status === "CORRECTION_REQUESTED" ? "Respond" : "Edit"}
                            </Button>
                          )}

                          {(item.status === "DRAFT" || item.status === "PENDING" || item.status === "CORRECTION_REQUESTED") && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                              onClick={() => {
                                if (confirm("Are you sure you want to cancel this change request?")) {
                                  cancelMutation.mutate({ id: item.id });
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* New/Edit Request Dialog */}
      <Dialog open={isNewRequestOpen} onOpenChange={setIsNewRequestOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRequestId ? "Edit Change Request" : "Submit Profile Change Request"}
            </DialogTitle>
            <DialogDescription>
              Select a category and specify the updated details. Proof documents are recommended for all updates.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            {/* Category Selector */}
            <div className="space-y-2">
              <Label>Request Category</Label>
              <Select
                value={formCategory}
                onValueChange={(val) => {
                  setFormCategory(val);
                  setFormChanges({});
                }}
                disabled={Boolean(editingRequestId)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">👤 Personal Information</SelectItem>
                  <SelectItem value="address">🏠 Address Details</SelectItem>
                  <SelectItem value="emergency_contact">🚨 Emergency Contact</SelectItem>
                  <SelectItem value="banking">🏦 Banking Details (Sensitive)</SelectItem>
                  <SelectItem value="tax_identity">🆔 Tax & Statutory Identity</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Dynamic Category Forms */}
            {formCategory === "personal" && (
              <div className="grid grid-cols-2 gap-4 border rounded-lg p-4 bg-muted/20">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input
                    value={formChanges.firstName || ""}
                    onChange={(e) => handleFieldChange("firstName", e.target.value)}
                    placeholder="e.g. John"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input
                    value={formChanges.lastName || ""}
                    onChange={(e) => handleFieldChange("lastName", e.target.value)}
                    placeholder="e.g. Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date of Birth</Label>
                  <Input
                    type="date"
                    value={formChanges.dateOfBirth || ""}
                    onChange={(e) => handleFieldChange("dateOfBirth", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <Select
                    value={formChanges.gender || "male"}
                    onValueChange={(v) => handleFieldChange("gender", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Contact Phone</Label>
                  <Input
                    value={formChanges.phone || ""}
                    onChange={(e) => handleFieldChange("phone", e.target.value)}
                    placeholder="+91 98765 43210"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Marital Status</Label>
                  <Select
                    value={formChanges.maritalStatus || "single"}
                    onValueChange={(v) => handleFieldChange("maritalStatus", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single</SelectItem>
                      <SelectItem value="married">Married</SelectItem>
                      <SelectItem value="divorced">Divorced</SelectItem>
                      <SelectItem value="widowed">Widowed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Blood Group</Label>
                  <Select
                    value={formChanges.bloodGroup || "O+"}
                    onValueChange={(v) => handleFieldChange("bloodGroup", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A+">A+</SelectItem>
                      <SelectItem value="A-">A-</SelectItem>
                      <SelectItem value="B+">B+</SelectItem>
                      <SelectItem value="B-">B-</SelectItem>
                      <SelectItem value="AB+">AB+</SelectItem>
                      <SelectItem value="AB-">AB-</SelectItem>
                      <SelectItem value="O+">O+</SelectItem>
                      <SelectItem value="O-">O-</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Father / Spouse Name</Label>
                  <Input
                    value={formChanges.fatherOrSpouseName || ""}
                    onChange={(e) => handleFieldChange("fatherOrSpouseName", e.target.value)}
                  />
                </div>
              </div>
            )}

            {formCategory === "address" && (
              <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
                <div className="space-y-2">
                  <Label>Address Line 1</Label>
                  <Input
                    value={formChanges.addressLine1 || ""}
                    onChange={(e) => handleFieldChange("addressLine1", e.target.value)}
                    placeholder="House/Flat number, Street name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Address Line 2 (Optional)</Label>
                  <Input
                    value={formChanges.addressLine2 || ""}
                    onChange={(e) => handleFieldChange("addressLine2", e.target.value)}
                    placeholder="Apartment, Landmark"
                  />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input
                      value={formChanges.city || ""}
                      onChange={(e) => handleFieldChange("city", e.target.value)}
                      placeholder="City"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>District</Label>
                    <Input
                      value={formChanges.district || ""}
                      onChange={(e) => handleFieldChange("district", e.target.value)}
                      placeholder="District"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>State</Label>
                    <Input
                      value={formChanges.state || ""}
                      onChange={(e) => handleFieldChange("state", e.target.value)}
                      placeholder="State"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Postal Code</Label>
                    <Input
                      value={formChanges.postalCode || ""}
                      onChange={(e) => handleFieldChange("postalCode", e.target.value)}
                      placeholder="e.g. 560001"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Permanent Address (Full text)</Label>
                  <Textarea
                    rows={2}
                    value={formChanges.permanentAddress || ""}
                    onChange={(e) => handleFieldChange("permanentAddress", e.target.value)}
                    placeholder="Enter complete permanent residential address"
                  />
                </div>
              </div>
            )}

            {formCategory === "emergency_contact" && (
              <div className="grid grid-cols-2 gap-4 border rounded-lg p-4 bg-muted/20">
                <div className="space-y-2 col-span-2">
                  <Label>Emergency Contact Full Name</Label>
                  <Input
                    value={formChanges.emergencyContactName || ""}
                    onChange={(e) => handleFieldChange("emergencyContactName", e.target.value)}
                    placeholder="e.g. Jane Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Relationship</Label>
                  <Input
                    value={formChanges.emergencyContactRelationship || ""}
                    onChange={(e) => handleFieldChange("emergencyContactRelationship", e.target.value)}
                    placeholder="e.g. Spouse, Parent, Sibling"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Emergency Phone Number</Label>
                  <Input
                    value={formChanges.emergencyContactPhone || ""}
                    onChange={(e) => handleFieldChange("emergencyContactPhone", e.target.value)}
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>
            )}

            {formCategory === "banking" && (
              <div className="space-y-4 border border-blue-200 rounded-lg p-4 bg-blue-50/20">
                <div className="text-xs text-blue-800 bg-blue-100/60 p-2 rounded flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-blue-600 shrink-0" />
                  Banking details are protected with field-level security and verified against official passbook/statement proof.
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Bank Name</Label>
                    <Input
                      value={formChanges.bankName || ""}
                      onChange={(e) => handleFieldChange("bankName", e.target.value)}
                      placeholder="e.g. HDFC Bank, ICICI Bank"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Branch Name</Label>
                    <Input
                      value={formChanges.bankBranch || ""}
                      onChange={(e) => handleFieldChange("bankBranch", e.target.value)}
                      placeholder="e.g. Indiranagar, Bangalore"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Account Number</Label>
                    <Input
                      value={formChanges.bankAccount || ""}
                      onChange={(e) => handleFieldChange("bankAccount", e.target.value)}
                      placeholder="Enter new account number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>IFSC Code</Label>
                    <Input
                      value={formChanges.bankIfsc || ""}
                      onChange={(e) => handleFieldChange("bankIfsc", e.target.value.toUpperCase())}
                      placeholder="e.g. HDFC0001234"
                    />
                  </div>
                </div>
              </div>
            )}

            {formCategory === "tax_identity" && (
              <div className="grid grid-cols-2 gap-4 border rounded-lg p-4 bg-muted/20">
                <div className="space-y-2">
                  <Label>Permanent Account Number (PAN)</Label>
                  <Input
                    value={formChanges.pan || ""}
                    onChange={(e) => handleFieldChange("pan", e.target.value.toUpperCase())}
                    placeholder="e.g. ABCDE1234F"
                    maxLength={10}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Aadhaar Number</Label>
                  <Input
                    value={formChanges.aadhaar || ""}
                    onChange={(e) => handleFieldChange("aadhaar", e.target.value)}
                    placeholder="12 digit Aadhaar"
                    maxLength={14}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Universal Account Number (UAN)</Label>
                  <Input
                    value={formChanges.uan || ""}
                    onChange={(e) => handleFieldChange("uan", e.target.value)}
                    placeholder="12 digit UAN"
                  />
                </div>
                <div className="space-y-2">
                  <Label>ESI Number</Label>
                  <Input
                    value={formChanges.esiNumber || ""}
                    onChange={(e) => handleFieldChange("esiNumber", e.target.value)}
                    placeholder="e.g. 31000123450000001"
                  />
                </div>
              </div>
            )}

            {/* Proof Attachment */}
            <div className="space-y-2">
              <Label>Supporting Document Proof Media ID (Optional / Recommended)</Label>
              <div className="flex gap-2">
                <Input
                  value={formProofMediaId}
                  onChange={(e) => setFormProofMediaId(e.target.value)}
                  placeholder="Paste Media ID from file manager or uploads"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                For banking or statutory identity updates, an uploaded cancelled cheque or ID document is required for verification.
              </p>
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label>Reason / Justification for Request</Label>
              <Textarea
                rows={2}
                value={formReason}
                onChange={(e) => setFormReason(e.target.value)}
                placeholder="Explain why this profile information needs updating..."
              />
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between">
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleSubmit(true)}
              disabled={submitMutation.isPending}
            >
              Save as Draft
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsNewRequestOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => handleSubmit(false)}
                disabled={submitMutation.isPending}
              >
                {submitMutation.isPending ? "Submitting..." : "Submit for Approval"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details & Diff Modal */}
      {selectedRequest && (
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className="capitalize">{selectedRequest.fieldCategory.replace("_", " ")} Request Details</span>
                {getStatusBadge(selectedRequest.status)}
              </DialogTitle>
              <DialogDescription>
                Submitted on {format(new Date(selectedRequest.createdAt), "MMMM d, yyyy 'at' h:mm a")}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              {/* Reviewer feedback highlight if correction requested or rejected */}
              {(selectedRequest.status === "CORRECTION_REQUESTED" || selectedRequest.status === "REJECTED") && selectedRequest.reviewComments && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-900">
                  <span className="font-semibold block mb-1">
                    {selectedRequest.status === "CORRECTION_REQUESTED" ? "Reviewer Requested Corrections:" : "Rejection Reason:"}
                  </span>
                  {selectedRequest.reviewComments}
                </div>
              )}

              {/* Side-by-side Before & After comparison card */}
              <div className="grid grid-cols-2 gap-4 border rounded-lg p-4 bg-muted/20">
                <div>
                  <h4 className="text-xs uppercase font-semibold text-muted-foreground mb-2">Previous Official Value</h4>
                  {selectedRequest.oldValues && Object.keys(selectedRequest.oldValues).length > 0 ? (
                    <div className="space-y-1.5 text-xs">
                      {Object.entries(selectedRequest.oldValues).map(([k, v]) => (
                        <div key={k} className="flex justify-between border-b pb-1">
                          <span className="font-medium text-muted-foreground">{k}:</span>
                          <span className="font-mono text-foreground">{String(v ?? "—")}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">No prior data recorded</span>
                  )}
                </div>

                <div>
                  <h4 className="text-xs uppercase font-semibold text-primary mb-2">Requested New Value</h4>
                  {selectedRequest.newValues && Object.keys(selectedRequest.newValues).length > 0 ? (
                    <div className="space-y-1.5 text-xs">
                      {Object.entries(selectedRequest.newValues).map(([k, v]) => (
                        <div key={k} className="flex justify-between border-b pb-1 bg-primary/5 px-1 rounded">
                          <span className="font-medium text-foreground">{k}:</span>
                          <span className="font-mono text-primary font-semibold">{String(v ?? "—")}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">No fields specified</span>
                  )}
                </div>
              </div>

              {/* Reason */}
              {selectedRequest.reason && (
                <div className="text-xs">
                  <span className="font-semibold text-muted-foreground">Employee Reason:</span>
                  <p className="mt-0.5 text-foreground">{selectedRequest.reason}</p>
                </div>
              )}

              {/* Document Proof info */}
              {selectedRequest.proofMediaId && (
                <div className="text-xs flex items-center gap-2 p-2 rounded bg-muted/40 border">
                  <FileCheck className="h-4 w-4 text-blue-600" />
                  <span>Document Proof Attached (Media ID: <code className="font-mono">{selectedRequest.proofMediaId}</code>)</span>
                </div>
              )}
            </div>

            <DialogFooter className="flex items-center justify-between">
              {(selectedRequest.status === "DRAFT" || selectedRequest.status === "PENDING" || selectedRequest.status === "CORRECTION_REQUESTED") && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (confirm("Are you sure you want to cancel this request?")) {
                      cancelMutation.mutate({ id: selectedRequest.id });
                    }
                  }}
                >
                  Cancel Request
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setIsDetailsOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default ProfileChangeRequestsPage;
