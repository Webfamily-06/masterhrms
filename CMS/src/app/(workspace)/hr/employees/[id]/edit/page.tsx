'use client';
import React, { useState, useEffect } from "react";
import {   createFileRoute, Link, useNavigate  , Route } from "@/src/lib/router-compat";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  User,
  Briefcase,
  MapPin,
  Landmark,
  FileText,
  Upload,
  Eye,
  Trash2,
  Lock,
  Loader2,
  Calendar,
  AlertCircle,
  FilePlus,
  RefreshCw,
  Plus,
} from "lucide-react";
import { EMPLOYEE_DOCUMENT_CATEGORIES, getDocumentCategorySlug } from "@/lib/constants/employee-documents";
import { COUNTRIES } from "@/lib/address/countries";
import { getStatesByCountry } from "@/lib/address/india-states";
import { getDistrictsByState } from "@/lib/address/india-districts";
import { lookupPincode } from "@/lib/address/address-lookup";

const BLOOD_GROUPS = [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
  "Unknown / Not Provided",
];

const EMERGENCY_RELATIONSHIPS = [
  "Father",
  "Mother",
  "Husband",
  "Wife",
  "Son",
  "Daughter",
  "Brother",
  "Sister",
  "Guardian",
  "Other",
];




interface WizardStep {
  id: number;
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const WIZARD_STEPS: WizardStep[] = [
  { id: 1, key: "personal", label: "Personal", icon: User },
  { id: 2, key: "employment", label: "Employment", icon: Briefcase },
  { id: 3, key: "contact", label: "Contact", icon: MapPin },
  { id: 4, key: "banking", label: "Banking", icon: Landmark },
  { id: 5, key: "documents", label: "Documents", icon: FileText },
];

function EmployeeEditWizardPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Personal
    id: "",
    firstName: "",
    lastName: "",
    employeeCode: "",
    email: "",
    password: "",
    phone: "",
    dateOfBirth: "",
    gender: "Male",
    bloodGroup: "",
    avatarUrl: "",

    // Step 2: Employment
    branchId: "",
    departmentId: "",
    designationId: "",
    joinedAt: "",
    employmentType: "full_time",
    status: "active",
    shiftId: "",
    attendancePolicyId: "",

    // Step 3: Contact
    addressLine1: "",
    addressLine2: "",
    city: "",
    district: "",
    state: "",
    country: "India",
    postalCode: "",
    emergencyContactName: "",
    emergencyContactRelationship: "",
    emergencyContactRelationshipOther: "",
    emergencyContactPhone: "",

    // Step 4: Banking
    bankName: "",
    accountHolderName: "",
    bankAccount: "",
    bicSwift: "",
    bankBranch: "",
    taxPayerId: "",
    salary: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Document Modal & Management State
  const [isAddDocOpen, setIsAddDocOpen] = useState(false);
  const [newDocData, setNewDocData] = useState({
    title: "",
    category: "Aadhaar Card / National Identity Proof",
    expiryDate: "",
    fileUrl: "",
    fileName: "",
  });
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [deleteDocId, setDeleteDocId] = useState<string | null>(null);

  // User Security Context / Permissions
  const userRaw = typeof window !== "undefined" ? localStorage.getItem("hrms_user") : null;
  const currentUser = userRaw ? JSON.parse(userRaw) : {};
  const userRoles: string[] = currentUser.roles || [];
  const userPerms: string[] = currentUser.permissions || [];
  const isSuperAdmin = userRoles.includes("super_admin");
  const isTenantOrHrAdmin =
    userRoles.includes("admin") ||
    userRoles.includes("hr_admin") ||
    userRoles.includes("Workspace Admin") ||
    userRoles.includes("HR Manager") ||
    userRoles.includes("tenant_admin");
  const hasSensitiveWritePerm =
    userPerms.includes("hr:employee:sensitive:write") ||
    userPerms.includes("hr:sensitive:write") ||
    userPerms.includes("hrm.sensitive.edit");

  // Authorized HR, Admin, Workspace Admin, or users with explicit sensitive permission
  const canEditSensitive =
    isSuperAdmin ||
    isTenantOrHrAdmin ||
    hasSensitiveWritePerm;

  const canDeleteDocs =
    userPerms.includes("hr:documents:delete") ||
    userPerms.includes("documents:delete") ||
    userRoles.includes("super_admin") ||
    userRoles.includes("hr_admin") ||
    userRoles.includes("admin") ||
    userRoles.includes("Workspace Admin") ||
    userRoles.includes("HR Manager");

  // Fetch Employee 360 data
  const {
    data: employeeRes,
    isLoading: isEmpLoading,
    error: empError,
    refetch: refetchEmployee,
  } = useQuery({
    queryKey: ["employee-360", id],
    queryFn: async () => {
      const res = await api.get(`/hr/employees/${id}`);
      return res.data || res;
    },
  });

  const emp = employeeRes;

  const isInitializedRef = React.useRef<string | null>(null);

  // Initialize form once when employee data first loads for this ID
  useEffect(() => {
    if (emp && isInitializedRef.current !== emp.id) {
      isInitializedRef.current = emp.id;
      setFormData({
        id: emp.id || "",
        firstName: emp.firstName || "",
        lastName: emp.lastName || "",
        employeeCode: emp.employeeCode || "",
        email: emp.email || "",
        password: "",
        phone: emp.phone || "",
        dateOfBirth: emp.dateOfBirth
          ? format(new Date(emp.dateOfBirth), "yyyy-MM-dd")
          : "",
        gender: emp.gender || "Male",
        bloodGroup: emp.bloodGroup || "",
        avatarUrl: emp.avatarUrl || emp.user?.profile?.avatarUrl || "",

        branchId: emp.branchId || "",
        departmentId: emp.departmentId || "",
        designationId: emp.designationId || "",
        joinedAt: emp.joinedAt
          ? format(new Date(emp.joinedAt), "yyyy-MM-dd")
          : "",
        employmentType: emp.employmentType || "full_time",
        status: emp.status || "active",
        shiftId: emp.shiftId || emp.shiftRosters?.[0]?.shiftId || "",
        attendancePolicyId: emp.attendancePolicyId || "",

        addressLine1: emp.addressLine1 || "",
        addressLine2: emp.addressLine2 || "",
        city: emp.city || "",
        district: emp.district || "",
        state: emp.state || "",
        country: emp.country || "India",
        postalCode: emp.postalCode || "",
        emergencyContactName: emp.emergencyContactName || "",
        emergencyContactRelationship: emp.emergencyContactRelationship || "",
        emergencyContactRelationshipOther: emp.emergencyContactRelationshipOther || "",
        emergencyContactPhone: emp.emergencyContactPhone || "",

        bankName: emp.bankName || "",
        accountHolderName:
          emp.accountHolderName || `${emp.firstName || ""} ${emp.lastName || ""}`.trim(),
        bankAccount: emp.bankAccount || "",
        bicSwift: emp.bicSwift || emp.bankIfsc || "",
        bankBranch: emp.bankBranch || "",
        taxPayerId: emp.taxPayerId || emp.pan || "",
        salary: emp.salary !== undefined && emp.salary !== null ? String(emp.salary) : "",
      });
    }
  }, [emp]);

