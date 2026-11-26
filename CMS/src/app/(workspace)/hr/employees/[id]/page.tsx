'use client';
import { useState } from "react";
import { createFileRoute, Link, Outlet, useChildMatches, Route } from "@/src/lib/router-compat";
import { format } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, unwrapArray } from "@/lib/api";
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { toast } from "sonner";
import {
  ArrowLeft,
  User,
  Briefcase,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Building2,
  Landmark,
  ShieldCheck,
  Award,
  FileText,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  Trash2,
  Lock,
  AlertCircle,
  FileSpreadsheet,
  Edit,
  Plus,
  Trophy,
  Star,
  Gift,
  UserCheck,
  Loader2,
  Zap,
  Heart,
  Users,
  Medal,
  Crown,
  Sparkles,
  History,
  CalendarOff,
  DollarSign,
  CreditCard,
  Laptop,
  GraduationCap,
  BookOpen,
  FileCheck,
  XCircle,
  Activity,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  FileSignature,
} from "lucide-react";

function renderProfileAwardIcon(iconName?: string | null, className = "size-4") {
  switch ((iconName || "").toLowerCase()) {
    case "star": return <Star className={className} />;
    case "zap": return <Zap className={className} />;
    case "heart": return <Heart className={className} />;
    case "users": return <Users className={className} />;
    case "medal": return <Medal className={className} />;
    case "crown": return <Crown className={className} />;
    case "sparkles": return <Sparkles className={className} />;
    case "trophy": return <Trophy className={className} />;
    case "award":
    default:
      return <Award className={className} />;
  }
}

interface DetailFieldProps {
  label: string;
  value?: string | number | null;
  icon?: React.ReactNode;
  mono?: boolean;
  highlight?: boolean;
  badge?: React.ReactNode;
}

function DetailField({ label, value, icon, mono, highlight, badge }: DetailFieldProps) {
  const displayVal = value !== null && value !== undefined && value !== "" ? String(value) : "—";
  return (
    <div className="flex flex-col gap-1 p-3 rounded-lg border bg-card/60 transition-colors hover:bg-card">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {icon && <span className="text-muted-foreground/80 shrink-0">{icon}</span>}
        <span>{label}</span>
      </div>
      <div className="flex items-center justify-between gap-2 mt-0.5">
        <span
          className={`text-sm truncate ${
            highlight ? "font-semibold text-foreground" : "text-foreground/90 font-medium"
          }`}
          title={displayVal}
        >
          {displayVal}
        </span>
        {badge}
      </div>
    </div>
  );
}

