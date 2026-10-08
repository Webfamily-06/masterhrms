import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import {
  User,
  Phone,
  Briefcase,
  ShieldCheck,
  Building2,
  Clock,
  Lock,
  Edit2,
  Send,
  Loader2,
  AlertCircle,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/me/profile")({
  component: MyProfilePage,
  head: () => ({
    meta: [{ title: "My Profile — Master HRMS" }],
  }),
});

interface ChangeRequestItem {
  id: string;
  fieldCategory: string;
  fieldKey: string;
  oldValueJson?: string;
  newValueJson?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  reviewComments?: string;
}

export function MyProfilePage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");

  // Direct edit dialog
  const [isDirectEditOpen, setIsDirectEditOpen] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [genderInput, setGenderInput] = useState("male");

  // Change request workflow dialog
  const [isChangeRequestOpen, setIsChangeRequestOpen] = useState(false);
  const [changeCategory, setChangeCategory] = useState("bank");
  const [changeKey, setChangeKey] = useState("bankAccount");
  const [changeValue, setChangeValue] = useState("");

  // Fetch employee profile
  const { data: profileResponse, isLoading, refetch } = useQuery({
    queryKey: ["my-self-profile"],
    queryFn: async () => {
      const res = await api.get("/me/profile");
      return res.data || res;
    },
  });

  const profile = profileResponse;

  // Direct edit mutation
  const directEditMutation = useMutation({
    mutationFn: async (payload: { phone?: string; gender?: string }) => {
      return await api.put("/me/profile", payload);
    },
    onSuccess: () => {
      toast.success("Profile updated successfully!");
      setIsDirectEditOpen(false);
      qc.invalidateQueries({ queryKey: ["my-self-profile"] });
      refetch();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update profile");
    },
  });

  // Change request mutation
  const changeRequestMutation = useMutation({
    mutationFn: async (payload: { fieldCategory: string; fieldKey: string; newValue: any }) => {
      return await api.post("/me/profile/change-requests", payload);
    },
    onSuccess: () => {
      toast.success("Change request submitted to HR for approval.");
      setIsChangeRequestOpen(false);
      setChangeValue("");
      qc.invalidateQueries({ queryKey: ["my-self-profile"] });
      refetch();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to submit change request");
    },
  });

  const handleOpenDirectEdit = () => {
    if (profile) {
      setPhoneInput(profile.phone || "");
      setGenderInput(profile.gender || "male");
      setIsDirectEditOpen(true);
    }
  };

  const handleOpenChangeRequest = (category: string, key: string) => {
    setChangeCategory(category);
    setChangeKey(key);
    setChangeValue("");
    setIsChangeRequestOpen(true);
  };

  const pendingRequests: ChangeRequestItem[] = profile?.pendingChangeRequests || [];

  if (isLoading) {
    return (
      <div className="py-24 text-center text-sm text-muted-foreground">
        Loading employee profile...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="py-16 text-center text-sm text-destructive">
        Unable to load employee profile context.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <PageHeader
        title="My Profile"
        description="View personal employment records, contact channels, and submit official change requests."
        icon={<User className="h-5 w-5" />}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleOpenDirectEdit} className="gap-1.5">
              <Edit2 className="h-3.5 w-3.5" />
              Edit Contact
            </Button>
            <Button
              size="sm"
              onClick={() => handleOpenChangeRequest("bank", "bankAccount")}
              className="gap-1.5"
            >
              <Lock className="h-3.5 w-3.5" />
              Request Profile Change
            </Button>
          </div>
        }
      />

      {/* Header Profile Summary */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary text-xl font-bold">
              {profile.firstName?.slice(0, 1)}
              {profile.lastName?.slice(0, 1)}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-foreground">
                  {profile.fullName}
                </h2>
                <Badge variant="default">{profile.status}</Badge>
                <Badge variant="outline" className="font-mono text-xs">
                  {profile.employeeCode}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {profile.position || profile.designation?.name || "Team Member"} •{" "}
                {profile.department?.name || "General"} • {profile.branch?.name || "HQ Office"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Change Requests Banner */}
      {pendingRequests.length > 0 && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardHeader className="py-3">
            <CardTitle className="text-xs font-semibold text-amber-600 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Pending Profile Change Requests ({pendingRequests.length})
            </CardTitle>
            <CardDescription className="text-xs">
              These changes require HR review and approval before authoritative records update.
            </CardDescription>
          </CardHeader>
          <CardContent className="py-2">
            <div className="divide-y text-xs">
              {pendingRequests.map((req) => (
                <div key={req.id} className="py-2 flex items-center justify-between">
                  <div>
                    <span className="font-semibold uppercase">{req.fieldCategory}: {req.fieldKey}</span>
                    <span className="text-muted-foreground ml-2">
                      (Requested: {req.newValueJson?.replace(/"/g, "")})
                    </span>
                  </div>
                  <Badge variant="outline" className="text-amber-600 border-amber-500">
                    PENDING APPROVAL
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Profile Details Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="overview" className="gap-1.5 text-xs">
            <Briefcase className="h-3.5 w-3.5" />
            Job & Team
          </TabsTrigger>
          <TabsTrigger value="personal" className="gap-1.5 text-xs">
            <Phone className="h-3.5 w-3.5" />
            Personal & Contact
          </TabsTrigger>
          <TabsTrigger value="statutory" className="gap-1.5 text-xs">
            <ShieldCheck className="h-3.5 w-3.5" />
            Statutory & Bank (Masked)
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: JOB & TEAM */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-primary" />
                Employment Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-2">
                <div className="flex justify-between py-1.5 border-b">
                  <span className="text-muted-foreground">Department:</span>
                  <span className="font-medium">{profile.department?.name || "—"}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b">
                  <span className="text-muted-foreground">Designation:</span>
                  <span className="font-medium">{profile.designation?.name || profile.position || "—"}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-muted-foreground">Workplace Facility:</span>
                  <span className="font-medium">{profile.branch?.name || "—"}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between py-1.5 border-b">
                  <span className="text-muted-foreground">Reporting Manager:</span>
                  <span className="font-medium">
                    {profile.manager
                      ? `${profile.manager.firstName} ${profile.manager.lastName}`
                      : "Executive"}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b">
                  <span className="text-muted-foreground">Employment Classification:</span>
                  <span className="font-medium capitalize">{profile.employmentType?.replace("_", " ")}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-muted-foreground">Date of Joining:</span>
                  <span className="font-medium">
                    {profile.joinedAt ? format(new Date(profile.joinedAt), "dd MMMM yyyy") : "—"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: PERSONAL & CONTACT */}
        <TabsContent value="personal" className="space-y-4">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" />
                Contact Information
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={handleOpenDirectEdit} className="h-7 text-xs gap-1">
                <Edit2 className="h-3 w-3" />
                Edit
              </Button>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-2">
                <div className="flex justify-between py-1.5 border-b">
                  <span className="text-muted-foreground">Official Email:</span>
                  <span className="font-medium">{profile.email}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b">
                  <span className="text-muted-foreground">Contact Phone:</span>
                  <span className="font-medium">{profile.phone || "—"}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-muted-foreground">Gender:</span>
                  <span className="font-medium capitalize">{profile.gender || "—"}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between py-1.5 border-b">
                  <span className="text-muted-foreground">Date of Birth:</span>
                  <span className="font-medium">
                    {profile.dateOfBirth ? format(new Date(profile.dateOfBirth), "dd MMM yyyy") : "—"}
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-muted-foreground">Tax Regime:</span>
                  <span className="font-medium uppercase">{profile.taxRegime} Regime</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: STATUTORY & BANK */}
        <TabsContent value="statutory" className="space-y-4">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Lock className="h-4 w-4 text-amber-500" />
                  Statutory Identifiers & Banking Credentials (Masked)
                </CardTitle>
                <CardDescription className="text-xs">
                  Modifying statutory or banking fields requires HR verification and approval.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenChangeRequest("bank", "bankAccount")}
                className="h-7 text-xs gap-1"
              >
                <Send className="h-3 w-3" />
                Request Update
              </Button>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-2">
                <div className="flex justify-between py-1.5 border-b">
                  <span className="text-muted-foreground">PAN:</span>
                  <span className="font-mono font-medium">{profile.statutory?.panMasked || "—"}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b">
                  <span className="text-muted-foreground">Aadhaar:</span>
                  <span className="font-mono font-medium">{profile.statutory?.aadhaarMasked || "—"}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b">
                  <span className="text-muted-foreground">UAN:</span>
                  <span className="font-mono font-medium">{profile.statutory?.uanMasked || "—"}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-muted-foreground">PF Number:</span>
                  <span className="font-mono font-medium">{profile.statutory?.pfNumberMasked || "—"}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between py-1.5 border-b">
                  <span className="text-muted-foreground">Bank Name:</span>
                  <span className="font-medium">{profile.statutory?.bankName || "—"}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b">
                  <span className="text-muted-foreground">Account Number:</span>
                  <span className="font-mono font-medium">{profile.statutory?.bankAccountMasked || "—"}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b">
                  <span className="text-muted-foreground">IFSC Code:</span>
                  <span className="font-mono font-medium">{profile.statutory?.bankIfsc || "—"}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-muted-foreground">Bank Branch:</span>
                  <span className="font-medium">{profile.statutory?.bankBranch || "—"}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* DIRECT EDIT DIALOG (Phone / Gender) */}
      <Dialog open={isDirectEditOpen} onOpenChange={setIsDirectEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Contact Profile</DialogTitle>
            <DialogDescription>
              Directly updates your primary phone number and demographic settings.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-phone">Primary Phone</Label>
              <Input
                id="edit-phone"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="+91 98765 43210"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-gender">Gender</Label>
              <Select value={genderInput} onValueChange={setGenderInput}>
                <SelectTrigger id="edit-gender"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDirectEditOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => directEditMutation.mutate({ phone: phoneInput, gender: genderInput })}
              disabled={directEditMutation.isPending}
            >
              {directEditMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CHANGE REQUEST WORKFLOW DIALOG */}
      <Dialog open={isChangeRequestOpen} onOpenChange={setIsChangeRequestOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Submit Profile Change Request</DialogTitle>
            <DialogDescription>
              Official request will be queued for review and approved by HR administration.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Field Category</Label>
              <Select
                value={changeCategory}
                onValueChange={(val) => {
                  setChangeCategory(val);
                  setChangeKey(val === "bank" ? "bankAccount" : val === "statutory" ? "pan" : "legalName");
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank">Banking Details</SelectItem>
                  <SelectItem value="statutory">Statutory ID (PAN / Aadhaar)</SelectItem>
                  <SelectItem value="personal">Legal Name</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Target Field</Label>
              <Select value={changeKey} onValueChange={setChangeKey}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {changeCategory === "bank" && (
                    <>
                      <SelectItem value="bankAccount">Bank Account Number</SelectItem>
                      <SelectItem value="bankIfsc">Bank IFSC Code</SelectItem>
                      <SelectItem value="bankName">Bank Institution Name</SelectItem>
                      <SelectItem value="bankBranch">Bank Branch</SelectItem>
                    </>
                  )}
                  {changeCategory === "statutory" && (
                    <>
                      <SelectItem value="pan">Permanent Account Number (PAN)</SelectItem>
                      <SelectItem value="aadhaar">Aadhaar Identifier</SelectItem>
                      <SelectItem value="uan">Universal Account Number (UAN)</SelectItem>
                    </>
                  )}
                  {changeCategory === "personal" && (
                    <SelectItem value="legalName">Legal Full Name</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Proposed New Value *</Label>
              <Input
                value={changeValue}
                onChange={(e) => setChangeValue(e.target.value)}
                placeholder="Enter verified new value"
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsChangeRequestOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!changeValue.trim()) {
                  toast.error("Please provide a new value");
                  return;
                }
                changeRequestMutation.mutate({
                  fieldCategory: changeCategory,
                  fieldKey: changeKey,
                  newValue: changeValue.trim(),
                });
              }}
              disabled={changeRequestMutation.isPending}
            >
              {changeRequestMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              Submit to HR
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
