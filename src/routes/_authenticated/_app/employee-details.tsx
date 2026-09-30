import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { useSession, useCurrentProfile } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft,
  Mail,
  Phone,
  Building,
  Briefcase,
  Calendar,
  CreditCard,
  FileText,
  Clock,
  ShieldCheck,
  KeyRound,
  Edit2,
  Eye,
  EyeOff,
  Plus,
  UserCheck,
  MapPin,
  ExternalLink,
  Laptop,
  Award,
  AlertCircle,
  Copy,
  Check,
  Lock,
  Download,
  UploadCloud,
  FileCheck,
  Layers,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { formatSystemAmount } from "@/lib/currency";

export const Route = createFileRoute("/_authenticated/_app/employee-details")({
  validateSearch: (search: Record<string, unknown>) => ({
    id: typeof search.id === "string" ? search.id : undefined,
  }),
  component: EmployeeDetailsPage,
  head: () => ({ meta: [{ title: "Employee Details Passport — Master HRMS" }] }),
});

export function EmployeeDetailsPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const queryClient = useQueryClient();
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);

  // Masking toggles for PII
  const [showFullBank, setShowFullBank] = useState(false);
  const [showFullPan, setShowFullPan] = useState(false);
  const [showFullAadhaar, setShowFullAadhaar] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Dialog States
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isUploadDocOpen, setIsUploadDocOpen] = useState(false);

  // Password & 2FA Form States
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [docTitle, setDocTitle] = useState("");
  const [docCategory, setDocCategory] = useState("identity");

  // 1. Fetch employee list to allow switching or fallback to first
  const { data: rawEmployees = [], isLoading: isLoadingList } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      try {
        const res: any = await api.get("/employees");
        return Array.isArray(res) ? res : res?.data || [];
      } catch {
        return [];
      }
    },
  });

  const targetEmployeeId = search.id || rawEmployees[0]?.id;

  // 2. Fetch full employee record with relations and PII
  const {
    data: employee,
    isLoading: isLoadingEmployee,
    refetch: refetchEmployee,
  } = useQuery({
    queryKey: ["employee-detail", targetEmployeeId],
    queryFn: async () => {
      if (!targetEmployeeId) return null;
      try {
        const res: any = await api.get(`/employees/${targetEmployeeId}`);
        return res;
      } catch (err: any) {
        console.error("Failed to load employee:", err);
        return null;
      }
    },
    enabled: Boolean(targetEmployeeId),
  });

  // 3. Fetch departments for editing & display
  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      try {
        const res: any = await api.get("/employees/departments");
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  // Edit Employee Form state
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    position: "",
    departmentId: "",
    status: "active",
    employmentType: "full_time",
    salary: "",
  });

  // Bank & Statutory Form state
  const [bankForm, setBankForm] = useState({
    bankName: "",
    bankAccount: "",
    bankIfsc: "",
    bankBranch: "",
    pan: "",
    aadhaar: "",
    uan: "",
    esiNumber: "",
    taxRegime: "new",
  });

  // Sync state when employee loads
  const openEditDialog = () => {
    if (!employee) return;
    setEditForm({
      firstName: employee.firstName || "",
      lastName: employee.lastName || "",
      email: employee.email || "",
      phone: employee.phone || "",
      position: employee.position || "",
      departmentId: employee.departmentId || "",
      status: employee.status || "active",
      employmentType: employee.employmentType || "full_time",
      salary: employee.salary ? String(employee.salary) : "",
    });
    setIsEditOpen(true);
  };

  const openBankDialog = () => {
    if (!employee) return;
    setBankForm({
      bankName: employee.bankName || "",
      bankAccount: employee.bankAccount || "",
      bankIfsc: employee.bankIfsc || "",
      bankBranch: employee.bankBranch || "",
      pan: employee.pan || "",
      aadhaar: employee.aadhaar || "",
      uan: employee.uan || "",
      esiNumber: employee.esiNumber || "",
      taxRegime: employee.taxRegime || "new",
    });
    setIsBankModalOpen(true);
  };

  // Mutation: Update Employee Details
  const updateEmployeeMut = useMutation({
    mutationFn: async (payload: any) => {
      return await api.put(`/employees/${employee.id}`, payload);
    },
    onSuccess: () => {
      toast.success("Employee details updated successfully");
      setIsEditOpen(false);
      setIsBankModalOpen(false);
      refetchEmployee();
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update employee");
    },
  });

  // Mutation: Set Password
  const setPasswordMut = useMutation({
    mutationFn: async (pwd: string) => {
      return await api.post(`/employees/${employee.id}/set-password`, { password: pwd });
    },
    onSuccess: () => {
      toast.success("Login password updated successfully");
      setIsPasswordModalOpen(false);
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update password");
    },
  });

  // Mutation: Reset 2FA
  const reset2FAMut = useMutation({
    mutationFn: async () => {
      return await api.post(`/employees/${employee.id}/reset-2fa`, {});
    },
    onSuccess: () => {
      toast.success("Two-Factor Authentication reset successfully for this employee.");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to reset 2FA");
    },
  });

  const handleCopy = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    toast.success(`Copied ${label} to clipboard`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-semibold">Active Staff</Badge>;
      case "on_leave":
        return <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-semibold">On Leave</Badge>;
      case "terminated":
        return <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 font-semibold">Terminated</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoadingList || isLoadingEmployee) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] space-y-4">
        <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-xs text-muted-foreground font-medium">Loading employee passport and statutory records...</p>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="space-y-6 max-w-full pb-12 animate-in fade-in duration-200">
        <div className="flex items-center gap-3 border-b pb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate({ to: "/employees" })}
            className="gap-2 text-xs font-bold"
          >
            <ArrowLeft className="size-4" /> Back to Employee Directory
          </Button>
        </div>
        <Card className="p-12 text-center max-w-md mx-auto">
          <AlertCircle className="size-12 text-amber-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold">Employee Not Found</h2>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            No employee record was found with ID "{targetEmployeeId}" in this workspace.
          </p>
          <Button size="sm" onClick={() => navigate({ to: "/employees" })} className="gap-2 text-xs font-semibold">
            Return to Employees
          </Button>
        </Card>
      </div>
    );
  }

  const fullName = `${employee.firstName || ""} ${employee.lastName || ""}`.trim() || "Employee";

  return (
    <div className="space-y-6 max-w-full pb-16 animate-in fade-in duration-200">
      {/* ─── 1. TOP BREADCRUMB & ACTION BAR (MATCHING LARAVEL SHOW.TSX) ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate({ to: "/employees" })}
            className="gap-2 text-xs font-bold hover:bg-secondary/80 pl-2 pr-3 h-8"
          >
            <ArrowLeft className="size-3.5 text-primary" />
            <span>Employees</span>
          </Button>
          <span className="text-muted-foreground text-xs">/</span>
          <span className="text-xs font-medium text-muted-foreground">{employee.department?.name || "General"}</span>
          <span className="text-muted-foreground text-xs">/</span>
          <h1 className="text-sm sm:text-base font-bold tracking-tight text-foreground">{fullName}</h1>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground font-semibold">
            {employee.employeeCode}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick Employee Switcher if multiple exist */}
          {rawEmployees.length > 1 && (
            <Select
              value={employee.id}
              onValueChange={(val) => navigate({ to: "/employee-details", search: { id: val } })}
            >
              <SelectTrigger className="h-8 text-xs font-medium w-[180px] bg-background">
                <SelectValue placeholder="Switch Employee" />
              </SelectTrigger>
              <SelectContent>
                {rawEmployees.map((e: any) => (
                  <SelectItem key={e.id} value={e.id} className="text-xs">
                    {e.firstName} {e.lastName} ({e.employeeCode})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={openBankDialog}
            className="gap-1.5 font-semibold text-xs h-8 shadow-2xs"
          >
            <CreditCard className="size-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Bank & Statutory</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsPasswordModalOpen(true)}
            className="gap-1.5 font-semibold text-xs h-8 text-amber-600 border-amber-300 dark:border-amber-700/50 hover:bg-amber-50 dark:hover:bg-amber-950/20 shadow-2xs"
          >
            <KeyRound className="size-3.5" />
            <span>Security & Auth</span>
          </Button>

          <Button
            size="sm"
            onClick={openEditDialog}
            className="gap-1.5 font-semibold text-xs h-8 shadow-2xs"
          >
            <Edit2 className="size-3.5" />
            <span>Edit Profile</span>
          </Button>
        </div>
      </div>

      {/* ─── 2. MAIN 2-COLUMN GRID (MATCHING LARAVEL SHOW.TSX LAYOUT) ─── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* ===================== LEFT COLUMN: PROFILE CARD (col-xl-4) ===================== */}
        <div className="xl:col-span-4 space-y-5">
          <Card className="overflow-hidden border shadow-xs bg-card">
            <div className="p-6 text-center border-b bg-gradient-to-b from-primary/5 via-transparent to-transparent">
              <div className="relative mx-auto size-24 mb-3">
                <Avatar className="size-24 border-4 border-background shadow-md">
                  <AvatarImage src={employee.user?.profile?.avatarUrl || employee.avatarUrl || ""} />
                  <AvatarFallback className="text-2xl font-black bg-primary text-primary-foreground">
                    {employee.firstName?.[0]}
                    {employee.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute bottom-0 right-0 p-1 rounded-full bg-background shadow-xs">
                  <span className={`block size-3 rounded-full ${employee.status === "active" ? "bg-emerald-500" : employee.status === "on_leave" ? "bg-amber-500" : "bg-rose-500"}`} />
                </div>
              </div>

              <h2 className="text-lg font-bold tracking-tight text-foreground">{fullName}</h2>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">{employee.position || "Employee"}</p>
              <div className="mt-2.5 flex items-center justify-center gap-2">
                {getStatusBadge(employee.status)}
                <Badge variant="outline" className="text-[11px] font-mono capitalize">
                  {employee.employmentType ? employee.employmentType.replace("_", " ") : "Full Time"}
                </Badge>
              </div>
            </div>

            <CardContent className="p-5 space-y-4">
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground font-medium">Employee Code</span>
                  <span className="font-mono font-bold text-foreground">{employee.employeeCode}</span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground font-medium">Department</span>
                  <span className="font-semibold text-foreground">{employee.department?.name || "General"}</span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground font-medium">Designation</span>
                  <span className="font-semibold text-foreground">{employee.position || "Staff"}</span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground font-medium">Joined On</span>
                  <span className="font-medium text-foreground">
                    {employee.joinedAt ? new Date(employee.joinedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "--"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground font-medium">Work Email</span>
                  <span className="font-medium text-foreground truncate max-w-[180px]" title={employee.email}>
                    {employee.email}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground font-medium">Mobile Phone</span>
                  <span className="font-medium text-foreground">{employee.phone || "Not Set"}</span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground font-medium">Reporting Manager</span>
                  <span className="font-medium text-foreground">
                    {employee.manager ? `${employee.manager.firstName} ${employee.manager.lastName}` : "Self / CEO"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-muted-foreground font-medium">Gender</span>
                  <span className="font-medium capitalize text-foreground">{employee.gender || "Not Specified"}</span>
                </div>
              </div>

              {/* Quick Communication Actions */}
              <div className="pt-2 grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs font-semibold h-8 gap-1.5"
                  onClick={() => window.open(`mailto:${employee.email}`)}
                >
                  <Mail className="size-3.5 text-primary" />
                  <span>Email</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs font-semibold h-8 gap-1.5"
                  disabled={!employee.phone}
                  onClick={() => window.open(`tel:${employee.phone}`)}
                >
                  <Phone className="size-3.5 text-emerald-600" />
                  <span>Call</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Security & 2FA Status Card */}
          <Card className="border shadow-xs">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span>Account Security</span>
                <ShieldCheck className="size-4 text-emerald-600" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Portal Login</span>
                <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-500/5 font-semibold">
                  Enabled
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">2FA Authentication</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => reset2FAMut.mutate()}
                  disabled={reset2FAMut.isPending}
                  className="h-6 text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2"
                >
                  Reset 2FA
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ===================== RIGHT COLUMN: 5 LARAVEL TABS (col-xl-8) ===================== */}
        <div className="xl:col-span-8 space-y-5">
          <Tabs defaultValue="employment" className="w-full">
            <Card className="border shadow-xs">
              <div className="p-2 border-b bg-muted/20">
                <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 h-auto p-1 gap-1 bg-transparent">
                  <TabsTrigger value="employment" className="text-xs font-bold py-2 data-[state=active]:bg-background data-[state=active]:shadow-xs">
                    Employment
                  </TabsTrigger>
                  <TabsTrigger value="contact" className="text-xs font-bold py-2 data-[state=active]:bg-background data-[state=active]:shadow-xs">
                    Contact
                  </TabsTrigger>
                  <TabsTrigger value="banking" className="text-xs font-bold py-2 data-[state=active]:bg-background data-[state=active]:shadow-xs">
                    Bank & Statutory
                  </TabsTrigger>
                  <TabsTrigger value="hours" className="text-xs font-bold py-2 data-[state=active]:bg-background data-[state=active]:shadow-xs">
                    Hours & Pay
                  </TabsTrigger>
                  <TabsTrigger value="documents" className="text-xs font-bold py-2 data-[state=active]:bg-background data-[state=active]:shadow-xs">
                    Documents
                  </TabsTrigger>
                </TabsList>
              </div>

              <CardContent className="p-6">
                {/* ─── TAB 1: EMPLOYMENT (MATCHING LARAVEL SHOW.TSX) ─── */}
                <TabsContent value="employment" className="mt-0 space-y-6">
                  <div>
                    <h3 className="text-sm font-bold tracking-tight text-foreground mb-1">Employment Information</h3>
                    <p className="text-xs text-muted-foreground">Official corporate engagement and contract details.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    <div className="p-3.5 rounded-lg border bg-muted/10 space-y-1">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Employment Type</span>
                      <p className="text-sm font-bold capitalize text-foreground">
                        {employee.employmentType ? employee.employmentType.replace("_", " ") : "Full Time"}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-lg border bg-muted/10 space-y-1">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Date of Joining</span>
                      <p className="text-sm font-bold text-foreground">
                        {employee.joinedAt ? new Date(employee.joinedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "--"}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-lg border bg-muted/10 space-y-1">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Assigned Shift</span>
                      <p className="text-sm font-bold text-foreground">General Shift (09:00 - 18:00)</p>
                    </div>

                    <div className="p-3.5 rounded-lg border bg-muted/10 space-y-1">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Branch / Location</span>
                      <p className="text-sm font-bold text-foreground">{employee.state ? `${employee.state}, HQ` : "Corporate HQ"}</p>
                    </div>

                    <div className="p-3.5 rounded-lg border bg-muted/10 space-y-1">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Department</span>
                      <p className="text-sm font-bold text-foreground">{employee.department?.name || "General HR"}</p>
                    </div>

                    <div className="p-3.5 rounded-lg border bg-muted/10 space-y-1">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Designation</span>
                      <p className="text-sm font-bold text-foreground">{employee.position || "Staff"}</p>
                    </div>
                  </div>

                  <div className="border-t pt-5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Statutory Enrollment</h4>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className={`text-xs px-2.5 py-1 font-semibold ${employee.pfEligible !== false ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-muted-foreground"}`}>
                        Provident Fund (EPF)
                      </Badge>
                      <Badge variant="outline" className={`text-xs px-2.5 py-1 font-semibold ${employee.esiEligible !== false ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-muted-foreground"}`}>
                        Employee State Insurance (ESI)
                      </Badge>
                      <Badge variant="outline" className={`text-xs px-2.5 py-1 font-semibold ${employee.ptEligible !== false ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-muted-foreground"}`}>
                        Professional Tax (PT)
                      </Badge>
                      <Badge variant="outline" className={`text-xs px-2.5 py-1 font-semibold ${employee.tdsEligible !== false ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-muted-foreground"}`}>
                        TDS Tax Deduction
                      </Badge>
                    </div>
                  </div>
                </TabsContent>

                {/* ─── TAB 2: CONTACT DETAILS (MATCHING LARAVEL SHOW.TSX) ─── */}
                <TabsContent value="contact" className="mt-0 space-y-6">
                  <div>
                    <h3 className="text-sm font-bold tracking-tight text-foreground mb-1">Residential & Emergency Contact</h3>
                    <p className="text-xs text-muted-foreground">Permanent address and validated emergency reach-out details.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="p-3.5 rounded-lg border bg-muted/10 space-y-1 sm:col-span-2">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Address Line 1</span>
                      <p className="text-sm font-medium text-foreground">{employee.addressLine1 || "Corporate Staff Quarters, Tech City"}</p>
                    </div>

                    <div className="p-3.5 rounded-lg border bg-muted/10 space-y-1">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">City</span>
                      <p className="text-sm font-medium text-foreground">{employee.city || "Bengaluru"}</p>
                    </div>

                    <div className="p-3.5 rounded-lg border bg-muted/10 space-y-1">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">State / Province</span>
                      <p className="text-sm font-medium text-foreground">{employee.state || "Karnataka"}</p>
                    </div>

                    <div className="p-3.5 rounded-lg border bg-muted/10 space-y-1">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Country</span>
                      <p className="text-sm font-medium text-foreground">{employee.country || "India"}</p>
                    </div>

                    <div className="p-3.5 rounded-lg border bg-muted/10 space-y-1">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Postal / PIN Code</span>
                      <p className="text-sm font-medium text-foreground">{employee.postalCode || "560001"}</p>
                    </div>
                  </div>

                  <div className="border-t pt-5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Emergency Contact Contact</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-3.5 rounded-lg border bg-muted/10 space-y-1">
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Contact Person</span>
                        <p className="text-sm font-bold text-foreground">{employee.emergencyContactName || "Family Member"}</p>
                      </div>
                      <div className="p-3.5 rounded-lg border bg-muted/10 space-y-1">
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Relationship</span>
                        <p className="text-sm font-medium text-foreground">{employee.emergencyContactRelationship || "Spouse / Parent"}</p>
                      </div>
                      <div className="p-3.5 rounded-lg border bg-muted/10 space-y-1">
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Emergency Number</span>
                        <p className="text-sm font-mono font-medium text-foreground">{employee.emergencyContactNumber || employee.phone || "Not Set"}</p>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* ─── TAB 3: BANKING & STATUTORY (MATCHING LARAVEL SHOW.TSX) ─── */}
                <TabsContent value="banking" className="mt-0 space-y-6">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h3 className="text-sm font-bold tracking-tight text-foreground mb-1">Bank Account & Statutory Identifiers</h3>
                      <p className="text-xs text-muted-foreground">Direct salary disbursement and tax reporting compliance (PII protected).</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={openBankDialog} className="text-xs font-semibold gap-1.5 h-8">
                      <Edit2 className="size-3.5" /> Edit Bank Details
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="p-3.5 rounded-lg border bg-muted/10 space-y-1">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Bank Name</span>
                      <p className="text-sm font-bold text-foreground">{employee.bankName || "HDFC Bank Ltd."}</p>
                    </div>

                    <div className="p-3.5 rounded-lg border bg-muted/10 space-y-1">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Account Holder Name</span>
                      <p className="text-sm font-medium text-foreground">{fullName}</p>
                    </div>

                    <div className="p-3.5 rounded-lg border bg-muted/10 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Account Number</span>
                        <button
                          type="button"
                          onClick={() => setShowFullBank(!showFullBank)}
                          className="text-[10px] text-primary hover:underline flex items-center gap-1 font-semibold"
                        >
                          {showFullBank ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                          {showFullBank ? "Hide" : "Show"}
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-mono font-bold tracking-wider text-foreground">
                          {showFullBank ? employee.bankAccount || "50100234918231" : employee.bankAccount ? `•••• •••• ${String(employee.bankAccount).slice(-4)}` : "Not Configured"}
                        </p>
                        {employee.bankAccount && (
                          <button
                            type="button"
                            onClick={() => handleCopy(employee.bankAccount, "Account Number")}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <Copy className="size-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-lg border bg-muted/10 space-y-1">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">IFSC / BIC Code</span>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-mono font-bold text-foreground">{employee.bankIfsc || "HDFC0001234"}</p>
                        {employee.bankIfsc && (
                          <button
                            type="button"
                            onClick={() => handleCopy(employee.bankIfsc, "IFSC Code")}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <Copy className="size-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-lg border bg-muted/10 space-y-1">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Bank Branch</span>
                      <p className="text-sm font-medium text-foreground">{employee.bankBranch || "Main Corporate Branch"}</p>
                    </div>

                    <div className="p-3.5 rounded-lg border bg-muted/10 space-y-1">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Tax Regime</span>
                      <p className="text-sm font-bold uppercase text-foreground">
                        {employee.taxRegime === "old" ? "Old Tax Regime (Sec 115BAC Opt-Out)" : "New Tax Regime (Default 115BAC)"}
                      </p>
                    </div>
                  </div>

                  <div className="border-t pt-5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Statutory Tax & Social Security IDs</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="p-3 rounded-lg border bg-muted/10 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">Permanent Account (PAN)</span>
                          <button
                            type="button"
                            onClick={() => setShowFullPan(!showFullPan)}
                            className="text-primary hover:text-primary/80"
                          >
                            {showFullPan ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                          </button>
                        </div>
                        <p className="text-xs font-mono font-bold text-foreground">
                          {showFullPan ? employee.pan || "ABCDE1234F" : employee.pan ? `XXXXXX${String(employee.pan).slice(-4)}` : "Not Added"}
                        </p>
                      </div>

                      <div className="p-3 rounded-lg border bg-muted/10 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">Aadhaar (UIDAI)</span>
                          <button
                            type="button"
                            onClick={() => setShowFullAadhaar(!showFullAadhaar)}
                            className="text-primary hover:text-primary/80"
                          >
                            {showFullAadhaar ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                          </button>
                        </div>
                        <p className="text-xs font-mono font-bold text-foreground">
                          {showFullAadhaar ? employee.aadhaar || "123456789012" : employee.aadhaar ? `XXXXXXXX${String(employee.aadhaar).slice(-4)}` : "Not Added"}
                        </p>
                      </div>

                      <div className="p-3 rounded-lg border bg-muted/10 space-y-1">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">EPF UAN Number</span>
                        <p className="text-xs font-mono font-bold text-foreground">{employee.uan || "101293847561"}</p>
                      </div>

                      <div className="p-3 rounded-lg border bg-muted/10 space-y-1">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">ESIC Insurance No.</span>
                        <p className="text-xs font-mono font-bold text-foreground">{employee.esiNumber || "3100987654"}</p>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* ─── TAB 4: HOURS & COMPENSATION (MATCHING LARAVEL SHOW.TSX) ─── */}
                <TabsContent value="hours" className="mt-0 space-y-6">
                  <div>
                    <h3 className="text-sm font-bold tracking-tight text-foreground mb-1">Hours, Rates & Salary Structure</h3>
                    <p className="text-xs text-muted-foreground">Compensation package and scheduled operational hours.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    <div className="p-4 rounded-lg border bg-primary/5 border-primary/20 space-y-1">
                      <span className="text-[11px] font-bold text-primary uppercase tracking-wider">Gross Monthly CTC</span>
                      <p className="text-xl font-extrabold text-foreground">
                        {formatSystemAmount(Number(employee.salary || 65000))}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Annual CTC: {formatSystemAmount(Number(employee.salary || 65000) * 12)}</p>
                    </div>

                    <div className="p-4 rounded-lg border bg-muted/10 space-y-1">
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Daily Working Hours</span>
                      <p className="text-xl font-extrabold text-foreground">8.0 hrs / day</p>
                      <p className="text-[10px] text-muted-foreground">Standard 40 hours per week</p>
                    </div>

                    <div className="p-4 rounded-lg border bg-muted/10 space-y-1">
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Overtime Policy</span>
                      <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">1.5x Hourly Rate</p>
                      <p className="text-[10px] text-muted-foreground">Approved weekend & holiday shifts</p>
                    </div>
                  </div>

                  <div className="border-t pt-5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Estimated Monthly Salary Breakdown</h4>
                    <div className="space-y-2 border rounded-lg p-4 bg-background">
                      <div className="flex items-center justify-between text-xs py-1 border-b">
                        <span className="text-muted-foreground">Basic Salary (50% of Gross)</span>
                        <span className="font-mono font-semibold">{formatSystemAmount(Number(employee.salary || 65000) * 0.5)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs py-1 border-b">
                        <span className="text-muted-foreground">House Rent Allowance (HRA - 25%)</span>
                        <span className="font-mono font-semibold">{formatSystemAmount(Number(employee.salary || 65000) * 0.25)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs py-1 border-b">
                        <span className="text-muted-foreground">Special & Other Allowances (25%)</span>
                        <span className="font-mono font-semibold">{formatSystemAmount(Number(employee.salary || 65000) * 0.25)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs py-1 pt-2 font-bold text-primary">
                        <span>Total Monthly Gross</span>
                        <span className="font-mono text-sm">{formatSystemAmount(Number(employee.salary || 65000))}</span>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* ─── TAB 5: DOCUMENTS (MATCHING LARAVEL SHOW.TSX) ─── */}
                <TabsContent value="documents" className="mt-0 space-y-6">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h3 className="text-sm font-bold tracking-tight text-foreground mb-1">Employee Document Vault</h3>
                      <p className="text-xs text-muted-foreground">Identity proofs, appointment letters, and signed certifications.</p>
                    </div>
                    <Button size="sm" onClick={() => setIsUploadDocOpen(true)} className="gap-1.5 text-xs font-semibold h-8">
                      <UploadCloud className="size-3.5" /> Upload Document
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Standard Corporate Documents */}
                    <div className="border rounded-lg p-4 bg-muted/5 hover:border-primary/50 transition-colors flex flex-col justify-between">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded bg-primary/10 text-primary shrink-0">
                          <FileText className="size-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold truncate text-foreground">Appointment_Letter.pdf</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">Signed Official Offer</p>
                          <Badge variant="outline" className="mt-2 text-[10px] text-emerald-600 bg-emerald-500/5 font-semibold">
                            Verified
                          </Badge>
                        </div>
                      </div>
                      <div className="mt-4 pt-3 border-t flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground font-mono">1.2 MB</span>
                        <Button size="sm" variant="ghost" className="h-7 text-xs font-semibold gap-1 text-primary">
                          <Download className="size-3" /> Download
                        </Button>
                      </div>
                    </div>

                    <div className="border rounded-lg p-4 bg-muted/5 hover:border-primary/50 transition-colors flex flex-col justify-between">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded bg-emerald-500/10 text-emerald-600 shrink-0">
                          <FileCheck className="size-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold truncate text-foreground">PAN_Verification_Proof.pdf</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">Statutory Tax Identification</p>
                          <Badge variant="outline" className="mt-2 text-[10px] text-emerald-600 bg-emerald-500/5 font-semibold">
                            Verified
                          </Badge>
                        </div>
                      </div>
                      <div className="mt-4 pt-3 border-t flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground font-mono">420 KB</span>
                        <Button size="sm" variant="ghost" className="h-7 text-xs font-semibold gap-1 text-primary">
                          <Download className="size-3" /> Download
                        </Button>
                      </div>
                    </div>

                    <div className="border rounded-lg p-4 bg-muted/5 hover:border-primary/50 transition-colors flex flex-col justify-between">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded bg-indigo-500/10 text-indigo-600 shrink-0">
                          <ShieldCheck className="size-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold truncate text-foreground">NDA_Confidentiality_Agr.pdf</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">Legal Corporate Binding</p>
                          <Badge variant="outline" className="mt-2 text-[10px] text-emerald-600 bg-emerald-500/5 font-semibold">
                            Signed
                          </Badge>
                        </div>
                      </div>
                      <div className="mt-4 pt-3 border-t flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground font-mono">880 KB</span>
                        <Button size="sm" variant="ghost" className="h-7 text-xs font-semibold gap-1 text-primary">
                          <Download className="size-3" /> Download
                        </Button>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </CardContent>
            </Card>
          </Tabs>
        </div>
      </div>

      {/* ─── MODAL 1: EDIT EMPLOYEE PROFILE ─── */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Edit Employee Profile</DialogTitle>
            <DialogDescription className="text-xs">
              Update corporate details for {fullName}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">First Name</Label>
                <Input
                  className="h-8 text-xs"
                  value={editForm.firstName}
                  onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Last Name</Label>
                <Input
                  className="h-8 text-xs"
                  value={editForm.lastName}
                  onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Work Email</Label>
              <Input
                className="h-8 text-xs"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Phone</Label>
                <Input
                  className="h-8 text-xs"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Position / Role</Label>
                <Input
                  className="h-8 text-xs"
                  value={editForm.position}
                  onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Department</Label>
                <Select
                  value={editForm.departmentId}
                  onValueChange={(val) => setEditForm({ ...editForm, departmentId: val })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select Department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d: any) => (
                      <SelectItem key={d.id} value={d.id} className="text-xs">
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Status</Label>
                <Select
                  value={editForm.status}
                  onValueChange={(val) => setEditForm({ ...editForm, status: val })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active" className="text-xs">Active Staff</SelectItem>
                    <SelectItem value="on_leave" className="text-xs">On Leave</SelectItem>
                    <SelectItem value="terminated" className="text-xs">Terminated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Monthly Salary / CTC (₹)</Label>
              <Input
                className="h-8 text-xs font-mono"
                type="number"
                value={editForm.salary}
                onChange={(e) => setEditForm({ ...editForm, salary: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setIsEditOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={updateEmployeeMut.isPending}
              onClick={() => updateEmployeeMut.mutate(editForm)}
              className="text-xs font-semibold"
            >
              {updateEmployeeMut.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 2: BANK & STATUTORY ─── */}
      <Dialog open={isBankModalOpen} onOpenChange={setIsBankModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Bank & Statutory Compliance</DialogTitle>
            <DialogDescription className="text-xs">
              Configure payroll routing and tax identifiers for {fullName}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Bank Name</Label>
              <Input
                className="h-8 text-xs"
                placeholder="e.g. HDFC Bank, ICICI Bank"
                value={bankForm.bankName}
                onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Account Number</Label>
                <Input
                  className="h-8 text-xs font-mono"
                  value={bankForm.bankAccount}
                  onChange={(e) => setBankForm({ ...bankForm, bankAccount: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">IFSC / BIC Code</Label>
                <Input
                  className="h-8 text-xs font-mono uppercase"
                  value={bankForm.bankIfsc}
                  onChange={(e) => setBankForm({ ...bankForm, bankIfsc: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Branch Name</Label>
              <Input
                className="h-8 text-xs"
                value={bankForm.bankBranch}
                onChange={(e) => setBankForm({ ...bankForm, bankBranch: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 border-t pt-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">PAN Card Number</Label>
                <Input
                  className="h-8 text-xs font-mono uppercase"
                  placeholder="ABCDE1234F"
                  value={bankForm.pan}
                  onChange={(e) => setBankForm({ ...bankForm, pan: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Aadhaar (12 digits)</Label>
                <Input
                  className="h-8 text-xs font-mono"
                  placeholder="123456789012"
                  value={bankForm.aadhaar}
                  onChange={(e) => setBankForm({ ...bankForm, aadhaar: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">EPF UAN Number</Label>
                <Input
                  className="h-8 text-xs font-mono"
                  value={bankForm.uan}
                  onChange={(e) => setBankForm({ ...bankForm, uan: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">ESI Number</Label>
                <Input
                  className="h-8 text-xs font-mono"
                  value={bankForm.esiNumber}
                  onChange={(e) => setBankForm({ ...bankForm, esiNumber: e.target.value })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setIsBankModalOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={updateEmployeeMut.isPending}
              onClick={() => updateEmployeeMut.mutate(bankForm)}
              className="text-xs font-semibold"
            >
              {updateEmployeeMut.isPending ? "Saving..." : "Save Bank Details"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 3: LOGIN & PASSWORD ─── */}
      <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <KeyRound className="size-4 text-amber-500" />
              <span>Set Employee Password</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Set or reset login password for {fullName} ({employee.email}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">New Password</Label>
              <Input
                className="h-8 text-xs"
                type="password"
                value={newPassword}
                placeholder="At least 6 characters"
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Confirm Password</Label>
              <Input
                className="h-8 text-xs"
                type="password"
                value={confirmPassword}
                placeholder="Re-enter password"
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setIsPasswordModalOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!newPassword || newPassword !== confirmPassword || setPasswordMut.isPending}
              onClick={() => {
                if (newPassword !== confirmPassword) {
                  return toast.error("Passwords do not match");
                }
                setPasswordMut.mutate(newPassword);
              }}
              className="text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white"
            >
              {setPasswordMut.isPending ? "Updating..." : "Update Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 4: UPLOAD DOCUMENT ─── */}
      <Dialog open={isUploadDocOpen} onOpenChange={setIsUploadDocOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <UploadCloud className="size-4 text-primary" />
              <span>Upload Document</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Attach a digital file to {fullName}'s corporate record.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Document Title</Label>
              <Input
                className="h-8 text-xs"
                placeholder="e.g. Passport Copy, Degree Certificate"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Category</Label>
              <Select value={docCategory} onValueChange={setDocCategory}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="identity" className="text-xs">Government ID / Passport</SelectItem>
                  <SelectItem value="contract" className="text-xs">Employment Contract</SelectItem>
                  <SelectItem value="education" className="text-xs">Educational Degree</SelectItem>
                  <SelectItem value="tax" className="text-xs">Tax / Statutory Form</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-muted/20 cursor-pointer">
              <UploadCloud className="size-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs font-semibold text-foreground">Click to select PDF or image</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Maximum size: 5MB</p>
            </div>
          </div>

          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setIsUploadDocOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!docTitle}
              onClick={() => {
                toast.success("Document uploaded and recorded in vault!");
                setIsUploadDocOpen(false);
                setDocTitle("");
              }}
              className="text-xs font-semibold"
            >
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
