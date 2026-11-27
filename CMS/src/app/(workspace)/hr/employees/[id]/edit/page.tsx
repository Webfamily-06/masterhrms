'use client';
import React, { useState, useEffect } from "react";
import {   createFileRoute, Link, useNavigate  , Route } from "@/src/lib/router-compat";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
  EyeOff,
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
import { CountrySelect } from "@/components/ui/country-select";
import { PhoneInput } from "@/components/ui/phone-input";
import { getStatesByCountry } from "@/lib/address/india-states";
import { getDistrictsByState } from "@/lib/address/india-districts";
import { lookupPincode } from "@/lib/address/address-lookup";
import { UniversalFilePicker } from "@/components/files/file-picker";
import { cn } from "@/lib/utils";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

function extractDigits(val: string): string {
  return String(val || "").replace(/\D/g, "");
}

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
    managerId: "",
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
    maritalStatus: "single",
    emergencyContactName: "",
    emergencyContactRelationship: "",
    emergencyContactRelationshipOther: "",
    emergencyContactPhone: "",

    // Step 4: Banking & Statutory
    bankName: "",
    accountHolderName: "",
    bankAccount: "",
    bicSwift: "",
    bankBranch: "",
    taxPayerId: "",
    taxRegime: "new",
    aadhaar: "",
    uan: "",
    esiNumber: "",
    pfNumber: "",
    pfEligible: true,
    esiEligible: true,
    ptEligible: true,
    tdsEligible: true,
    salary: "",
  });

  const [showPassword, setShowPassword] = useState(false);
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
        managerId: emp.managerId || "",
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
        maritalStatus: emp.maritalStatus || "single",
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
        taxRegime: emp.taxRegime || "new",
        aadhaar: emp.aadhaar || "",
        uan: emp.uan || "",
        esiNumber: emp.esiNumber || "",
        pfNumber: emp.pfNumber || "",
        pfEligible: emp.pfEligible !== undefined ? Boolean(emp.pfEligible) : true,
        esiEligible: emp.esiEligible !== undefined ? Boolean(emp.esiEligible) : true,
        ptEligible: emp.ptEligible !== undefined ? Boolean(emp.ptEligible) : true,
        tdsEligible: emp.tdsEligible !== undefined ? Boolean(emp.tdsEligible) : true,
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

  const { data: managersData = [] } = useQuery({
    queryKey: ["potential-managers-list"],
    queryFn: async () => {
      const res = await api.get("/hr/employees", { params: { limit: 200, status: "active" } });
      return res.data?.data || res.data || res || [];
    },
  });
  const potentialManagers = Array.isArray(managersData) ? managersData : (managersData as any)?.data || [];

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

  // Step Validation Logic (aligned 1:1 with Create Employee page)
  const validateStep = (stepNumber: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (stepNumber === 1) {
      const fn = formData.firstName.trim();
      if (!fn) {
        newErrors.firstName = "First name is required.";
      } else if (fn.length < 2) {
        newErrors.firstName = "First name must be at least 2 characters.";
      } else if (/^\d+$/.test(fn)) {
        newErrors.firstName = "First name cannot be numbers only.";
      }

      if (!formData.employeeCode.trim()) {
        newErrors.employeeCode = "Employee code is required.";
      } else if (!/^[A-Za-z0-9_-]{2,32}$/.test(formData.employeeCode.trim())) {
        newErrors.employeeCode = "Use 2–32 letters, numbers, hyphens, or underscores.";
      }

      if (!formData.email.trim()) {
        newErrors.email = "Email address is required.";
      } else if (!EMAIL_REGEX.test(formData.email.trim())) {
        newErrors.email = "Enter a valid email address.";
      }

      if (formData.password && formData.password.length < 6) {
        newErrors.password = "New password must be at least 6 characters.";
      }

      if (formData.phone.trim()) {
        const phoneDigits = extractDigits(formData.phone);
        if (phoneDigits.length < 10 || phoneDigits.length > 15) {
          newErrors.phone = "Enter a valid phone number (10–15 digits).";
        }
      }

      if (formData.dateOfBirth) {
        const dob = new Date(formData.dateOfBirth);
        const now = new Date();
        const ageYears = (now.getTime() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
        if (isNaN(dob.getTime()) || dob > now) {
          newErrors.dateOfBirth = "Date of birth cannot be in the future.";
        } else if (ageYears < 14) {
          newErrors.dateOfBirth = "Employee must be at least 14 years old.";
        }
      }

      if (!formData.gender) newErrors.gender = "Please select a gender.";
    } else if (stepNumber === 2) {
      if (!formData.joinedAt) newErrors.joinedAt = "Date of joining is required.";
      if (!formData.employmentType) newErrors.employmentType = "Employment type is required.";
      if (!formData.status) newErrors.status = "Employee status is required.";
    } else if (stepNumber === 3) {
      if (formData.postalCode.trim()) {
        const zip = formData.postalCode.trim();
        if (!/^\d+$/.test(zip)) {
          newErrors.postalCode = "Pincode / ZIP must contain digits only.";
        } else if (formData.country === "India" && zip.length !== 6) {
          newErrors.postalCode = "Indian pincode must be exactly 6 digits.";
        } else if (zip.length < 4 || zip.length > 10) {
          newErrors.postalCode = "Postal code must be 4–10 digits.";
        }
      }
      if (formData.emergencyContactPhone.trim()) {
        const emDigits = extractDigits(formData.emergencyContactPhone);
        if (emDigits.length < 10 || emDigits.length > 15) {
          newErrors.emergencyContactPhone = "Enter a valid emergency phone (10–15 digits).";
        }
      }
    } else if (stepNumber === 4) {
      if (canEditSensitive) {
        if (formData.salary && (!/^\d+(\.\d{1,2})?$/.test(formData.salary) || Number(formData.salary) < 0)) {
          newErrors.salary = "Enter a valid numeric salary amount.";
        }
        if (formData.taxPayerId.trim() && !PAN_REGEX.test(formData.taxPayerId.trim().toUpperCase())) {
          newErrors.taxPayerId = "Invalid PAN format (e.g. ABCDE1234F).";
        }
        if (formData.aadhaar.trim() && !/^\d{12}$/.test(formData.aadhaar.trim())) {
          newErrors.aadhaar = "Aadhaar number must be exactly 12 digits.";
        }
        if (formData.uan.trim() && !/^\d{12}$/.test(formData.uan.trim())) {
          newErrors.uan = "UAN must be exactly 12 digits.";
        }
        if (formData.esiNumber.trim() && !/^\d{10,17}$/.test(formData.esiNumber.trim())) {
          newErrors.esiNumber = "ESI number must be 10–17 digits.";
        }
        if (formData.bankAccount.trim() && !/^\d{9,18}$/.test(formData.bankAccount.trim())) {
          newErrors.bankAccount = "Account number must be 9–18 digits.";
        }
        if (formData.bicSwift.trim() && !IFSC_REGEX.test(formData.bicSwift.trim().toUpperCase())) {
          newErrors.bicSwift = "Invalid IFSC format (e.g. HDFC0001234).";
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
      queryClient.invalidateQueries({ queryKey: ["org-tree"] });
      queryClient.invalidateQueries({ queryKey: ["org-structure"] });
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
      managerId: formData.managerId || null,
      joinedAt: formData.joinedAt,
      employmentType: formData.employmentType,
      status: formData.status,
      shiftId: formData.shiftId || null,
      attendancePolicyId: formData.attendancePolicyId || null,

      addressLine1: formData.addressLine1.trim() || null,
      addressLine2: formData.addressLine2.trim() || null,
      city: formData.city.trim() || null,
      district: formData.district?.trim() || null,
      state: formData.state.trim() || null,
      country: formData.country.trim() || null,
      postalCode: formData.postalCode.trim() || null,
      maritalStatus: formData.maritalStatus || null,
      emergencyContactName: formData.emergencyContactName.trim() || null,
      emergencyContactRelationship:
        formData.emergencyContactRelationship === "Other" && formData.emergencyContactRelationshipOther
          ? formData.emergencyContactRelationshipOther.trim()
          : formData.emergencyContactRelationship.trim() || null,
      emergencyContactRelationshipOther: formData.emergencyContactRelationshipOther?.trim() || null,
      emergencyContactPhone: formData.emergencyContactPhone.trim() || null,
    };

    if (formData.password && formData.password.trim().length > 0) {
      payload.password = formData.password.trim();
    }

    if (canEditSensitive) {
      payload.bankName = formData.bankName.trim() || null;
      payload.accountHolderName = formData.accountHolderName.trim() || null;
      payload.bankAccount = formData.bankAccount.trim() || null;
      payload.bicSwift = formData.bicSwift.trim().toUpperCase() || null;
      payload.bankIfsc = formData.bicSwift.trim().toUpperCase() || null;
      payload.bankBranch = formData.bankBranch.trim() || null;
      payload.taxPayerId = formData.taxPayerId.trim().toUpperCase() || null;
      payload.pan = formData.taxPayerId.trim().toUpperCase() || null;
      payload.taxRegime = formData.taxRegime || "new";
      payload.aadhaar = formData.aadhaar.trim() || null;
      payload.uan = formData.uan.trim() || null;
      payload.esiNumber = formData.esiNumber.trim() || null;
      payload.pfNumber = formData.pfNumber.trim() || null;
      payload.pfEligible = formData.pfEligible;
      payload.esiEligible = formData.esiEligible;
      payload.ptEligible = formData.ptEligible;
      payload.tdsEligible = formData.tdsEligible;
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
    <div className="w-full space-y-6 pb-16">
      <PageHeader
        title="Edit Employee"
        description={`Update employee details and information for ${fullNameDisplay}.`}
        actions={
          <Link to="/hr/employees/$id" params={{ id }}>
            <Button variant="outline" size="sm" className="gap-1.5 h-9">
              <ArrowLeft className="size-4" />
              Back
            </Button>
          </Link>
        }
      />

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
                            ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                            : isCompleted
                              ? "bg-primary text-primary-foreground"
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
                            ? "bg-primary"
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
                    className="bg-muted/50 cursor-not-allowed text-xs"
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
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => updateField("password", e.target.value)}
                      placeholder="Leave blank to preserve current password"
                      autoComplete="new-password"
                      className={cn("pr-10", errors.password && "border-destructive focus-visible:ring-destructive")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password ? (
                    <p className="text-[11px] text-destructive">{errors.password}</p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">
                      Blank preserves the existing login password without alteration.
                    </p>
                  )}
                </div>

                {/* Phone Number (Country Flags + Dial Code — identical to Create Employee) */}
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-xs font-medium">
                    Phone Number
                  </Label>
                  <PhoneInput
                    id="phone"
                    value={formData.phone}
                    onChange={(val) => updateField("phone", val)}
                    defaultCountry="IN"
                    placeholder="e.g. 98765 43210"
                    className={cn("h-10", errors.phone && "border-destructive")}
                  />
                  {errors.phone && <p className="text-[11px] text-destructive">{errors.phone}</p>}
                </div>

                {/* Date of Birth */}
                <div className="space-y-1.5">
                  <Label htmlFor="dateOfBirth" className="text-xs font-medium">
                    Date of Birth
                  </Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    max={new Date().toISOString().split("T")[0]}
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

                {/* Reporting Manager */}
                <div className="space-y-1.5">
                  <Label htmlFor="managerId" className="text-xs font-medium">
                    Reporting Manager
                  </Label>
                  <Select
                    value={formData.managerId || "none"}
                    onValueChange={(val) => updateField("managerId", val === "none" ? "" : val)}
                  >
                    <SelectTrigger id="managerId">
                      <SelectValue placeholder="Select manager (Optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (Top-Level Executive / Root)</SelectItem>
                      {potentialManagers
                        .filter((m: any) => m.id !== id)
                        .map((m: any) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.firstName} {m.lastName} ({m.employeeCode}) {m.position ? `— ${m.position}` : ""}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    Connects this employee to the corporate reporting tree.
                  </p>
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

                  {/* Country (Searchable with Flags — identical to Create Employee) */}
                  <div className="space-y-1.5">
                    <Label htmlFor="country" className="text-xs font-medium">
                      Country
                    </Label>
                    <CountrySelect
                      value={formData.country}
                      onValueChange={(val) => {
                        updateField("country", val);
                        updateField("state", "");
                        updateField("district", "");
                      }}
                      placeholder="Select Country"
                    />
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

                  {/* Postal / ZIP Code (Digits Only + India Auto-Lookup) */}
                  <div className="space-y-1.5">
                    <Label htmlFor="postalCode" className="text-xs font-medium">
                      Pincode / ZIP Code
                    </Label>
                    <Input
                      id="postalCode"
                      inputMode="numeric"
                      maxLength={formData.country === "India" ? 6 : 10}
                      value={formData.postalCode}
                      onChange={async (e) => {
                        const maxLen = formData.country === "India" ? 6 : 10;
                        const cleaned = e.target.value.replace(/\D/g, "").slice(0, maxLen);
                        updateField("postalCode", cleaned);
                        if (formData.country === "India" && cleaned.length === 6) {
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

                  {/* Marital Status */}
                  <div className="space-y-1.5">
                    <Label htmlFor="maritalStatus" className="text-xs font-medium">
                      Marital Status
                    </Label>
                    <Select
                      value={formData.maritalStatus || "single"}
                      onValueChange={(val) => updateField("maritalStatus", val)}
                    >
                      <SelectTrigger id="maritalStatus">
                        <SelectValue placeholder="Select marital status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">Single</SelectItem>
                        <SelectItem value="married">Married</SelectItem>
                        <SelectItem value="divorced">Divorced</SelectItem>
                        <SelectItem value="widowed">Widowed</SelectItem>
                      </SelectContent>
                    </Select>
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
                      Phone Number
                    </Label>
                    <PhoneInput
                      id="emergencyContactPhone"
                      value={formData.emergencyContactPhone}
                      onChange={(val) => updateField("emergencyContactPhone", val)}
                      defaultCountry="IN"
                      placeholder="e.g. 98765 43210"
                      className={cn("h-10", errors.emergencyContactPhone && "border-destructive")}
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
                      (<code className="bg-amber-100 dark:bg-amber-900 px-1 py-0.5 rounded">hr:employee:sensitive:write</code>).
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
                    inputMode="numeric"
                    maxLength={18}
                    value={formData.bankAccount}
                    onChange={(e) => updateField("bankAccount", e.target.value.replace(/\D/g, "").slice(0, 18))}
                    placeholder="e.g. 50100234567890"
                    disabled={!canEditSensitive}
                    className={errors.bankAccount ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  {errors.bankAccount && <p className="text-[11px] text-destructive">{errors.bankAccount}</p>}
                </div>

                {/* Bank Identifier Code (IFSC / BIC / SWIFT) */}
                <div className="space-y-1.5">
                  <Label htmlFor="bicSwift" className="text-xs font-medium">
                    IFSC / BIC Code
                  </Label>
                  <Input
                    id="bicSwift"
                    maxLength={11}
                    value={formData.bicSwift}
                    onChange={(e) => updateField("bicSwift", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 11))}
                    placeholder="e.g. HDFC0001234"
                    disabled={!canEditSensitive}
                    className={errors.bicSwift ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  {errors.bicSwift && <p className="text-[11px] text-destructive">{errors.bicSwift}</p>}
                </div>

                {/* Bank Branch */}
                <div className="space-y-1.5">
                  <Label htmlFor="bankBranch" className="text-xs font-medium">
                    Bank Branch
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
                    PAN / Tax Payer ID
                  </Label>
                  <Input
                    id="taxPayerId"
                    maxLength={10}
                    value={formData.taxPayerId}
                    onChange={(e) => updateField("taxPayerId", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10))}
                    placeholder="e.g. ABCDE1234F"
                    disabled={!canEditSensitive}
                    className={errors.taxPayerId ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  {errors.taxPayerId && <p className="text-[11px] text-destructive">{errors.taxPayerId}</p>}
                </div>

                {/* Aadhaar Number */}
                <div className="space-y-1.5">
                  <Label htmlFor="aadhaar" className="text-xs font-medium">
                    Aadhaar Number
                  </Label>
                  <Input
                    id="aadhaar"
                    inputMode="numeric"
                    maxLength={12}
                    value={formData.aadhaar}
                    onChange={(e) => updateField("aadhaar", e.target.value.replace(/\D/g, "").slice(0, 12))}
                    placeholder="12-digit Aadhaar number"
                    disabled={!canEditSensitive}
                    className={errors.aadhaar ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  {errors.aadhaar && <p className="text-[11px] text-destructive">{errors.aadhaar}</p>}
                </div>

                {/* UAN Number */}
                <div className="space-y-1.5">
                  <Label htmlFor="uan" className="text-xs font-medium">
                    UAN (Universal Account Number)
                  </Label>
                  <Input
                    id="uan"
                    inputMode="numeric"
                    maxLength={12}
                    value={formData.uan}
                    onChange={(e) => updateField("uan", e.target.value.replace(/\D/g, "").slice(0, 12))}
                    placeholder="12-digit UAN"
                    disabled={!canEditSensitive}
                    className={errors.uan ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  {errors.uan && <p className="text-[11px] text-destructive">{errors.uan}</p>}
                </div>

                {/* ESI Number */}
                <div className="space-y-1.5">
                  <Label htmlFor="esiNumber" className="text-xs font-medium">
                    ESI Number
                  </Label>
                  <Input
                    id="esiNumber"
                    inputMode="numeric"
                    maxLength={17}
                    value={formData.esiNumber}
                    onChange={(e) => updateField("esiNumber", e.target.value.replace(/\D/g, "").slice(0, 17))}
                    placeholder="10–17 digit ESI number"
                    disabled={!canEditSensitive}
                    className={errors.esiNumber ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  {errors.esiNumber && <p className="text-[11px] text-destructive">{errors.esiNumber}</p>}
                </div>

                {/* PF Number */}
                <div className="space-y-1.5">
                  <Label htmlFor="pfNumber" className="text-xs font-medium">
                    PF Number
                  </Label>
                  <Input
                    id="pfNumber"
                    value={formData.pfNumber}
                    onChange={(e) => updateField("pfNumber", e.target.value)}
                    placeholder="e.g. TN/MAS/0012345/000/0001234"
                    disabled={!canEditSensitive}
                  />
                </div>

                {/* Tax Regime */}
                <div className="space-y-1.5">
                  <Label htmlFor="taxRegime" className="text-xs font-medium">
                    Income Tax Regime
                  </Label>
                  <Select
                    value={formData.taxRegime || "new"}
                    onValueChange={(val) => updateField("taxRegime", val)}
                    disabled={!canEditSensitive}
                  >
                    <SelectTrigger id="taxRegime">
                      <SelectValue placeholder="Select tax regime" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New Tax Regime</SelectItem>
                      <SelectItem value="old">Old Tax Regime</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Base Salary */}
                <div className="space-y-1.5">
                  <Label htmlFor="salary" className="text-xs font-medium">
                    Base Salary (Annual CTC in INR)
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

                {/* Statutory Eligibility Checkboxes */}
                <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t">
                  {[
                    { key: "pfEligible", label: "PF Eligible" },
                    { key: "esiEligible", label: "ESI Eligible" },
                    { key: "ptEligible", label: "PT Eligible" },
                    { key: "tdsEligible", label: "TDS Eligible" },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center gap-2">
                      <Checkbox
                        id={item.key}
                        checked={Boolean((formData as any)[item.key])}
                        onCheckedChange={(c) => updateField(item.key, Boolean(c))}
                        disabled={!canEditSensitive}
                      />
                      <Label htmlFor={item.key} className="text-xs font-medium cursor-pointer">
                        {item.label}
                      </Label>
                    </div>
                  ))}
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
                  className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground h-8 text-xs shrink-0"
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
                                <Badge className="text-[10px] px-1.5 py-0 bg-primary text-primary-foreground">
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
              className="gap-1.5 h-9 bg-primary hover:bg-primary/90 text-primary-foreground"
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
              className="gap-1.5 h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-5"
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
              <UniversalFilePicker
                moduleKey="employees"
                pageKey="documents"
                entityType="employee_document"
                entityId={id || "draft"}
                fieldKey="file"
                allowedTypes=".pdf,image/*,.doc,.docx"
                title="Attach Employee Document"
                selectedFile={
                  newDocData.fileUrl
                    ? {
                        id: (newDocData as any).mediaId || "attached-doc",
                        fileName: newDocData.fileName || "Attached Document",
                        url: newDocData.fileUrl,
                      }
                    : null
                }
                onSelect={(file) => {
                  setNewDocData((prev) => ({
                    ...prev,
                    fileName: file.fileName,
                    fileUrl: file.url || "",
                    mediaId: file.id,
                  }));
                }}
                onRemove={() => {
                  setNewDocData((prev) => ({
                    ...prev,
                    fileName: "",
                    fileUrl: "",
                    mediaId: undefined,
                  }));
                }}
              />
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
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
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
