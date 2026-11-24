'use client';

import { useState, useRef, useMemo } from "react";
import { useNavigate } from "@/src/lib/router-compat";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Loader2,
  ImageIcon,
  X,
  Plus,
  Trash2,
} from "lucide-react";
import { EMPLOYEE_DOCUMENT_CATEGORIES } from "@/lib/constants/employee-documents";
import { CountrySelect } from "@/components/ui/country-select";
import { PhoneInput } from "@/components/ui/phone-input";
import { getStatesByCountry } from "@/lib/address/india-states";
import { getDistrictsByState } from "@/lib/address/india-districts";
import { lookupPincode } from "@/lib/address/address-lookup";
import { cn } from "@/lib/utils";

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

const STEPS = [
  { id: 1, title: "Personal", heading: "Basic Information" },
  { id: 2, title: "Employment", heading: "Employment Details" },
  { id: 3, title: "Contact", heading: "Contact Information" },
  { id: 4, title: "Banking", heading: "Banking & Compensation" },
  { id: 5, title: "Documents", heading: "Documents" },
] as const;

interface EmployeeDocumentDraft {
  id: string;
  documentType: string;
  title: string;
  documentNumber: string;
  expiryDate: string;
  fileName: string;
  fileUrl: string;
}

function createEmptyDocumentDraft(): EmployeeDocumentDraft {
  return {
    id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    documentType: "",
    title: "",
    documentNumber: "",
    expiryDate: "",
    fileName: "",
    fileUrl: "",
  };
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

function extractDigits(val: string): string {
  return val.replace(/\D/g, "");
}

function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "-" };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

function NewEmployeeWizardPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [showPassword, setShowPassword] = useState(false);
  const [avatarFileName, setAvatarFileName] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [documents, setDocuments] = useState<EmployeeDocumentDraft[]>([createEmptyDocumentDraft()]);

  const [formData, setFormData] = useState({
    // Step 1: Personal (Basic Information)
    fullName: "",
    employeeCode: "",
    email: "",
    password: "",
    phone: "",
    dateOfBirth: "",
    gender: "male",
    avatarUrl: "",

    // Step 2: Employment
    branchId: "",
    departmentId: "",
    designationId: "",
    managerId: "",
    shiftId: "",
    attendancePolicyId: "",
    employmentType: "full_time",
    joinedAt: new Date().toISOString().split("T")[0],
    status: "active",
    createLoginAccount: true,
    userRole: "employee",

    // Step 3: Contact
    address: "",
    country: "India",
    state: "",
    district: "",
    city: "",
    zipCode: "",
    bloodGroup: "",
    maritalStatus: "single",
    emergencyContactName: "",
    emergencyContactRelationship: "",
    emergencyContactRelationshipOther: "",
    emergencyContactPhone: "",

    // Step 4: Banking & Compensation
    bankName: "",
    bankAccount: "",
    bankIfsc: "",
    bankBranch: "",
    salary: "",
    taxRegime: "new",
    pan: "",
    aadhaar: "",
    uan: "",
    esiNumber: "",
    pfNumber: "",
    pfEligible: true,
    esiEligible: true,
    ptEligible: true,
    tdsEligible: true,

    // Step 5: Documents & Notes
    documentCategory: "Aadhaar Card / National Identity Proof",
    documentTitle: "",
    documentUrl: "",
    onboardingNotes: "",
  });

  const updateField = (key: string, val: any) => {
    setFormData((prev) => ({ ...prev, [key]: val }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  // Live API queries
  const { data: systemIdPreview } = useQuery({
    queryKey: ["employee-system-id-preview", formData.branchId],
    queryFn: async () => {
      const res = await api.get("/hr/employees/system-id/preview", {
        params: { branchId: formData.branchId || undefined },
      });
      return res?.data || res || {};
    },
  });

  const { data: branches = [] } = useQuery({
    queryKey: ["wizard-branches"],
    queryFn: async () => {
      const res = await api.get("/hr/organization/branches", { params: { limit: 100 } });
      return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
    },
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["wizard-departments"],
    queryFn: async () => {
      const res = await api.get("/hr/organization/departments", { params: { limit: 100 } });
      return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
    },
  });

  const { data: designations = [] } = useQuery({
    queryKey: ["wizard-designations"],
    queryFn: async () => {
      const res = await api.get("/hr/organization/designations", { params: { limit: 100 } });
      return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
    },
  });

  // Strict cascading filters: Branch -> Department -> Designation
  const filteredDepartments = useMemo(() => {
    if (!formData.branchId) return [];
    return departments.filter(
      (d: any) => d.branchId === formData.branchId || d.branch?.id === formData.branchId
    );
  }, [departments, formData.branchId]);

  const filteredDesignations = useMemo(() => {
    if (!formData.departmentId) return [];
    return designations.filter(
      (dg: any) =>
        dg.departmentId === formData.departmentId || dg.department?.id === formData.departmentId
    );
  }, [designations, formData.departmentId]);

  const { data: managers = [] } = useQuery({
    queryKey: ["wizard-managers"],
    queryFn: async () => {
      const res = await api.get("/hr/employees", { params: { limit: 100 } });
      return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
    },
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ["wizard-shifts"],
    queryFn: async () => {
      try {
        const res = await api.get("/v1/hr/attendance/shifts");
        return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  const { data: attendancePolicies = [] } = useQuery({
    queryKey: ["wizard-attendance-policies"],
    queryFn: async () => {
      try {
        const res = await api.get("/v1/hr/attendance/policies");
        return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  const { data: apiDocumentTypes = [] } = useQuery({
    queryKey: ["wizard-document-types"],
    queryFn: async () => {
      const res = await api.get("/hr/organization/document-types", { params: { limit: 100 } });
      return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
    },
  });

  const requiredDocumentTypes = useMemo<string[]>(() => {
    return (apiDocumentTypes as any[])
      .filter((dt: any) => Boolean(dt?.isRequired) && dt?.isActive !== false && typeof dt?.name === "string")
      .map((dt: any) => dt.name as string);
  }, [apiDocumentTypes]);

  const documentTypeOptions = useMemo(() => {
    const fromApi = apiDocumentTypes
      .map((dt: any) => dt?.name)
      .filter((name: any): name is string => typeof name === "string" && name.trim().length > 0);
    const defaults = EMPLOYEE_DOCUMENT_CATEGORIES.map((c) => c.name);
    return Array.from(new Set([...fromApi, ...defaults]));
  }, [apiDocumentTypes]);

  const updateDocumentItem = (id: string, field: keyof EmployeeDocumentDraft, value: string) => {
    setDocuments((prev) => prev.map((doc) => (doc.id === id ? { ...doc, [field]: value } : doc)));
  };

  const handleDocumentFileChange = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Document file exceeds the 5MB maximum file size.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setDocuments((prev) =>
          prev.map((doc) =>
            doc.id === id
              ? {
                  ...doc,
                  fileName: file.name,
                  fileUrl: reader.result as string,
                  title: doc.title || file.name.replace(/\.[^.]+$/, ""),
                }
              : doc
          )
        );
      }
    };
    reader.readAsDataURL(file);
  };

  const addMoreDocument = () => {
    setDocuments((prev) => [...prev, createEmptyDocumentDraft()]);
  };

  const removeDocument = (id: string) => {
    setDocuments((prev) => (prev.length > 1 ? prev.filter((doc) => doc.id !== id) : prev));
  };

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post("/hr/employees", payload);
    },
    onSuccess: () => {
      toast.success("Employee created successfully.");
      navigate({ to: "/hr/employees" as any });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to create employee record");
    },
  });

  // Strict per-step validation
  const validateStep = (step: number): boolean => {
    const nextErrors: Record<string, string> = {};

    if (step === 1) {
      const name = formData.fullName.trim();
      if (!name) {
        nextErrors.fullName = "Full name is required.";
      } else if (name.length < 2) {
        nextErrors.fullName = "Full name must be at least 2 characters.";
      } else if (/^\d+$/.test(name)) {
        nextErrors.fullName = "Full name cannot be numbers only.";
      }

      if (!formData.employeeCode.trim()) {
        nextErrors.employeeCode = "Employee code is required.";
      } else if (!/^[A-Za-z0-9_-]{2,32}$/.test(formData.employeeCode.trim())) {
        nextErrors.employeeCode = "Use 2–32 letters, numbers, hyphens, or underscores.";
      }

      if (!formData.email.trim()) {
        nextErrors.email = "Email address is required.";
      } else if (!EMAIL_REGEX.test(formData.email.trim())) {
        nextErrors.email = "Enter a valid email address.";
      }

      if (!formData.password) {
        nextErrors.password = "Password is required.";
      } else if (formData.password.length < 6) {
        nextErrors.password = "Password must be at least 6 characters.";
      }

      const phoneDigits = extractDigits(formData.phone);
      if (!phoneDigits) {
        nextErrors.phone = "Phone number is required.";
      } else if (phoneDigits.length < 10 || phoneDigits.length > 15) {
        nextErrors.phone = "Enter a valid phone number (10–15 digits).";
      }

      if (!formData.dateOfBirth) {
        nextErrors.dateOfBirth = "Date of birth is required.";
      } else {
        const dob = new Date(formData.dateOfBirth);
        const now = new Date();
        const ageYears = (now.getTime() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
        if (isNaN(dob.getTime()) || dob > now) {
          nextErrors.dateOfBirth = "Date of birth cannot be in the future.";
        } else if (ageYears < 14) {
          nextErrors.dateOfBirth = "Employee must be at least 14 years old.";
        }
      }

      if (!formData.gender) {
        nextErrors.gender = "Please select a gender.";
      }
    }

    if (step === 2) {
      if (!formData.joinedAt) {
        nextErrors.joinedAt = "Joining date is required.";
      }
    }

    if (step === 3) {
      if (formData.zipCode) {
        if (!/^\d+$/.test(formData.zipCode)) {
          nextErrors.zipCode = "Pincode / ZIP must contain digits only.";
        } else if (formData.country === "India" && formData.zipCode.length !== 6) {
          nextErrors.zipCode = "Indian pincode must be exactly 6 digits.";
        } else if (formData.zipCode.length < 4 || formData.zipCode.length > 10) {
          nextErrors.zipCode = "Postal code must be 4–10 digits.";
        }
      }

      if (formData.emergencyContactPhone) {
        const emDigits = extractDigits(formData.emergencyContactPhone);
        if (emDigits.length < 10 || emDigits.length > 15) {
          nextErrors.emergencyContactPhone = "Enter a valid emergency phone (10–15 digits).";
        }
      }
    }

    if (step === 4) {
      if (formData.salary && (!/^\d+(\.\d{1,2})?$/.test(formData.salary) || Number(formData.salary) < 0)) {
        nextErrors.salary = "Enter a valid numeric salary amount.";
      }
      if (formData.pan && !PAN_REGEX.test(formData.pan)) {
        nextErrors.pan = "Invalid PAN format (e.g. ABCDE1234F).";
      }
      if (formData.aadhaar && !/^\d{12}$/.test(formData.aadhaar)) {
        nextErrors.aadhaar = "Aadhaar number must be exactly 12 digits.";
      }
      if (formData.uan && !/^\d{12}$/.test(formData.uan)) {
        nextErrors.uan = "UAN must be exactly 12 digits.";
      }
      if (formData.esiNumber && !/^\d{10,17}$/.test(formData.esiNumber)) {
        nextErrors.esiNumber = "ESI number must be 10–17 digits.";
      }
      if (formData.bankAccount && !/^\d{9,18}$/.test(formData.bankAccount)) {
        nextErrors.bankAccount = "Account number must be 9–18 digits.";
      }
      if (formData.bankIfsc && !IFSC_REGEX.test(formData.bankIfsc)) {
        nextErrors.bankIfsc = "Invalid IFSC format (e.g. HDFC0001234).";
      }
    }

    if (step === 5) {
      if (requiredDocumentTypes.length > 0) {
        const missingRequired = requiredDocumentTypes.filter(
          (reqName) =>
            !documents.some(
              (d) =>
                d.documentType.toLowerCase() === reqName.toLowerCase() &&
                Boolean(d.fileUrl)
            )
        );
        if (missingRequired.length > 0) {
          nextErrors.documents = `Mandatory document upload required: ${missingRequired.join(", ")}.`;
        }
      }
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      const firstError = Object.values(nextErrors)[0];
      toast.error(firstError);
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) return;
    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleStepClick = (targetStep: number) => {
    if (targetStep <= currentStep) {
      setCurrentStep(targetStep);
      return;
    }
    // Validate sequential steps before jumping forward
    for (let s = currentStep; s < targetStep; s++) {
      if (!validateStep(s)) return;
    }
    setCurrentStep(targetStep);
  };

  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErrors((prev) => ({ ...prev, avatarUrl: "Please select a valid image file (PNG, JPG, WebP)." }));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, avatarUrl: "Image exceeds the 2MB maximum file size." }));
      toast.error("Profile image must be 2MB or smaller.");
      return;
    }
    setAvatarFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        updateField("avatarUrl", reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (!validateStep(currentStep)) return;

    const { firstName, lastName } = splitFullName(formData.fullName);
    const payload = {
      firstName,
      lastName,
      employeeCode: formData.employeeCode.trim(),
      email: formData.email.trim(),
      password: formData.password,
      phone: formData.phone.trim(),
      dateOfBirth: formData.dateOfBirth || undefined,
      gender: formData.gender,
      avatarUrl: formData.avatarUrl || undefined,
      branchId: formData.branchId || undefined,
      departmentId: formData.departmentId || undefined,
      designationId: formData.designationId || undefined,
      managerId: formData.managerId || undefined,
      shiftId: formData.shiftId || undefined,
      attendancePolicyId: formData.attendancePolicyId || undefined,
      employmentType: formData.employmentType,
      joinedAt: formData.joinedAt,
      status: formData.status,
      createLoginAccount: formData.createLoginAccount,
      userRole: formData.userRole,
      addressLine1: formData.address.trim() || "",
      country: formData.country,
      state: formData.state,
      district: formData.district,
      city: formData.city.trim(),
      postalCode: formData.zipCode.trim(),
      zipCode: formData.zipCode.trim(),
      bloodGroup: formData.bloodGroup || undefined,
      maritalStatus: formData.maritalStatus,
      emergencyContactName: formData.emergencyContactName.trim() || undefined,
      emergencyContactRelationship:
        formData.emergencyContactRelationship === "Other" && formData.emergencyContactRelationshipOther
          ? formData.emergencyContactRelationshipOther.trim()
          : formData.emergencyContactRelationship || "",
      emergencyContactPhone: formData.emergencyContactPhone.trim() || undefined,
      bankName: formData.bankName.trim() || undefined,
      bankAccount: formData.bankAccount.trim() || undefined,
      bankIfsc: formData.bankIfsc.trim() || undefined,
      bankBranch: formData.bankBranch.trim() || undefined,
      salary: formData.salary ? Number(formData.salary) : undefined,
      taxRegime: formData.taxRegime,
      pan: formData.pan.trim() || undefined,
      aadhaar: formData.aadhaar.trim() || undefined,
      uan: formData.uan.trim() || undefined,
      esiNumber: formData.esiNumber.trim() || undefined,
      pfNumber: formData.pfNumber.trim() || undefined,
      pfEligible: formData.pfEligible,
      esiEligible: formData.esiEligible,
      ptEligible: formData.ptEligible,
      tdsEligible: formData.tdsEligible,
      documentCategory: documents[0]?.documentType || formData.documentCategory,
      documentTitle: documents[0]?.title?.trim() || undefined,
      documentUrl: documents[0]?.fileUrl || undefined,
      documents: documents
        .filter((d) => d.documentType || d.title.trim() || d.documentNumber.trim() || d.fileUrl)
        .map((d) => ({
          documentType: d.documentType || "Other",
          category: d.documentType || "Other",
          title: d.title.trim() || d.documentType || "Employee Document",
          documentNumber: d.documentNumber.trim() || undefined,
          fileUrl: d.fileUrl || undefined,
          mediaUrl: d.fileUrl || undefined,
          expiryDate: d.expiryDate || undefined,
        })),
      onboardingNotes: formData.onboardingNotes.trim() || undefined,
    };

    createMutation.mutate(payload);
  };

  const activeStepMeta = STEPS[currentStep - 1];

  return (
    <div className="w-full space-y-5">
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Create Employee</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Add a new employee to your organization.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => navigate({ to: "/hr/employees" as any })}
          className="h-9 gap-1.5 text-xs font-medium"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </Button>
      </div>

      {/* ── Outer Wizard Container ── */}
      <div className="rounded-xl border border-border/80 bg-card shadow-xs p-5 lg:p-6 space-y-6">
        {/* ── 5-Step Horizontal Stepper ── */}
        <div className="flex items-center justify-between overflow-x-auto pb-1">
          {STEPS.map((step, index) => {
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            return (
              <div key={step.id} className="flex items-center flex-1 last:flex-none min-w-fit">
                <button
                  type="button"
                  onClick={() => handleStepClick(step.id)}
                  className="flex items-center gap-2.5 group focus:outline-none cursor-pointer"
                >
                  <span
                    className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-colors shrink-0",
                      isActive
                        ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                        : isCompleted
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-border text-muted-foreground group-hover:border-muted-foreground/60"
                    )}
                  >
                    {isCompleted ? <Check className="h-4 w-4" /> : step.id}
                  </span>
                  <span
                    className={cn(
                      "text-xs font-medium whitespace-nowrap transition-colors",
                      isActive
                        ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                        : isCompleted
                          ? "text-foreground"
                          : "text-muted-foreground group-hover:text-foreground"
                    )}
                  >
                    {step.title}
                  </span>
                </button>
                {index < STEPS.length - 1 && (
                  <div
                    className={cn(
                      "flex-1 h-px mx-3 sm:mx-5 min-w-[24px] transition-colors",
                      isCompleted ? "bg-emerald-500/60" : "bg-border"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* ── Inner Section Card ── */}
        <div className="rounded-xl border border-border/80 bg-background/40 overflow-hidden">
          <div className="px-6 py-4 border-b border-border/70">
            <h2 className="text-lg font-bold tracking-tight text-foreground">
              {activeStepMeta.heading}
            </h2>
          </div>

          <div className="p-6">
            {/* ── STEP 1: PERSONAL (BASIC INFORMATION) ── */}
            {currentStep === 1 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="emp-full-name" className="text-xs font-semibold text-foreground">
                    Full Name <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="emp-full-name"
                    value={formData.fullName}
                    onChange={(e) => updateField("fullName", e.target.value)}
                    placeholder="e.g. John Doe"
                    className={cn("h-10 text-sm", errors.fullName && "border-rose-500 focus-visible:ring-rose-500")}
                  />
                  {errors.fullName && <p className="text-xs text-rose-600">{errors.fullName}</p>}
                </div>

                {/* Employee ID (Auto-Generated Preview) */}
                <div className="space-y-1.5">
                  <Label htmlFor="emp-system-id" className="text-xs font-semibold text-foreground">
                    Employee ID
                  </Label>
                  <Input
                    id="emp-system-id"
                    value={systemIdPreview?.preview || "EMP000001"}
                    readOnly
                    disabled
                    className="h-10 text-sm bg-muted/60 text-muted-foreground font-mono cursor-not-allowed"
                  />
                  <p className="text-[11px] text-muted-foreground">Employee ID will be auto-generated</p>
                </div>

                {/* Employee Code */}
                <div className="space-y-1.5">
                  <Label htmlFor="emp-code" className="text-xs font-semibold text-foreground">
                    Employee Code <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="emp-code"
                    value={formData.employeeCode}
                    onChange={(e) => updateField("employeeCode", e.target.value.replace(/[^A-Za-z0-9_-]/g, ""))}
                    placeholder="e.g. EMP001"
                    className={cn("h-10 text-sm", errors.employeeCode && "border-rose-500 focus-visible:ring-rose-500")}
                  />
                  {errors.employeeCode ? (
                    <p className="text-xs text-rose-600">{errors.employeeCode}</p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">
                      This ID will be used to map employee with biometric device.
                    </p>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <Label htmlFor="emp-email" className="text-xs font-semibold text-foreground">
                    Email <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="emp-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    placeholder="e.g. john@example.com"
                    className={cn("h-10 text-sm", errors.email && "border-rose-500 focus-visible:ring-rose-500")}
                  />
                  {errors.email && <p className="text-xs text-rose-600">{errors.email}</p>}
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <Label htmlFor="emp-password" className="text-xs font-semibold text-foreground">
                    Password <span className="text-rose-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="emp-password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => updateField("password", e.target.value)}
                      placeholder="Enter password"
                      className={cn(
                        "h-10 text-sm pr-10",
                        errors.password && "border-rose-500 focus-visible:ring-rose-500"
                      )}
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
                  {errors.password && <p className="text-xs text-rose-600">{errors.password}</p>}
                </div>

                {/* Phone Number (Strict Digits Only) */}
                <div className="space-y-1.5">
                  <Label htmlFor="emp-phone" className="text-xs font-semibold text-foreground">
                    Phone Number <span className="text-rose-500">*</span>
                  </Label>
                  <PhoneInput
                    id="emp-phone"
                    value={formData.phone}
                    onChange={(val) => updateField("phone", val)}
                    defaultCountry="IN"
                    placeholder="e.g. 98765 43210"
                    className={cn("h-10", errors.phone && "border-rose-500")}
                  />
                  {errors.phone && <p className="text-xs text-rose-600">{errors.phone}</p>}
                </div>

                {/* Date of Birth */}
                <div className="space-y-1.5">
                  <Label htmlFor="emp-dob" className="text-xs font-semibold text-foreground">
                    Date of Birth <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="emp-dob"
                    type="date"
                    max={new Date().toISOString().split("T")[0]}
                    value={formData.dateOfBirth}
                    onChange={(e) => updateField("dateOfBirth", e.target.value)}
                    className={cn("h-10 text-sm", errors.dateOfBirth && "border-rose-500 focus-visible:ring-rose-500")}
                  />
                  {errors.dateOfBirth && <p className="text-xs text-rose-600">{errors.dateOfBirth}</p>}
                </div>

                {/* Gender (Inline Radio Buttons matching screenshot) */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground">
                    Gender <span className="text-rose-500">*</span>
                  </Label>
                  <div className="flex items-center gap-6 h-10">
                    {[
                      { value: "male", label: "Male" },
                      { value: "female", label: "Female" },
                      { value: "other", label: "Other" },
                    ].map((opt) => {
                      const checked = formData.gender === opt.value;
                      return (
                        <label
                          key={opt.value}
                          className="inline-flex items-center gap-2 text-sm text-foreground cursor-pointer select-none"
                        >
                          <input
                            type="radio"
                            name="employee-gender"
                            value={opt.value}
                            checked={checked}
                            onChange={() => updateField("gender", opt.value)}
                            className="sr-only"
                          />
                          <span
                            className={cn(
                              "h-4 w-4 rounded-full border-2 flex items-center justify-center transition-colors",
                              checked ? "border-emerald-500" : "border-emerald-500/60"
                            )}
                          >
                            {checked && <span className="h-2 w-2 rounded-full bg-emerald-500" />}
                          </span>
                          <span>{opt.label}</span>
                        </label>
                      );
                    })}
                  </div>
                  {errors.gender && <p className="text-xs text-rose-600">{errors.gender}</p>}
                </div>

                {/* Profile Image (Full-Width Row matching screenshot) */}
                <div className="md:col-span-2 space-y-2 pt-1">
                  <Label className="text-xs font-semibold text-foreground">Profile Image</Label>
                  <div className="flex items-start gap-4">
                    <div className="relative h-24 w-24 rounded-lg border border-border/80 bg-muted/30 flex flex-col items-center justify-center overflow-hidden shrink-0">
                      {formData.avatarUrl ? (
                        <>
                          <img
                            src={formData.avatarUrl}
                            alt="Profile preview"
                            className="h-full w-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              updateField("avatarUrl", "");
                              setAvatarFileName("");
                              if (fileInputRef.current) fileInputRef.current.value = "";
                            }}
                            className="absolute top-1 right-1 h-5 w-5 rounded-full bg-background/85 text-foreground flex items-center justify-center hover:bg-rose-600 hover:text-white transition-colors cursor-pointer"
                            aria-label="Remove profile image"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center mb-1">
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <span className="text-[10px] text-muted-foreground">No image</span>
                        </>
                      )}
                    </div>

                    <div className="flex-1 space-y-1.5 pt-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleProfileImageChange}
                        className="hidden"
                      />
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className={cn(
                          "flex items-center gap-3 h-10 px-3 rounded-md border border-border/80 bg-card hover:bg-muted/40 transition-colors cursor-pointer text-sm",
                          errors.avatarUrl && "border-rose-500"
                        )}
                      >
                        <span className="font-medium text-foreground shrink-0">Choose File</span>
                        <span className="text-muted-foreground truncate">
                          {avatarFileName || "No file chosen"}
                        </span>
                      </div>
                      {errors.avatarUrl ? (
                        <p className="text-xs text-rose-600">{errors.avatarUrl}</p>
                      ) : (
                        <p className="text-[11px] text-muted-foreground">Max file size: 2MB</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 2: EMPLOYMENT DETAILS ── */}
            {currentStep === 2 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Branch</Label>
                  <Select
                    value={formData.branchId || "none"}
                    onValueChange={(val) => {
                      const nextBranch = val === "none" ? "" : val;
                      updateField("branchId", nextBranch);
                      updateField("departmentId", "");
                      updateField("designationId", "");
                    }}
                  >
                    <SelectTrigger className="h-10 text-sm">
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select Branch</SelectItem>
                      {branches.map((b: any) => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Department</Label>
                  <Select
                    value={formData.departmentId || "none"}
                    disabled={!formData.branchId}
                    onValueChange={(val) => {
                      const nextDept = val === "none" ? "" : val;
                      updateField("departmentId", nextDept);
                      updateField("designationId", "");
                    }}
                  >
                    <SelectTrigger className="h-10 text-sm">
                      <SelectValue
                        placeholder={
                          !formData.branchId
                            ? "Select a branch first"
                            : filteredDepartments.length === 0
                              ? "No departments in this branch"
                              : "Select department"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        {!formData.branchId ? "Select a branch first" : "Select Department"}
                      </SelectItem>
                      {filteredDepartments.map((d: any) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Designation</Label>
                  <Select
                    value={formData.designationId || "none"}
                    disabled={!formData.departmentId}
                    onValueChange={(val) => updateField("designationId", val === "none" ? "" : val)}
                  >
                    <SelectTrigger className="h-10 text-sm">
                      <SelectValue
                        placeholder={
                          !formData.departmentId
                            ? "Select a department first"
                            : filteredDesignations.length === 0
                              ? "No designations in this department"
                              : "Select designation"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        {!formData.departmentId ? "Select a department first" : "Select Designation"}
                      </SelectItem>
                      {filteredDesignations.map((dg: any) => (
                        <SelectItem key={dg.id} value={dg.id}>{dg.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Reporting Manager</Label>
                  <Select
                    value={formData.managerId || "none"}
                    onValueChange={(val) => updateField("managerId", val === "none" ? "" : val)}
                  >
                    <SelectTrigger className="h-10 text-sm">
                      <SelectValue placeholder="Select manager" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Top Executive (No Manager)</SelectItem>
                      {managers.map((m: any) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.firstName} {m.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="emp-joined-at" className="text-xs font-semibold text-foreground">
                    Date of Joining <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="emp-joined-at"
                    type="date"
                    value={formData.joinedAt}
                    onChange={(e) => updateField("joinedAt", e.target.value)}
                    className={cn("h-10 text-sm", errors.joinedAt && "border-rose-500")}
                  />
                  {errors.joinedAt && <p className="text-xs text-rose-600">{errors.joinedAt}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Employment Type</Label>
                  <Select
                    value={formData.employmentType}
                    onValueChange={(val) => updateField("employmentType", val)}
                  >
                    <SelectTrigger className="h-10 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full_time">Full Time</SelectItem>
                      <SelectItem value="part_time">Part Time</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="intern">Intern</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Employment Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(val) => updateField("status", val)}
                  >
                    <SelectTrigger className="h-10 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="on_leave">On Leave</SelectItem>
                      <SelectItem value="terminated">Terminated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Workspace Role</Label>
                  <Select
                    value={formData.userRole}
                    onValueChange={(val) => updateField("userRole", val)}
                  >
                    <SelectTrigger className="h-10 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employee">Employee (Self-Service)</SelectItem>
                      <SelectItem value="manager">Manager (Team Approvals)</SelectItem>
                      <SelectItem value="hr_admin">HR Administrator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Work Shift</Label>
                  <Select
                    value={formData.shiftId || "none"}
                    onValueChange={(val) => updateField("shiftId", val === "none" ? "" : val)}
                  >
                    <SelectTrigger className="h-10 text-sm">
                      <SelectValue placeholder="Select work shift" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Default Shift</SelectItem>
                      {shifts
                        .filter((s: any) => (s.status || "active") === "active")
                        .map((s: any) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name} ({s.startTime} - {s.endTime})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Attendance Policy</Label>
                  <Select
                    value={formData.attendancePolicyId || "none"}
                    onValueChange={(val) => updateField("attendancePolicyId", val === "none" ? "" : val)}
                  >
                    <SelectTrigger className="h-10 text-sm">
                      <SelectValue placeholder="Select attendance policy" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Default Attendance Policy</SelectItem>
                      {attendancePolicies
                        .filter((p: any) => (p.status || "active") === "active")
                        .map((p: any) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2 flex items-center gap-2 pt-1">
                  <Checkbox
                    id="create-login-account"
                    checked={formData.createLoginAccount}
                    onCheckedChange={(c) => updateField("createLoginAccount", Boolean(c))}
                  />
                  <Label htmlFor="create-login-account" className="text-xs font-medium cursor-pointer">
                    Enable self-service login account using the email &amp; password from Step 1
                  </Label>
                </div>
              </div>
            )}

            {/* ── STEP 3: CONTACT INFORMATION ── */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                  <div className="md:col-span-2 space-y-1.5">
                    <Label htmlFor="emp-address" className="text-xs font-semibold text-foreground">
                      Residential Address
                    </Label>
                    <Input
                      id="emp-address"
                      value={formData.address}
                      onChange={(e) => updateField("address", e.target.value)}
                      placeholder="Street / Apartment / Building"
                      className="h-10 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">Country</Label>
                    <CountrySelect
                      value={formData.country}
                      onValueChange={(val) => {
                        updateField("country", val);
                        updateField("state", "");
                        updateField("district", "");
                      }}
                      placeholder="Select Country"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">State / Province</Label>
                    {getStatesByCountry(formData.country).length > 0 ? (
                      <Select
                        value={formData.state}
                        onValueChange={(val) => {
                          updateField("state", val);
                          updateField("district", "");
                        }}
                      >
                        <SelectTrigger className="h-10 text-sm">
                          <SelectValue placeholder="Select State" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {getStatesByCountry(formData.country).map((s) => (
                            <SelectItem key={s.code} value={s.name}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        value={formData.state}
                        onChange={(e) => updateField("state", e.target.value)}
                        placeholder="State / Province"
                        className="h-10 text-sm"
                      />
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">District</Label>
                    {getDistrictsByState(formData.state).length > 0 ? (
                      <Select
                        value={formData.district}
                        onValueChange={(val) => updateField("district", val)}
                      >
                        <SelectTrigger className="h-10 text-sm">
                          <SelectValue placeholder="Select District" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {getDistrictsByState(formData.state).map((d) => (
                            <SelectItem key={d.code} value={d.name}>{d.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        value={formData.district}
                        onChange={(e) => updateField("district", e.target.value)}
                        placeholder="e.g. Chennai / Bengaluru"
                        className="h-10 text-sm"
                      />
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="emp-city" className="text-xs font-semibold text-foreground">
                      City
                    </Label>
                    <Input
                      id="emp-city"
                      value={formData.city}
                      onChange={(e) => updateField("city", e.target.value)}
                      placeholder="e.g. Chennai"
                      className="h-10 text-sm"
                    />
                  </div>

                  {/* Pincode / ZIP Code (Strict Digits Only) */}
                  <div className="space-y-1.5">
                    <Label htmlFor="emp-pincode" className="text-xs font-semibold text-foreground">
                      Pincode / ZIP Code
                    </Label>
                    <Input
                      id="emp-pincode"
                      inputMode="numeric"
                      maxLength={formData.country === "India" ? 6 : 10}
                      value={formData.zipCode}
                      onChange={async (e) => {
                        const maxLen = formData.country === "India" ? 6 : 10;
                        const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, maxLen);
                        updateField("zipCode", digitsOnly);
                        if (formData.country === "India" && digitsOnly.length === 6) {
                          const match = await lookupPincode(digitsOnly);
                          if (match) {
                            if (!formData.city || formData.city === match.city) updateField("city", match.city);
                            if (!formData.state || formData.state === match.state) updateField("state", match.state);
                            if (match.district) updateField("district", match.district);
                            toast.info(`Location matched: ${match.city}, ${match.state}`);
                          }
                        }
                      }}
                      placeholder="e.g. 600001"
                      className={cn("h-10 text-sm", errors.zipCode && "border-rose-500 focus-visible:ring-rose-500")}
                    />
                    {errors.zipCode && <p className="text-xs text-rose-600">{errors.zipCode}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">Blood Group</Label>
                    <Select
                      value={formData.bloodGroup || "none"}
                      onValueChange={(val) => updateField("bloodGroup", val === "none" ? "" : val)}
                    >
                      <SelectTrigger className="h-10 text-sm">
                        <SelectValue placeholder="Select blood group" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Not Specified</SelectItem>
                        {BLOOD_GROUPS.map((bg) => (
                          <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Emergency Contact */}
                <div className="pt-4 border-t border-border/70 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Emergency Contact
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="em-name" className="text-xs font-semibold text-foreground">
                        Contact Name
                      </Label>
                      <Input
                        id="em-name"
                        value={formData.emergencyContactName}
                        onChange={(e) => updateField("emergencyContactName", e.target.value)}
                        placeholder="e.g. Jane Doe"
                        className="h-10 text-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground">Relationship</Label>
                      <Select
                        value={formData.emergencyContactRelationship || "none"}
                        onValueChange={(val) => {
                          const next = val === "none" ? "" : val;
                          updateField("emergencyContactRelationship", next);
                          if (next !== "Other") updateField("emergencyContactRelationshipOther", "");
                        }}
                      >
                        <SelectTrigger className="h-10 text-sm">
                          <SelectValue placeholder="Select relationship" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Select relationship</SelectItem>
                          {EMERGENCY_RELATIONSHIPS.map((rel) => (
                            <SelectItem key={rel} value={rel}>{rel}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="em-phone" className="text-xs font-semibold text-foreground">
                        Emergency Phone
                      </Label>
                      <PhoneInput
                        id="em-phone"
                        value={formData.emergencyContactPhone}
                        onChange={(val) => updateField("emergencyContactPhone", val)}
                        defaultCountry="IN"
                        placeholder="98765 12345"
                        className={cn("h-10", errors.emergencyContactPhone && "border-rose-500")}
                      />
                      {errors.emergencyContactPhone && (
                        <p className="text-xs text-rose-600">{errors.emergencyContactPhone}</p>
                      )}
                    </div>

                    {formData.emergencyContactRelationship === "Other" && (
                      <div className="md:col-span-3 space-y-1.5">
                        <Label className="text-xs font-semibold text-foreground">Specify Relationship</Label>
                        <Input
                          value={formData.emergencyContactRelationshipOther}
                          onChange={(e) => updateField("emergencyContactRelationshipOther", e.target.value)}
                          placeholder="e.g. Cousin, Uncle, Roommate"
                          className="h-10 text-sm"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 4: BANKING & COMPENSATION ── */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="bank-name" className="text-xs font-semibold text-foreground">Bank Name</Label>
                    <Input
                      id="bank-name"
                      value={formData.bankName}
                      onChange={(e) => updateField("bankName", e.target.value)}
                      placeholder="e.g. HDFC Bank"
                      className="h-10 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="bank-account" className="text-xs font-semibold text-foreground">Account Number</Label>
                    <Input
                      id="bank-account"
                      inputMode="numeric"
                      maxLength={18}
                      value={formData.bankAccount}
                      onChange={(e) => updateField("bankAccount", e.target.value.replace(/\D/g, "").slice(0, 18))}
                      placeholder="e.g. 5010023456789"
                      className={cn("h-10 text-sm", errors.bankAccount && "border-rose-500")}
                    />
                    {errors.bankAccount && <p className="text-xs text-rose-600">{errors.bankAccount}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="bank-ifsc" className="text-xs font-semibold text-foreground">IFSC Code</Label>
                    <Input
                      id="bank-ifsc"
                      maxLength={11}
                      value={formData.bankIfsc}
                      onChange={(e) =>
                        updateField("bankIfsc", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 11))
                      }
                      placeholder="e.g. HDFC0001234"
                      className={cn("h-10 text-sm font-mono", errors.bankIfsc && "border-rose-500")}
                    />
                    {errors.bankIfsc && <p className="text-xs text-rose-600">{errors.bankIfsc}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="bank-branch" className="text-xs font-semibold text-foreground">Bank Branch</Label>
                    <Input
                      id="bank-branch"
                      value={formData.bankBranch}
                      onChange={(e) => updateField("bankBranch", e.target.value)}
                      placeholder="e.g. Koramangala, Bengaluru"
                      className="h-10 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="emp-salary" className="text-xs font-semibold text-foreground">
                      Annual Base CTC / Salary
                    </Label>
                    <Input
                      id="emp-salary"
                      inputMode="decimal"
                      value={formData.salary}
                      onChange={(e) => updateField("salary", e.target.value.replace(/[^\d.]/g, ""))}
                      placeholder="e.g. 1200000"
                      className={cn("h-10 text-sm", errors.salary && "border-rose-500")}
                    />
                    {errors.salary && <p className="text-xs text-rose-600">{errors.salary}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">Tax Regime</Label>
                    <Select value={formData.taxRegime} onValueChange={(val) => updateField("taxRegime", val)}>
                      <SelectTrigger className="h-10 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New Tax Regime (Section 115BAC)</SelectItem>
                        <SelectItem value="old">Old Tax Regime (With Deductions)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="emp-pan" className="text-xs font-semibold text-foreground">PAN Number</Label>
                    <Input
                      id="emp-pan"
                      maxLength={10}
                      value={formData.pan}
                      onChange={(e) =>
                        updateField("pan", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10))
                      }
                      placeholder="e.g. ABCDE1234F"
                      className={cn("h-10 text-sm font-mono", errors.pan && "border-rose-500")}
                    />
                    {errors.pan && <p className="text-xs text-rose-600">{errors.pan}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="emp-aadhaar" className="text-xs font-semibold text-foreground">
                      Aadhaar Number (12 Digits)
                    </Label>
                    <Input
                      id="emp-aadhaar"
                      inputMode="numeric"
                      maxLength={12}
                      value={formData.aadhaar}
                      onChange={(e) => updateField("aadhaar", e.target.value.replace(/\D/g, "").slice(0, 12))}
                      placeholder="12-digit Aadhaar number"
                      className={cn("h-10 text-sm font-mono", errors.aadhaar && "border-rose-500")}
                    />
                    {errors.aadhaar && <p className="text-xs text-rose-600">{errors.aadhaar}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="emp-uan" className="text-xs font-semibold text-foreground">UAN (12 Digits)</Label>
                    <Input
                      id="emp-uan"
                      inputMode="numeric"
                      maxLength={12}
                      value={formData.uan}
                      onChange={(e) => updateField("uan", e.target.value.replace(/\D/g, "").slice(0, 12))}
                      placeholder="12-digit UAN"
                      className={cn("h-10 text-sm font-mono", errors.uan && "border-rose-500")}
                    />
                    {errors.uan && <p className="text-xs text-rose-600">{errors.uan}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="emp-esi" className="text-xs font-semibold text-foreground">ESI Number</Label>
                    <Input
                      id="emp-esi"
                      inputMode="numeric"
                      maxLength={17}
                      value={formData.esiNumber}
                      onChange={(e) => updateField("esiNumber", e.target.value.replace(/\D/g, "").slice(0, 17))}
                      placeholder="ESI number"
                      className={cn("h-10 text-sm font-mono", errors.esiNumber && "border-rose-500")}
                    />
                    {errors.esiNumber && <p className="text-xs text-rose-600">{errors.esiNumber}</p>}
                  </div>
                </div>

                <div className="pt-4 border-t border-border/70">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                      <Checkbox
                        checked={formData.pfEligible}
                        onCheckedChange={(c) => updateField("pfEligible", Boolean(c))}
                      />
                      EPF Eligible
                    </label>
                    <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                      <Checkbox
                        checked={formData.esiEligible}
                        onCheckedChange={(c) => updateField("esiEligible", Boolean(c))}
                      />
                      ESIC Eligible
                    </label>
                    <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                      <Checkbox
                        checked={formData.ptEligible}
                        onCheckedChange={(c) => updateField("ptEligible", Boolean(c))}
                      />
                      PT Deduction
                    </label>
                    <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                      <Checkbox
                        checked={formData.tdsEligible}
                        onCheckedChange={(c) => updateField("tdsEligible", Boolean(c))}
                      />
                      TDS Withholding
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 5: DOCUMENTS (Repeatable Document #1, #2... Cards matching Screenshot 3) ── */}
            {currentStep === 5 && (
              <div className="space-y-4">
                {requiredDocumentTypes.length > 0 && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 space-y-2">
                    <p className="text-xs font-semibold text-foreground">
                      Mandatory Onboarding Documents Required:
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      {requiredDocumentTypes.map((reqName) => {
                        const isUploaded = documents.some(
                          (d) =>
                            d.documentType.toLowerCase() === reqName.toLowerCase() &&
                            Boolean(d.fileUrl)
                        );
                        return (
                          <span
                            key={reqName}
                            className={cn(
                              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border",
                              isUploaded
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                                : "bg-background text-foreground border-amber-500/40"
                            )}
                          >
                            {isUploaded ? <Check className="h-3 w-3" /> : <span className="text-rose-500">*</span>}
                            {reqName}
                          </span>
                        );
                      })}
                    </div>
                    {errors.documents && (
                      <p className="text-xs font-medium text-rose-600">{errors.documents}</p>
                    )}
                  </div>
                )}

                {documents.map((doc, idx) => (
                  <div
                    key={doc.id}
                    data-testid={`employee-document-card-${idx + 1}`}
                    className="rounded-xl border border-border/80 bg-card p-5 space-y-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-foreground">Document #{idx + 1}</h3>
                      {documents.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeDocument(doc.id)}
                          className="h-8 px-2.5 text-xs text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 gap-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remove
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                      {/* Document Type */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-foreground">
                          Document Type <span className="text-rose-500">*</span>
                        </Label>
                        <Select
                          value={doc.documentType || "none"}
                          onValueChange={(val) =>
                            updateDocumentItem(doc.id, "documentType", val === "none" ? "" : val)
                          }
                        >
                          <SelectTrigger className="h-10 text-sm">
                            <SelectValue placeholder="Select Document Type" />
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            <SelectItem value="none">Select Document Type</SelectItem>
                            {documentTypeOptions.map((opt) => {
                              const isReq = requiredDocumentTypes.some(
                                (r) => r.toLowerCase() === opt.toLowerCase()
                              );
                              return (
                                <SelectItem key={opt} value={opt}>
                                  {opt}{isReq ? " * (Required)" : ""}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* File Upload (Choose File bar matching Screenshot 3) */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-foreground">
                          File <span className="text-rose-500">*</span>
                        </Label>
                        <label className="flex items-center justify-between gap-2 h-10 px-3 rounded-md border border-border/80 bg-background hover:bg-muted/40 transition-colors cursor-pointer text-sm">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="font-medium text-foreground shrink-0">Choose File</span>
                            <span className="text-muted-foreground truncate">
                              {doc.fileName || "No file chosen"}
                            </span>
                          </div>
                          {doc.fileName && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                updateDocumentItem(doc.id, "fileName", "");
                                updateDocumentItem(doc.id, "fileUrl", "");
                              }}
                              className="text-muted-foreground hover:text-rose-600 shrink-0"
                              aria-label="Clear file"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <input
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
                            onChange={(e) => handleDocumentFileChange(doc.id, e)}
                            className="hidden"
                          />
                        </label>
                        <p className="text-[11px] text-muted-foreground">Max file size: 5MB</p>
                      </div>

                      {/* Document Title */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-foreground">Document Title</Label>
                        <Input
                          value={doc.title}
                          onChange={(e) => updateDocumentItem(doc.id, "title", e.target.value)}
                          placeholder="e.g. Aadhaar Card / Signed Offer Letter"
                          className="h-10 text-sm"
                        />
                      </div>

                      {/* Document Number */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-foreground">Document Number</Label>
                        <Input
                          value={doc.documentNumber}
                          onChange={(e) => updateDocumentItem(doc.id, "documentNumber", e.target.value)}
                          placeholder="e.g. ID / Passport / License Number"
                          className="h-10 text-sm"
                        />
                      </div>

                      {/* Expiry Date */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-foreground">Expiry Date</Label>
                        <Input
                          type="date"
                          value={doc.expiryDate}
                          onChange={(e) => updateDocumentItem(doc.id, "expiryDate", e.target.value)}
                          className="h-10 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {/* Add More Document Button */}
                <div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addMoreDocument}
                    className="h-9 px-4 gap-1.5 text-xs font-semibold border-dashed border-emerald-500/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                  >
                    <Plus className="h-4 w-4" />
                    Add More Document
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom Action Row (Matches Screenshot Bottom-Right Emerald Next ->) ── */}
      <div className="flex items-center justify-between">
        <div>
          {currentStep > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={handlePrev}
              disabled={createMutation.isPending}
              className="h-10 px-4 gap-2 text-xs font-medium"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Previous
            </Button>
          )}
        </div>

        {currentStep < STEPS.length ? (
          <Button
            type="button"
            onClick={handleNext}
            className="h-10 px-5 gap-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
          >
            Next
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={createMutation.isPending}
            className="h-10 px-5 gap-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
          >
            {createMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Create Employee
          </Button>
        )}
      </div>
    </div>
  );
}

export default NewEmployeeWizardPage;