  // Dropdown Queries
  const { data: branches = [] } = useQuery({
    queryKey: ["org-branches"],
    queryFn: async () => {
      const res = await api.get("/hr/organization/branches", { params: { limit: 100 } });
      return res.data || res || [];
    },
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["org-departments"],
    queryFn: async () => {
      const res = await api.get("/hr/organization/departments", { params: { limit: 100 } });
      return res.data || res || [];
    },
  });

  const { data: designations = [] } = useQuery({
    queryKey: ["org-designations"],
    queryFn: async () => {
      const res = await api.get("/hr/organization/designations", { params: { limit: 100 } });
      return res.data || res || [];
    },
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ["attendance-shifts"],
    queryFn: async () => {
      const res = await api.get("/hr/attendance/shifts");
      return res.data || res || [];
    },
  });

  const { data: policies = [] } = useQuery({
    queryKey: ["attendance-policies"],
    queryFn: async () => {
      const res = await api.get("/hr/attendance/policies");
      return res.data || res || [];
    },
  });

  // Query Employee Documents
  const {
    data: documents = [],
    refetch: refetchDocuments,
    isLoading: isDocsLoading,
  } = useQuery({
    queryKey: ["employee-documents", id],
    queryFn: async () => {
      const res = await api.get("/documents", { params: { employeeId: id } });
      return res.data || res || [];
    },
  });

