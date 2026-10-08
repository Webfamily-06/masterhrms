import { createFileRoute, redirect } from "@tanstack/react-router";
import { extractRolesFromToken } from "@/lib/auth-navigation";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  User,
  Phone,
  Mail,
  Building,
  Briefcase,
  Shield,
  CreditCard,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
  Eye,
  EyeOff,
  MapPin,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/_app/profile")({
  beforeLoad: () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("hrms_auth_token") : null;
    const { roles } = extractRolesFromToken(token);
    const isHrOrAdmin = roles.some((r) => ["admin", "super_admin", "tenant_admin", "hr_admin", "hr"].includes(r));
    throw redirect({ to: isHrOrAdmin ? "/hr/profile" : "/me/profile" });
  },
  component: EmployeeProfilePage,
});

export default function EmployeeProfilePage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("general");
  const [revealSensitive, setRevealSensitive] = useState(false);

  // Instant edit form state
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");

  // Sensitive change request dialog
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [requestCategory, setRequestCategory] = useState("bank");
  const [requestFieldKey, setRequestFieldKey] = useState("bankAccount");
  const [requestNewValue, setRequestNewValue] = useState("");

  // Fetch full employee self-service profile
  const { data: profileRes, isLoading, error } = useQuery({
    queryKey: ["employee-profile-me"],
    queryFn: async () => {
      return await api.get("/v1/me/profile");
    },
  });

  const emp = profileRes?.data;

  // Sync initial editable fields
  useEffect(() => {
    if (emp) {
      setPhone(emp.phone || "");
      setGender(emp.gender || "");
    }
  }, [emp]);

  // Mutation: Instant non-sensitive update
  const updateProfileMutation = useMutation({
    mutationFn: async (payload: { phone?: string; gender?: string }) => {
      return await api.put("/v1/me/profile", payload);
    },
    onSuccess: () => {
      toast.success("Profile contact information updated successfully.");
      queryClient.invalidateQueries({ queryKey: ["employee-profile-me"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update profile.");
    },
  });

  // Mutation: Submit sensitive change request
  const submitChangeRequestMutation = useMutation({
    mutationFn: async (payload: {
      fieldCategory: string;
      fieldKey: string;
      newValue: string;
    }) => {
      return await api.post("/v1/me/profile/change-requests", payload);
    },
    onSuccess: () => {
      toast.success("Change request submitted for HR approval.");
      setRequestDialogOpen(false);
      setRequestNewValue("");
      queryClient.invalidateQueries({ queryKey: ["employee-profile-me"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to submit change request.");
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !emp) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="mx-auto size-12 text-destructive mb-3" />
        <h2 className="text-xl font-bold">Profile Unavailable</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Unable to resolve an active employee record for your account. Please contact your HR administrator.
        </p>
      </div>
    );
  }

  const handleInstantSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate({ phone, gender });
  };

  const openChangeRequest = (category: string, fieldKey: string) => {
    setRequestCategory(category);
    setRequestFieldKey(fieldKey);
    setRequestNewValue("");
    setRequestDialogOpen(true);
  };

  const handleRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestNewValue.trim()) {
      toast.error("Please enter a new value.");
      return;
    }
    submitChangeRequestMutation.mutate({
      fieldCategory: requestCategory,
      fieldKey: requestFieldKey,
      newValue: requestNewValue.trim(),
    });
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div className="flex items-center gap-4">
          <div className="size-16 sm:size-20 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-2xl uppercase shadow-xs">
            {emp.firstName?.[0]}
            {emp.lastName?.[0]}
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              {emp.fullName}
              <span className="text-xs uppercase font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25">
                {emp.status}
              </span>
            </h1>
            <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
              <span>{emp.position || "Employee"}</span>
              <span>•</span>
              <span className="font-mono text-xs">{emp.employeeCode}</span>
              {emp.department?.name && (
                <>
                  <span>•</span>
                  <span>{emp.department.name}</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Global Mask Toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setRevealSensitive((v) => !v)}
          className="flex items-center gap-2 text-xs"
        >
          {revealSensitive ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          {revealSensitive ? "Hide Masked Values" : "Reveal Masked Values"}
        </Button>
      </div>

      {/* Pending Change Requests Alert Banner */}
      {emp.pendingChangeRequests?.length > 0 && (
        <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 flex items-start gap-3">
          <Clock className="size-5 text-warning shrink-0 mt-0.5" />
          <div className="text-xs flex-1">
            <span className="font-semibold text-warning">
              Pending HR Verification ({emp.pendingChangeRequests.length}):
            </span>{" "}
            You have pending requests to update sensitive records (
            {emp.pendingChangeRequests.map((r: any) => r.fieldKey).join(", ")}). These will reflect once authorized by your HR department.
          </div>
        </div>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="general" className="rounded-lg text-xs font-semibold gap-1.5">
            <User className="size-3.5" />
            General & Contact
          </TabsTrigger>
          <TabsTrigger value="statutory" className="rounded-lg text-xs font-semibold gap-1.5">
            <CreditCard className="size-3.5" />
            Bank & Statutory
          </TabsTrigger>
          <TabsTrigger value="employment" className="rounded-lg text-xs font-semibold gap-1.5">
            <Briefcase className="size-3.5" />
            Employment & Org
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-lg text-xs font-semibold gap-1.5">
            <Clock className="size-3.5" />
            Request History
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: General & Contact */}
        <TabsContent value="general" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Contact Information</CardTitle>
                <CardDescription className="text-xs">
                  Update your immediate personal communication channels.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleInstantSave} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-medium">Work Email</Label>
                    <div className="relative">
                      <Mail className="size-4 absolute left-3 top-2.5 text-muted-foreground" />
                      <Input
                        id="email"
                        value={emp.email || ""}
                        disabled
                        className="pl-9 bg-muted/40 font-mono text-xs"
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground">Managed by IT & Workspace administrator.</span>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-xs font-medium">Mobile Number</Label>
                    <div className="relative">
                      <Phone className="size-4 absolute left-3 top-2.5 text-muted-foreground" />
                      <Input
                        id="phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 9876543210"
                        className="pl-9 text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="gender" className="text-xs font-medium">Gender</Label>
                    <Input
                      id="gender"
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      placeholder="e.g. Female / Male / Other"
                      className="text-xs"
                    />
                  </div>

                  <Button
                    type="submit"
                    size="sm"
                    disabled={updateProfileMutation.isPending}
                    className="w-full text-xs font-semibold mt-2"
                  >
                    {updateProfileMutation.isPending && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
                    Save Contact Details
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Identity & Legal Details</CardTitle>
                  <CardDescription className="text-xs">
                    Legal fields require verification against statutory identity proofs.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/20">
                  <div>
                    <div className="text-muted-foreground">Legal Full Name</div>
                    <div className="font-semibold text-foreground mt-0.5">{emp.fullName}</div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-[11px] h-7"
                    onClick={() => openChangeRequest("personal", "legalName")}
                  >
                    Request Change
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/20">
                  <div>
                    <div className="text-muted-foreground">Date of Birth</div>
                    <div className="font-semibold text-foreground mt-0.5">
                      {emp.dateOfBirth ? new Date(emp.dateOfBirth).toLocaleDateString() : "Not provided"}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-[11px] h-7"
                    onClick={() => openChangeRequest("personal", "dateOfBirth")}
                  >
                    Request Change
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 2: Bank & Statutory */}
        <TabsContent value="statutory" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Bank Account for Payroll</CardTitle>
                  <CardDescription className="text-xs">Direct deposit account for monthly salary disbursements.</CardDescription>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  onClick={() => openChangeRequest("bank", "bankAccount")}
                >
                  Update Account
                </Button>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b border-border/40">
                  <span className="text-muted-foreground">Bank Name</span>
                  <span className="font-semibold">{emp.statutory?.bankName || "Not assigned"}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border/40">
                  <span className="text-muted-foreground">Account Number</span>
                  <span className="font-mono font-semibold">
                    {revealSensitive ? emp.statutory?.bankAccountMasked || "None" : emp.statutory?.bankAccountMasked || "••••••••"}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-border/40">
                  <span className="text-muted-foreground">IFSC Code</span>
                  <span className="font-mono font-semibold">{emp.statutory?.bankIfsc || "None"}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">Branch</span>
                  <span className="font-semibold">{emp.statutory?.bankBranch || "None"}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Statutory Identifiers</CardTitle>
                  <CardDescription className="text-xs">PF, ESI, PAN and government tax registrations.</CardDescription>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  onClick={() => openChangeRequest("statutory", "pan")}
                >
                  Update PAN / UAN
                </Button>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b border-border/40">
                  <span className="text-muted-foreground">Permanent Account Number (PAN)</span>
                  <span className="font-mono font-semibold">
                    {revealSensitive ? emp.statutory?.panMasked || "None" : emp.statutory?.panMasked || "••••••••"}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-border/40">
                  <span className="text-muted-foreground">Aadhaar (UIDAI)</span>
                  <span className="font-mono font-semibold">
                    {revealSensitive ? emp.statutory?.aadhaarMasked || "None" : emp.statutory?.aadhaarMasked || "••••••••"}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-border/40">
                  <span className="text-muted-foreground">Universal Account Number (UAN)</span>
                  <span className="font-mono font-semibold">{emp.statutory?.uanMasked || "None"}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">Tax Regime</span>
                  <span className="uppercase font-semibold px-2 py-0.5 rounded bg-muted text-[10px]">
                    {emp.taxRegime} Regime
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 3: Employment & Org */}
        <TabsContent value="employment" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Organization & Reporting Line</CardTitle>
              <CardDescription className="text-xs">Your official position and branch allocation inside the company.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                <div className="p-3 rounded-lg border border-border/50 bg-muted/20">
                  <div className="text-muted-foreground flex items-center gap-1.5">
                    <Building className="size-3.5" /> Department
                  </div>
                  <div className="font-bold text-sm mt-1">{emp.department?.name || "General"}</div>
                </div>

                <div className="p-3 rounded-lg border border-border/50 bg-muted/20">
                  <div className="text-muted-foreground flex items-center gap-1.5">
                    <Briefcase className="size-3.5" /> Designation
                  </div>
                  <div className="font-bold text-sm mt-1">{emp.designation?.name || emp.position || "Employee"}</div>
                </div>

                <div className="p-3 rounded-lg border border-border/50 bg-muted/20">
                  <div className="text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="size-3.5" /> Work Location / Branch
                  </div>
                  <div className="font-bold text-sm mt-1">{emp.branch?.name || "Main Headquarters"}</div>
                </div>

                <div className="p-3 rounded-lg border border-border/50 bg-muted/20">
                  <div className="text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="size-3.5" /> Joining Date
                  </div>
                  <div className="font-bold text-sm mt-1">
                    {emp.joinedAt ? new Date(emp.joinedAt).toLocaleDateString() : "Not specified"}
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-border/50 bg-muted/20">
                  <div className="text-muted-foreground flex items-center gap-1.5">
                    <Shield className="size-3.5" /> Employment Type
                  </div>
                  <div className="font-bold text-sm mt-1 capitalize">{emp.employmentType?.replace("_", " ")}</div>
                </div>

                <div className="p-3 rounded-lg border border-border/50 bg-muted/20">
                  <div className="text-muted-foreground flex items-center gap-1.5">
                    <User className="size-3.5" /> Reporting Manager
                  </div>
                  <div className="font-bold text-sm mt-1">
                    {emp.manager ? `${emp.manager.firstName} ${emp.manager.lastName}` : "Direct to HR / Leadership"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: Request History */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Self-Service Change Request Log</CardTitle>
              <CardDescription className="text-xs">
                Audit trail of sensitive modifications requested for HR review.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {emp.pendingChangeRequests?.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-xs">
                  No active or past change requests recorded.
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {emp.pendingChangeRequests.map((req: any) => (
                    <div key={req.id} className="py-3 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-foreground flex items-center gap-2">
                          <span className="capitalize">{req.fieldCategory}</span>: {req.fieldKey}
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                              req.status === "APPROVED"
                                ? "bg-emerald-500/10 text-emerald-600"
                                : req.status === "REJECTED"
                                ? "bg-rose-500/10 text-rose-600"
                                : "bg-amber-500/10 text-amber-600"
                            }`}
                          >
                            {req.status}
                          </span>
                        </div>
                        <div className="text-muted-foreground mt-0.5 text-[11px]">
                          Requested: {new Date(req.createdAt).toLocaleString()}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-muted-foreground">New Value</div>
                        <div className="font-mono font-semibold">{req.newValueJson}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Sensitive Field Change Request Modal */}
      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Request Profile Record Modification</DialogTitle>
            <DialogDescription className="text-xs">
              Modifying sensitive records ({requestFieldKey}) requires verification by your HR department.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRequestSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Category</Label>
              <Input value={requestCategory} disabled className="bg-muted text-xs capitalize" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Field to Update</Label>
              <Input value={requestFieldKey} disabled className="bg-muted text-xs font-mono" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="newValue" className="text-xs font-medium">Proposed New Value</Label>
              <Input
                id="newValue"
                value={requestNewValue}
                onChange={(e) => setRequestNewValue(e.target.value)}
                placeholder="Enter new account / ID / legal detail"
                className="text-xs"
                autoFocus
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRequestDialogOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitChangeRequestMutation.isPending}
                className="text-xs font-semibold"
              >
                {submitChangeRequestMutation.isPending && (
                  <Loader2 className="size-3.5 animate-spin mr-1.5" />
                )}
                Submit to HR
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
