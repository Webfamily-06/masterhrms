import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  UserPlus,
  User,
  Phone,
  Briefcase,
  DollarSign,
  ShieldCheck,
  FileText,
  Key,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Loader2,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/hr/employees/new")({
  component: NewEmployeeWizardPage,
  head: () => ({
    meta: [{ title: "New Employee Onboarding Wizard — Master HRMS" }],
  }),
});

const STEPS = [
  { id: 1, title: "Personal", icon: User },
  { id: 2, title: "Contact", icon: Phone },
  { id: 3, title: "Job Details", icon: Briefcase },
  { id: 4, title: "Compensation", icon: DollarSign },
  { id: 5, title: "Statutory & Bank", icon: ShieldCheck },
  { id: 6, title: "Documents", icon: FileText },
  { id: 7, title: "Access & Login", icon: Key },
  { id: 8, title: "Review & Submit", icon: CheckCircle2 },
];

export function NewEmployeeWizardPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);

  // Form State covering all 8 wizard steps
  const [formData, setFormData] = useState({
    // Step 1: Personal
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    gender: "male",
    maritalStatus: "single",
    avatarUrl: "",

    // Step 2: Contact
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    emergencyContactName: "",
    emergencyContactPhone: "",

    // Step 3: Job
    employeeCode: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
    branchId: "",
    departmentId: "",
    designationId: "",
    managerId: "",
    position: "",
    employmentType: "full_time",
    joinedAt: new Date().toISOString().split("T")[0],
    status: "active",

    // Step 4: Compensation
    salary: "",
    taxRegime: "new",
    pfEligible: true,
    esiEligible: true,
    ptEligible: true,
    tdsEligible: true,

    // Step 5: Statutory & Bank
    pan: "",
    aadhaar: "",
    uan: "",
    esiNumber: "",
    pfNumber: "",
    bankName: "",
    bankAccount: "",
    bankIfsc: "",
    bankBranch: "",

    // Step 6: Documents
    documentTitle: "",
    documentUrl: "",

    // Step 7: Access
    createLoginAccount: true,
    password: "Employee@123",
    userRole: "employee",

    // Step 8: Onboarding notes
    onboardingNotes: "",
  });

  const updateField = (key: string, val: any) => {
    setFormData((prev) => ({ ...prev, [key]: val }));
  };

  // Queries for lookups
  const { data: branches = [] } = useQuery({
    queryKey: ["wizard-branches"],
    queryFn: async () => {
      const res = await api.get("/hr/organization/branches", { params: { limit: 100 } });
      return res.data || res || [];
    },
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["wizard-departments"],
    queryFn: async () => {
      const res = await api.get("/hr/organization/departments", { params: { limit: 100 } });
      return res.data || res || [];
    },
  });

  const { data: designations = [] } = useQuery({
    queryKey: ["wizard-designations"],
    queryFn: async () => {
      const res = await api.get("/hr/organization/designations", { params: { limit: 100 } });
      return res.data || res || [];
    },
  });

  const { data: managers = [] } = useQuery({
    queryKey: ["wizard-managers"],
    queryFn: async () => {
      const res = await api.get("/hr/employees", { params: { limit: 100 } });
      return res.data || res || [];
    },
  });

  // Creation mutation
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post("/hr/employees", payload);
    },
    onSuccess: (res) => {
      toast.success("Employee created and onboarding transaction completed!");
      navigate({ to: "/hr/employees" as any });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create employee record");
    },
  });

  const handleNext = () => {
    // Basic step validation
    if (currentStep === 1) {
      if (!formData.firstName.trim() || !formData.lastName.trim()) {
        toast.error("Please provide both first and last name.");
        return;
      }
    } else if (currentStep === 2) {
      if (!formData.email.trim()) {
        toast.error("Email address is required.");
        return;
      }
    } else if (currentStep === 3) {
      if (!formData.employeeCode.trim()) {
        toast.error("Employee code is required.");
        return;
      }
    }
    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = () => {
    createMutation.mutate(formData);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <PageHeader
        title="New Employee Onboarding Wizard"
        description="Authoritative 8-step atomic employee creation flow with organizational, statutory, and access provisioning."
        icon={UserPlus}
      />

      {/* Wizard Progress Stepper */}
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 border rounded-xl p-3 bg-card shadow-sm">
        {STEPS.map((step) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;

          return (
            <button
              key={step.id}
              onClick={() => setCurrentStep(step.id)}
              className={`flex flex-col items-center justify-center p-2 rounded-lg text-center transition-all ${
                isActive
                  ? "bg-primary text-primary-foreground font-semibold shadow"
                  : isCompleted
                    ? "bg-primary/10 text-primary hover:bg-primary/20"
                    : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Icon className="h-4 w-4 mb-1" />
              <span className="text-[10px] leading-tight line-clamp-1">{step.title}</span>
            </button>
          );
        })}
      </div>

      {/* Step Contents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>Step {currentStep} of 8: {STEPS[currentStep - 1].title}</span>
          </CardTitle>
          <CardDescription>
            {currentStep === 1 && "Personal demographic details and identity profile."}
            {currentStep === 2 && "Official and emergency contact channels."}
            {currentStep === 3 && "Organizational unit, designation, and managerial reporting path."}
            {currentStep === 4 && "Compensation package, tax regime, and social security entitlements."}
            {currentStep === 5 && "Statutory Indian identifiers (PAN, Aadhaar, PF) and disbursement bank details."}
            {currentStep === 6 && "Identity proof, contracts, and supporting credentials."}
            {currentStep === 7 && "User login account, credentials, and security role."}
            {currentStep === 8 && "Review all information and execute atomic creation transaction."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* STEP 1: PERSONAL */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>First Name *</Label>
                  <Input
                    value={formData.firstName}
                    onChange={(e) => updateField("firstName", e.target.value)}
                    placeholder="e.g. Rahul"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Last Name *</Label>
                  <Input
                    value={formData.lastName}
                    onChange={(e) => updateField("lastName", e.target.value)}
                    placeholder="e.g. Sharma"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Date of Birth</Label>
                  <Input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => updateField("dateOfBirth", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Gender</Label>
                  <Select
                    value={formData.gender}
                    onValueChange={(val) => updateField("gender", val)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Marital Status</Label>
                  <Select
                    value={formData.maritalStatus}
                    onValueChange={(val) => updateField("maritalStatus", val)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single</SelectItem>
                      <SelectItem value="married">Married</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: CONTACT */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Official Work Email *</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    placeholder="e.g. rahul.sharma@company.com"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Primary Phone</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Residential Address</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => updateField("address", e.target.value)}
                  placeholder="Street / Apartment address"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>City</Label>
                  <Input
                    value={formData.city}
                    onChange={(e) => updateField("city", e.target.value)}
                    placeholder="e.g. Bengaluru"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>State</Label>
                  <Input
                    value={formData.state}
                    onChange={(e) => updateField("state", e.target.value)}
                    placeholder="e.g. Karnataka"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Postal Code</Label>
                  <Input
                    value={formData.zipCode}
                    onChange={(e) => updateField("zipCode", e.target.value)}
                    placeholder="560103"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                <div className="space-y-1.5">
                  <Label>Emergency Contact Person</Label>
                  <Input
                    value={formData.emergencyContactName}
                    onChange={(e) => updateField("emergencyContactName", e.target.value)}
                    placeholder="e.g. Sunita Sharma (Spouse / Guardian)"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Emergency Contact Phone</Label>
                  <Input
                    value={formData.emergencyContactPhone}
                    onChange={(e) => updateField("emergencyContactPhone", e.target.value)}
                    placeholder="+91 98765 12345"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: JOB DETAILS */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Employee Code *</Label>
                  <Input
                    value={formData.employeeCode}
                    onChange={(e) => updateField("employeeCode", e.target.value)}
                    placeholder="e.g. EMP-1001"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Joining Date</Label>
                  <Input
                    type="date"
                    value={formData.joinedAt}
                    onChange={(e) => updateField("joinedAt", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Branch / Facility</Label>
                  <Select
                    value={formData.branchId || "none"}
                    onValueChange={(val) => updateField("branchId", val === "none" ? "" : val)}
                  >
                    <SelectTrigger><SelectValue placeholder="Select facility" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {branches.map((b: any) => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Department</Label>
                  <Select
                    value={formData.departmentId || "none"}
                    onValueChange={(val) => updateField("departmentId", val === "none" ? "" : val)}
                  >
                    <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {departments.map((d: any) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Designation</Label>
                  <Select
                    value={formData.designationId || "none"}
                    onValueChange={(val) => updateField("designationId", val === "none" ? "" : val)}
                  >
                    <SelectTrigger><SelectValue placeholder="Select designation" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {designations.map((dg: any) => (
                        <SelectItem key={dg.id} value={dg.id}>{dg.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Reporting Manager</Label>
                  <Select
                    value={formData.managerId || "none"}
                    onValueChange={(val) => updateField("managerId", val === "none" ? "" : val)}
                  >
                    <SelectTrigger><SelectValue placeholder="Select supervisor" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Top Executive (No Manager)</SelectItem>
                      {managers.map((m: any) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.firstName} {m.lastName} ({m.employeeCode})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Employment Type</Label>
                  <Select
                    value={formData.employmentType}
                    onValueChange={(val) => updateField("employmentType", val)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full_time">Full Time</SelectItem>
                      <SelectItem value="part_time">Part Time</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="intern">Intern</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: COMPENSATION */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Annual Base CTC / Gross Salary (₹)</Label>
                  <Input
                    type="number"
                    value={formData.salary}
                    onChange={(e) => updateField("salary", e.target.value)}
                    placeholder="e.g. 1200000"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Tax Regime</Label>
                  <Select
                    value={formData.taxRegime}
                    onValueChange={(val) => updateField("taxRegime", val)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New Tax Regime (Section 115BAC)</SelectItem>
                      <SelectItem value="old">Old Tax Regime (With Deductions)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="pt-2 border-t space-y-2">
                <h4 className="text-sm font-semibold text-foreground">Statutory Welfare Enrollments</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="pf-elig"
                      checked={formData.pfEligible}
                      onCheckedChange={(c) => updateField("pfEligible", Boolean(c))}
                    />
                    <Label htmlFor="pf-elig" className="text-sm">Provident Fund (EPF) Eligible</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="esi-elig"
                      checked={formData.esiEligible}
                      onCheckedChange={(c) => updateField("esiEligible", Boolean(c))}
                    />
                    <Label htmlFor="esi-elig" className="text-sm">ESIC Insurance Eligible</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="pt-elig"
                      checked={formData.ptEligible}
                      onCheckedChange={(c) => updateField("ptEligible", Boolean(c))}
                    />
                    <Label htmlFor="pt-elig" className="text-sm">Professional Tax (PT) Deduction</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="tds-elig"
                      checked={formData.tdsEligible}
                      onCheckedChange={(c) => updateField("tdsEligible", Boolean(c))}
                    />
                    <Label htmlFor="tds-elig" className="text-sm">TDS / Income Tax Withholding</Label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: STATUTORY & BANK */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Permanent Account Number (PAN)</Label>
                  <Input
                    value={formData.pan}
                    onChange={(e) => updateField("pan", e.target.value.toUpperCase())}
                    placeholder="e.g. ABCDE1234F"
                    maxLength={10}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Aadhaar Number (12 Digits)</Label>
                  <Input
                    value={formData.aadhaar}
                    onChange={(e) => updateField("aadhaar", e.target.value)}
                    placeholder="e.g. 1234 5678 9012"
                    maxLength={14}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Universal Account Number (UAN)</Label>
                  <Input
                    value={formData.uan}
                    onChange={(e) => updateField("uan", e.target.value)}
                    placeholder="12-digit UAN"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>ESI Number</Label>
                  <Input
                    value={formData.esiNumber}
                    onChange={(e) => updateField("esiNumber", e.target.value)}
                    placeholder="17-digit ESI number"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>PF Member ID</Label>
                  <Input
                    value={formData.pfNumber}
                    onChange={(e) => updateField("pfNumber", e.target.value)}
                    placeholder="e.g. KN/BNG/12345/678"
                  />
                </div>
              </div>

              <div className="pt-2 border-t space-y-3">
                <h4 className="text-sm font-semibold text-foreground">Disbursement Bank Account</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Bank Name</Label>
                    <Input
                      value={formData.bankName}
                      onChange={(e) => updateField("bankName", e.target.value)}
                      placeholder="e.g. HDFC Bank"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Account Number</Label>
                    <Input
                      value={formData.bankAccount}
                      onChange={(e) => updateField("bankAccount", e.target.value)}
                      placeholder="e.g. 5010023456789"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>IFSC Code</Label>
                    <Input
                      value={formData.bankIfsc}
                      onChange={(e) => updateField("bankIfsc", e.target.value.toUpperCase())}
                      placeholder="e.g. HDFC0001234"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Bank Branch Location</Label>
                    <Input
                      value={formData.bankBranch}
                      onChange={(e) => updateField("bankBranch", e.target.value)}
                      placeholder="e.g. Koramangala, Bangalore"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: DOCUMENTS */}
          {currentStep === 6 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Attach identity proof, employment offer letters, or resume credentials.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Document Title</Label>
                  <Input
                    value={formData.documentTitle}
                    onChange={(e) => updateField("documentTitle", e.target.value)}
                    placeholder="e.g. Signed Offer Letter / Govt ID"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Document File URL</Label>
                  <Input
                    value={formData.documentUrl}
                    onChange={(e) => updateField("documentUrl", e.target.value)}
                    placeholder="https://storage.masterhrms.com/..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 7: ACCESS & LOGIN */}
          {currentStep === 7 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="create-login"
                  checked={formData.createLoginAccount}
                  onCheckedChange={(c) => updateField("createLoginAccount", Boolean(c))}
                />
                <Label htmlFor="create-login" className="text-sm font-semibold">
                  Provision User Login Account & Self-Service Portal Access
                </Label>
              </div>

              {formData.createLoginAccount && (
                <div className="grid grid-cols-2 gap-4 p-4 rounded-lg border bg-muted/20">
                  <div className="space-y-1.5">
                    <Label>Initial Temporary Password</Label>
                    <Input
                      type="text"
                      value={formData.password}
                      onChange={(e) => updateField("password", e.target.value)}
                      placeholder="Default: Employee@123"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Employee will be prompted to reset upon first login.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Workspace Role Assignment</Label>
                    <Select
                      value={formData.userRole}
                      onValueChange={(val) => updateField("userRole", val)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="employee">Employee (Self-Service)</SelectItem>
                        <SelectItem value="manager">Manager (Team Approvals)</SelectItem>
                        <SelectItem value="hr_admin">HR Administrator</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 8: REVIEW & SUBMIT */}
          {currentStep === 8 && (
            <div className="space-y-4">
              <div className="rounded-lg border p-4 bg-muted/10 space-y-3">
                <h4 className="font-semibold text-foreground text-sm border-b pb-2">
                  Employee Summary Verification
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground">Full Name:</span>
                    <p className="font-medium">{formData.firstName} {formData.lastName}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Employee Code:</span>
                    <p className="font-medium font-mono">{formData.employeeCode}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Work Email:</span>
                    <p className="font-medium">{formData.email}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Joining Date:</span>
                    <p className="font-medium">{formData.joinedAt}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Employment Type:</span>
                    <p className="font-medium capitalize">{formData.employmentType.replace("_", " ")}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Portal Access:</span>
                    <p className="font-medium">{formData.createLoginAccount ? "Yes (Enabled)" : "No"}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Onboarding Notes / Handover Comments</Label>
                <Textarea
                  value={formData.onboardingNotes}
                  onChange={(e) => updateField("onboardingNotes", e.target.value)}
                  rows={3}
                  placeholder="Additional context or induction remarks..."
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handlePrev}
          disabled={currentStep === 1 || createMutation.isPending}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous Step
        </Button>

        {currentStep < 8 ? (
          <Button onClick={handleNext} className="gap-2">
            Next Step
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={createMutation.isPending}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Confirm & Complete Onboarding
          </Button>
        )}
      </div>
    </div>
  );
}