  // Update Field Handler
  const updateField = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  // Avatar Upload Handler
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG, JPG, WEBP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file size must be under 5 MB.");
      return;
    }

    try {
      setIsUploadingAvatar(true);
      const data = new FormData();
      data.append("file", file);
      const empIdentifier = formData.employeeCode?.trim() || id;
      data.append("folder", `Employees/${empIdentifier}/Profile`);

      const res = await api.post("/v1/media/upload", data);
      const uploadedUrl = res.url || res.data?.url;
      if (uploadedUrl) {
        updateField("avatarUrl", uploadedUrl);
        toast.success("Profile photo updated.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to upload profile photo.");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Step Validation Logic
  const validateStep = (stepNumber: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (stepNumber === 1) {
      if (!formData.firstName.trim()) newErrors.firstName = "First name is required";
      if (!formData.lastName.trim()) newErrors.lastName = "Last name is required";
      if (!formData.employeeCode.trim()) newErrors.employeeCode = "Employee code is required";
      if (!formData.email.trim()) {
        newErrors.email = "Email address is required";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
        newErrors.email = "Invalid email format";
      }
      if (!formData.phone.trim()) newErrors.phone = "Phone number is required";
      if (!formData.dateOfBirth) newErrors.dateOfBirth = "Date of birth is required";
      if (!formData.gender) newErrors.gender = "Gender is required";
    } else if (stepNumber === 2) {
      if (branches?.length > 0 && !formData.branchId) newErrors.branchId = "Branch selection is required";
      if (departments?.length > 0 && !formData.departmentId) newErrors.departmentId = "Department selection is required";
      if (designations?.length > 0 && !formData.designationId) newErrors.designationId = "Designation selection is required";
      if (!formData.joinedAt) newErrors.joinedAt = "Date of joining is required";
      if (!formData.employmentType) newErrors.employmentType = "Employment type is required";
      if (!formData.status) newErrors.status = "Employee status is required";
    } else if (stepNumber === 3) {
      if (!formData.addressLine1.trim()) newErrors.addressLine1 = "Address Line 1 is required";
      if (!formData.city.trim()) newErrors.city = "City is required";
      if (!formData.state.trim()) newErrors.state = "State / Province is required";
      if (!formData.country.trim()) newErrors.country = "Country is required";
      if (!formData.postalCode.trim()) newErrors.postalCode = "Postal / ZIP Code is required";
      if (!formData.emergencyContactName.trim())
        newErrors.emergencyContactName = "Emergency contact name is required";
      if (!formData.emergencyContactRelationship.trim())
        newErrors.emergencyContactRelationship = "Relationship is required";
      if (!formData.emergencyContactPhone.trim())
        newErrors.emergencyContactPhone = "Emergency contact phone is required";
    } else if (stepNumber === 4) {
      if (canEditSensitive) {
        if (!formData.bankName.trim()) newErrors.bankName = "Bank name is required";
        if (!formData.accountHolderName.trim())
          newErrors.accountHolderName = "Account holder name is required";
        if (!formData.bicSwift.trim())
          newErrors.bicSwift = "Bank Identifier Code (BIC/SWIFT) is required";
        if (!formData.bankBranch.trim()) newErrors.bankBranch = "Bank branch is required";
        if (!formData.salary || isNaN(Number(formData.salary)) || Number(formData.salary) < 0) {
          newErrors.salary = "Base salary must be a valid non-negative number";
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Next Step Navigation
  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCompletedSteps((prev) => new Set([...prev, currentStep]));
      setCurrentStep((prev) => Math.min(prev + 1, 5));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      toast.error("Please fill in all required fields accurately before proceeding.");
    }
  };

  // Back Navigation
  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Jump to Step
  const handleStepClick = (stepId: number) => {
    if (stepId === currentStep) return;
    if (stepId < currentStep || completedSteps.has(stepId)) {
      setCurrentStep(stepId);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      // Validate current step before jumping forward
      if (validateStep(currentStep)) {
        setCompletedSteps((prev) => new Set([...prev, currentStep]));
        setCurrentStep(stepId);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  };

  // Mutation for updating employee
  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.put(`/hr/employees/${id}`, payload);
    },
    onSuccess: () => {
      toast.success("Employee details updated successfully.");
      isInitializedRef.current = null;
      queryClient.invalidateQueries({ queryKey: ["employee-360", id] });
      queryClient.invalidateQueries({ queryKey: ["hr-employees-list"] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["employee-documents", id] });
      navigate({ to: "/hr/employees/$id", params: { id } } as any);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update employee details.");
    },
  });

  // Submit Handler
  const handleFinalSubmit = () => {
    // Validate all preceding steps
    for (let s = 1; s <= 4; s++) {
      if (!validateStep(s)) {
        setCurrentStep(s);
        toast.error(`Please complete all required fields in Step ${s} (${WIZARD_STEPS[s - 1].label}).`);
        return;
      }
    }

    const payload: any = {
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      employeeCode: formData.employeeCode.trim(),
      email: formData.email.toLowerCase().trim(),
      phone: formData.phone.trim(),
      dateOfBirth: formData.dateOfBirth,
      gender: formData.gender,
      bloodGroup: formData.bloodGroup || null,
      avatarUrl: formData.avatarUrl || null,

      branchId: formData.branchId,
      departmentId: formData.departmentId,
      designationId: formData.designationId,
      joinedAt: formData.joinedAt,
      employmentType: formData.employmentType,
      status: formData.status,
      shiftId: formData.shiftId || null,
      attendancePolicyId: formData.attendancePolicyId || null,

      addressLine1: formData.addressLine1.trim(),
      addressLine2: formData.addressLine2.trim() || null,
      city: formData.city.trim(),
      district: formData.district?.trim() || null,
      state: formData.state.trim(),
      country: formData.country.trim(),
      postalCode: formData.postalCode.trim(),
      emergencyContactName: formData.emergencyContactName.trim(),
      emergencyContactRelationship:
        formData.emergencyContactRelationship === "Other" && formData.emergencyContactRelationshipOther
          ? formData.emergencyContactRelationshipOther.trim()
          : formData.emergencyContactRelationship.trim(),
      emergencyContactRelationshipOther: formData.emergencyContactRelationshipOther?.trim() || null,
      emergencyContactPhone: formData.emergencyContactPhone.trim(),
    };

    if (formData.password && formData.password.trim().length > 0) {
      payload.password = formData.password.trim();
    }

    if (canEditSensitive) {
      payload.bankName = formData.bankName.trim();
      payload.accountHolderName = formData.accountHolderName.trim();
      payload.bankAccount = formData.bankAccount.trim() || null;
      payload.bicSwift = formData.bicSwift.trim();
      payload.bankBranch = formData.bankBranch.trim();
      payload.taxPayerId = formData.taxPayerId.trim() || null;
      payload.salary = formData.salary ? Number(formData.salary) : null;
    }

    updateMutation.mutate(payload);
  };

  // Add Document Mutation
  const addDocMutation = useMutation({
    mutationFn: async (docData: typeof newDocData) => {
      return await api.post("/documents", {
        employeeId: id,
        title: docData.title.trim(),
        category: docData.category,
        fileUrl: docData.fileUrl || null,
        fileName: docData.fileName || `${docData.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`,
        expiryDate: docData.expiryDate || null,
        requiresSignature: false,
      });
    },
    onSuccess: () => {
      toast.success("Document attached successfully.");
      setIsAddDocOpen(false);
      setNewDocData({
        title: "",
        category: "Employment Contract",
        expiryDate: "",
        fileUrl: "",
        fileName: "",
      });
      refetchDocuments();
      queryClient.invalidateQueries({ queryKey: ["employee-360", id] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to add document.");
    },
  });

  // Handle Document File Upload
  const handleDocFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      toast.error("Document file size must be under 15 MB.");
      return;
    }

    try {
      setIsUploadingDoc(true);
      const data = new FormData();
      data.append("file", file);
      data.append("folder", "documents/employee");

      const res = await api.post("/v1/media/upload", data);
      const uploadedUrl = res.url || res.data?.url;
      if (uploadedUrl) {
        setNewDocData((prev) => ({
          ...prev,
          fileUrl: uploadedUrl,
          fileName: file.name,
          title: prev.title || file.name.replace(/\.[^/.]+$/, ""),
        }));
        toast.success("Document file uploaded.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to upload document file.");
    } finally {
      setIsUploadingDoc(false);
    }
  };

  // Delete Document Mutation
  const deleteDocMutation = useMutation({
    mutationFn: async (docId: string) => {
      return await api.delete(`/documents/${docId}`);
    },
    onSuccess: () => {
      toast.success("Document deleted from vault.");
      setDeleteDocId(null);
      refetchDocuments();
      queryClient.invalidateQueries({ queryKey: ["employee-360", id] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete document.");
      setDeleteDocId(null);
    },
  });

  if (isEmpLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-3 text-muted-foreground">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-sm font-medium">Loading employee information...</p>
      </div>
    );
  }

  if (empError || !emp) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 py-12 text-center">
        <AlertCircle className="size-10 text-destructive" />
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-foreground">Employee Record Unavailable</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            {empError ? (empError as any).message : "The employee record could not be found or access is restricted."}
          </p>
        </div>
        <Link to="/hr/employees">
          <Button size="sm" className="gap-1.5">
            <ArrowLeft className="size-4" />
            Back to Employees
          </Button>
        </Link>
      </div>
    );
  }

  const fullNameDisplay = `${formData.firstName} ${formData.lastName}`.trim() || "Employee";

  return (
    <div className="space-y-6 pb-16 max-w-5xl mx-auto">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Edit Employee</h1>
          <p className="text-sm text-muted-foreground">
            Update employee details and information for {fullNameDisplay}.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link to="/hr/employees/$id" params={{ id }}>
            <Button variant="outline" size="sm" className="gap-1.5 h-9">
              <ArrowLeft className="size-4" />
              Back
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Five-Step Horizontal Progress Indicator */}
      <Card className="border shadow-xs bg-card">
        <CardContent className="p-4 sm:p-6">
          <nav aria-label="Progress" className="w-full">
            <ol className="flex items-center justify-between w-full">
              {WIZARD_STEPS.map((step, idx) => {
                const isCompleted = completedSteps.has(step.id);
                const isCurrent = currentStep === step.id;
                const isClickable = isCompleted || step.id <= currentStep;
                const StepIcon = step.icon;

                return (
                  <li
                    key={step.id}
                    className={`relative flex items-center ${
                      idx !== WIZARD_STEPS.length - 1 ? "flex-1" : ""
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleStepClick(step.id)}
                      disabled={!isClickable && !completedSteps.has(step.id)}
                      className={`group flex items-center gap-2.5 focus:outline-hidden ${
                        isClickable ? "cursor-pointer" : "cursor-not-allowed opacity-75"
                      }`}
                      aria-current={isCurrent ? "step" : undefined}
                    >
                      {/* Step Circle Indicator */}
                      <span
                        className={`size-9 rounded-full flex items-center justify-center font-semibold text-xs transition-colors shrink-0 ${
                          isCurrent
                            ? "bg-emerald-600 text-white ring-4 ring-emerald-100"
                            : isCompleted
                              ? "bg-emerald-600 text-white"
                              : "border-2 border-muted-foreground/30 text-muted-foreground bg-muted/40"
                        }`}
                      >
                        {isCompleted && !isCurrent ? (
                          <Check className="size-4 stroke-[2.5]" />
                        ) : (
                          <span>{step.id}</span>
                        )}
                      </span>

                      {/* Step Label & Icon */}
                      <span className="hidden sm:flex flex-col text-left">
                        <span
                          className={`text-xs font-semibold tracking-tight transition-colors ${
                            isCurrent
                              ? "text-emerald-700 font-bold"
                              : isCompleted
                                ? "text-foreground"
                                : "text-muted-foreground"
                          }`}
                        >
                          {step.label}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {isCurrent ? "In Progress" : isCompleted ? "Completed" : "Pending"}
                        </span>
                      </span>
                    </button>

                    {/* Connecting Line between steps */}
                    {idx !== WIZARD_STEPS.length - 1 && (
                      <div
                        className={`flex-1 mx-3 sm:mx-4 h-0.5 transition-colors ${
                          completedSteps.has(step.id) && (completedSteps.has(WIZARD_STEPS[idx + 1].id) || currentStep > step.id)
                            ? "bg-emerald-600"
                            : "bg-border"
                        }`}
                        aria-hidden="true"
                      />
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        </CardContent>
      </Card>

      {/* 3. Wizard Content Area */}
      <Card className="border shadow-xs bg-card">
        <CardHeader className="border-b px-6 py-4 bg-muted/10">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                {React.createElement(WIZARD_STEPS[currentStep - 1].icon, { className: "size-5 text-emerald-600" })}
                {WIZARD_STEPS[currentStep - 1].label} Details
              </CardTitle>
              <CardDescription>
                {currentStep === 1 && "Personal and core identification details."}
                {currentStep === 2 && "Employment assignment, status, and company organizational mapping."}
                {currentStep === 3 && "Residential address and verified emergency contact information."}
                {currentStep === 4 && "Banking disbursement coordinates and sensitive statutory compensation."}
                {currentStep === 5 && "Employee identity documents, contracts, and certifications."}
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs px-2.5 py-0.5 font-medium border-border">
              Step {currentStep} of 5
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {/* ======================================================== */}
          {/* STEP 1: PERSONAL INFORMATION */}
          {/* ======================================================== */}
          {currentStep === 1 && (
            <div className="space-y-6">
              {/* Profile Image & Avatar */}
              <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-lg bg-muted/20 border">
                <Avatar className="size-20 border-2 border-border shadow-xs shrink-0">
                  {formData.avatarUrl ? (
                    <AvatarImage src={formData.avatarUrl} alt={fullNameDisplay} />
                  ) : null}
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-xl">
                    {formData.firstName?.[0]}
                    {formData.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2 text-center sm:text-left flex-1">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Profile Photo</h3>
                    <p className="text-xs text-muted-foreground">
                      Upload an official employee headshot (PNG, JPG, or WEBP up to 5 MB).
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <Label
                      htmlFor="avatar-file-upload"
                      className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 border transition-colors"
                    >
                      {isUploadingAvatar ? (
                        <>
                          <Loader2 className="size-3.5 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="size-3.5" />
                          Change Photo
                        </>
                      )}
                    </Label>
                    <input
                      id="avatar-file-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                      disabled={isUploadingAvatar}
                    />
                    {formData.avatarUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7 text-destructive hover:bg-destructive/10"
                        onClick={() => updateField("avatarUrl", "")}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Personal Fields Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Employee ID (Read-only) */}
                <div className="space-y-1.5">
                  <Label htmlFor="emp-id" className="text-xs font-medium text-muted-foreground">
                    Employee System ID <span className="text-xs text-muted-foreground font-normal">(Read-only)</span>
                  </Label>
                  <Input
                    id="emp-id"
                    value={formData.id}
                    readOnly
                    className="bg-muted/50 cursor-not-allowed font-mono text-xs"
                  />
                </div>

                {/* Employee Code */}
                <div className="space-y-1.5">
                  <Label htmlFor="employeeCode" className="text-xs font-medium">
                    Employee Code <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="employeeCode"
                    value={formData.employeeCode}
                    onChange={(e) => updateField("employeeCode", e.target.value)}
                    placeholder="e.g. EMP-1001"
                    className={errors.employeeCode ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  {errors.employeeCode && (
                    <p className="text-[11px] text-destructive">{errors.employeeCode}</p>
                  )}
                </div>

                {/* First Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="firstName" className="text-xs font-medium">
                    First Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => updateField("firstName", e.target.value)}
                    placeholder="e.g. Alex"
                    className={errors.firstName ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  {errors.firstName && (
                    <p className="text-[11px] text-destructive">{errors.firstName}</p>
                  )}
                </div>

                {/* Last Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="lastName" className="text-xs font-medium">
                    Last Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => updateField("lastName", e.target.value)}
                    placeholder="e.g. Morgan"
                    className={errors.lastName ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  {errors.lastName && (
                    <p className="text-[11px] text-destructive">{errors.lastName}</p>
                  )}
                </div>

                {/* Email Address */}
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-medium">
                    Email Address <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    placeholder="alex.morgan@company.com"
                    className={errors.email ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  {errors.email && <p className="text-[11px] text-destructive">{errors.email}</p>}
                </div>

                {/* Password Replacement */}
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs font-medium">
                    Password <span className="text-xs text-muted-foreground font-normal">(Optional replacement)</span>
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => updateField("password", e.target.value)}
                    placeholder="Leave blank to preserve current password"
                    autoComplete="new-password"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Blank preserves the existing login password without alteration.
                  </p>
                </div>

                {/* Phone Number */}
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-xs font-medium">
                    Phone Number <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    placeholder="+91 98765 43210"
                    className={errors.phone ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  {errors.phone && <p className="text-[11px] text-destructive">{errors.phone}</p>}
                </div>

                {/* Date of Birth */}
                <div className="space-y-1.5">
                  <Label htmlFor="dateOfBirth" className="text-xs font-medium">
                    Date of Birth <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => updateField("dateOfBirth", e.target.value)}
                    className={errors.dateOfBirth ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  {errors.dateOfBirth && (
                    <p className="text-[11px] text-destructive">{errors.dateOfBirth}</p>
                  )}
                </div>

                {/* Gender */}
                <div className="space-y-1.5">
                  <Label htmlFor="gender" className="text-xs font-medium">
                    Gender <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.gender}
                    onValueChange={(val) => updateField("gender", val)}
                  >
                    <SelectTrigger id="gender" className={errors.gender ? "border-destructive" : ""}>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.gender && <p className="text-[11px] text-destructive">{errors.gender}</p>}
                </div>

                {/* Blood Group */}
                <div className="space-y-1.5">
                  <Label htmlFor="bloodGroup" className="text-xs font-medium">
                    Blood Group
                  </Label>
                  <Select
                    value={formData.bloodGroup}
                    onValueChange={(val) => updateField("bloodGroup", val)}
                  >
                    <SelectTrigger id="bloodGroup">
                      <SelectValue placeholder="Select blood group" />
                    </SelectTrigger>
                    <SelectContent>
                      {BLOOD_GROUPS.map((bg) => (
                        <SelectItem key={bg} value={bg}>
                          {bg}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 2: EMPLOYMENT DETAILS */}
          {/* ======================================================== */}
          {currentStep === 2 && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Branch */}
                <div className="space-y-1.5">
                  <Label htmlFor="branchId" className="text-xs font-medium">
                    Branch <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.branchId}
                    onValueChange={(val) => updateField("branchId", val)}
                  >
                    <SelectTrigger id="branchId" className={errors.branchId ? "border-destructive" : ""}>
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((b: any) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name} {b.code ? `(${b.code})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.branchId && <p className="text-[11px] text-destructive">{errors.branchId}</p>}
                </div>

                {/* Department */}
                <div className="space-y-1.5">
                  <Label htmlFor="departmentId" className="text-xs font-medium">
                    Department <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.departmentId}
                    onValueChange={(val) => updateField("departmentId", val)}
                  >
                    <SelectTrigger id="departmentId" className={errors.departmentId ? "border-destructive" : ""}>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((d: any) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.departmentId && (
                    <p className="text-[11px] text-destructive">{errors.departmentId}</p>
                  )}
                </div>

                {/* Designation */}
                <div className="space-y-1.5">
                  <Label htmlFor="designationId" className="text-xs font-medium">
                    Designation <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.designationId}
                    onValueChange={(val) => updateField("designationId", val)}
                  >
                    <SelectTrigger id="designationId" className={errors.designationId ? "border-destructive" : ""}>
                      <SelectValue placeholder="Select designation" />
                    </SelectTrigger>
                    <SelectContent>
                      {designations.map((dg: any) => (
                        <SelectItem key={dg.id} value={dg.id}>
                          {dg.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.designationId && (
                    <p className="text-[11px] text-destructive">{errors.designationId}</p>
                  )}
                </div>

                {/* Date of Joining */}
                <div className="space-y-1.5">
                  <Label htmlFor="joinedAt" className="text-xs font-medium">
                    Date of Joining <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="joinedAt"
                    type="date"
                    value={formData.joinedAt}
                    onChange={(e) => updateField("joinedAt", e.target.value)}
                    className={errors.joinedAt ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  {errors.joinedAt && <p className="text-[11px] text-destructive">{errors.joinedAt}</p>}
                </div>

                {/* Employment Type */}
                <div className="space-y-1.5">
                  <Label htmlFor="employmentType" className="text-xs font-medium">
                    Employment Type <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.employmentType}
                    onValueChange={(val) => updateField("employmentType", val)}
                  >
                    <SelectTrigger id="employmentType" className={errors.employmentType ? "border-destructive" : ""}>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full_time">Full Time</SelectItem>
                      <SelectItem value="part_time">Part Time</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="intern">Internship</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.employmentType && (
                    <p className="text-[11px] text-destructive">{errors.employmentType}</p>
                  )}
                </div>

                {/* Employee Status */}
                <div className="space-y-1.5">
                  <Label htmlFor="status" className="text-xs font-medium">
                    Employee Status <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.status}
                    onValueChange={(val) => updateField("status", val)}
                  >
                    <SelectTrigger id="status" className={errors.status ? "border-destructive" : ""}>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="on_leave">On Leave</SelectItem>
                      <SelectItem value="terminated">Terminated</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.status && <p className="text-[11px] text-destructive">{errors.status}</p>}
                </div>

                {/* Shift (Optional) */}
                <div className="space-y-1.5">
                  <Label htmlFor="shiftId" className="text-xs font-medium">
                    Shift <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
                  </Label>
                  <Select
                    value={formData.shiftId}
                    onValueChange={(val) => updateField("shiftId", val)}
                  >
                    <SelectTrigger id="shiftId">
                      <SelectValue placeholder="Select shift (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {shifts.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} ({s.startTime} - {s.endTime})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Attendance Policy (Optional) */}
                <div className="space-y-1.5">
                  <Label htmlFor="attendancePolicyId" className="text-xs font-medium">
                    Attendance Policy <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
                  </Label>
                  <Select
                    value={formData.attendancePolicyId}
                    onValueChange={(val) => updateField("attendancePolicyId", val)}
                  >
                    <SelectTrigger id="attendancePolicyId">
                      <SelectValue placeholder="Select policy (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {policies.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} {p.isDefault ? "(Default)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 3: CONTACT INFORMATION */}
          {/* ======================================================== */}
          {currentStep === 3 && (
            <div className="space-y-6">
              {/* Address Fields */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Residential Address
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5 md:col-span-2">
                    <Label htmlFor="addressLine1" className="text-xs font-medium">
                      Address Line 1 <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="addressLine1"
                      value={formData.addressLine1}
                      onChange={(e) => updateField("addressLine1", e.target.value)}
                      placeholder="Street address, building, suite"
                      className={errors.addressLine1 ? "border-destructive focus-visible:ring-destructive" : ""}
                    />
                    {errors.addressLine1 && (
                      <p className="text-[11px] text-destructive">{errors.addressLine1}</p>
                    )}
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <Label htmlFor="addressLine2" className="text-xs font-medium">
                      Address Line 2 <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
                    </Label>
                    <Input
                      id="addressLine2"
                      value={formData.addressLine2}
                      onChange={(e) => updateField("addressLine2", e.target.value)}
                      placeholder="Apartment, unit, floor, landmark"
                    />
                  </div>

                  {/* Country */}
                  <div className="space-y-1.5">
                    <Label htmlFor="country" className="text-xs font-medium">
                      Country <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.country}
                      onValueChange={(val) => {
                        updateField("country", val);
                        updateField("state", "");
                        updateField("district", "");
                      }}
                    >
                      <SelectTrigger id="country" className={errors.country ? "border-destructive focus-visible:ring-destructive" : ""}>
                        <SelectValue placeholder="Select Country" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {COUNTRIES.map((c) => (
                          <SelectItem key={c.code} value={c.name}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.country && <p className="text-[11px] text-destructive">{errors.country}</p>}
                  </div>

                  {/* State / Province */}
                  <div className="space-y-1.5">
                    <Label htmlFor="state" className="text-xs font-medium">
                      State / Province <span className="text-destructive">*</span>
                    </Label>
                    {getStatesByCountry(formData.country).length > 0 ? (
                      <Select
                        value={formData.state}
                        onValueChange={(val) => {
                          updateField("state", val);
                          updateField("district", "");
                        }}
                      >
                        <SelectTrigger id="state" className={errors.state ? "border-destructive focus-visible:ring-destructive" : ""}>
                          <SelectValue placeholder="Select State" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {getStatesByCountry(formData.country).map((s) => (
                            <SelectItem key={s.code} value={s.name}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        id="state"
                        value={formData.state}
                        onChange={(e) => updateField("state", e.target.value)}
                        placeholder="State / Province"
                        className={errors.state ? "border-destructive focus-visible:ring-destructive" : ""}
                      />
                    )}
                    {errors.state && <p className="text-[11px] text-destructive">{errors.state}</p>}
                  </div>

                  {/* District */}
                  <div className="space-y-1.5">
                    <Label htmlFor="district" className="text-xs font-medium">
                      District
                    </Label>
                    {getDistrictsByState(formData.state).length > 0 ? (
                      <Select
                        value={formData.district}
                        onValueChange={(val) => updateField("district", val)}
                      >
                        <SelectTrigger id="district">
                          <SelectValue placeholder="Select District" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {getDistrictsByState(formData.state).map((d) => (
                            <SelectItem key={d.code} value={d.name}>
                              {d.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        id="district"
                        value={formData.district}
                        onChange={(e) => updateField("district", e.target.value)}
                        placeholder="e.g. Chennai / Bangalore"
                      />
                    )}
                  </div>

                  {/* City */}
                  <div className="space-y-1.5">
                    <Label htmlFor="city" className="text-xs font-medium">
                      City <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => updateField("city", e.target.value)}
                      placeholder="e.g. Chennai"
                      className={errors.city ? "border-destructive focus-visible:ring-destructive" : ""}
                    />
                    {errors.city && <p className="text-[11px] text-destructive">{errors.city}</p>}
                  </div>

                  {/* Postal / ZIP Code */}
                  <div className="space-y-1.5">
                    <Label htmlFor="postalCode" className="text-xs font-medium">
                      Postal / ZIP Code <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="postalCode"
                      value={formData.postalCode}
                      onChange={async (e) => {
                        const val = e.target.value;
                        updateField("postalCode", val);
                        const cleaned = val.trim();
                        if (formData.country === "India" && cleaned.length === 6 && /^\d+$/.test(cleaned)) {
                          const match = await lookupPincode(cleaned);
                          if (match) {
                            if (!formData.city || formData.city === match.city) updateField("city", match.city);
                            if (!formData.state || formData.state === match.state) updateField("state", match.state);
                            if (match.district) updateField("district", match.district);
                            toast.info(`Location matched: ${match.city}, ${match.district || ""}, ${match.state}`);
                          }
                        }
                      }}
                      placeholder="e.g. 600001"
                      className={errors.postalCode ? "border-destructive focus-visible:ring-destructive" : ""}
                    />
                    {errors.postalCode && (
                      <p className="text-[11px] text-destructive">{errors.postalCode}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="space-y-4 border-t pt-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Emergency Contact
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="emergencyContactName" className="text-xs font-medium">
                      Full Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="emergencyContactName"
                      value={formData.emergencyContactName}
                      onChange={(e) => updateField("emergencyContactName", e.target.value)}
                      placeholder="e.g. Sarah Morgan"
                      className={
                        errors.emergencyContactName
                          ? "border-destructive focus-visible:ring-destructive"
                          : ""
                      }
                    />
                    {errors.emergencyContactName && (
                      <p className="text-[11px] text-destructive">{errors.emergencyContactName}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="emergencyContactRelationship" className="text-xs font-medium">
                      Relationship <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={
                        EMERGENCY_RELATIONSHIPS.includes(formData.emergencyContactRelationship)
                          ? formData.emergencyContactRelationship
                          : formData.emergencyContactRelationship
                            ? "Other"
                            : ""
                      }
                      onValueChange={(val) => {
                        updateField("emergencyContactRelationship", val);
                        if (val !== "Other") {
                          updateField("emergencyContactRelationshipOther", "");
                        }
                      }}
                    >
                      <SelectTrigger
                        id="emergencyContactRelationship"
                        className={errors.emergencyContactRelationship ? "border-destructive focus-visible:ring-destructive" : ""}
                      >
                        <SelectValue placeholder="Select relationship" />
                      </SelectTrigger>
                      <SelectContent>
                        {EMERGENCY_RELATIONSHIPS.map((rel) => (
                          <SelectItem key={rel} value={rel}>
                            {rel}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.emergencyContactRelationship && (
                      <p className="text-[11px] text-destructive">
                        {errors.emergencyContactRelationship}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="emergencyContactPhone" className="text-xs font-medium">
                      Phone Number <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="emergencyContactPhone"
                      value={formData.emergencyContactPhone}
                      onChange={(e) => updateField("emergencyContactPhone", e.target.value)}
                      placeholder="+91 98765 43210"
                      className={
                        errors.emergencyContactPhone
                          ? "border-destructive focus-visible:ring-destructive"
                          : ""
                      }
                    />
                    {errors.emergencyContactPhone && (
                      <p className="text-[11px] text-destructive">{errors.emergencyContactPhone}</p>
                    )}
                  </div>

                  {(formData.emergencyContactRelationship === "Other" ||
                    (formData.emergencyContactRelationship &&
                      !EMERGENCY_RELATIONSHIPS.includes(formData.emergencyContactRelationship))) && (
                    <div className="space-y-1.5 md:col-span-3">
                      <Label htmlFor="emergencyContactRelationshipOther" className="text-xs font-medium">
                        Specify Other Relationship <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="emergencyContactRelationshipOther"
                        value={
                          formData.emergencyContactRelationshipOther ||
                          (!EMERGENCY_RELATIONSHIPS.includes(formData.emergencyContactRelationship)
                            ? formData.emergencyContactRelationship
                            : "")
                        }
                        onChange={(e) => updateField("emergencyContactRelationshipOther", e.target.value)}
                        placeholder="e.g. Cousin, Uncle, Roommate"
                        className={
                          errors.emergencyContactRelationshipOther
                            ? "border-destructive focus-visible:ring-destructive"
                            : ""
                        }
                      />
                      {errors.emergencyContactRelationshipOther && (
                        <p className="text-[11px] text-destructive">
                          {errors.emergencyContactRelationshipOther}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 4: BANKING & SENSITIVE COMPENSATION */}
          {/* ======================================================== */}
          {currentStep === 4 && (
            <div className="space-y-6">
              {!canEditSensitive && (
                <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300">
                  <Lock className="size-5 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-bold uppercase tracking-wider">
                      Protected Sensitive Financial Records
                    </p>
                    <p className="text-xs">
                      You are viewing financial attributes in read-only / masked mode. Modifying
                      bank coordinates and base salary requires explicit sensitive data permissions
                      (<code className="font-mono bg-amber-100 dark:bg-amber-900 px-1 py-0.5 rounded">hr:employee:sensitive:write</code>).
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Bank Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="bankName" className="text-xs font-medium">
                    Bank Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="bankName"
                    value={formData.bankName}
                    onChange={(e) => updateField("bankName", e.target.value)}
                    placeholder="e.g. HDFC Bank"
                    disabled={!canEditSensitive}
                    className={errors.bankName ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  {errors.bankName && <p className="text-[11px] text-destructive">{errors.bankName}</p>}
                </div>

                {/* Account Holder Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="accountHolderName" className="text-xs font-medium">
                    Account Holder Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="accountHolderName"
                    value={formData.accountHolderName}
                    onChange={(e) => updateField("accountHolderName", e.target.value)}
                    placeholder="Full name as per bank records"
                    disabled={!canEditSensitive}
                    className={
                      errors.accountHolderName ? "border-destructive focus-visible:ring-destructive" : ""
                    }
                  />
                  {errors.accountHolderName && (
                    <p className="text-[11px] text-destructive">{errors.accountHolderName}</p>
                  )}
                </div>

                {/* Account Number */}
                <div className="space-y-1.5">
                  <Label htmlFor="bankAccount" className="text-xs font-medium">
                    Account Number
                  </Label>
                  <Input
                    id="bankAccount"
                    value={formData.bankAccount}
                    onChange={(e) => updateField("bankAccount", e.target.value)}
                    placeholder="e.g. 50100234567890"
                    disabled={!canEditSensitive}
                  />
                </div>

                {/* Bank Identifier Code (BIC / SWIFT / IFSC) */}
                <div className="space-y-1.5">
                  <Label htmlFor="bicSwift" className="text-xs font-medium">
                    Bank Identifier Code (BIC / SWIFT / IFSC) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="bicSwift"
                    value={formData.bicSwift}
                    onChange={(e) => updateField("bicSwift", e.target.value)}
                    placeholder="e.g. HDFC0001234"
                    disabled={!canEditSensitive}
                    className={errors.bicSwift ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  {errors.bicSwift && <p className="text-[11px] text-destructive">{errors.bicSwift}</p>}
                </div>

                {/* Bank Branch */}
                <div className="space-y-1.5">
                  <Label htmlFor="bankBranch" className="text-xs font-medium">
                    Bank Branch <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="bankBranch"
                    value={formData.bankBranch}
                    onChange={(e) => updateField("bankBranch", e.target.value)}
                    placeholder="e.g. Indiranagar Branch"
                    disabled={!canEditSensitive}
                    className={errors.bankBranch ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  {errors.bankBranch && (
                    <p className="text-[11px] text-destructive">{errors.bankBranch}</p>
                  )}
                </div>

                {/* Tax Payer ID (PAN) */}
                <div className="space-y-1.5">
                  <Label htmlFor="taxPayerId" className="text-xs font-medium">
                    Tax Payer ID (PAN / Tax ID)
                  </Label>
                  <Input
                    id="taxPayerId"
                    value={formData.taxPayerId}
                    onChange={(e) => updateField("taxPayerId", e.target.value)}
                    placeholder="e.g. ABCDE1234F"
                    disabled={!canEditSensitive}
                  />
                </div>

                {/* Base Salary */}
                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="salary" className="text-xs font-medium">
                    Base Salary (Annual CTC in INR) <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-semibold">
                      ₹
                    </span>
                    <Input
                      id="salary"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.salary}
                      onChange={(e) => updateField("salary", e.target.value)}
                      placeholder="e.g. 1200000"
                      disabled={!canEditSensitive}
                      className={`pl-8 ${errors.salary ? "border-destructive focus-visible:ring-destructive" : ""}`}
                    />
                  </div>
                  {errors.salary && <p className="text-[11px] text-destructive">{errors.salary}</p>}
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 5: DOCUMENTS MANAGEMENT */}
          {/* ======================================================== */}
          {currentStep === 5 && (
            <div className="space-y-6">
              {/* Header & Add Button */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Employee Documents Vault</h3>
                  <p className="text-xs text-muted-foreground">
                    Private and verified contracts, government identification, and educational records.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setIsAddDocOpen(true)}
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs shrink-0"
                >
                  <Plus className="size-3.5" />
                  Add Document
                </Button>
              </div>

              {/* Documents List */}
              {isDocsLoading ? (
                <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
                  <Loader2 className="size-5 animate-spin text-primary" />
                  <span className="text-xs">Loading employee documents...</span>
                </div>
              ) : documents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg text-center p-6 bg-muted/10">
                  <FileText className="size-10 text-muted-foreground/50 mb-2 stroke-1" />
                  <p className="text-sm font-semibold text-foreground">No documents uploaded yet</p>
                  <p className="text-xs text-muted-foreground max-w-sm mt-1">
                    Click "Add Document" above to upload employment contracts, ID proofs, or educational certificates.
                  </p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden divide-y">
                  {documents.map((doc: any) => {
                    const expiryFormatted = doc.expiryDate
                      ? format(new Date(doc.expiryDate), "dd MMM yyyy")
                      : "No expiry date";

                    const isExpired = doc.expiryDate && new Date(doc.expiryDate) < new Date();

                    return (
                      <div
                        key={doc.id}
                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/20 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border border-emerald-200 dark:border-emerald-800 shrink-0 mt-0.5">
                            <FileText className="size-5" />
                          </div>
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-sm font-semibold text-foreground">{doc.title}</h4>
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                {doc.category || "General"}
                              </Badge>
                              {doc.status === "verified" || doc.status === "approved" ? (
                                <Badge className="text-[10px] px-1.5 py-0 bg-emerald-600 text-white">
                                  Verified
                                </Badge>
                              ) : isExpired ? (
                                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                  Expired
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                  {doc.status || "Uploaded"}
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                              <span>Code: {doc.documentCode}</span>
                              <span>•</span>
                              <span>File: {doc.fileName || "document.pdf"}</span>
                              <span>•</span>
                              <span className={isExpired ? "text-destructive font-medium" : ""}>
                                Expiry: {expiryFormatted}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          {doc.fileUrl ? (
                            <a
                              href={doc.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center"
                            >
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs gap-1.5"
                                title="View Document"
                              >
                                <Eye className="size-3.5" />
                                View
                              </Button>
                            </a>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs gap-1.5"
                              disabled
                              title="No document URL available"
                            >
                              <Eye className="size-3.5" />
                              View
                            </Button>
                          )}

                          {canDeleteDocs && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs gap-1.5 text-destructive hover:bg-destructive/10"
                              onClick={() => setDeleteDocId(doc.id)}
                              title="Delete Document"
                            >
                              <Trash2 className="size-3.5" />
                              Delete
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </CardContent>

        {/* Wizard Footer Navigation */}
        <div className="border-t bg-muted/10 px-6 py-4 flex items-center justify-between gap-3">
          {currentStep > 1 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleBack}
              disabled={updateMutation.isPending}
              className="gap-1.5 h-9"
            >
              <ArrowLeft className="size-4" />
              Back
            </Button>
          ) : (
            <div />
          )}

          {currentStep < 5 ? (
            <Button
              type="button"
              size="sm"
              onClick={handleNext}
              className="gap-1.5 h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={handleFinalSubmit}
              disabled={updateMutation.isPending}
              className="gap-1.5 h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5"
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Updating Employee...
                </>
              ) : (
                <>
                  <Check className="size-4 stroke-[2.5]" />
                  Update Employee
                </>
              )}
            </Button>
          )}
        </div>
      </Card>

      {/* Add Document Modal */}
      <Dialog open={isAddDocOpen} onOpenChange={setIsAddDocOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Add Employee Document</DialogTitle>
            <DialogDescription className="text-xs">
              Attach an identity document, contract, or certification to this employee profile.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="doc-category" className="text-xs font-medium">
                Document Category <span className="text-destructive">*</span>
              </Label>
              <Select
                value={newDocData.category}
                onValueChange={(val) => setNewDocData((prev) => ({ ...prev, category: val }))}
              >
                <SelectTrigger id="doc-category">
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {EMPLOYEE_DOCUMENT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.id} value={cat.name}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="doc-title" className="text-xs font-medium">
                Document Title / Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="doc-title"
                value={newDocData.title}
                onChange={(e) => setNewDocData((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="e.g. Master Employment Agreement 2026"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Upload File (PDF, DOC, Images up to 15 MB) <span className="text-destructive">*</span>
              </Label>
              <div className="flex items-center gap-2">
                <Label
                  htmlFor="doc-file-input"
                  className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 border transition-colors shrink-0"
                >
                  {isUploadingDoc ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="size-3.5" />
                      Select File
                    </>
                  )}
                </Label>
                <input
                  id="doc-file-input"
                  type="file"
                  className="hidden"
                  onChange={handleDocFileUpload}
                  disabled={isUploadingDoc}
                />
                <span className="text-xs text-muted-foreground truncate">
                  {newDocData.fileName || "No file selected yet"}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="doc-expiry" className="text-xs font-medium">
                Expiry Date <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
              </Label>
              <Input
                id="doc-expiry"
                type="date"
                value={newDocData.expiryDate}
                onChange={(e) =>
                  setNewDocData((prev) => ({ ...prev, expiryDate: e.target.value }))
                }
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddDocOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={
                !newDocData.title.trim() ||
                !newDocData.fileUrl ||
                addDocMutation.isPending ||
                isUploadingDoc
              }
              onClick={() => addDocMutation.mutate(newDocData)}
            >
              {addDocMutation.isPending ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                "Attach Document"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={Boolean(deleteDocId)}
        onOpenChange={(open) => !open && setDeleteDocId(null)}
        title="Delete Employee Document"
        description="Are you sure you want to permanently delete this document from the employee vault? This action cannot be undone."
        confirmLabel="Delete Document"
        variant="destructive"
        onConfirm={() => {
          if (deleteDocId) {
            deleteDocMutation.mutate(deleteDocId);
          }
        }}
      />
    </div>
  );
}

export default EmployeeEditWizardPage;
