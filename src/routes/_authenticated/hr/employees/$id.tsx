import { useState } from "react";
import { createFileRoute, Link, Outlet, useChildMatches } from "@tanstack/react-router";
import { format } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";

function EmployeeRouteWrapper() {
  const childMatches = useChildMatches();
  if (childMatches && childMatches.length > 0) {
    return <Outlet />;
  }
  return <Employee360Page />;
}

export const Route = createFileRoute("/_authenticated/hr/employees/$id")({
  component: EmployeeRouteWrapper,
  head: () => ({
    meta: [{ title: "Employee Profile — Master HRMS" }],
  }),
});

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
          className={`text-sm truncate ${mono ? "font-mono" : ""} ${
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

export function Employee360Page() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("basic-info");

  // Document actions state
  const [selectedLetter, setSelectedLetter] = useState<any | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [docToDelete, setDocToDelete] = useState<any | null>(null);
  const [isDeletingDoc, setIsDeletingDoc] = useState(false);
  const [isVerifyingDoc, setIsVerifyingDoc] = useState<string | null>(null);

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

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 2.A Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1 border-b">
        <div className="space-y-1">
          <BreadcrumbNav
            items={[
              { label: "Dashboard", href: "/dashboard" },
              { label: "Employees", href: "/hr/employees" },
              { label: fullName },
            ]}
          />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{fullName}</h1>
          <p className="text-xs text-muted-foreground">
            View detailed information and activity for employee.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link to="/hr/employees">
            <Button variant="outline" size="sm" className="gap-1.5 h-9">
              <ArrowLeft className="size-4" />
              Back to Employees
            </Button>
          </Link>
          <Link to="/hr/employees/$id/edit" params={{ id: emp.id }}>
            <Button size="sm" className="gap-1.5 h-9 bg-emerald-600 hover:bg-emerald-700 text-white">
              <Edit className="size-4" />
              Edit Employee
            </Button>
          </Link>
        </div>
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
                  <Badge variant="outline" className="font-mono text-[11px] px-2 py-0.5">
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
                  <span className="font-mono font-medium text-foreground">{emp.employeeCode || "—"}</span>
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
            {/* Tab navigation bar */}
            <TabsList className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 h-auto p-1 bg-muted/70 gap-1 rounded-lg">
              <TabsTrigger
                value="basic-info"
                className="gap-1.5 text-xs py-2 data-[state=active]:bg-background data-[state=active]:shadow-xs"
              >
                <User className="size-3.5" />
                <span>Basic Info</span>
              </TabsTrigger>
              <TabsTrigger
                value="employment"
                className="gap-1.5 text-xs py-2 data-[state=active]:bg-background data-[state=active]:shadow-xs"
              >
                <Briefcase className="size-3.5" />
                <span>Employment</span>
              </TabsTrigger>
              <TabsTrigger
                value="contact"
                className="gap-1.5 text-xs py-2 data-[state=active]:bg-background data-[state=active]:shadow-xs"
              >
                <Phone className="size-3.5" />
                <span>Contact</span>
              </TabsTrigger>
              <TabsTrigger
                value="banking"
                className="gap-1.5 text-xs py-2 data-[state=active]:bg-background data-[state=active]:shadow-xs"
              >
                <Landmark className="size-3.5" />
                <span>Banking</span>
              </TabsTrigger>
              <TabsTrigger
                value="certifications"
                className="gap-1.5 text-xs py-2 data-[state=active]:bg-background data-[state=active]:shadow-xs"
              >
                <Award className="size-3.5" />
                <span>Certifications</span>
              </TabsTrigger>
              <TabsTrigger
                value="documents"
                className="gap-1.5 text-xs py-2 data-[state=active]:bg-background data-[state=active]:shadow-xs"
              >
                <FileText className="size-3.5" />
                <span>Documents</span>
              </TabsTrigger>
            </TabsList>

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
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Corporate Awards & Recognitions ({awards.length})
                    </h3>
                    {awards.length === 0 ? (
                      <div className="flex flex-col items-center justify-center p-8 rounded-lg border border-dashed text-center">
                        <Award className="size-8 text-muted-foreground/60 mb-2" />
                        <p className="text-xs font-medium text-foreground">No Corporate Awards Conferred</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Recognitions, quarterly excellence honors, and company awards will appear here once conferred.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {awards.map((award: any) => (
                          <div key={award.id} className="p-3.5 rounded-lg border bg-card/60 flex items-start gap-3">
                            <div className="p-2 rounded-full bg-amber-500/10 text-amber-600 shrink-0">
                              <Award className="size-4" />
                            </div>
                            <div className="space-y-0.5">
                              <div className="font-semibold text-xs text-foreground">
                                {award.awardType?.name || award.title || "Recognition Award"}
                              </div>
                              <p className="text-[11px] text-muted-foreground">
                                Conferred on {award.awardDate ? format(new Date(award.awardDate), "dd MMMM yyyy") : "—"}
                              </p>
                              {award.description && (
                                <p className="text-[11px] text-muted-foreground/80 pt-1">{award.description}</p>
                              )}
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
                    <Badge variant="secondary" className="w-fit text-xs font-mono">
                      {companyDocs.length} Documents Stored
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
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
                        return (
                          <div
                            key={doc.id}
                            className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-muted/30 transition-colors"
                          >
                            <div className="space-y-1.5">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold text-sm text-foreground">{doc.title}</span>
                                <Badge variant="outline" className="font-mono text-[11px]">
                                  {doc.documentCode}
                                </Badge>
                                <Badge
                                  variant={
                                    isVerified
                                      ? "default"
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
                <span className="font-medium font-mono">{selectedDoc?.fileName}</span>
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
    </div>
  );
}