function Employee360Page() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("basic-info");

  // Document actions state
  const [selectedLetter, setSelectedLetter] = useState<any | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [docToDelete, setDocToDelete] = useState<any | null>(null);
  const [isDeletingDoc, setIsDeletingDoc] = useState(false);
  const [isVerifyingDoc, setIsVerifyingDoc] = useState<string | null>(null);
  const [docToReject, setDocToReject] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isRejectingDoc, setIsRejectingDoc] = useState(false);

  // Award actions & conferring state
  const [isAwardModalOpen, setIsAwardModalOpen] = useState(false);
  const [awardToDelete, setAwardToDelete] = useState<any | null>(null);
  const [awardFormData, setAwardFormData] = useState({
    awardTypeId: "",
    awardDate: new Date().toISOString().split("T")[0],
    giftItem: "",
    giftAmount: "0",
    description: "",
    presentedBy: "Executive Committee",
  });

  const { data: activeAwardTypes = [] } = useQuery({
    queryKey: ["active-award-types-profile"],
    queryFn: async () => {
      const res = await api.get("/hr/organization/award-types?status=active&limit=100");
      return res.data?.data || res.data || [];
    },
    staleTime: 60000,
  });

  const assignAwardMutation = useMutation({
    mutationFn: async () => {
      if (!awardFormData.awardTypeId) {
        throw new Error("Please select an Award Type.");
      }
      return await api.post("/api/awards", {
        employeeId: id,
        awardTypeId: awardFormData.awardTypeId,
        awardDate: awardFormData.awardDate,
        giftItem: awardFormData.giftItem || "Recognition Award",
        giftAmount: Number(awardFormData.giftAmount) || 0,
        description: awardFormData.description.trim() || null,
        presentedBy: awardFormData.presentedBy.trim() || "Management",
      });
    },
    onSuccess: () => {
      toast.success("Award conferred successfully!");
      setIsAwardModalOpen(false);
      setAwardFormData({
        awardTypeId: "",
        awardDate: new Date().toISOString().split("T")[0],
        giftItem: "",
        giftAmount: "0",
        description: "",
        presentedBy: "Executive Committee",
      });
      queryClient.invalidateQueries({ queryKey: ["employee-360", id] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Failed to grant award.");
    },
  });

  const revokeAwardMutation = useMutation({
    mutationFn: async (awardId: string) => {
      return await api.delete(`/api/awards/${awardId}`);
    },
    onSuccess: () => {
      toast.success("Award record removed successfully.");
      setAwardToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["employee-360", id] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || "Failed to revoke award.");
    },
  });

  const { data: responseData, isLoading, error, refetch } = useQuery({
    queryKey: ["employee-360", id],
    queryFn: async () => {
      const res = await api.get(`/hr/employees/${id}`);
      return res.data?.data || res.data || res;
    },
  });

  const emp = responseData;

  // Handle Document Verification / Approval
  const handleVerifyDocument = async (docId: string, docCode: string) => {
    try {
      setIsVerifyingDoc(docId);
      const res = await api.put(`/documents/${docId}/verify`);
      toast.success(res.data?.message || `Document ${docCode} verified and certified!`);
      queryClient.invalidateQueries({ queryKey: ["employee-360", id] });
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || "Failed to verify document.");
    } finally {
      setIsVerifyingDoc(null);
    }
  };

  // Handle Document Rejection
  const handleRejectDocument = async () => {
    if (!docToReject || !rejectionReason.trim()) {
      toast.error("Please provide a reason for rejecting this document.");
      return;
    }
    try {
      setIsRejectingDoc(true);
      await api.post(`/api/documents/${docToReject.id}/reject`, { reason: rejectionReason.trim() });
      toast.success(`Document ${docToReject.documentCode || docToReject.title || "record"} rejected.`);
      setDocToReject(null);
      setRejectionReason("");
      queryClient.invalidateQueries({ queryKey: ["employee-360", id] });
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || "Failed to reject document.");
    } finally {
      setIsRejectingDoc(false);
    }
  };

  // Handle Document Deletion
  const handleDeleteDocument = async () => {
    if (!docToDelete) return;
    try {
      setIsDeletingDoc(true);
      await api.delete(`/documents/${docToDelete.id}`);
      toast.success("Document removed from employee vault.");
      setDocToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["employee-360", id] });
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || "Failed to delete document.");
    } finally {
      setIsDeletingDoc(false);
    }
  };

  // Print/Download Generated Letter
  const handlePrintLetter = (letter: any) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow popups to download or print this document.");
      return;
    }
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${letter.title || "Employee Certificate"}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #111; line-height: 1.6; }
            h1, h2, h3 { color: #000; }
            .header { border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 30px; }
            .footer { border-top: 1px solid #e5e7eb; margin-top: 50px; padding-top: 20px; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>${letter.title}</h2>
            <p><strong>Letter Type:</strong> ${letter.letterType} | <strong>Issue Date:</strong> ${
              letter.issuedAt ? format(new Date(letter.issuedAt), "dd MMMM yyyy") : "—"
            }</p>
          </div>
          <div class="content">
            ${letter.contentHtml || "<p>No content stored.</p>"}
          </div>
          <div class="footer">
            <p>This is a certified electronic record issued under MasterHRMS. Authentication Token: ${letter.id}</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 300);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[480px] gap-3 text-muted-foreground">
        <Clock className="size-8 animate-spin text-primary" />
        <p className="text-sm font-medium">Loading Employee 360 profile...</p>
      </div>
    );
  }

  if (error || !emp) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 py-12 text-center">
        <AlertCircle className="size-10 text-destructive" />
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-foreground">Employee Profile Unavailable</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            {error ? (error as any).message : "The requested employee record could not be found or access is restricted."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
          <Link to="/hr/employees">
            <Button size="sm" className="gap-1.5">
              <ArrowLeft className="size-4" />
              Back to Employees
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const fullName = `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || "Employee Details";
  const initials = `${emp.firstName?.[0] || ""}${emp.lastName?.[0] || ""}`.toUpperCase() || "EM";
  const employeeStatus = emp.status || "active";
  const companyDocs = Array.isArray(emp.companyDocuments) ? emp.companyDocuments : [];
  const generatedLetters = Array.isArray(emp.generatedLetters) ? emp.generatedLetters : [];
  const awards = Array.isArray(emp.awards) ? emp.awards : [];
  const activeProbation = emp.probationRecords?.[0];
  const activeShift = emp.shiftRosters?.[0]?.shift;
  const activeContract = emp.employeeContracts?.[0];

  // Satellite relations for Extended Employee 360
  const promotionRecords = Array.isArray(emp.promotionRecords) ? emp.promotionRecords : [];
  const transfers = Array.isArray(emp.transfers) ? emp.transfers : [];
  const disciplinaryWarnings = Array.isArray(emp.disciplinaryWarnings) ? emp.disciplinaryWarnings : [];
  const employeeExits = Array.isArray(emp.employeeExits) ? emp.employeeExits : [];
  const attendanceRecords = Array.isArray(emp.attendance) ? emp.attendance : [];
  const leaveRequests = Array.isArray(emp.leaveRequests) ? emp.leaveRequests : [];
  const payslips = Array.isArray(emp.payslips) ? emp.payslips : [];
  const assignedAssets = Array.isArray(emp.assignedAssets) ? emp.assignedAssets : [];
  const trainingTasks = Array.isArray(emp.assignedTrainingTasks) ? emp.assignedTrainingTasks : [];
  const courseEnrollments = Array.isArray(emp.courseEnrollments) ? emp.courseEnrollments : [];
  const qualifications = Array.isArray(emp.qualifications) ? emp.qualifications : [];
  const workExperience = Array.isArray(emp.workExperience) ? emp.workExperience : [];
  const familyMembers = Array.isArray(emp.familyMembers) ? emp.familyMembers : [];
  const auditLogs = Array.isArray(emp.auditLogs) ? emp.auditLogs : [];
  const documentTypes = Array.isArray(emp.documentTypes) ? emp.documentTypes : [];

  // Mandatory document compliance calculations
  const mandatoryDocTypes = documentTypes.filter((dt: any) => dt.isRequired);
  const verifiedMandatoryCount = mandatoryDocTypes.filter((dt: any) =>
    companyDocs.some((cd: any) =>
      cd.status === "verified" &&
      (cd.category?.toLowerCase() === dt.code?.toLowerCase() ||
       cd.category?.toLowerCase() === dt.name?.toLowerCase() ||
       cd.title?.toLowerCase().includes(dt.name?.toLowerCase()))
    )
  ).length;
  const complianceRate = mandatoryDocTypes.length > 0
    ? Math.round((verifiedMandatoryCount / mandatoryDocTypes.length) * 100)
    : 100;

  return (
    <div className="w-full min-w-0 space-y-6 pb-12">
      {/* 2.A Page Header */}
      <div className="space-y-2">
        <BreadcrumbNav
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Employees", href: "/hr/employees" },
            { label: fullName },
          ]}
        />
        <PageHeader
          title={fullName}
          description="View detailed information and activity for employee."
          actions={
            <div className="flex items-center gap-2 shrink-0">
              <Link to="/hr/employees">
                <Button variant="outline" size="sm" className="gap-1.5 h-9">
                  <ArrowLeft className="size-4" />
                  Back to Employees
                </Button>
              </Link>
              <Link to="/hr/employees/$id/edit" params={{ id: emp.id }}>
                <Button size="sm" className="gap-1.5 h-9 bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Edit className="size-4" />
                  Edit Employee
                </Button>
              </Link>
            </div>
          }
        />
      </div>

      {/* 2.B Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column — Employee Summary Card */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-4">
          <Card className="shadow-sm border">
            <CardContent className="p-5 space-y-5">
              {/* Profile Avatar & Header */}
              <div className="flex flex-col items-center text-center space-y-3 pt-2">
                <Avatar className="size-20 border-2 border-border shadow-xs">
                  {emp.avatarUrl ? (
                    <AvatarImage src={emp.avatarUrl} alt={fullName} />
                  ) : null}
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-xl">
                    {initials}
                  </AvatarFallback>
                </Avatar>

                <div className="space-y-1">
                  <h2 className="text-base font-bold text-foreground leading-snug">{fullName}</h2>
                  <p className="text-xs text-muted-foreground font-medium">
                    {emp.designation?.name || emp.position || "—"}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                  <Badge
                    variant={
                      employeeStatus === "active"
                        ? "default"
                        : employeeStatus === "on_leave"
                          ? "secondary"
                          : "destructive"
                    }
                    className="capitalize text-[11px] px-2 py-0.5"
                  >
                    {employeeStatus.replace("_", " ")}
                  </Badge>
                  <Badge variant="outline" className="text-[11px] px-2 py-0.5">
                    {emp.employeeCode || emp.id?.slice(0, 8)}
                  </Badge>
                </div>
              </div>

              <div className="border-t pt-4 space-y-3 text-xs">
                {/* Employee ID */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <User className="size-3.5" />
                    Employee ID
                  </span>
                  <span className="font-medium text-foreground">{emp.employeeCode || "—"}</span>
                </div>

                {/* Email */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Mail className="size-3.5" />
                    Work Email
                  </span>
                  <span className="font-medium text-foreground truncate max-w-[150px]" title={emp.email}>
                    {emp.email ? (
                      <a href={`mailto:${emp.email}`} className="hover:underline hover:text-primary">
                        {emp.email}
                      </a>
                    ) : (
                      "—"
                    )}
                  </span>
                </div>

                {/* Phone */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Phone className="size-3.5" />
                    Phone
                  </span>
                  <span className="font-medium text-foreground">
                    {emp.phone ? (
                      <a href={`tel:${emp.phone}`} className="hover:underline hover:text-primary">
                        {emp.phone}
                      </a>
                    ) : (
                      "—"
                    )}
                  </span>
                </div>

                {/* Date of Birth */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="size-3.5" />
                    Date of Birth
                  </span>
                  <span className="font-medium text-foreground">
                    {emp.dateOfBirth ? format(new Date(emp.dateOfBirth), "dd MMM yyyy") : "—"}
                  </span>
                </div>

                {/* Joining Date */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Clock className="size-3.5" />
                    Joining Date
                  </span>
                  <span className="font-medium text-foreground">
                    {emp.joinedAt ? format(new Date(emp.joinedAt), "dd MMM yyyy") : "—"}
                  </span>
                </div>

                {/* Department */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Building2 className="size-3.5" />
                    Department
                  </span>
                  <span className="font-medium text-foreground truncate max-w-[150px]" title={emp.department?.name}>
                    {emp.department?.name || "—"}
                  </span>
                </div>

                {/* Branch / Work Location */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="size-3.5" />
                    Branch / Location
                  </span>
                  <span className="font-medium text-foreground truncate max-w-[150px]" title={emp.branch?.name}>
                    {emp.branch?.name || "—"}
                  </span>
                </div>

                {/* Employment Type */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Briefcase className="size-3.5" />
                    Employment Type
                  </span>
                  <span className="font-medium capitalize text-foreground">
                    {emp.employmentType ? emp.employmentType.replace("_", " ") : "—"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column — Six Primary Tabs */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            {/* Tab navigation bar - scrollable & responsive */}
            <div className="overflow-x-auto pb-1 scrollbar-thin">
              <TabsList className="inline-flex w-max min-w-full justify-start h-auto p-1 bg-muted/70 gap-1 rounded-lg">
                <TabsTrigger
                  value="basic-info"
                  className="gap-1.5 text-xs py-2 px-3 whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-xs"
                >
                  <User className="size-3.5" />
                  <span>Basic Info</span>
                </TabsTrigger>
                <TabsTrigger
                  value="employment"
                  className="gap-1.5 text-xs py-2 px-3 whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-xs"
                >
                  <Briefcase className="size-3.5" />
                  <span>Employment</span>
                </TabsTrigger>
                <TabsTrigger
                  value="contact"
                  className="gap-1.5 text-xs py-2 px-3 whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-xs"
                >
                  <Phone className="size-3.5" />
                  <span>Contact</span>
                </TabsTrigger>
                <TabsTrigger
                  value="banking"
                  className="gap-1.5 text-xs py-2 px-3 whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-xs"
                >
                  <Landmark className="size-3.5" />
                  <span>Banking</span>
                </TabsTrigger>
                <TabsTrigger
                  value="certifications"
                  className="gap-1.5 text-xs py-2 px-3 whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-xs"
                >
                  <Award className="size-3.5" />
                  <span>Certifications</span>
                </TabsTrigger>
                <TabsTrigger
                  value="documents"
                  className="gap-1.5 text-xs py-2 px-3 whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-xs"
                >
                  <FileText className="size-3.5" />
                  <span>Documents Vault</span>
                </TabsTrigger>
                <TabsTrigger
                  value="lifecycle"
                  className="gap-1.5 text-xs py-2 px-3 whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-xs"
                >
                  <History className="size-3.5" />
                  <span>Lifecycle</span>
                </TabsTrigger>
                <TabsTrigger
                  value="attendance"
                  className="gap-1.5 text-xs py-2 px-3 whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-xs"
                >
                  <Clock className="size-3.5" />
                  <span>Attendance</span>
                </TabsTrigger>
                <TabsTrigger
                  value="leave"
                  className="gap-1.5 text-xs py-2 px-3 whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-xs"
                >
                  <CalendarOff className="size-3.5" />
                  <span>Leave & Balances</span>
                </TabsTrigger>
                <TabsTrigger
                  value="payroll"
                  className="gap-1.5 text-xs py-2 px-3 whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-xs"
                >
                  <CreditCard className="size-3.5" />
                  <span>Payroll & Payslips</span>
                </TabsTrigger>
                <TabsTrigger
                  value="assets"
                  className="gap-1.5 text-xs py-2 px-3 whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-xs"
                >
                  <Laptop className="size-3.5" />
                  <span>Assigned Assets</span>
                </TabsTrigger>
                <TabsTrigger
                  value="training"
                  className="gap-1.5 text-xs py-2 px-3 whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-xs"
                >
                  <GraduationCap className="size-3.5" />
                  <span>Training & Courses</span>
                </TabsTrigger>
                <TabsTrigger
                  value="qualifications-experience"
                  className="gap-1.5 text-xs py-2 px-3 whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-xs"
                >
                  <BookOpen className="size-3.5" />
                  <span>Qualifications & Exp</span>
                </TabsTrigger>
                <TabsTrigger
                  value="family"
                  className="gap-1.5 text-xs py-2 px-3 whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-xs"
                >
                  <Users className="size-3.5" />
                  <span>Family & Dependents</span>
                </TabsTrigger>
                <TabsTrigger
                  value="audit-trail"
                  className="gap-1.5 text-xs py-2 px-3 whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-xs"
                >
                  <Activity className="size-3.5" />
                  <span>Audit Trail</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* TAB 1: BASIC INFO */}
            <TabsContent value="basic-info" className="space-y-4 focus-visible:outline-none">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <User className="size-4 text-primary" />
                    Basic Information
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Legal identification, demographic details, and tenant account parameters.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <DetailField
                      label="Full Legal Name"
                      value={fullName}
                      icon={<User className="size-3.5" />}
                      highlight
                    />
                    <DetailField
                      label="Employee Code"
                      value={emp.employeeCode}
                      icon={<User className="size-3.5" />}
                      mono
                    />
                    <DetailField
                      label="System Employee ID"
                      value={emp.systemId || emp.id}
                      icon={<ShieldCheck className="size-3.5" />}
                      mono
                    />
                    <DetailField
                      label="Blood Group"
                      value={emp.bloodGroup}
                      icon={<ShieldCheck className="size-3.5" />}
                      highlight={!!emp.bloodGroup}
                    />
                    <DetailField
                      label="Official Work Email"
                      value={emp.email}
                      icon={<Mail className="size-3.5" />}
                    />
                    <DetailField
                      label="Personal Email"
                      value={emp.user?.email || null}
                      icon={<Mail className="size-3.5" />}
                    />
                    <DetailField
                      label="Primary Phone Number"
                      value={emp.phone}
                      icon={<Phone className="size-3.5" />}
                    />
                    <DetailField
                      label="Date of Birth"
                      value={emp.dateOfBirth ? format(new Date(emp.dateOfBirth), "dd MMMM yyyy") : null}
                      icon={<Calendar className="size-3.5" />}
                    />
                    <DetailField
                      label="Gender"
                      value={emp.gender ? emp.gender.charAt(0).toUpperCase() + emp.gender.slice(1) : null}
                      icon={<User className="size-3.5" />}
                    />
                    <DetailField
                      label="Work State / Province"
                      value={emp.workStateCode || emp.state}
                      icon={<MapPin className="size-3.5" />}
                    />
                    <DetailField
                      label="Employment Status"
                      value={employeeStatus}
                      icon={<ShieldCheck className="size-3.5" />}
                      badge={
                        <Badge
                          variant={
                            employeeStatus === "active"
                              ? "default"
                              : employeeStatus === "on_leave"
                                ? "secondary"
                                : "destructive"
                          }
                          className="capitalize text-xs"
                        >
                          {employeeStatus.replace("_", " ")}
                        </Badge>
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 2: EMPLOYMENT */}
            <TabsContent value="employment" className="space-y-4 focus-visible:outline-none">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Briefcase className="size-4 text-primary" />
                    Employment & Organizational Position
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Designation, reporting hierarchy, work shift, and operational policies.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <DetailField
                      label="Branch / Work Location"
                      value={emp.branch?.name}
                      icon={<MapPin className="size-3.5" />}
                      highlight
                    />
                    <DetailField
                      label="Department"
                      value={emp.department?.name}
                      icon={<Building2 className="size-3.5" />}
                      highlight
                    />
                    <DetailField
                      label="Designation / Official Title"
                      value={emp.designation?.name || emp.position}
                      icon={<Briefcase className="size-3.5" />}
                      highlight
                    />
                    <DetailField
                      label="Direct Reporting Manager"
                      value={
                        emp.manager
                          ? `${emp.manager.firstName} ${emp.manager.lastName} (${emp.manager.employeeCode})`
                          : "Top Executive (Reports to Board / Workspace Admin)"
                      }
                      icon={<User className="size-3.5" />}
                    />
                    <DetailField
                      label="Employment Classification"
                      value={emp.employmentType ? emp.employmentType.replace("_", " ") : null}
                      icon={<Briefcase className="size-3.5" />}
                    />
                    <DetailField
                      label="Date of Joining"
                      value={emp.joinedAt ? format(new Date(emp.joinedAt), "dd MMMM yyyy") : null}
                      icon={<Clock className="size-3.5" />}
                    />
                    <DetailField
                      label="Probation Status"
                      value={
                        activeProbation
                          ? `${activeProbation.status.toUpperCase()} (${activeProbation.probationPeriodDays} days - Ends ${
                              activeProbation.endDate ? format(new Date(activeProbation.endDate), "dd MMM yyyy") : "—"
                            })`
                          : "Permanent / Confirmed"
                      }
                      icon={<ShieldCheck className="size-3.5" />}
                    />
                    <DetailField
                      label="Operational Work Shift"
                      value={
                        activeShift
                          ? `${activeShift.shiftName || activeShift.name || "Assigned Shift"} (${
                              activeShift.startTime || ""
                            } - ${activeShift.endTime || ""})`
                          : "General Day Shift (09:00 - 18:00)"
                      }
                      icon={<Clock className="size-3.5" />}
                    />
                    <DetailField
                      label="Attendance Policy"
                      value="Standard Workspace Policy (Grace: 15 mins)"
                      icon={<ShieldCheck className="size-3.5" />}
                    />
                    <DetailField
                      label="Contract / Agreement Type"
                      value={activeContract?.contractType?.name || activeContract?.title || "Permanent Employment"}
                      icon={<FileText className="size-3.5" />}
                    />
                    <DetailField
                      label="Direct Subordinates Count"
                      value={`${emp.subordinates?.length || 0} direct reports`}
                      icon={<User className="size-3.5" />}
                    />
                    <DetailField
                      label="Employment Lifecycle Status"
                      value={employeeStatus.toUpperCase()}
                      icon={<ShieldCheck className="size-3.5" />}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 3: CONTACT */}
            <TabsContent value="contact" className="space-y-4 focus-visible:outline-none">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Phone className="size-4 text-primary" />
                    Residential & Emergency Contact Details
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Stored physical coordinates and designated emergency contacts.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <DetailField
                      label="Address Line 1"
                      value={emp.addressLine1}
                      icon={<MapPin className="size-3.5" />}
                    />
                    <DetailField
                      label="Address Line 2"
                      value={emp.addressLine2}
                      icon={<MapPin className="size-3.5" />}
                    />
                    <DetailField
                      label="City / Municipality"
                      value={emp.city}
                      icon={<Building2 className="size-3.5" />}
                    />
                    <DetailField
                      label="District"
                      value={emp.district}
                      icon={<MapPin className="size-3.5" />}
                    />
                    <DetailField
                      label="State / Province"
                      value={emp.state || emp.workStateCode}
                      icon={<MapPin className="size-3.5" />}
                    />
                    <DetailField
                      label="Country"
                      value={emp.country || "India"}
                      icon={<MapPin className="size-3.5" />}
                    />
                    <DetailField
                      label="Postal / ZIP Code"
                      value={emp.postalCode}
                      icon={<MapPin className="size-3.5" />}
                    />
                    <DetailField
                      label="Emergency Contact Name"
                      value={emp.emergencyContactName}
                      icon={<User className="size-3.5" />}
                    />
                    <DetailField
                      label="Emergency Contact Relationship"
                      value={emp.emergencyContactRelationship}
                      icon={<User className="size-3.5" />}
                    />
                    <DetailField
                      label="Emergency Contact Phone"
                      value={emp.emergencyContactPhone}
                      icon={<Phone className="size-3.5" />}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 4: BANKING */}
            <TabsContent value="banking" className="space-y-4 focus-visible:outline-none">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Landmark className="size-4 text-primary" />
                        Banking, Statutory & Compensation Credentials
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Disbursement banking coordinates and statutory tax identifiers.
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="gap-1 text-xs text-amber-600 border-amber-300">
                      <Lock className="size-3" />
                      FLS Protected
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-3 bg-muted/40 rounded-lg border text-xs text-muted-foreground flex items-center gap-2">
                    <Lock className="size-4 text-amber-500 shrink-0" />
                    <span>
                      Server-side Field-Level Security (FLS) is actively enforced. Sensitive tax identifiers, bank account
                      numbers, and salary structures are masked for unauthorized roles.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <DetailField
                      label="Bank Institution Name"
                      value={emp.bankName}
                      icon={<Landmark className="size-3.5" />}
                      highlight
                    />
                    <DetailField
                      label="Account Holder Name"
                      value={emp.accountHolderName || fullName}
                      icon={<User className="size-3.5" />}
                    />
                    <DetailField
                      label="Disbursement Bank Account"
                      value={emp.bankAccount}
                      icon={<Landmark className="size-3.5" />}
                      mono
                      highlight
                    />
                    <DetailField
                      label="Bank Branch Location"
                      value={emp.bankBranch}
                      icon={<Building2 className="size-3.5" />}
                    />
                    <DetailField
                      label="IFSC / Routing Code"
                      value={emp.bankIfsc}
                      icon={<Landmark className="size-3.5" />}
                      mono
                    />
                    <DetailField
                      label="BIC / SWIFT Code"
                      value={emp.bicSwift || null}
                      icon={<Landmark className="size-3.5" />}
                      mono
                    />
                    <DetailField
                      label="Permanent Account Number (PAN)"
                      value={emp.pan}
                      icon={<ShieldCheck className="size-3.5" />}
                      mono
                    />
                    <DetailField
                      label="Aadhaar Identifier"
                      value={emp.aadhaar}
                      icon={<ShieldCheck className="size-3.5" />}
                      mono
                    />
                    <DetailField
                      label="Universal Account Number (UAN)"
                      value={emp.uan}
                      icon={<ShieldCheck className="size-3.5" />}
                      mono
                    />
                    <DetailField
                      label="ESIC Number"
                      value={emp.esiNumber}
                      icon={<ShieldCheck className="size-3.5" />}
                      mono
                    />
                    <DetailField
                      label="Provident Fund (PF) Number"
                      value={emp.pfNumber}
                      icon={<ShieldCheck className="size-3.5" />}
                      mono
                    />
                    <DetailField
                      label="Statutory Tax Regime"
                      value={emp.taxRegime ? `${emp.taxRegime.toUpperCase()} Regime` : null}
                      icon={<FileSpreadsheet className="size-3.5" />}
                    />
                    <DetailField
                      label="Annual Base Salary / CTC"
                      value={emp.salary ? `₹${Number(emp.salary).toLocaleString()}` : "Restricted / Masked"}
                      icon={<Landmark className="size-3.5 text-emerald-600" />}
                      highlight
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 5: CERTIFICATIONS */}
            <TabsContent value="certifications" className="space-y-4 focus-visible:outline-none">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">
                    Certifications & Official Letters
                  </CardTitle>
                  <CardDescription className="text-xs">
                    System-generated employment letters, verification certificates, and recognized corporate awards.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Generated Letters List */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Employer Generated Letters & Certificates ({generatedLetters.length})
                    </h3>

                    {generatedLetters.length === 0 ? (
                      <div className="flex flex-col items-center justify-center p-8 rounded-lg border border-dashed text-center">
                        <Award className="size-8 text-muted-foreground/60 mb-2" />
                        <p className="text-xs font-medium text-foreground">No Generated Letters on File</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Official documents such as Appointment Letters, Confirmation Letters, or Experience Certificates
                          will appear here once issued.
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y rounded-lg border bg-card">
                        {generatedLetters.map((letter: any) => (
                          <div
                            key={letter.id}
                            className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm text-foreground">{letter.title}</span>
                                <Badge variant="outline" className="text-[11px]">
                                  {letter.letterType}
                                </Badge>
                              </div>
                              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                <span>
                                  Issued: {letter.issuedAt ? format(new Date(letter.issuedAt), "dd MMM yyyy") : "—"}
                                </span>
                                <span>•</span>
                                <span className="flex items-center gap-1 text-emerald-600 font-medium">
                                  <CheckCircle2 className="size-3" />
                                  Issued & Certified
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1.5 text-xs"
                                onClick={() => setSelectedLetter(letter)}
                              >
                                <Eye className="size-3.5" />
                                Preview
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1.5 text-xs"
                                onClick={() => handlePrintLetter(letter)}
                              >
                                <Download className="size-3.5" />
                                Download
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Company Awards List */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Corporate Awards & Recognitions
                        </h3>
                        <Badge variant="secondary" className="text-[10px]">
                          {awards.length}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link
                          to="/hr/awards"
                          className="text-xs text-primary hover:underline font-medium flex items-center gap-1 mr-1"
                        >
                          Nomination Queue
                        </Link>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setIsAwardModalOpen(true)}
                          className="h-7 text-xs gap-1.5 font-medium"
                        >
                          <Plus className="size-3.5 text-primary" />
                          Award Employee
                        </Button>
                      </div>
                    </div>

                    {awards.length === 0 ? (
                      <div className="flex flex-col items-center justify-center p-8 rounded-lg border border-dashed text-center">
                        <Trophy className="size-8 text-muted-foreground/60 mb-2" />
                        <p className="text-xs font-medium text-foreground">No Corporate Awards Conferred</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Recognitions, quarterly excellence honors, and company awards will appear here once conferred.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {awards.map((award: any) => (
                          <div
                            key={award.id}
                            className="p-3.5 rounded-lg border bg-card/60 flex items-start justify-between gap-3 transition-colors hover:bg-card"
                          >
                            <div className="flex items-start gap-3 min-w-0">
                              {award.awardType?.imageUrl ? (
                                <div className="size-11 rounded-lg border bg-muted/30 overflow-hidden flex items-center justify-center p-1 shrink-0">
                                  <img
                                    src={award.awardType.imageUrl}
                                    alt={award.awardType.name || "Award"}
                                    className="size-full object-contain"
                                    onError={(e) => {
                                      (e.target as HTMLElement).style.display = "none";
                                    }}
                                  />
                                </div>
                              ) : (
                                <div className="size-11 rounded-lg bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
                                  {renderProfileAwardIcon(award.awardType?.icon, "size-5")}
                                </div>
                              )}

                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-xs text-foreground truncate">
                                    {award.awardType?.name || award.giftItem || "Recognition Award"}
                                  </span>
                                  {award.certificateNo && (
                                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">
                                      {award.certificateNo}
                                    </Badge>
                                  )}
                                  {award.nominationId && (
                                    <Badge variant="secondary" className="text-[9px] font-sans px-1.5 py-0 h-4 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                                      <CheckCircle2 className="size-2.5" /> Approved Nomination
                                    </Badge>
                                  )}
                                </div>

                                <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                                  <Calendar className="size-3 text-muted-foreground/70" />
                                  <span>
                                    Conferred on{" "}
                                    {award.awardDate ? format(new Date(award.awardDate), "dd MMMM yyyy") : "—"}
                                  </span>
                                </p>

                                {award.description && (
                                  <p className="text-[11px] text-muted-foreground/90 line-clamp-2 pt-0.5">
                                    {award.description}
                                  </p>
                                )}

                                <div className="flex items-center gap-3 pt-1 text-[10px] text-muted-foreground">
                                  {award.presentedBy && (
                                    <span>
                                      Presented by: <strong className="text-foreground/80">{award.presentedBy}</strong>
                                    </span>
                                  )}
                                  {Number(award.giftAmount) > 0 && (
                                    <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                      ₹{Number(award.giftAmount).toLocaleString()} Reward
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    let downloadUrl = award.certificateUrl;
                                    if (!downloadUrl && award.id) {
                                      toast.info("Generating verified vector certificate...");
                                      const genRes = await api.post(`/api/awards/${award.id}/certificate/generate`);
                                      downloadUrl = `/api/awards/certificates/${genRes.data?.data?.id}/download`;
                                    }
                                    if (downloadUrl) {
                                      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
                                      const res = await fetch(downloadUrl, {
                                        headers: token ? { Authorization: `Bearer ${token}` } : {},
                                      });
                                      if (res.ok) {
                                        const blob = await res.blob();
                                        const url = window.URL.createObjectURL(blob);
                                        const a = document.createElement("a");
                                        a.href = url;
                                        a.download = `certificate-${award.certificateNo || award.id}.pdf`;
                                        document.body.appendChild(a);
                                        a.click();
                                        a.remove();
                                        window.URL.revokeObjectURL(url);
                                        toast.success("Certificate downloaded.");
                                        return;
                                      }
                                    }
                                    throw new Error("Unable to download certificate.");
                                  } catch (e: any) {
                                    toast.error(e.message || "Failed to download certificate.");
                                  }
                                }}
                                className="h-7 text-[11px] gap-1 px-2 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                                title="Download Official Vector PDF Certificate"
                              >
                                <Download className="size-3" />
                                <span>PDF</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setAwardToDelete(award)}
                                className="size-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                title="Revoke Award"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 6: DOCUMENTS */}
            <TabsContent value="documents" className="space-y-4 focus-visible:outline-none">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <FileText className="size-4 text-primary" />
                        Employee Documents Vault
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Uploaded identification records, employment agreements, and compliance records.
                      </CardDescription>
                    </div>
                    <Badge variant="secondary" className="w-fit text-xs">
                      {companyDocs.length} Documents Stored
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Compliance Meter & Required Checklist */}
                  <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-semibold flex items-center gap-2">
                          <ShieldCheck className="size-4 text-emerald-600" />
                          Document Compliance Status
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Verification progress against tenant mandatory document requirements
                        </p>
                      </div>
                      <Badge
                        variant={complianceRate === 100 ? "default" : "secondary"}
                        className={`text-xs w-fit ${complianceRate === 100 ? "bg-emerald-600" : ""}`}
                      >
                        {verifiedMandatoryCount} / {mandatoryDocTypes.length} Mandatory Verified ({complianceRate}%)
                      </Badge>
                    </div>

                    <Progress value={complianceRate} className="h-2" />

                    {mandatoryDocTypes.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1">
                        {mandatoryDocTypes.map((dt: any) => {
                          const matchingDoc = companyDocs.find(
                            (cd: any) =>
                              cd.category?.toLowerCase() === dt.code?.toLowerCase() ||
                              cd.category?.toLowerCase() === dt.name?.toLowerCase() ||
                              cd.title?.toLowerCase().includes(dt.name?.toLowerCase())
                          );
                          const isMatchedVerified = matchingDoc?.status === "verified";
                          const isMatchedRejected = matchingDoc?.status === "rejected";
                          const isMatchedPending = matchingDoc && !isMatchedVerified && !isMatchedRejected;

                          return (
                            <div
                              key={dt.id}
                              className={`flex items-center justify-between p-2.5 rounded-md border text-xs ${
                                isMatchedVerified
                                  ? "bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800"
                                  : isMatchedRejected
                                    ? "bg-rose-50/50 border-rose-200 dark:bg-rose-950/20 dark:border-rose-800"
                                    : isMatchedPending
                                      ? "bg-amber-50/50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800"
                                      : "bg-muted/30 border-muted-foreground/20"
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                {isMatchedVerified ? (
                                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                                ) : isMatchedRejected ? (
                                  <XCircle className="size-4 text-rose-600 shrink-0" />
                                ) : isMatchedPending ? (
                                  <Clock className="size-4 text-amber-600 shrink-0" />
                                ) : (
                                  <AlertCircle className="size-4 text-muted-foreground shrink-0" />
                                )}
                                <span className="font-medium truncate">{dt.name}</span>
                              </div>
                              <Badge
                                variant={
                                  isMatchedVerified
                                    ? "default"
                                    : isMatchedRejected
                                      ? "destructive"
                                      : "outline"
                                }
                                className="text-[10px] shrink-0"
                              >
                                {isMatchedVerified
                                  ? "Verified"
                                  : isMatchedRejected
                                    ? "Rejected"
                                    : isMatchedPending
                                      ? "Pending Review"
                                      : "Missing"}
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {companyDocs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 rounded-lg border border-dashed text-center">
                      <FileText className="size-8 text-muted-foreground/60 mb-2" />
                      <p className="text-xs font-medium text-foreground">No Uploaded Documents Found</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Documents uploaded for this employee will appear in this secure tenant vault.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y rounded-lg border bg-card">
                      {companyDocs.map((doc: any) => {
                        const isVerified = doc.status === "verified";
                        const isSigned = doc.status === "signed";
                        const isRejected = doc.status === "rejected";
                        return (
                          <div
                            key={doc.id}
                            className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-muted/30 transition-colors"
                          >
                            <div className="space-y-1.5">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold text-sm text-foreground">{doc.title}</span>
                                <Badge variant="outline" className="text-[11px]">
                                  {doc.documentCode}
                                </Badge>
                                <Badge
                                  variant={
                                    isVerified
                                      ? "default"
                                      : isRejected
                                        ? "destructive"
                                        : isSigned
                                          ? "secondary"
                                          : "outline"
                                  }
                                  className="text-[11px] capitalize"
                                >
                                  {doc.status?.replace("_", " ") || "Pending"}
                                </Badge>
                              </div>

                              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                <span>Category: {doc.category}</span>
                                <span>•</span>
                                <span>
                                  File: {doc.fileName} ({doc.fileSize || "PDF"})
                                </span>
                                <span>•</span>
                                <span>
                                  Uploaded: {doc.createdAt ? format(new Date(doc.createdAt), "dd MMM yyyy") : "—"}
                                </span>
                                {doc.expiryDate && (
                                  <>
                                    <span>•</span>
                                    <span>Expires: {format(new Date(doc.expiryDate), "dd MMM yyyy")}</span>
                                  </>
                                )}
                              </div>

                              {isRejected && (doc.rejectionReason || doc.notes) && (
                                <div className="p-2 rounded bg-destructive/10 border border-destructive/20 text-destructive text-[11px] flex items-center gap-1.5">
                                  <AlertCircle className="size-3.5 shrink-0" />
                                  <span>
                                    <strong>Rejection Reason:</strong> {doc.rejectionReason || doc.notes}
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1 text-xs"
                                onClick={() => setSelectedDoc(doc)}
                              >
                                <Eye className="size-3.5" />
                                Preview
                              </Button>

                              <a
                                href={doc.fileUrl || `/api/documents/${doc.id}/stream`}
                                target="_blank"
                                rel="noreferrer"
                                download={doc.fileName}
                              >
                                <Button variant="outline" size="sm" className="h-8 gap-1 text-xs">
                                  <Download className="size-3.5" />
                                  Download
                                </Button>
                              </a>

                              {!isVerified && (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  className="h-8 gap-1 text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400"
                                  disabled={isVerifyingDoc === doc.id}
                                  onClick={() => handleVerifyDocument(doc.id, doc.documentCode)}
                                >
                                  <CheckCircle2 className="size-3.5" />
                                  {isVerifyingDoc === doc.id ? "Verifying..." : "Approve"}
                                </Button>
                              )}

                              {!isVerified && !isRejected && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 gap-1 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 dark:border-rose-800"
                                  onClick={() => {
                                    setDocToReject(doc);
                                    setRejectionReason("");
                                  }}
                                >
                                  <XCircle className="size-3.5" />
                                  Reject
                                </Button>
                              )}

                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 size-8 p-0 text-muted-foreground hover:text-destructive"
                                title="Delete Document"
                                onClick={() => setDocToDelete(doc)}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 7: LIFECYCLE */}
            <TabsContent value="lifecycle" className="space-y-4 focus-visible:outline-none">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg border bg-card text-center space-y-1">
                  <p className="text-[11px] text-muted-foreground font-medium">Promotions</p>
                  <p className="text-xl font-bold text-foreground">{promotionRecords.length}</p>
                </div>
                <div className="p-3 rounded-lg border bg-card text-center space-y-1">
                  <p className="text-[11px] text-muted-foreground font-medium">Transfers</p>
                  <p className="text-xl font-bold text-foreground">{transfers.length}</p>
                </div>
                <div className="p-3 rounded-lg border bg-card text-center space-y-1">
                  <p className="text-[11px] text-muted-foreground font-medium">Disciplinary</p>
                  <p className="text-xl font-bold text-foreground">{disciplinaryWarnings.length}</p>
                </div>
                <div className="p-3 rounded-lg border bg-card text-center space-y-1">
                  <p className="text-[11px] text-muted-foreground font-medium">Separation Status</p>
                  <p className="text-xs font-semibold capitalize mt-1.5">{employeeExits[0]?.status || "Active Tenured"}</p>
                </div>
              </div>

              {/* Promotions Section */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <TrendingUp className="size-4 text-primary" />
                    Promotions & Career Advancements
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Chronological record of role elevations, title changes, and rank revisions.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {promotionRecords.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">No promotion records logged.</p>
                  ) : (
                    <div className="divide-y rounded-lg border">
                      {promotionRecords.map((p: any) => (
                        <div key={p.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 font-medium">
                              <span className="text-muted-foreground line-through">{p.previousDesignation || "Initial Rank"}</span>
                              <ChevronRight className="size-3.5 text-muted-foreground" />
                              <span className="font-semibold text-foreground text-sm">{p.newDesignation || "Advanced Position"}</span>
                            </div>
                            {p.notes && <p className="text-muted-foreground text-[11px]">{p.notes}</p>}
                          </div>
                          <Badge variant="outline" className="text-[11px] shrink-0 w-fit">
                            {p.promotionDate ? format(new Date(p.promotionDate), "dd MMM yyyy") : "—"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Transfers Section */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Building2 className="size-4 text-primary" />
                    Transfers & Relocations
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Branch reassignments, departmental shifts, and unit reorganizations.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {transfers.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">No branch or departmental transfers recorded.</p>
                  ) : (
                    <div className="divide-y rounded-lg border">
                      {transfers.map((t: any) => (
                        <div key={t.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                          <div className="space-y-1">
                            <div className="font-semibold text-foreground">
                              Branch: {t.previousBranch || "—"} → {t.newBranch || "—"}
                            </div>
                            <div className="text-muted-foreground text-[11px]">
                              Department: {t.previousDepartment || "—"} → {t.newDepartment || "—"}
                            </div>
                            {t.notes && <p className="text-muted-foreground text-[11px]">{t.notes}</p>}
                          </div>
                          <Badge variant="outline" className="text-[11px] shrink-0 w-fit">
                            {t.effectiveDate ? format(new Date(t.effectiveDate), "dd MMM yyyy") : "—"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Disciplinary Warnings */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <AlertTriangle className="size-4 text-amber-600" />
                    Disciplinary & Compliance Actions
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Compliance notices, warnings, and formal governance reviews.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {disciplinaryWarnings.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">Clean record. No disciplinary warnings registered.</p>
                  ) : (
                    <div className="divide-y rounded-lg border">
                      {disciplinaryWarnings.map((w: any) => (
                        <div key={w.id} className="p-3.5 space-y-1.5 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-foreground">{w.subject || "Disciplinary Notice"}</span>
                            <Badge variant="outline" className="text-[10px] text-amber-700 bg-amber-50 dark:bg-amber-950/40 border-amber-300">
                              {w.warningType?.name || "Official Notice"}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground text-[11px]">{w.description}</p>
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                            <span>Status: {w.status || "Active"}</span>
                            <span>Date: {w.warningDate ? format(new Date(w.warningDate), "dd MMM yyyy") : "—"}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Exit / Separation Details */}
              {employeeExits.length > 0 && (
                <Card className="border-rose-200 dark:border-rose-900 bg-rose-50/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2 text-rose-700 dark:text-rose-400">
                      <CalendarOff className="size-4" />
                      Separation & Offboarding Case
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs">
                    {employeeExits.map((ex: any) => (
                      <div key={ex.id} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                        <DetailField label="Exit Type" value={ex.exitType?.replace("_", " ")} />
                        <DetailField label="Resignation Date" value={ex.resignationDate ? format(new Date(ex.resignationDate), "dd MMM yyyy") : "—"} />
                        <DetailField label="Last Working Date" value={ex.lastWorkingDate ? format(new Date(ex.lastWorkingDate), "dd MMM yyyy") : "—"} />
                        <DetailField label="Status" value={ex.status} badge={<Badge variant="outline" className="capitalize text-[10px]">{ex.status}</Badge>} />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* TAB 8: ATTENDANCE & TIMESHEETS */}
            <TabsContent value="attendance" className="space-y-4 focus-visible:outline-none">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg border bg-card text-center space-y-1">
                  <p className="text-[11px] text-muted-foreground font-medium">Logged Days</p>
                  <p className="text-xl font-bold text-foreground">{attendanceRecords.length}</p>
                </div>
                <div className="p-3 rounded-lg border bg-card text-center space-y-1">
                  <p className="text-[11px] text-muted-foreground font-medium">Present</p>
                  <p className="text-xl font-bold text-emerald-600">
                    {attendanceRecords.filter((a: any) => a.status === "present").length}
                  </p>
                </div>
                <div className="p-3 rounded-lg border bg-card text-center space-y-1">
                  <p className="text-[11px] text-muted-foreground font-medium">Late / Half-Day</p>
                  <p className="text-xl font-bold text-amber-600">
                    {attendanceRecords.filter((a: any) => a.status === "late" || a.status === "half_day").length}
                  </p>
                </div>
                <div className="p-3 rounded-lg border bg-card text-center space-y-1">
                  <p className="text-[11px] text-muted-foreground font-medium">Active Shift</p>
                  <p className="text-xs font-semibold mt-1.5 truncate">{activeShift?.name || "Standard Office"}</p>
                </div>
              </div>

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Clock className="size-4 text-primary" />
                        Recent Attendance Punches & Timesheets
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Daily check-in / check-out records and total hours logged.
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="w-fit text-xs">
                      Last 30 Records
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {attendanceRecords.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 rounded-lg border border-dashed text-center">
                      <Clock className="size-8 text-muted-foreground/60 mb-2" />
                      <p className="text-xs font-medium text-foreground">No Attendance Logs Found</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Timesheet and punch records for this employee will appear here once registered.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-lg border overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-muted/50 border-b text-muted-foreground">
                          <tr>
                            <th className="p-3 font-medium">Date</th>
                            <th className="p-3 font-medium">Check-In</th>
                            <th className="p-3 font-medium">Check-Out</th>
                            <th className="p-3 font-medium">Total Hours</th>
                            <th className="p-3 font-medium">Status</th>
                            <th className="p-3 font-medium">Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {attendanceRecords.map((att: any) => (
                            <tr key={att.id} className="hover:bg-muted/30">
                              <td className="p-3 font-medium">
                                {att.date ? format(new Date(att.date), "dd MMM yyyy") : "—"}
                              </td>
                              <td className="p-3 text-muted-foreground">{att.checkIn || "—"}</td>
                              <td className="p-3 text-muted-foreground">{att.checkOut || "—"}</td>
                              <td className="p-3 font-medium">{att.totalHours ? `${att.totalHours} hrs` : "—"}</td>
                              <td className="p-3">
                                <Badge
                                  variant={att.status === "present" ? "default" : att.status === "absent" ? "destructive" : "secondary"}
                                  className="capitalize text-[10px]"
                                >
                                  {att.status || "logged"}
                                </Badge>
                              </td>
                              <td className="p-3 text-muted-foreground text-[11px] max-w-[180px] truncate">{att.notes || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 9: LEAVE & BALANCES */}
            <TabsContent value="leave" className="space-y-4 focus-visible:outline-none">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg border bg-card text-center space-y-1">
                  <p className="text-[11px] text-muted-foreground font-medium">Total Requests</p>
                  <p className="text-xl font-bold text-foreground">{leaveRequests.length}</p>
                </div>
                <div className="p-3 rounded-lg border bg-card text-center space-y-1">
                  <p className="text-[11px] text-muted-foreground font-medium">Approved</p>
                  <p className="text-xl font-bold text-emerald-600">
                    {leaveRequests.filter((l: any) => l.status === "approved").length}
                  </p>
                </div>
                <div className="p-3 rounded-lg border bg-card text-center space-y-1">
                  <p className="text-[11px] text-muted-foreground font-medium">Pending Review</p>
                  <p className="text-xl font-bold text-amber-600">
                    {leaveRequests.filter((l: any) => l.status === "pending").length}
                  </p>
                </div>
                <div className="p-3 rounded-lg border bg-card text-center space-y-1">
                  <p className="text-[11px] text-muted-foreground font-medium">Days Taken</p>
                  <p className="text-xl font-bold text-foreground">
                    {leaveRequests
                      .filter((l: any) => l.status === "approved")
                      .reduce((sum: number, l: any) => sum + (Number(l.totalDays) || 1), 0)}
                  </p>
                </div>
              </div>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <CalendarOff className="size-4 text-primary" />
                    Leave Requests History
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Paid time off, sick leaves, casual leaves, and statutory absences.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {leaveRequests.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 rounded-lg border border-dashed text-center">
                      <CalendarOff className="size-8 text-muted-foreground/60 mb-2" />
                      <p className="text-xs font-medium text-foreground">No Leave Requests Found</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Submitted leave applications will be listed here with approval workflow statuses.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y rounded-lg border bg-card">
                      {leaveRequests.map((lr: any) => (
                        <div key={lr.id} className="p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs hover:bg-muted/30">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground">{lr.leaveType?.name || "General Leave"}</span>
                              <Badge
                                variant={lr.status === "approved" ? "default" : lr.status === "rejected" ? "destructive" : "secondary"}
                                className="capitalize text-[10px]"
                              >
                                {lr.status || "pending"}
                              </Badge>
                              <span className="text-[11px] font-medium text-muted-foreground">
                                ({lr.totalDays || 1} {Number(lr.totalDays) === 1 ? "day" : "days"})
                              </span>
                            </div>
                            <p className="text-muted-foreground text-[11px]">{lr.reason || "No reason specified."}</p>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-muted-foreground text-[11px] shrink-0">
                            <span className="">
                              {lr.startDate ? format(new Date(lr.startDate), "dd MMM yyyy") : "—"} →{" "}
                              {lr.endDate ? format(new Date(lr.endDate), "dd MMM yyyy") : "—"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 10: PAYROLL & PAYSLIPS */}
            <TabsContent value="payroll" className="space-y-4 focus-visible:outline-none">
              {/* Compensation Structure */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <CreditCard className="size-4 text-primary" />
                    Compensation & Statutory Configuration
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Salary grade, statutory contributions eligibility, and banking disbursement profile.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    <DetailField
                      label="Annual CTC / Base Compensation"
                      value={emp.salary ? `₹${Number(emp.salary).toLocaleString()}` : "Confidential"}
                      icon={<DollarSign className="size-3.5" />}
                      highlight
                    />
                    <DetailField
                      label="Tax Regime"
                      value={emp.taxRegime === "new" ? "New Tax Regime (Sec 115BAC)" : "Old Tax Regime"}
                      icon={<FileText className="size-3.5" />}
                    />
                    <DetailField
                      label="Payment Method"
                      value={emp.bankAccount ? "Direct Bank Transfer" : "Manual / Cheque"}
                      icon={<Landmark className="size-3.5" />}
                    />
                  </div>

                  <div className="p-3.5 rounded-lg border bg-muted/30 space-y-2">
                    <p className="text-xs font-semibold text-foreground">Statutory Compliance Enrollments</p>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <Badge variant={emp.pfEligible !== false ? "default" : "secondary"}>
                        PF {emp.pfEligible !== false ? "Enrolled" : "Exempt"}
                      </Badge>
                      <Badge variant={emp.esiEligible !== false ? "default" : "secondary"}>
                        ESI {emp.esiEligible !== false ? "Enrolled" : "Exempt"}
                      </Badge>
                      <Badge variant={emp.tdsEligible !== false ? "default" : "secondary"}>
                        TDS {emp.tdsEligible !== false ? "Deductible" : "Exempt"}
                      </Badge>
                      <Badge variant={emp.ptEligible !== false ? "default" : "secondary"}>
                        Professional Tax {emp.ptEligible !== false ? "Applicable" : "Exempt"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payslips Archive */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <FileSpreadsheet className="size-4 text-primary" />
                        Issued Payslips Archive
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Downloadable monthly salary slips and tax withholding breakdowns.
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="w-fit text-xs">
                      {payslips.length} Payslips Available
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {payslips.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 rounded-lg border border-dashed text-center">
                      <FileSpreadsheet className="size-8 text-muted-foreground/60 mb-2" />
                      <p className="text-xs font-medium text-foreground">No Payslips Generated Yet</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Monthly payroll disbursement statements will appear here upon payroll processing cycles.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y rounded-lg border bg-card">
                      {payslips.map((ps: any) => (
                        <div key={ps.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-muted/30">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground">
                                {ps.month} {ps.year}
                              </span>
                              <Badge variant="outline" className="capitalize text-[10px]">
                                {ps.status || "Paid"}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap gap-3 text-muted-foreground text-[11px]">
                              <span>Gross: ₹{Number(ps.grossSalary || 0).toLocaleString()}</span>
                              <span>•</span>
                              <span>Deductions: ₹{Number(ps.totalDeductions || 0).toLocaleString()}</span>
                              <span>•</span>
                              <span className="font-semibold text-emerald-600">
                                Net: ₹{Number(ps.netSalary || 0).toLocaleString()}
                              </span>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5 text-xs text-primary"
                            onClick={() => toast.info(`Downloading payslip for ${ps.month} ${ps.year}...`)}
                          >
                            <Download className="size-3.5" />
                            Payslip PDF
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 11: ASSIGNED ASSETS */}
            <TabsContent value="assets" className="space-y-4 focus-visible:outline-none">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Laptop className="size-4 text-primary" />
                        Company Property & Assigned Assets
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Hardware, peripherals, security tokens, and corporate inventory assigned to this employee.
                      </CardDescription>
                    </div>
                    <Badge variant="secondary" className="w-fit text-xs">
                      {assignedAssets.length} Assets Custody
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {assignedAssets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 rounded-lg border border-dashed text-center">
                      <Laptop className="size-8 text-muted-foreground/60 mb-2" />
                      <p className="text-xs font-medium text-foreground">No Company Assets Currently Assigned</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Laptops, access cards, and company equipment assigned to this employee will appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y rounded-lg border bg-card">
                      {assignedAssets.map((asset: any) => (
                        <div key={asset.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-muted/30">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground text-sm">{asset.name}</span>
                              <Badge variant="outline" className="text-[11px]">
                                {asset.assetCode}
                              </Badge>
                              <Badge variant="secondary" className="capitalize text-[10px]">
                                {asset.status?.replace("_", " ") || "In Custody"}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap gap-3 text-muted-foreground text-[11px]">
                              <span>Category: {asset.category || "IT Asset"}</span>
                              {asset.serialNumber && (
                                <>
                                  <span>•</span>
                                  <span className="">SN: {asset.serialNumber}</span>
                                </>
                              )}
                              <span>•</span>
                              <span>Condition: {asset.condition || "Operational"}</span>
                            </div>
                          </div>
                          <div className="text-[11px] text-muted-foreground shrink-0">
                            Assigned: {asset.assignedAt ? format(new Date(asset.assignedAt), "dd MMM yyyy") : "—"}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 12: TRAINING & COURSES */}
            <TabsContent value="training" className="space-y-4 focus-visible:outline-none">
              {/* Training Programs */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <GraduationCap className="size-4 text-primary" />
                    Corporate Training Programs
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Compliance modules, security awareness drills, and skill development workshops.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {trainingTasks.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">No active training programs assigned.</p>
                  ) : (
                    <div className="divide-y rounded-lg border bg-card">
                      {trainingTasks.map((tt: any) => (
                        <div key={tt.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-muted/30">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 font-medium">
                              <span className="font-semibold text-foreground">{tt.trainingProgram?.name || "Training Task"}</span>
                              <Badge
                                variant={tt.status === "completed" ? "default" : "outline"}
                                className="capitalize text-[10px]"
                              >
                                {tt.status?.replace("_", " ") || "Assigned"}
                              </Badge>
                            </div>
                            {tt.score && <p className="text-[11px] text-emerald-600 font-medium">Evaluation Score: {tt.score}%</p>}
                          </div>
                          <div className="text-[11px] text-muted-foreground shrink-0">
                            Due: {tt.dueDate ? format(new Date(tt.dueDate), "dd MMM yyyy") : "Ongoing"}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* LMS Course Enrollments */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <BookOpen className="size-4 text-primary" />
                    LMS Course Enrollments
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Self-paced learning courses, syllabus progress, and completion certificates.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {courseEnrollments.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">No LMS course enrollments recorded.</p>
                  ) : (
                    <div className="divide-y rounded-lg border bg-card">
                      {courseEnrollments.map((ce: any) => (
                        <div key={ce.id} className="p-3.5 space-y-2 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-foreground">{ce.course?.title || "Self-Paced Course"}</span>
                            <Badge variant={ce.status === "completed" ? "default" : "secondary"} className="capitalize text-[10px]">
                              {ce.status?.replace("_", " ") || "In Progress"}
                            </Badge>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] text-muted-foreground">
                              <span>Progress</span>
                              <span className="">{ce.progress || 0}%</span>
                            </div>
                            <Progress value={Number(ce.progress) || 0} className="h-1.5" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 13: QUALIFICATIONS & WORK EXPERIENCE */}
            <TabsContent value="qualifications-experience" className="space-y-4 focus-visible:outline-none">
              {/* Academic Qualifications */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <BookOpen className="size-4 text-primary" />
                    Academic & Professional Qualifications
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Degrees, diplomas, university certificates, and verified academic credentials.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {qualifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 rounded-lg border border-dashed text-center">
                      <BookOpen className="size-8 text-muted-foreground/60 mb-2" />
                      <p className="text-xs font-medium text-foreground">No Educational Qualifications Logged</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Degrees and certifications added during onboarding will appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y rounded-lg border bg-card">
                      {qualifications.map((q: any, idx: number) => (
                        <div key={idx} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-muted/30">
                          <div className="space-y-1">
                            <div className="font-semibold text-foreground text-sm">
                              {q.degree || q.title || "Academic Degree"}
                            </div>
                            <div className="text-muted-foreground text-[11px]">
                              {q.institution || q.college || "University"} {q.specialization ? `• ${q.specialization}` : ""}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {q.grade && <Badge variant="outline" className="text-[10px]">Grade: {q.grade}</Badge>}
                            <Badge variant="secondary" className="text-[10px]">{q.year || q.passingYear || "Completed"}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Past Employment Experience */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Briefcase className="size-4 text-primary" />
                    Previous Employment History
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Past employers, job titles, tenure, and prior experience records.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {workExperience.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 rounded-lg border border-dashed text-center">
                      <Briefcase className="size-8 text-muted-foreground/60 mb-2" />
                      <p className="text-xs font-medium text-foreground">No Prior Experience Records Logged</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Previous company tenures documented during candidate verification will appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y rounded-lg border bg-card">
                      {workExperience.map((exp: any, idx: number) => (
                        <div key={idx} className="p-3.5 space-y-1.5 text-xs hover:bg-muted/30">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-foreground text-sm">
                              {exp.title || exp.designation || "Role"} @ {exp.company || exp.employer || "Company"}
                            </span>
                            <span className="text-[11px] text-muted-foreground shrink-0">
                              {exp.fromDate || exp.startDate || "—"} to {exp.toDate || exp.endDate || "Present"}
                            </span>
                          </div>
                          {exp.responsibilities && (
                            <p className="text-muted-foreground text-[11px]">{exp.responsibilities}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 14: FAMILY & DEPENDENTS */}
            <TabsContent value="family" className="space-y-4 focus-visible:outline-none">
              {/* Emergency Primary Contact Highlight */}
              <Card className="border-emerald-200 dark:border-emerald-900 bg-emerald-50/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                    <ShieldCheck className="size-4" />
                    Designated Primary Emergency Contact
                  </CardTitle>
                  <CardDescription className="text-xs">
                    First responder contact information registered in corporate safety database.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <DetailField label="Contact Person" value={emp.emergencyContactName} icon={<User className="size-3.5" />} highlight />
                    <DetailField label="Relationship" value={emp.emergencyContactRelationship} icon={<Heart className="size-3.5" />} />
                    <DetailField label="Contact Phone" value={emp.emergencyContactPhone} icon={<Phone className="size-3.5" />} mono />
                  </div>
                </CardContent>
              </Card>

              {/* Family Members & Dependents List */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Users className="size-4 text-primary" />
                        Family Members & Dependents
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Family profiles for corporate health insurance benefits and emergency assistance.
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="w-fit text-xs">
                      {familyMembers.length} Members Registered
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {familyMembers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 rounded-lg border border-dashed text-center">
                      <Users className="size-8 text-muted-foreground/60 mb-2" />
                      <p className="text-xs font-medium text-foreground">No Family Members Logged</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Spouse, children, and dependent parent records added for insurance benefits will appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y rounded-lg border bg-card">
                      {familyMembers.map((fam: any, idx: number) => (
                        <div key={idx} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-muted/30">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground text-sm">{fam.name}</span>
                              <Badge variant="outline" className="capitalize text-[10px]">
                                {fam.relationship || "Dependent"}
                              </Badge>
                              {fam.isEmergencyContact && (
                                <Badge variant="default" className="text-[10px] bg-emerald-600">
                                  Emergency Contact
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-3 text-muted-foreground text-[11px]">
                              {fam.phone && <span>Phone: {fam.phone}</span>}
                              {fam.email && (
                                <>
                                  <span>•</span>
                                  <span>Email: {fam.email}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 15: AUDIT TRAIL & MUTATION LOG */}
            <TabsContent value="audit-trail" className="space-y-4 focus-visible:outline-none">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Activity className="size-4 text-primary" />
                        Audit Trail & Profile Mutation History
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Immutable system audit logs detailing profile revisions, document operations, and lifecycle updates.
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="w-fit text-xs">
                      {auditLogs.length} Events Logged
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {auditLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 rounded-lg border border-dashed text-center">
                      <Activity className="size-8 text-muted-foreground/60 mb-2" />
                      <p className="text-xs font-medium text-foreground">No Audit Events Logged</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        System changes and security mutations regarding this profile will appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y rounded-lg border bg-card">
                      {auditLogs.map((log: any) => (
                        <div key={log.id} className="p-3.5 space-y-1.5 text-xs hover:bg-muted/30">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[10px] uppercase">
                                {log.action}
                              </Badge>
                              <span className="text-muted-foreground text-[11px]">by {log.actorId || "System"}</span>
                            </div>
                            <span className="text-[11px] text-muted-foreground">
                              {log.createdAt ? format(new Date(log.createdAt), "dd MMM yyyy HH:mm:ss") : "—"}
                            </span>
                          </div>
                          {log.metadata && (
                            <div className="bg-muted/40 p-2 rounded text-[11px] text-muted-foreground truncate">
                              {typeof log.metadata === "string" ? log.metadata : JSON.stringify(log.metadata)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Generated Letter Preview Dialog */}
      <Dialog open={!!selectedLetter} onOpenChange={(open) => !open && setSelectedLetter(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Award className="size-5 text-primary" />
              {selectedLetter?.title || "Letter Preview"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {selectedLetter?.letterType} • Issued on{" "}
              {selectedLetter?.issuedAt ? format(new Date(selectedLetter.issuedAt), "dd MMMM yyyy") : "—"}
            </DialogDescription>
          </DialogHeader>

          <div
            className="p-5 border rounded-lg bg-card text-foreground text-xs leading-relaxed max-h-[50vh] overflow-y-auto space-y-3 prose dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{
              __html: selectedLetter?.contentHtml || "<p>No content preview available.</p>",
            }}
          />

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="default"
              size="sm"
              className="gap-1.5"
              onClick={() => selectedLetter && handlePrintLetter(selectedLetter)}
            >
              <Download className="size-3.5" />
              Print / Download
            </Button>
            <Button variant="outline" size="sm" onClick={() => setSelectedLetter(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Uploaded Document Preview Dialog */}
      <Dialog open={!!selectedDoc} onOpenChange={(open) => !open && setSelectedDoc(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <FileText className="size-5 text-primary" />
              {selectedDoc?.title || "Document Details"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Document Code: {selectedDoc?.documentCode} • Category: {selectedDoc?.category}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="p-3 bg-muted/40 rounded-lg space-y-2 border">
              <div className="flex justify-between">
                <span className="text-muted-foreground">File Name:</span>
                <span className="font-medium">{selectedDoc?.fileName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">File Size:</span>
                <span className="font-medium">{selectedDoc?.fileSize || "Standard"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant="outline" className="capitalize text-[11px]">
                  {selectedDoc?.status?.replace("_", " ")}
                </Badge>
              </div>
              {selectedDoc?.signedAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Digital Signature:</span>
                  <span className="font-medium text-emerald-600">
                    Signed by {selectedDoc.signerName} on {format(new Date(selectedDoc.signedAt), "dd MMM yyyy")}
                  </span>
                </div>
              )}
              {selectedDoc?.verifiedAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Verified By:</span>
                  <span className="font-medium text-emerald-600">
                    {selectedDoc.verifiedBy} ({format(new Date(selectedDoc.verifiedAt), "dd MMM yyyy")})
                  </span>
                </div>
              )}
            </div>

            {selectedDoc?.fileUrl ? (
              <div className="border rounded-lg p-2 bg-muted/10 h-64 flex items-center justify-center">
                <iframe
                  src={selectedDoc.fileUrl}
                  title="Document Preview"
                  className="w-full h-full rounded border-0"
                />
              </div>
            ) : (
              <div className="p-6 border border-dashed rounded-lg text-center text-muted-foreground">
                <FileText className="size-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs font-medium">Binary preview stream available via download</p>
                <p className="text-[11px] mt-1">Use the download action below to access this encrypted tenant document.</p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <a
              href={selectedDoc?.fileUrl || `/api/documents/${selectedDoc?.id}/stream`}
              target="_blank"
              rel="noreferrer"
              download={selectedDoc?.fileName}
            >
              <Button size="sm" className="gap-1.5">
                <Download className="size-3.5" />
                Download Document
              </Button>
            </a>
            <Button variant="outline" size="sm" onClick={() => setSelectedDoc(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Deletion */}
      <ConfirmationDialog
        open={!!docToDelete}
        onOpenChange={(open) => !open && setDocToDelete(null)}
        title="Delete Employee Document"
        description={`Are you sure you want to permanently delete "${docToDelete?.title}" (${docToDelete?.documentCode}) from this employee's document vault? This operation cannot be undone.`}
        confirmLabel={isDeletingDoc ? "Deleting..." : "Delete Document"}
        variant="destructive"
        isLoading={isDeletingDoc}
        onConfirm={handleDeleteDocument}
      />

      {/* Award Employee Modal */}
      <Dialog open={isAwardModalOpen} onOpenChange={setIsAwardModalOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <Award className="size-4 text-amber-500" />
              Award Employee
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Confer corporate recognition and an excellence certificate to {emp?.firstName} {emp?.lastName}.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              assignAwardMutation.mutate();
            }}
            className="space-y-4 pt-2"
          >
            {/* Select Award Type */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Award Type *</Label>
              <Select
                value={awardFormData.awardTypeId}
                onValueChange={(val) => {
                  const selected = activeAwardTypes.find((t: any) => t.id === val);
                  setAwardFormData((prev) => ({
                    ...prev,
                    awardTypeId: val,
                    giftItem: selected?.name || prev.giftItem,
                  }));
                }}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Choose award category..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {activeAwardTypes.map((at: any) => (
                    <SelectItem key={at.id} value={at.id} className="text-xs">
                      <div className="flex items-center gap-2">
                        {renderProfileAwardIcon(at.icon, "size-3.5 text-amber-500")}
                        <span>{at.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Award Date */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Conferred Date *</Label>
              <Input
                type="date"
                value={awardFormData.awardDate}
                onChange={(e) => setAwardFormData((prev) => ({ ...prev, awardDate: e.target.value }))}
                required
                className="h-9 text-xs"
              />
            </div>

            {/* Citation */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Recognition Citation / Reason</Label>
              <Textarea
                value={awardFormData.description}
                onChange={(e) => setAwardFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Reason for honor, project delivered, or performance milestone..."
                rows={2}
                className="text-xs resize-none"
              />
            </div>

            {/* Issuer & Reward */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Presented By</Label>
                <Input
                  value={awardFormData.presentedBy}
                  onChange={(e) => setAwardFormData((prev) => ({ ...prev, presentedBy: e.target.value }))}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Reward Amount</Label>
                <Input
                  type="number"
                  min="0"
                  value={awardFormData.giftAmount}
                  onChange={(e) => setAwardFormData((prev) => ({ ...prev, giftAmount: e.target.value }))}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAwardModalOpen(false)}
                className="h-9 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={assignAwardMutation.isPending}
                className="h-9 text-xs gap-1.5"
              >
                {assignAwardMutation.isPending && <Loader2 className="size-3.5 animate-spin" />}
                Confer Award
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Award Revocation */}
      <ConfirmationDialog
        open={Boolean(awardToDelete)}
        onOpenChange={(open) => !open && setAwardToDelete(null)}
        title="Revoke Corporate Award?"
        description={`Are you sure you want to revoke and delete '${awardToDelete?.awardType?.name || awardToDelete?.giftItem || "this award"}' from ${emp?.firstName} ${emp?.lastName}'s profile? This audit action cannot be undone.`}
        confirmLabel={revokeAwardMutation.isPending ? "Revoking..." : "Revoke Award"}
        variant="destructive"
        isLoading={revokeAwardMutation.isPending}
        onConfirm={() => {
          if (awardToDelete?.id) {
            revokeAwardMutation.mutate(awardToDelete.id);
          }
        }}
      />

      {/* Document Rejection Reason Dialog */}
      <Dialog
        open={Boolean(docToReject)}
        onOpenChange={(open) => {
          if (!open) {
            setDocToReject(null);
            setRejectionReason("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-rose-600">
              <XCircle className="size-5" />
              Reject Document
            </DialogTitle>
            <DialogDescription className="text-xs">
              Reject document &quot;{docToReject?.title}&quot; ({docToReject?.documentCode}). The employee will be required to upload a corrected version.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Rejection Reason / Required Correction *</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Blurry scan, illegible signature, expired validity date, or name mismatch..."
                rows={3}
                className="text-xs resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setDocToReject(null);
                setRejectionReason("");
              }}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isRejectingDoc || !rejectionReason.trim()}
              onClick={handleRejectDocument}
              className="text-xs gap-1.5"
            >
              {isRejectingDoc && <Loader2 className="size-3.5 animate-spin" />}
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Employee360Page;
