import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useCurrentProfile, useSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AvatarCropperDialog } from "@/components/avatar-cropper-dialog";
import { formatSystemAmount } from "@/lib/currency";
import { cn } from "@/lib/utils";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Users,
  Building2,
  UserCheck,
  DollarSign,
  Download,
  Eye,
  UserPlus,
  Phone,
  Mail,
  Calendar,
  Briefcase,
  ShieldAlert,
  CheckCircle2,
  X,
  TrendingUp,
  Award,
  Laptop,
  Star,
  Target,
  ShieldCheck,
  CheckSquare,
  PackageCheck,
  Circle,
  Camera,
  LayoutGrid,
  List,
  KeyRound,
  Lock,
  Send,
  Copy,
  Check,
  Smartphone,
  EyeOff,
  Sparkles,
  ArrowLeft,
  CreditCard,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  MapPin,
  Heart,
  BookOpen,
  Layers,
  Globe,
  HelpCircle,
  Shield,
  FileText,
  AlertCircle,
  HardDrive,
  Clock,
  ExternalLink,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_app/employees")({
  component: Employees,
  head: () => ({ meta: [{ title: "Employees Management & Directory — Master HRMS" }] }),
});

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  active: {
    label: "ACTIVE",
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  probation: {
    label: "PROBATION",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  },
  on_leave: {
    label: "ON LEAVE",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  },
  terminated: {
    label: "TERMINATED",
    className: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  },
};

const ONBOARDING_CHECKLIST = [
  "Signed contract & offer letter",
  "ID & address verification (Aadhaar/Passport)",
  "Bank account & tax details submitted",
  "Work workstation / laptop allocated",
  "HRMS & corporate email access granted",
  "Induction / orientation completed",
];

const EMPTY_FORM = {
  employee_code: "",
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  position: "",
  department_id: "",
  employment_type: "full_time",
  salary: "",
  joined_at: "",
  status: "active",
  avatar_url: "",
  emergency_name: "",
  emergency_phone: "",
  emergency_relation: "",
  bank_name: "",
  bank_account: "",
  bank_ifsc: "",
  password: "",
  onboarding: [] as string[],
};

export type PerformanceReview = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  department: string;
  cycle: string;
  rating: number;
  kpis: { title: string; target: string; achieved: string; score: number }[];
  managerFeedback: string;
  recommendedIncrement: string;
  status: "completed" | "in_review" | "draft";
  reviewedAt: string;
};

export type HardwareAsset = {
  id: string;
  assetTag: string;
  name: string;
  category: "Laptop" | "Desktop" | "Monitor" | "Phone" | "Accessory";
  serialNo: string;
  assignedToEmployeeId: string;
  assignedToEmployeeName: string;
  allocatedDate: string;
  warrantyExpiry: string;
  condition: "New" | "Good" | "Fair" | "Needs Service";
  status: "assigned" | "available" | "in_repair" | "decommissioned";
  cost?: string;
  vendor?: string;
  location?: string;
  imageUrl?: string;
};

export type EmployeeExtendedProfile = {
  about?: string;
  experienceYears?: string;
  passportNo?: string;
  passportExpiry?: string;
  nationality?: string;
  religion?: string;
  maritalStatus?: string;
  spouseEmployment?: string;
  childrenCount?: string;
  address?: string;
  birthday?: string;
  gender?: string;
  emergencyPrimary?: {
    name: string;
    relationship: string;
    phone1: string;
    phone2?: string;
  };
  emergencySecondary?: {
    name: string;
    relationship: string;
    phone1: string;
    phone2?: string;
  };
  bank?: {
    bankName: string;
    accountNo: string;
    ifscCode: string;
    branchAddress: string;
  };
  family?: {
    name: string;
    relationship: string;
    dob: string;
    phone: string;
  }[];
  education?: {
    institution: string;
    course: string;
    duration: string;
  }[];
  experience?: {
    company: string;
    role: string;
    duration: string;
    isCurrent?: boolean;
  }[];
  statutory?: {
    salaryBasis: string;
    salaryAmount: string;
    paymentType: string;
    pfContribution: string;
    pfNo: string;
    employeePfRate: string;
    additionalPfRate: string;
    totalPfRate: string;
    esiContribution: string;
    esiNo: string;
    employeeEsiRate: string;
    additionalEsiRate: string;
    totalEsiRate: string;
  };
  permissions?: Record<string, { enabled: boolean; read: boolean; write: boolean; create: boolean; delete: boolean; import: boolean; export: boolean }>;
};

const DEFAULT_EXTENDED_PROFILE: EmployeeExtendedProfile = {
  about: "As an experienced professional, I deliver exceptional quality work and bring continuous value to our organization. Focused on high-impact results, team collaboration, and reliable execution.",
  experienceYears: "5+ years of Experience",
  passportNo: "QRET4566FGRT",
  passportExpiry: "15 May 2029",
  nationality: "Indian",
  religion: "Christianity",
  maritalStatus: "Married",
  spouseEmployment: "Employed",
  childrenCount: "2",
  address: "1861 Bayonne Ave, Manchester, NJ, 08759",
  birthday: "24th July 1995",
  gender: "Male",
  emergencyPrimary: {
    name: "Adrian Peralt",
    relationship: "Father",
    phone1: "+1 127 2685 598",
    phone2: "+1 127 2685 599",
  },
  emergencySecondary: {
    name: "Karen Wills",
    relationship: "Mother",
    phone1: "+1 989 7774 787",
    phone2: "",
  },
  bank: {
    bankName: "HDFC International Bank",
    accountNo: "159843014641",
    ifscCode: "HDFC0001245",
    branchAddress: "Mumbai Corporate Hub, India",
  },
  family: [
    {
      name: "Hendry Peralt",
      relationship: "Brother",
      dob: "25 May 2014",
      phone: "+1 265 6956 961",
    },
    {
      name: "Sophia Peralt",
      relationship: "Spouse",
      dob: "12 Oct 1996",
      phone: "+1 265 6956 962",
    },
  ],
  education: [
    {
      institution: "Oxford University",
      course: "Computer Science & Engineering",
      duration: "2018 - 2022",
    },
    {
      institution: "Cambridge Institute",
      course: "Computer Network & Systems",
      duration: "2015 - 2018",
    },
    {
      institution: "National Public School",
      course: "Higher Secondary (Grade XII)",
      duration: "2013 - 2015",
    },
  ],
  experience: [
    {
      company: "Google LLC",
      role: "Senior Fullstack Developer",
      duration: "Jan 2023 - Present",
      isCurrent: true,
    },
    {
      company: "Salesforce Systems",
      role: "Web Application Engineer",
      duration: "Dec 2020 - Dec 2022",
      isCurrent: false,
    },
    {
      company: "HubSpot Global",
      role: "Software Developer",
      duration: "Jan 2019 - Nov 2020",
      isCurrent: false,
    },
  ],
  statutory: {
    salaryBasis: "Monthly",
    salaryAmount: "₹ 85,000",
    paymentType: "Bank Transfer",
    pfContribution: "Employee & Employer Contribution",
    pfNo: "MH/BAN/109845/000",
    employeePfRate: "12%",
    additionalPfRate: "3.67%",
    totalPfRate: "15.67%",
    esiContribution: "Employee Contribution",
    esiNo: "310009845210001",
    employeeEsiRate: "0.75%",
    additionalEsiRate: "3.25%",
    totalEsiRate: "4.00%",
  },
  permissions: {
    Holidays: { enabled: true, read: true, write: false, create: false, delete: false, import: false, export: true },
    Leaves: { enabled: true, read: true, write: true, create: true, delete: false, import: false, export: true },
    Clients: { enabled: true, read: true, write: true, create: true, delete: false, import: false, export: false },
    Projects: { enabled: true, read: true, write: true, create: true, delete: false, import: true, export: true },
    Tasks: { enabled: true, read: true, write: true, create: true, delete: true, import: false, export: true },
    Chats: { enabled: true, read: true, write: true, create: true, delete: false, import: false, export: false },
    Assets: { enabled: true, read: true, write: false, create: true, delete: false, import: true, export: false },
    TimingSheets: { enabled: true, read: true, write: true, create: true, delete: false, import: false, export: true },
  },
};

const DEFAULT_PERFORMANCE_REVIEWS: PerformanceReview[] = [];
const DEFAULT_HARDWARE_ASSETS: HardwareAsset[] = [
  {
    id: "ast-dell-01",
    assetTag: "AST - 001",
    name: "Dell Latitude 7440 Ultrabook",
    category: "Laptop",
    serialNo: "3647952145678",
    assignedToEmployeeId: "default",
    assignedToEmployeeName: "Assigned Staff",
    allocatedDate: "22 Nov, 2024 10:32 AM",
    warrantyExpiry: "12 Jan 2028",
    condition: "New",
    status: "assigned",
    cost: "₹ 1,12,000",
    vendor: "Dell India Technologies Pvt Ltd",
    location: "Floor 4, Workstation 42, Tech Park",
    imageUrl: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=500&auto=format&fit=crop&q=60",
  },
  {
    id: "ast-mouse-02",
    assetTag: "AST - 002",
    name: "Logitech MX Master 3S Wireless Mouse",
    category: "Accessory",
    serialNo: "9845721182390",
    assignedToEmployeeId: "default",
    assignedToEmployeeName: "Assigned Staff",
    allocatedDate: "22 Nov, 2024 10:32 AM",
    warrantyExpiry: "15 Oct 2027",
    condition: "Good",
    status: "assigned",
    cost: "₹ 8,995",
    vendor: "Logitech Electronics Hub",
    location: "Desk 42, Floor 4",
    imageUrl: "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=500&auto=format&fit=crop&q=60",
  },
];

export function Employees() {
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);
  const tenantId = profile?.tenant_id || "default";
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<string>("directory");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // Selected Employee for Details View (Dreams UI-2 exact page view)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  // Modals state
  const [openAddModal, setOpenAddModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any | null>(null);
  const [addDeptOpen, setAddDeptOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState("");
  const [addForm, setAddForm] = useState({ ...EMPTY_FORM });

  // Extended Edit Modals state
  const [openEditPersonalModal, setOpenEditPersonalModal] = useState(false);
  const [openEditEmergencyModal, setOpenEditEmergencyModal] = useState(false);
  const [openEditBankModal, setOpenEditBankModal] = useState(false);
  const [openEditFamilyModal, setOpenEditFamilyModal] = useState(false);
  const [openEditEducationModal, setOpenEditEducationModal] = useState(false);
  const [openEditExperienceModal, setOpenEditExperienceModal] = useState(false);
  const [openBankStatutoryModal, setOpenBankStatutoryModal] = useState(false);
  const [selectedAssetForInfo, setSelectedAssetForInfo] = useState<HardwareAsset | null>(null);
  const [selectedAssetForIssue, setSelectedAssetForIssue] = useState<HardwareAsset | null>(null);
  const [issueDescription, setIssueDescription] = useState("");

  // Accordion collapsed state in Details View
  const [collapsedAbout, setCollapsedAbout] = useState(false);
  const [collapsedBank, setCollapsedBank] = useState(false);
  const [collapsedFamily, setCollapsedFamily] = useState(false);
  const [collapsedEducation, setCollapsedEducation] = useState(false);
  const [collapsedExperience, setCollapsedExperience] = useState(false);
  const [detailsSubTab, setDetailsSubTab] = useState<"projects" | "assets">("projects");

  // Avatar Cropper State
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [tempCropSrc, setTempCropSrc] = useState<string | null>(null);
  const [cropperTarget, setCropperTarget] = useState<"add" | "edit">("add");
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const editAvatarInputRef = useRef<HTMLInputElement>(null);

  function handleAvatarFileSelect(e: React.ChangeEvent<HTMLInputElement>, target: "add" | "edit") {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setTempCropSrc(ev.target?.result as string);
      setCropperTarget(target);
      setIsCropperOpen(true);
    };
    reader.readAsDataURL(files[0]);
  }

  function handleCropComplete(croppedDataUrl: string) {
    if (cropperTarget === "add") {
      setAddForm((prev) => ({ ...prev, avatar_url: croppedDataUrl }));
    } else if (cropperTarget === "edit" && editingEmployee) {
      setEditingEmployee((prev: any) => ({ ...prev, avatar_url: croppedDataUrl }));
    }
    setIsCropperOpen(false);
    setTempCropSrc(null);
    toast.success("Profile photo cropped & set!");
  }

  // Appraisal & Asset Dialog States
  const [isAddReviewOpen, setIsAddReviewOpen] = useState(false);
  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    employeeId: "",
    cycle: "Q1 2026 Appraisal",
    rating: 5,
    managerFeedback: "",
    recommendedIncrement: "10% Salary Increment",
  });
  const [assetForm, setAssetForm] = useState({
    name: "",
    category: "Laptop" as HardwareAsset["category"],
    serialNo: "",
    assignedToEmployeeId: "",
    condition: "New" as HardwareAsset["condition"],
    cost: "₹ 75,000",
    vendor: "Compusoft Systems Ltd.",
    location: "Corporate HQ, Floor 4",
  });

  // Fetch employees
  const { data: rawEmployees = [], isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      try {
        const res: any = await api.get("/employees");
        return Array.isArray(res) ? res : (res?.data || []);
      } catch {
        return [];
      }
    },
  });

  const employees = rawEmployees.map((e: any) => ({
    ...e,
    id: e.id,
    first_name: e.firstName ?? e.first_name,
    last_name: e.lastName ?? e.last_name,
    employee_code: e.employeeCode ?? e.employee_code,
    email: e.email,
    phone: e.phone,
    position: e.position,
    department_id: e.departmentId ?? e.department_id,
    departments: e.department ?? e.departments,
    manager: e.manager,
    salary: e.salary,
    employment_type: e.employmentType ?? e.employment_type,
    status: e.status,
    joined_at: e.joinedAt ?? e.joined_at,
    avatar_url: e.user?.profile?.avatarUrl || e.avatarUrl || e.avatar_url || "",
    pan: e.pan,
    aadhaar: e.aadhaar,
    uan: e.uan,
    esiNumber: e.esiNumber,
    bankName: e.bankName,
    bankAccount: e.bankAccount,
    bankIfsc: e.bankIfsc,
    bankBranch: e.bankBranch,
    dateOfBirth: e.dateOfBirth,
    gender: e.gender,
    taxRegime: e.taxRegime,
    state: e.state,
  }));

  // Selected Employee object
  const activeEmployee = employees.find((e: any) => e.id === selectedEmployeeId) || employees[0] || null;

  // Fetch departments
  const { data: rawDepartments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      try {
        const res = await api.get("/employees/departments");
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  const departments = rawDepartments.map((d: any) => ({
    ...d,
    id: d.id,
    name: d.name,
  }));

  // Platform settings
  const { data: sysConfig } = useQuery({
    queryKey: ["realtime-platform-settings"],
    queryFn: async () => {
      try {
        const page = await api.get("/cms/pages/system-platform-settings");
        return page?.content || null;
      } catch {
        return null;
      }
    },
  });

  // Query / Cache for Extended Passport Profiles per Tenant
  const { data: passportMap = {} } = useQuery<Record<string, EmployeeExtendedProfile>>({
    queryKey: ["tenant-employee-passports", tenantId],
    queryFn: async () => {
      try {
        const page = await api.get(`/cms/pages/tenant-${tenantId}-employee-passports`);
        if (page?.content && typeof page.content === "object") {
          return page.content as Record<string, EmployeeExtendedProfile>;
        }
        return {};
      } catch {
        return {};
      }
    },
  });

  const savePassportMut = useMutation({
    mutationFn: async (updatedMap: Record<string, EmployeeExtendedProfile>) => {
      await api.put(`/cms/pages/tenant-${tenantId}-employee-passports`, {
        title: "Employee Extended Passports & Details",
        content: updatedMap,
        published: true,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenant-employee-passports", tenantId] });
      toast.success("Employee details saved & synced!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Active Extended Profile
  const activeExtended: EmployeeExtendedProfile = {
    ...DEFAULT_EXTENDED_PROFILE,
    ...(activeEmployee ? (passportMap[activeEmployee.id] || {}) : {}),
    bank: {
      ...DEFAULT_EXTENDED_PROFILE.bank!,
      bankName: activeEmployee?.bankName || passportMap[activeEmployee?.id]?.bank?.bankName || DEFAULT_EXTENDED_PROFILE.bank!.bankName,
      accountNo: activeEmployee?.bankAccount || passportMap[activeEmployee?.id]?.bank?.accountNo || DEFAULT_EXTENDED_PROFILE.bank!.accountNo,
      ifscCode: activeEmployee?.bankIfsc || passportMap[activeEmployee?.id]?.bank?.ifscCode || DEFAULT_EXTENDED_PROFILE.bank!.ifscCode,
      branchAddress: activeEmployee?.bankBranch || passportMap[activeEmployee?.id]?.bank?.branchAddress || DEFAULT_EXTENDED_PROFILE.bank!.branchAddress,
    },
    gender: activeEmployee?.gender || passportMap[activeEmployee?.id]?.gender || DEFAULT_EXTENDED_PROFILE.gender,
    birthday: activeEmployee?.dateOfBirth ? new Date(activeEmployee.dateOfBirth).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : (passportMap[activeEmployee?.id]?.birthday || DEFAULT_EXTENDED_PROFILE.birthday),
  };

  // 1. Performance Reviews Query
  const { data: reviews = DEFAULT_PERFORMANCE_REVIEWS } = useQuery<PerformanceReview[]>({
    queryKey: ["tenant-performance-reviews", tenantId],
    queryFn: async () => {
      try {
        const page = await api.get(`/cms/pages/tenant-${tenantId}-performance-reviews`);
        if (Array.isArray(page?.content) && page.content.length > 0) {
          return page.content as PerformanceReview[];
        }
        return DEFAULT_PERFORMANCE_REVIEWS;
      } catch {
        return DEFAULT_PERFORMANCE_REVIEWS;
      }
    },
  });

  const saveReviewsMut = useMutation({
    mutationFn: async (updated: PerformanceReview[]) => {
      await api.put(`/cms/pages/tenant-${tenantId}-performance-reviews`, {
        title: "Performance Reviews & Appraisals",
        content: updated,
        published: true,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenant-performance-reviews", tenantId] });
      toast.success("Performance appraisal saved!");
      setIsAddReviewOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // 2. Hardware Assets Query
  const { data: assets = DEFAULT_HARDWARE_ASSETS } = useQuery<HardwareAsset[]>({
    queryKey: ["tenant-hardware-assets", tenantId],
    queryFn: async () => {
      try {
        const page = await api.get(`/cms/pages/tenant-${tenantId}-hardware-assets`);
        if (Array.isArray(page?.content) && page.content.length > 0) {
          return page.content as HardwareAsset[];
        }
        return DEFAULT_HARDWARE_ASSETS;
      } catch {
        return DEFAULT_HARDWARE_ASSETS;
      }
    },
  });

  const saveAssetsMut = useMutation({
    mutationFn: async (updated: HardwareAsset[]) => {
      await api.put(`/cms/pages/tenant-${tenantId}-hardware-assets`, {
        title: "Company Hardware Assets",
        content: updated,
        published: true,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenant-hardware-assets", tenantId] });
      toast.success("Hardware asset allocated successfully!");
      setIsAddAssetOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Reset Employee 2FA Mutation (Tenant Admin)
  const reset2faMut = useMutation({
    mutationFn: async (empId: string) => {
      return await api.post(`/employees/${empId}/reset-2fa`, {});
    },
    onSuccess: (res: any) => {
      toast.success(res.message || "Two-Factor Authentication reset successfully for this employee.");
      qc.invalidateQueries({ queryKey: ["employees"] });
      refetchEmpAccount();
    },
    onError: (e: any) => toast.error(e.message || "Failed to reset 2FA for this employee"),
  });

  // Employee Login Account & Password Management Modal
  const [authModalEmployee, setAuthModalEmployee] = useState<any | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Query linked login account details
  const { data: empAccountData, isLoading: isEmpAccountLoading, refetch: refetchEmpAccount } = useQuery({
    queryKey: ["employee-login-account", authModalEmployee?.id],
    queryFn: async () => {
      if (!authModalEmployee?.id) return null;
      return await api.get(`/employees/${authModalEmployee.id}/login-account`);
    },
    enabled: !!authModalEmployee?.id,
  });

  // Set / Reset Employee Password Mutation
  const setPasswordMut = useMutation({
    mutationFn: async ({ employeeId, password }: { employeeId: string; password: string }) => {
      return await api.post(`/employees/${employeeId}/set-password`, {
        newPassword: password,
      });
    },
    onSuccess: (res: any) => {
      toast.success(res?.message || "Password updated successfully!");
      setNewPassword("");
      refetchEmpAccount();
      qc.invalidateQueries({ queryKey: ["employees"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update employee password");
    },
  });

  function generateRandomPassword() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
    let pwd = "";
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pwd);
    setShowNewPassword(true);
    toast.success("Generated random strong password!");
  }

  const filtered = employees.filter((e: any) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      e.first_name?.toLowerCase().includes(q) ||
      e.last_name?.toLowerCase().includes(q) ||
      e.email?.toLowerCase().includes(q) ||
      e.employee_code?.toLowerCase().includes(q) ||
      e.position?.toLowerCase().includes(q);
    const matchesDept = selectedDept === "all" || e.department_id === selectedDept;
    const matchesStatus = selectedStatus === "all" || e.status === selectedStatus;
    return matchesSearch && matchesDept && matchesStatus;
  });

  // Create Employee
  const createMut = useMutation({
    mutationFn: async () => {
      const payload = {
        employeeCode: addForm.employee_code.trim(),
        firstName: addForm.first_name.trim(),
        lastName: addForm.last_name.trim(),
        email: addForm.email.trim(),
        phone: addForm.phone.trim() || null,
        position: addForm.position.trim() || null,
        departmentId: addForm.department_id || null,
        employmentType: addForm.employment_type,
        salary: Number(addForm.salary) || 0,
        joinedAt: addForm.joined_at || new Date().toISOString().slice(0, 10),
        status: addForm.status,
        avatarUrl: addForm.avatar_url || null,
        password: addForm.password?.trim() || "Password@123",
      };
      await api.post("/employees", payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setOpenAddModal(false);
      setAddForm({ ...EMPTY_FORM });
      toast.success("New employee added & login credentials automatically created in database!");
    },
    onError: (e: Error) => toast.error(`Error: ${e.message}`),
  });

  // Update Employee Core & Statutory Fields
  const updateMut = useMutation({
    mutationFn: async (emp: any) => {
      const payload = {
        employeeCode: emp.employee_code ?? emp.employeeCode,
        firstName: emp.first_name ?? emp.firstName,
        lastName: emp.last_name ?? emp.lastName,
        email: emp.email,
        phone: emp.phone,
        position: emp.position,
        departmentId: emp.department_id ?? emp.departmentId,
        employmentType: emp.employment_type ?? emp.employmentType,
        salary: Number(emp.salary),
        status: emp.status,
        joinedAt: emp.joined_at ?? emp.joinedAt,
        avatarUrl: emp.avatar_url ?? emp.avatarUrl ?? null,
        bankName: emp.bankName ?? emp.bank_name,
        bankAccount: emp.bankAccount ?? emp.bank_account,
        bankIfsc: emp.bankIfsc ?? emp.bank_ifsc,
        bankBranch: emp.bankBranch ?? emp.bank_branch,
        pan: emp.pan,
        aadhaar: emp.aadhaar,
        gender: emp.gender,
        dateOfBirth: emp.dateOfBirth ?? emp.date_of_birth,
      };
      await api.put(`/employees/${emp.id}`, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      setEditingEmployee(null);
      toast.success("Employee record updated successfully!");
    },
    onError: (e: Error) => toast.error(`Update failed: ${e.message}`),
  });

  // Delete Employee
  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/employees/${id}`);
      return id;
    },
    onSuccess: (deletedId) => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      if (selectedEmployeeId === deletedId) setSelectedEmployeeId(null);
      toast.success("Employee removed.");
    },
    onError: (e: Error) => toast.error(`Delete failed: ${e.message}`),
  });

  // Add Department
  const addDeptMut = useMutation({
    mutationFn: async (name: string) => {
      await api.post("/employees/departments", { name });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["departments"] });
      setAddDeptOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Delete Department
  const deleteDeptMut = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/employees/departments/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["departments"] });
      toast.success("Department removed.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function exportEmployeesCSV() {
    if (employees.length === 0) return toast.error("No employees to export");
    const headers = [
      "Employee Code", "First Name", "Last Name", "Email", "Phone",
      "Department", "Position", "Employment Type", "Salary", "Status", "Joined Date",
    ];
    const rows = employees.map((e: any) => [
      e.employee_code, e.first_name, e.last_name, e.email, e.phone || "",
      e.departments?.name || "", e.position || "", e.employment_type,
      e.salary, e.status, e.joined_at || "",
    ]);
    const csv =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r: any[]) => r.map((c: any) => `"${c}"`).join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csv));
    link.setAttribute("download", `employees_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Exported employees to CSV!");
  }

  const activeCount = employees.filter((e: any) => e.status === "active").length;
  const probationCount = employees.filter((e: any) => e.status === "probation").length;
  const thisMonth = new Date().toISOString().slice(0, 7);
  const newHiresThisMonth = employees.filter(
    (e: any) => e.joined_at && e.joined_at.startsWith(thisMonth),
  ).length;

  function handleCreateReview() {
    if (!reviewForm.employeeId) return toast.error("Please select an employee for appraisal");
    const targetEmp = employees.find((e: any) => e.id === reviewForm.employeeId);
    if (!targetEmp) return toast.error("Employee not found");

    const newRev: PerformanceReview = {
      id: `rev-${Date.now()}`,
      employeeId: targetEmp.id,
      employeeName: `${targetEmp.first_name} ${targetEmp.last_name}`,
      employeeCode: targetEmp.employee_code,
      department: targetEmp.departments?.name || "Operations",
      cycle: reviewForm.cycle,
      rating: Number(reviewForm.rating),
      kpis: [
        { title: "Core Role Competency", target: "100%", achieved: "96%", score: Number(reviewForm.rating) },
        { title: "Project Delivery SLA", target: "95%", achieved: "98%", score: Number(reviewForm.rating) },
      ],
      managerFeedback: reviewForm.managerFeedback.trim() || "Consistently delivers quality outcomes and demonstrates strong team synergy.",
      recommendedIncrement: reviewForm.recommendedIncrement,
      status: "completed",
      reviewedAt: new Date().toISOString().slice(0, 10),
    };

    saveReviewsMut.mutate([newRev, ...reviews]);
  }

  function handleCreateAsset() {
    if (!assetForm.name.trim()) return toast.error("Asset name is required");
    const targetEmp = employees.find((e: any) => e.id === assetForm.assignedToEmployeeId);

    const newAsset: HardwareAsset = {
      id: `ast-${Date.now()}`,
      assetTag: `AST - ${Math.floor(100 + Math.random() * 900)}`,
      name: assetForm.name.trim(),
      category: assetForm.category,
      serialNo: assetForm.serialNo.trim() || `SN-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
      assignedToEmployeeId: targetEmp ? targetEmp.id : "unassigned",
      assignedToEmployeeName: targetEmp ? `${targetEmp.first_name} ${targetEmp.last_name}` : "Unallocated (Inventory)",
      allocatedDate: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
      warrantyExpiry: new Date(Date.now() + 365 * 24 * 3600 * 1000 * 3).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
      condition: assetForm.condition,
      status: targetEmp ? "assigned" : "available",
      cost: assetForm.cost,
      vendor: assetForm.vendor,
      location: assetForm.location,
      imageUrl: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=500&auto=format&fit=crop&q=60",
    };

    saveAssetsMut.mutate([newAsset, ...assets]);
  }

  // =========================================================================
  // VIEW: IF AN EMPLOYEE IS SELECTED -> RENDER EXACT `ui-2/employee-details.html`
  // =========================================================================
  if (selectedEmployeeId && activeEmployee) {
    return (
      <div className="space-y-6 max-w-full pb-12 animate-in fade-in duration-200">
        {/* Breadcrumb Top Bar (matching ui-2/employee-details.html) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedEmployeeId(null)}
              className="gap-2 text-sm font-bold hover:bg-secondary/80 pl-2 pr-3"
            >
              <ArrowLeft className="size-4 text-primary" /> Back to Employee Lists
            </Button>
            <span className="text-muted-foreground">/</span>
            <h2 className="text-lg font-extrabold tracking-tight">Employee Details</h2>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              onClick={() => setOpenBankStatutoryModal(true)}
              className="gap-1.5 font-bold text-xs bg-primary text-primary-foreground shadow-xs"
            >
              <Plus className="size-3.5" /> Bank & Statutory
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setAuthModalEmployee(activeEmployee);
                setNewPassword("");
              }}
              className="text-xs font-semibold gap-1.5 text-amber-600 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30"
            >
              <KeyRound className="size-3.5" /> Login & Password
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditingEmployee({ ...activeEmployee })}
              className="text-xs font-semibold gap-1.5"
            >
              <Edit2 className="size-3.5" /> Edit Employee
            </Button>
          </div>
        </div>

        {/* 2-Column Grid matching ui-2/employee-details.html */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* ===================== LEFT COLUMN (col-xl-4) ===================== */}
          <div className="xl:col-span-4 space-y-5">
            {/* Profile Overview Card */}
            <Card className="overflow-hidden border shadow-xs bg-card">
              <div className="p-5 text-center border-b bg-gradient-to-b from-primary/5 to-transparent">
                <div className="relative mx-auto size-24 mb-3">
                  <Avatar className="size-24 border-4 border-background shadow-md">
                    <AvatarImage src={activeEmployee.avatar_url || "/favicon.webp"} />
                    <AvatarFallback className="text-2xl font-black bg-primary text-primary-foreground">
                      {activeEmployee.first_name?.[0]}{activeEmployee.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute bottom-0 right-0 size-6 bg-emerald-500 rounded-full border-2 border-background grid place-items-center text-white" title="Verified Staff">
                    <Check className="size-3.5 stroke-[3]" />
                  </span>
                </div>

                <h3 className="text-lg font-black tracking-tight text-foreground flex items-center justify-center gap-1.5">
                  {activeEmployee.first_name} {activeEmployee.last_name}
                  <ShieldCheck className="size-4 text-emerald-600 inline-block" />
                </h3>

                <div className="flex items-center justify-center gap-2 mt-1.5 flex-wrap">
                  <Badge variant="secondary" className="text-xs font-semibold gap-1 px-2.5 py-0.5">
                    <span className="size-1.5 rounded-full bg-primary inline-block"></span>
                    {activeEmployee.position || "Software Developer"}
                  </Badge>
                  <Badge variant="outline" className="text-xs font-semibold text-muted-foreground border-border">
                    {activeExtended.experienceYears || "5+ years of Experience"}
                  </Badge>
                </div>

                {/* Profile Meta Info rows */}
                <div className="mt-4 pt-3 border-t space-y-2.5 text-xs text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <CreditCard className="size-3.5 text-primary/70" /> Client ID / Employee ID
                    </span>
                    <span className="font-mono font-bold text-foreground">{activeEmployee.employee_code}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Star className="size-3.5 text-amber-500/80" /> Team / Department
                    </span>
                    <span className="font-semibold text-foreground">{activeEmployee.departments?.name || "UI/UX Design"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Calendar className="size-3.5 text-blue-500/80" /> Date Of Join
                    </span>
                    <span className="font-semibold text-foreground">
                      {activeEmployee.joined_at ? new Date(activeEmployee.joined_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "1st Jan 2023"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <UserCheck className="size-3.5 text-emerald-500/80" /> Report Office / Manager
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Avatar className="size-5 border">
                        <AvatarFallback className="text-[9px] font-bold bg-muted">
                          {activeEmployee.manager?.firstName?.[0] || "D"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-semibold text-foreground">
                        {activeEmployee.manager ? `${activeEmployee.manager.firstName} ${activeEmployee.manager.lastName}` : "Doglas Martini"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Left Action Buttons */}
                <div className="grid grid-cols-2 gap-2 mt-4 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingEmployee({ ...activeEmployee })}
                    className="text-xs font-bold gap-1.5"
                  >
                    <Edit2 className="size-3.5" /> Edit Info
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      window.location.href = "/chat";
                    }}
                    className="text-xs font-bold gap-1.5 bg-primary text-primary-foreground"
                  >
                    <Send className="size-3.5" /> Message
                  </Button>
                </div>
              </div>

              {/* Basic Information Section */}
              <div className="p-4 border-b space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Basic Information</h4>
                  <button
                    onClick={() => setEditingEmployee({ ...activeEmployee })}
                    className="size-7 rounded-md hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                    title="Edit Basic Information"
                  >
                    <Edit2 className="size-3.5" />
                  </button>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Phone className="size-3.5 text-primary/70" /> Phone
                    </span>
                    <span className="font-mono font-semibold text-foreground">{activeEmployee.phone || "(163) 2459 315"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Mail className="size-3.5 text-primary/70" /> Email
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(activeEmployee.email);
                        toast.success("Email copied to clipboard!");
                      }}
                      className="font-mono text-primary hover:underline flex items-center gap-1 font-semibold"
                      title="Copy Email"
                    >
                      {activeEmployee.email}
                      <Copy className="size-3 text-muted-foreground hover:text-foreground" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <UserCheck className="size-3.5 text-primary/70" /> Gender
                    </span>
                    <span className="font-semibold text-foreground capitalize">{activeExtended.gender || "Male"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Calendar className="size-3.5 text-primary/70" /> Birthday
                    </span>
                    <span className="font-semibold text-foreground">{activeExtended.birthday || "24th July 1995"}</span>
                  </div>
                  <div className="flex items-start justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5 shrink-0 mt-0.5">
                      <MapPin className="size-3.5 text-primary/70" /> Address
                    </span>
                    <span className="font-semibold text-foreground text-right max-w-[200px] leading-tight">
                      {activeExtended.address || "1861 Bayonne Ave, Manchester, NJ, 08759"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Personal Information Section */}
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Personal Information</h4>
                  <button
                    onClick={() => setOpenEditPersonalModal(true)}
                    className="size-7 rounded-md hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                    title="Edit Personal Information"
                  >
                    <Edit2 className="size-3.5" />
                  </button>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <FileText className="size-3.5 text-primary/70" /> Passport No
                    </span>
                    <span className="font-mono font-bold text-foreground">{activeExtended.passportNo || "QRET4566FGRT"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Calendar className="size-3.5 text-primary/70" /> Passport Exp Date
                    </span>
                    <span className="font-semibold text-foreground">{activeExtended.passportExpiry || "15 May 2029"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Globe className="size-3.5 text-primary/70" /> Nationality
                    </span>
                    <span className="font-semibold text-foreground">{activeExtended.nationality || "Indian"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <BookOpen className="size-3.5 text-primary/70" /> Religion
                    </span>
                    <span className="font-semibold text-foreground">{activeExtended.religion || "Christianity"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Heart className="size-3.5 text-primary/70" /> Marital status
                    </span>
                    <span className="font-semibold text-foreground">{activeExtended.maritalStatus || "Married"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Briefcase className="size-3.5 text-primary/70" /> Employment of spouse
                    </span>
                    <span className="font-semibold text-foreground">{activeExtended.spouseEmployment || "No"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Users className="size-3.5 text-primary/70" /> No. of children
                    </span>
                    <span className="font-semibold text-foreground">{activeExtended.childrenCount || "2"}</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Emergency Contact Number Card */}
            <Card className="border shadow-xs bg-card overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between bg-muted/20">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Phone className="size-3.5 text-rose-500" /> Emergency Contact Number
                </h4>
                <button
                  onClick={() => setOpenEditEmergencyModal(true)}
                  className="size-7 rounded-md hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  title="Edit Emergency Contacts"
                >
                  <Edit2 className="size-3.5" />
                </button>
              </div>

              <div className="divide-y text-xs">
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-muted-foreground font-bold uppercase block">Primary Contact</span>
                    <div className="font-bold text-foreground mt-0.5 flex items-center gap-1.5">
                      {activeExtended.emergencyPrimary?.name || "Adrian Peralt"}
                      <span className="size-1 rounded-full bg-rose-500 inline-block"></span>
                      <span className="text-muted-foreground font-normal">{activeExtended.emergencyPrimary?.relationship || "Father"}</span>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-foreground">
                    {activeExtended.emergencyPrimary?.phone1 || "+1 127 2685 598"}
                  </span>
                </div>

                <div className="p-4 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-muted-foreground font-bold uppercase block">Secondary Contact</span>
                    <div className="font-bold text-foreground mt-0.5 flex items-center gap-1.5">
                      {activeExtended.emergencySecondary?.name || "Karen Wills"}
                      <span className="size-1 rounded-full bg-rose-500 inline-block"></span>
                      <span className="text-muted-foreground font-normal">{activeExtended.emergencySecondary?.relationship || "Mother"}</span>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-foreground">
                    {activeExtended.emergencySecondary?.phone1 || "+1 989 7774 787"}
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* ===================== RIGHT COLUMN (col-xl-8) ===================== */}
          <div className="xl:col-span-8 space-y-5">
            {/* Accordion 1: About Employee */}
            <Card className="border shadow-xs bg-card">
              <div className="p-4 flex items-center justify-between border-b bg-muted/10">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-foreground">About Employee</h4>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditingEmployee({ ...activeEmployee })}
                    className="size-7 rounded-md hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground"
                    title="Edit About"
                  >
                    <Edit2 className="size-3.5" />
                  </button>
                  <button
                    onClick={() => setCollapsedAbout(!collapsedAbout)}
                    className="size-7 rounded-md hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground"
                  >
                    {collapsedAbout ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
                  </button>
                </div>
              </div>
              {!collapsedAbout && (
                <CardContent className="p-4 text-xs leading-relaxed text-muted-foreground">
                  {activeExtended.about || "As an award winning designer, I deliver exceptional quality work and bring value to your brand! With 10 years of experience and 350+ projects completed worldwide with satisfied customers, I developed the 360° brand approach, which helped me to create numerous brands that are relevant, meaningful and loved."}
                </CardContent>
              )}
            </Card>

            {/* Accordion 2: Bank Information */}
            <Card className="border shadow-xs bg-card">
              <div className="p-4 flex items-center justify-between border-b bg-muted/10">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-foreground">Bank Information</h4>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setOpenEditBankModal(true)}
                    className="size-7 rounded-md hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground"
                    title="Edit Bank Information"
                  >
                    <Edit2 className="size-3.5" />
                  </button>
                  <button
                    onClick={() => setCollapsedBank(!collapsedBank)}
                    className="size-7 rounded-md hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground"
                  >
                    {collapsedBank ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
                  </button>
                </div>
              </div>
              {!collapsedBank && (
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[11px] mb-1">Bank Name</span>
                      <h5 className="font-bold text-foreground">{activeExtended.bank?.bankName || "Swiz International Bank"}</h5>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px] mb-1">Bank account no</span>
                      <h5 className="font-mono font-bold text-foreground">{activeExtended.bank?.accountNo || "159843014641"}</h5>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px] mb-1">IFSC Code</span>
                      <h5 className="font-mono font-bold text-foreground">{activeExtended.bank?.ifscCode || "ICI24504"}</h5>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px] mb-1">Branch</span>
                      <h5 className="font-bold text-foreground">{activeExtended.bank?.branchAddress || "Alabama USA"}</h5>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Accordion 3: Family Information */}
            <Card className="border shadow-xs bg-card">
              <div className="p-4 flex items-center justify-between border-b bg-muted/10">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-foreground">Family Information</h4>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setOpenEditFamilyModal(true)}
                    className="size-7 rounded-md hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground"
                    title="Edit Family Information"
                  >
                    <Edit2 className="size-3.5" />
                  </button>
                  <button
                    onClick={() => setCollapsedFamily(!collapsedFamily)}
                    className="size-7 rounded-md hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground"
                  >
                    {collapsedFamily ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
                  </button>
                </div>
              </div>
              {!collapsedFamily && (
                <CardContent className="p-4 space-y-3">
                  {(activeExtended.family || []).map((fam, idx) => (
                    <div key={idx} className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs pb-3 border-b last:border-b-0 last:pb-0">
                      <div>
                        <span className="text-muted-foreground block text-[11px] mb-1">Name</span>
                        <h5 className="font-bold text-foreground">{fam.name}</h5>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px] mb-1">Relationship</span>
                        <h5 className="font-bold text-foreground">{fam.relationship}</h5>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px] mb-1">Date of birth</span>
                        <h5 className="font-semibold text-foreground">{fam.dob}</h5>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px] mb-1">Phone</span>
                        <h5 className="font-mono font-bold text-foreground">{fam.phone}</h5>
                      </div>
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>

            {/* 2-Column Split: Education Details & Experience Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Education Details Accordion */}
              <Card className="border shadow-xs bg-card">
                <div className="p-4 flex items-center justify-between border-b bg-muted/10">
                  <h4 className="font-bold text-sm text-foreground">Education Details</h4>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setOpenEditEducationModal(true)}
                      className="size-7 rounded-md hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground"
                      title="Edit Education Information"
                    >
                      <Edit2 className="size-3.5" />
                    </button>
                    <button
                      onClick={() => setCollapsedEducation(!collapsedEducation)}
                      className="size-7 rounded-md hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground"
                    >
                      {collapsedEducation ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
                    </button>
                  </div>
                </div>
                {!collapsedEducation && (
                  <CardContent className="p-4 space-y-3.5 text-xs">
                    {(activeExtended.education || []).map((edu, idx) => (
                      <div key={idx} className="flex items-start justify-between pb-3 border-b last:border-b-0 last:pb-0">
                        <div>
                          <span className="text-muted-foreground block text-[11px] font-normal">{edu.institution}</span>
                          <h5 className="font-bold text-foreground mt-0.5">{edu.course}</h5>
                        </div>
                        <span className="font-mono text-[11px] text-muted-foreground shrink-0">{edu.duration}</span>
                      </div>
                    ))}
                  </CardContent>
                )}
              </Card>

              {/* Experience Details Accordion */}
              <Card className="border shadow-xs bg-card">
                <div className="p-4 flex items-center justify-between border-b bg-muted/10">
                  <h4 className="font-bold text-sm text-foreground">Experience</h4>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setOpenEditExperienceModal(true)}
                      className="size-7 rounded-md hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground"
                      title="Edit Experience"
                    >
                      <Edit2 className="size-3.5" />
                    </button>
                    <button
                      onClick={() => setCollapsedExperience(!collapsedExperience)}
                      className="size-7 rounded-md hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground"
                    >
                      {collapsedExperience ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
                    </button>
                  </div>
                </div>
                {!collapsedExperience && (
                  <CardContent className="p-4 space-y-3.5 text-xs">
                    {(activeExtended.experience || []).map((exp, idx) => (
                      <div key={idx} className="flex items-start justify-between pb-3 border-b last:border-b-0 last:pb-0">
                        <div>
                          <h5 className="font-bold text-foreground">{exp.company}</h5>
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-secondary px-2 py-0.5 rounded text-foreground mt-1">
                            <span className="size-1 rounded-full bg-primary inline-block"></span>
                            {exp.role}
                          </span>
                        </div>
                        <span className="font-mono text-[11px] text-muted-foreground shrink-0">{exp.duration}</span>
                      </div>
                    ))}
                  </CardContent>
                )}
              </Card>
            </div>

            {/* Tabbed Card: Projects & Assets (matching ui-2/employee-details.html) */}
            <Card className="border shadow-xs bg-card">
              <div className="p-4 border-b">
                <div className="flex items-center gap-6 border-b pb-2">
                  <button
                    onClick={() => setDetailsSubTab("projects")}
                    className={cn(
                      "text-xs font-extrabold pb-1 transition-all relative",
                      detailsSubTab === "projects"
                        ? "text-primary border-b-2 border-primary"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Projects (2 Active)
                  </button>
                  <button
                    onClick={() => setDetailsSubTab("assets")}
                    className={cn(
                      "text-xs font-extrabold pb-1 transition-all relative",
                      detailsSubTab === "assets"
                        ? "text-primary border-b-2 border-primary"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Allocated Assets ({assets.length})
                  </button>
                </div>
              </div>

              <CardContent className="p-5">
                {detailsSubTab === "projects" ? (
                  /* ===================== PROJECTS TAB ===================== */
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Project 1 */}
                    <Card className="p-4 border bg-muted/10 hover:border-primary/40 transition-all">
                      <div className="flex items-center gap-3 pb-3 mb-3 border-b">
                        <div className="size-10 rounded-lg bg-emerald-500/10 text-emerald-600 grid place-items-center font-bold text-sm shrink-0">
                          <Globe className="size-5" />
                        </div>
                        <div>
                          <h5 className="font-bold text-sm text-foreground">World Health ERP Platform</h5>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>8 tasks</span>
                            <span>•</span>
                            <span className="text-emerald-600 font-semibold">15 Completed</span>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-[10px] text-muted-foreground block font-medium">Deadline</span>
                          <span className="font-bold text-foreground">31 July 2026</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground block font-medium">Project Lead</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Avatar className="size-4 border">
                              <AvatarFallback className="text-[8px] font-bold">L</AvatarFallback>
                            </Avatar>
                            <span className="font-semibold text-foreground">Leona</span>
                          </div>
                        </div>
                      </div>
                    </Card>

                    {/* Project 2 */}
                    <Card className="p-4 border bg-muted/10 hover:border-primary/40 transition-all">
                      <div className="flex items-center gap-3 pb-3 mb-3 border-b">
                        <div className="size-10 rounded-lg bg-blue-500/10 text-blue-600 grid place-items-center font-bold text-sm shrink-0">
                          <Building2 className="size-5" />
                        </div>
                        <div>
                          <h5 className="font-bold text-sm text-foreground">Hospital Administration Module</h5>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>12 tasks</span>
                            <span>•</span>
                            <span className="text-blue-600 font-semibold">24 Completed</span>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-[10px] text-muted-foreground block font-medium">Deadline</span>
                          <span className="font-bold text-foreground">15 August 2026</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground block font-medium">Project Lead</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Avatar className="size-4 border">
                              <AvatarFallback className="text-[8px] font-bold">A</AvatarFallback>
                            </Avatar>
                            <span className="font-semibold text-foreground">Andrew</span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                ) : (
                  /* ===================== ASSETS TAB ===================== */
                  <div className="space-y-3">
                    {assets.map((ast) => (
                      <Card key={ast.id} className="p-4 border hover:shadow-xs transition-all">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="size-12 rounded-lg bg-primary/10 border grid place-items-center text-primary shrink-0 overflow-hidden">
                              {ast.imageUrl ? (
                                <img src={ast.imageUrl} alt={ast.name} className="size-full object-cover" />
                              ) : (
                                <Laptop className="size-6" />
                              )}
                            </div>
                            <div>
                              <h5 className="font-bold text-sm text-foreground">{ast.name}</h5>
                              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                                <span className="font-mono text-primary font-bold">{ast.assetTag}</span>
                                <span>•</span>
                                <span>Assigned on {ast.allocatedDate}</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 self-end sm:self-center">
                            <div className="text-right hidden sm:block text-xs">
                              <span className="text-[10px] text-muted-foreground block font-medium">Assigned by</span>
                              <div className="flex items-center gap-1.5 justify-end mt-0.5">
                                <Avatar className="size-4 border">
                                  <AvatarFallback className="text-[8px] font-bold">A</AvatarFallback>
                                </Avatar>
                                <span className="font-semibold text-foreground">Andrew Symon</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedAssetForInfo(ast)}
                                className="text-xs font-semibold gap-1"
                              >
                                View Info
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setSelectedAssetForIssue(ast)}
                                className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                              >
                                Raise Issue
                              </Button>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ALL MODALS: MATCHING `ui-2/employee-details.html` */}
        {/* ========================================================================= */}

        {/* 1. EDIT EMPLOYEE MODAL (Tabs: Basic Information + Permissions Matrix) */}
        {editingEmployee && (
          <Dialog open={!!editingEmployee} onOpenChange={(o) => !o && setEditingEmployee(null)}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-base font-black flex items-center gap-2">
                    <Edit2 className="size-4 text-primary" /> Edit Employee
                    <Badge variant="outline" className="font-mono text-[11px] text-primary">
                      {editingEmployee.employee_code ?? editingEmployee.employeeCode}
                    </Badge>
                  </DialogTitle>
                </div>
              </DialogHeader>

              <Tabs defaultValue="basic" className="space-y-4">
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="basic" className="text-xs font-bold">Basic Information</TabsTrigger>
                  <TabsTrigger value="permissions" className="text-xs font-bold">Permissions Matrix</TabsTrigger>
                </TabsList>

                {/* Tab 1: Basic Information */}
                <TabsContent value="basic" className="space-y-4 pt-1 text-xs">
                  {/* Avatar Upload Frame */}
                  <div className="p-4 rounded-xl border bg-secondary/30 flex items-center gap-4">
                    <Avatar className="size-16 border-2 shadow-sm">
                      <AvatarImage src={editingEmployee.avatar_url || "/favicon.webp"} />
                      <AvatarFallback className="font-bold bg-primary text-primary-foreground">
                        {editingEmployee.first_name?.[0]}{editingEmployee.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                      <h4 className="font-bold text-xs text-foreground">Upload Profile Image</h4>
                      <p className="text-[11px] text-muted-foreground">Image should be below 4 MB (JPEG, PNG, WEBP)</p>
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="file"
                          ref={editAvatarInputRef}
                          onChange={(e) => handleAvatarFileSelect(e, "edit")}
                          accept="image/*"
                          className="hidden"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => editAvatarInputRef.current?.click()}
                          className="h-7 text-xs font-bold gap-1 text-emerald-600 border-emerald-500/30 hover:bg-emerald-50"
                        >
                          <Camera className="size-3.5" /> Upload & Crop Photo
                        </Button>
                        {editingEmployee.avatar_url && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingEmployee({ ...editingEmployee, avatar_url: "" })}
                            className="h-7 text-xs text-rose-500 hover:bg-rose-50"
                          >
                            Reset
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">First Name *</Label>
                      <Input
                        value={editingEmployee.first_name ?? editingEmployee.firstName ?? ""}
                        onChange={(e) => setEditingEmployee({ ...editingEmployee, first_name: e.target.value })}
                        className="text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Last Name</Label>
                      <Input
                        value={editingEmployee.last_name ?? editingEmployee.lastName ?? ""}
                        onChange={(e) => setEditingEmployee({ ...editingEmployee, last_name: e.target.value })}
                        className="text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Employee ID *</Label>
                      <Input
                        value={editingEmployee.employee_code ?? editingEmployee.employeeCode ?? ""}
                        onChange={(e) => setEditingEmployee({ ...editingEmployee, employee_code: e.target.value })}
                        className="text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Joining Date *</Label>
                      <Input
                        type="date"
                        value={editingEmployee.joined_at ? new Date(editingEmployee.joined_at).toISOString().slice(0, 10) : ""}
                        onChange={(e) => setEditingEmployee({ ...editingEmployee, joined_at: e.target.value })}
                        className="text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Work Email *</Label>
                      <Input
                        type="email"
                        value={editingEmployee.email ?? ""}
                        onChange={(e) => setEditingEmployee({ ...editingEmployee, email: e.target.value })}
                        className="text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Phone Number *</Label>
                      <Input
                        value={editingEmployee.phone ?? ""}
                        onChange={(e) => setEditingEmployee({ ...editingEmployee, phone: e.target.value })}
                        className="text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Department</Label>
                      <Select
                        value={editingEmployee.department_id ?? editingEmployee.departmentId ?? ""}
                        onValueChange={(v) => setEditingEmployee({ ...editingEmployee, department_id: v })}
                      >
                        <SelectTrigger className="text-xs"><SelectValue placeholder="Select Department" /></SelectTrigger>
                        <SelectContent>
                          {departments.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Designation / Role</Label>
                      <Input
                        value={editingEmployee.position ?? ""}
                        onChange={(e) => setEditingEmployee({ ...editingEmployee, position: e.target.value })}
                        className="text-xs"
                      />
                    </div>
                    <div className="space-y-1 col-span-2">
                      <Label className="text-xs font-semibold">Monthly Salary (₹)</Label>
                      <Input
                        type="number"
                        value={editingEmployee.salary ?? 0}
                        onChange={(e) => setEditingEmployee({ ...editingEmployee, salary: Number(e.target.value) })}
                        className="text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1 col-span-2">
                      <Label className="text-xs font-semibold">About Employee Bio</Label>
                      <textarea
                        rows={3}
                        value={activeExtended.about}
                        onChange={(e) => {
                          const updated = {
                            ...passportMap,
                            [editingEmployee.id]: {
                              ...activeExtended,
                              about: e.target.value,
                            },
                          };
                          savePassportMut.mutate(updated);
                        }}
                        className="w-full p-2.5 text-xs rounded-md border bg-background font-normal"
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Tab 2: Permissions Matrix */}
                <TabsContent value="permissions" className="space-y-3 text-xs">
                  <div className="p-3 bg-secondary/30 rounded-lg flex items-center justify-between">
                    <span className="font-bold text-xs">Enable All System Modules & Permissions</span>
                    <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-500/10 border-emerald-300">
                      Auto-Enforced RBAC
                    </Badge>
                  </div>

                  <div className="border rounded-lg overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40 text-[11px]">
                          <TableHead className="w-[140px]">Module</TableHead>
                          <TableHead className="text-center">Read</TableHead>
                          <TableHead className="text-center">Write</TableHead>
                          <TableHead className="text-center">Create</TableHead>
                          <TableHead className="text-center">Delete</TableHead>
                          <TableHead className="text-center">Import</TableHead>
                          <TableHead className="text-center">Export</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {["Holidays", "Leaves", "Clients", "Projects", "Tasks", "Chats", "Assets", "Timing Sheets"].map((mod) => (
                          <TableRow key={mod} className="text-xs">
                            <TableCell className="font-bold">{mod}</TableCell>
                            {["read", "write", "create", "delete", "import", "export"].map((perm) => (
                              <TableCell key={perm} className="text-center">
                                <input
                                  type="checkbox"
                                  defaultChecked={true}
                                  className="rounded border-gray-300 text-primary focus:ring-primary size-3.5 cursor-pointer"
                                />
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              </Tabs>

              <DialogFooter className="mt-4 border-t pt-3 flex justify-between">
                <Button variant="outline" onClick={() => setEditingEmployee(null)}>Cancel</Button>
                <Button
                  onClick={() => updateMut.mutate(editingEmployee)}
                  disabled={updateMut.isPending}
                  className="font-bold bg-primary text-primary-foreground"
                >
                  {updateMut.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* 2. EDIT PERSONAL INFO MODAL (#edit_personal) */}
        <Dialog open={openEditPersonalModal} onOpenChange={setOpenEditPersonalModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <FileText className="size-4 text-primary" /> Edit Personal Information
              </DialogTitle>
            </DialogHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const updatedMap = {
                  ...passportMap,
                  [activeEmployee.id]: {
                    ...activeExtended,
                    passportNo: (fd.get("passportNo") as string) || activeExtended.passportNo,
                    passportExpiry: (fd.get("passportExpiry") as string) || activeExtended.passportExpiry,
                    nationality: (fd.get("nationality") as string) || activeExtended.nationality,
                    religion: (fd.get("religion") as string) || activeExtended.religion,
                    maritalStatus: (fd.get("maritalStatus") as string) || activeExtended.maritalStatus,
                    spouseEmployment: (fd.get("spouseEmployment") as string) || activeExtended.spouseEmployment,
                    childrenCount: (fd.get("childrenCount") as string) || activeExtended.childrenCount,
                  },
                };
                savePassportMut.mutate(updatedMap);
                setOpenEditPersonalModal(false);
              }}
              className="space-y-3 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Passport No *</Label>
                  <Input name="passportNo" defaultValue={activeExtended.passportNo} className="text-xs font-mono" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Passport Expiry Date *</Label>
                  <Input name="passportExpiry" defaultValue={activeExtended.passportExpiry} className="text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Nationality *</Label>
                  <Input name="nationality" defaultValue={activeExtended.nationality} className="text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Religion</Label>
                  <Input name="religion" defaultValue={activeExtended.religion} className="text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Marital Status *</Label>
                  <Input name="maritalStatus" defaultValue={activeExtended.maritalStatus} className="text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Employment of Spouse</Label>
                  <Input name="spouseEmployment" defaultValue={activeExtended.spouseEmployment} className="text-xs" />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label className="text-xs font-semibold">No. of Children</Label>
                  <Input name="childrenCount" defaultValue={activeExtended.childrenCount} className="text-xs" />
                </div>
              </div>

              <DialogFooter className="mt-4 pt-2 border-t">
                <Button type="button" variant="outline" onClick={() => setOpenEditPersonalModal(false)}>Cancel</Button>
                <Button type="submit" className="font-bold bg-primary text-primary-foreground">Save Personal Info</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* 3. EDIT EMERGENCY CONTACT MODAL (#edit_emergency) */}
        <Dialog open={openEditEmergencyModal} onOpenChange={setOpenEditEmergencyModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Phone className="size-4 text-rose-500" /> Emergency Contact Details
              </DialogTitle>
            </DialogHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const updatedMap = {
                  ...passportMap,
                  [activeEmployee.id]: {
                    ...activeExtended,
                    emergencyPrimary: {
                      name: (fd.get("p_name") as string) || "Adrian Peralt",
                      relationship: (fd.get("p_rel") as string) || "Father",
                      phone1: (fd.get("p_phone1") as string) || "+1 127 2685 598",
                      phone2: (fd.get("p_phone2") as string) || "",
                    },
                    emergencySecondary: {
                      name: (fd.get("s_name") as string) || "Karen Wills",
                      relationship: (fd.get("s_rel") as string) || "Mother",
                      phone1: (fd.get("s_phone1") as string) || "+1 989 7774 787",
                      phone2: (fd.get("s_phone2") as string) || "",
                    },
                  },
                };
                savePassportMut.mutate(updatedMap);
                setOpenEditEmergencyModal(false);
              }}
              className="space-y-4 text-xs"
            >
              {/* Primary Contact */}
              <div className="p-3 border rounded-lg bg-secondary/10 space-y-2">
                <h5 className="font-bold text-xs text-foreground uppercase tracking-wider">Primary Contact Details</h5>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[11px] font-semibold">Name *</Label>
                    <Input name="p_name" defaultValue={activeExtended.emergencyPrimary?.name} className="text-xs" />
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold">Relationship</Label>
                    <Input name="p_rel" defaultValue={activeExtended.emergencyPrimary?.relationship} className="text-xs" />
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold">Phone No 1 *</Label>
                    <Input name="p_phone1" defaultValue={activeExtended.emergencyPrimary?.phone1} className="text-xs font-mono" />
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold">Phone No 2</Label>
                    <Input name="p_phone2" defaultValue={activeExtended.emergencyPrimary?.phone2} className="text-xs font-mono" />
                  </div>
                </div>
              </div>

              {/* Secondary Contact */}
              <div className="p-3 border rounded-lg bg-secondary/10 space-y-2">
                <h5 className="font-bold text-xs text-foreground uppercase tracking-wider">Secondary Contact Details</h5>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[11px] font-semibold">Name *</Label>
                    <Input name="s_name" defaultValue={activeExtended.emergencySecondary?.name} className="text-xs" />
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold">Relationship</Label>
                    <Input name="s_rel" defaultValue={activeExtended.emergencySecondary?.relationship} className="text-xs" />
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold">Phone No 1 *</Label>
                    <Input name="s_phone1" defaultValue={activeExtended.emergencySecondary?.phone1} className="text-xs font-mono" />
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold">Phone No 2</Label>
                    <Input name="s_phone2" defaultValue={activeExtended.emergencySecondary?.phone2} className="text-xs font-mono" />
                  </div>
                </div>
              </div>

              <DialogFooter className="mt-4 pt-2 border-t">
                <Button type="button" variant="outline" onClick={() => setOpenEditEmergencyModal(false)}>Cancel</Button>
                <Button type="submit" className="font-bold bg-primary text-primary-foreground">Save Contacts</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* 4. EDIT BANK DETAILS MODAL (#edit_bank) */}
        <Dialog open={openEditBankModal} onOpenChange={setOpenEditBankModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <CreditCard className="size-4 text-primary" /> Bank Details
              </DialogTitle>
            </DialogHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const bankName = (fd.get("bankName") as string) || "Swiz International Bank";
                const bankAccount = (fd.get("bankAccount") as string) || "159843014641";
                const bankIfsc = (fd.get("bankIfsc") as string) || "ICI24504";
                const bankBranch = (fd.get("bankBranch") as string) || "Alabama USA";

                // Update in Prisma
                updateMut.mutate({
                  ...activeEmployee,
                  bankName,
                  bankAccount,
                  bankIfsc,
                  bankBranch,
                });

                // Update in Passport Map
                const updatedMap = {
                  ...passportMap,
                  [activeEmployee.id]: {
                    ...activeExtended,
                    bank: {
                      bankName,
                      accountNo: bankAccount,
                      ifscCode: bankIfsc,
                      branchAddress: bankBranch,
                    },
                  },
                };
                savePassportMut.mutate(updatedMap);
                setOpenEditBankModal(false);
              }}
              className="space-y-3 text-xs"
            >
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Bank Name *</Label>
                <Input name="bankName" defaultValue={activeExtended.bank?.bankName} className="text-xs" required />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Bank Account No *</Label>
                <Input name="bankAccount" defaultValue={activeExtended.bank?.accountNo} className="text-xs font-mono" required />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">IFSC Code *</Label>
                <Input name="bankIfsc" defaultValue={activeExtended.bank?.ifscCode} className="text-xs font-mono uppercase" required />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Branch Address *</Label>
                <Input name="bankBranch" defaultValue={activeExtended.bank?.branchAddress} className="text-xs" required />
              </div>

              <DialogFooter className="mt-4 pt-2 border-t">
                <Button type="button" variant="outline" onClick={() => setOpenEditBankModal(false)}>Cancel</Button>
                <Button type="submit" className="font-bold bg-primary text-primary-foreground">Save Bank Details</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* 5. EDIT FAMILY INFORMATION MODAL (#edit_familyinformation) */}
        <Dialog open={openEditFamilyModal} onOpenChange={setOpenEditFamilyModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Users className="size-4 text-primary" /> Family Information
              </DialogTitle>
            </DialogHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const newMember = {
                  name: (fd.get("name") as string) || "Hendry Peralt",
                  relationship: (fd.get("relationship") as string) || "Brother",
                  dob: (fd.get("dob") as string) || "25 May 2014",
                  phone: (fd.get("phone") as string) || "+1 265 6956 961",
                };

                const updatedMap = {
                  ...passportMap,
                  [activeEmployee.id]: {
                    ...activeExtended,
                    family: [newMember, ...(activeExtended.family || []).slice(1)],
                  },
                };
                savePassportMut.mutate(updatedMap);
                setOpenEditFamilyModal(false);
              }}
              className="space-y-3 text-xs"
            >
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Name *</Label>
                <Input name="name" defaultValue={activeExtended.family?.[0]?.name || "Hendry Peralt"} className="text-xs" required />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Relationship *</Label>
                <Input name="relationship" defaultValue={activeExtended.family?.[0]?.relationship || "Brother"} className="text-xs" required />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Date of birth *</Label>
                <Input name="dob" defaultValue={activeExtended.family?.[0]?.dob || "25 May 2014"} className="text-xs" required />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Phone *</Label>
                <Input name="phone" defaultValue={activeExtended.family?.[0]?.phone || "+1 265 6956 961"} className="text-xs font-mono" required />
              </div>

              <DialogFooter className="mt-4 pt-2 border-t">
                <Button type="button" variant="outline" onClick={() => setOpenEditFamilyModal(false)}>Cancel</Button>
                <Button type="submit" className="font-bold bg-primary text-primary-foreground">Save Member</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* 6. EDIT EDUCATION INFORMATION MODAL (#edit_education) */}
        <Dialog open={openEditEducationModal} onOpenChange={setOpenEditEducationModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <BookOpen className="size-4 text-primary" /> Education Information
              </DialogTitle>
            </DialogHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const institution = fd.get("institution") as string;
                const course = fd.get("course") as string;
                const duration = `${fd.get("startYear") || "2020"} - ${fd.get("endYear") || "2022"}`;

                const updatedEdu = [
                  { institution, course, duration },
                  ...(activeExtended.education || []).slice(0, 2),
                ];

                const updatedMap = {
                  ...passportMap,
                  [activeEmployee.id]: {
                    ...activeExtended,
                    education: updatedEdu,
                  },
                };
                savePassportMut.mutate(updatedMap);
                setOpenEditEducationModal(false);
              }}
              className="space-y-3 text-xs"
            >
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Institution Name *</Label>
                <Input name="institution" defaultValue="Oxford University" className="text-xs" required />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Course / Degree *</Label>
                <Input name="course" defaultValue="Computer Science & Engineering" className="text-xs" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Start Year *</Label>
                  <Input name="startYear" defaultValue="2018" className="text-xs font-mono" required />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">End Year *</Label>
                  <Input name="endYear" defaultValue="2022" className="text-xs font-mono" required />
                </div>
              </div>

              <DialogFooter className="mt-4 pt-2 border-t">
                <Button type="button" variant="outline" onClick={() => setOpenEditEducationModal(false)}>Cancel</Button>
                <Button type="submit" className="font-bold bg-primary text-primary-foreground">Save Education</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* 7. EDIT EXPERIENCE INFORMATION MODAL (#edit_experience) */}
        <Dialog open={openEditExperienceModal} onOpenChange={setOpenEditExperienceModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Briefcase className="size-4 text-primary" /> Company Experience
              </DialogTitle>
            </DialogHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const company = fd.get("company") as string;
                const role = fd.get("role") as string;
                const isCurrent = fd.get("isCurrent") === "on";
                const duration = `${fd.get("startDate") || "Jan 2023"} - ${isCurrent ? "Present" : (fd.get("endDate") || "Dec 2024")}`;

                const updatedExp = [
                  { company, role, duration, isCurrent },
                  ...(activeExtended.experience || []).slice(0, 2),
                ];

                const updatedMap = {
                  ...passportMap,
                  [activeEmployee.id]: {
                    ...activeExtended,
                    experience: updatedExp,
                  },
                };
                savePassportMut.mutate(updatedMap);
                setOpenEditExperienceModal(false);
              }}
              className="space-y-3 text-xs"
            >
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Previous Company Name *</Label>
                <Input name="company" defaultValue="Google LLC" className="text-xs" required />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Designation / Role *</Label>
                <Input name="role" defaultValue="Senior Fullstack Developer" className="text-xs" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Start Date *</Label>
                  <Input name="startDate" defaultValue="Jan 2023" className="text-xs" required />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">End Date</Label>
                  <Input name="endDate" defaultValue="Present" className="text-xs" />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input type="checkbox" name="isCurrent" id="isCurrent" defaultChecked={true} className="size-4 rounded" />
                <label htmlFor="isCurrent" className="font-semibold text-foreground cursor-pointer">
                  Check if presently working here
                </label>
              </div>

              <DialogFooter className="mt-4 pt-2 border-t">
                <Button type="button" variant="outline" onClick={() => setOpenEditExperienceModal(false)}>Cancel</Button>
                <Button type="submit" className="font-bold bg-primary text-primary-foreground">Save Experience</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* 8. BANK & STATUTORY MODAL (#add_bank_satutory) */}
        <Dialog open={openBankStatutoryModal} onOpenChange={setOpenBankStatutoryModal}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base font-black flex items-center gap-2">
                <Building2 className="size-5 text-primary" /> Bank & Statutory Details
              </DialogTitle>
            </DialogHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const stat = {
                  salaryBasis: (fd.get("salaryBasis") as string) || "Monthly",
                  salaryAmount: (fd.get("salaryAmount") as string) || "₹ 85,000",
                  paymentType: (fd.get("paymentType") as string) || "Bank Transfer",
                  pfContribution: (fd.get("pfContribution") as string) || "Employee Contribution",
                  pfNo: (fd.get("pfNo") as string) || "MH/BAN/109845/000",
                  employeePfRate: (fd.get("employeePfRate") as string) || "12%",
                  additionalPfRate: (fd.get("additionalPfRate") as string) || "3.67%",
                  totalPfRate: (fd.get("totalPfRate") as string) || "15.67%",
                  esiContribution: (fd.get("esiContribution") as string) || "Employee Contribution",
                  esiNo: (fd.get("esiNo") as string) || "310009845210001",
                  employeeEsiRate: (fd.get("employeeEsiRate") as string) || "0.75%",
                  additionalEsiRate: (fd.get("additionalEsiRate") as string) || "3.25%",
                  totalEsiRate: (fd.get("totalEsiRate") as string) || "4.00%",
                };

                const updatedMap = {
                  ...passportMap,
                  [activeEmployee.id]: {
                    ...activeExtended,
                    statutory: stat,
                  },
                };
                savePassportMut.mutate(updatedMap);
                setOpenBankStatutoryModal(false);
              }}
              className="space-y-5 text-xs"
            >
              {/* Basic Salary Information */}
              <div className="p-4 border rounded-xl bg-secondary/10 space-y-3">
                <h5 className="font-bold text-xs uppercase tracking-wider text-foreground">Basic Salary Information</h5>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-[11px] font-semibold">Salary Basis *</Label>
                    <Select defaultValue={activeExtended.statutory?.salaryBasis || "Monthly"} name="salaryBasis">
                      <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Weekly">Weekly</SelectItem>
                        <SelectItem value="Monthly">Monthly</SelectItem>
                        <SelectItem value="Annually">Annually</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold">Salary Amount (₹)</Label>
                    <Input name="salaryAmount" defaultValue={activeExtended.statutory?.salaryAmount || "85,000"} className="text-xs font-mono" />
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold">Payment Type</Label>
                    <Select defaultValue={activeExtended.statutory?.paymentType || "Bank Transfer"} name="paymentType">
                      <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="Debit Card">Debit Card</SelectItem>
                        <SelectItem value="Mobile Payment">Mobile Payment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* PF Information */}
              <div className="p-4 border rounded-xl bg-secondary/10 space-y-3">
                <h5 className="font-bold text-xs uppercase tracking-wider text-foreground">PF (Provident Fund) Information</h5>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-[11px] font-semibold">PF Contribution *</Label>
                    <Select defaultValue={activeExtended.statutory?.pfContribution || "Employee & Employer Contribution"} name="pfContribution">
                      <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Employee Contribution">Employee Contribution</SelectItem>
                        <SelectItem value="Employer Contribution">Employer Contribution</SelectItem>
                        <SelectItem value="Employee & Employer Contribution">Employee & Employer Contribution</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold">PF Number</Label>
                    <Input name="pfNo" defaultValue={activeExtended.statutory?.pfNo || "MH/BAN/109845/000"} className="text-xs font-mono" />
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold">Employee PF Rate</Label>
                    <Input name="employeePfRate" defaultValue={activeExtended.statutory?.employeePfRate || "12%"} className="text-xs font-mono" />
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold">Additional Rate</Label>
                    <Input name="additionalPfRate" defaultValue={activeExtended.statutory?.additionalPfRate || "3.67%"} className="text-xs font-mono" />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-[11px] font-semibold">Total Rate</Label>
                    <Input name="totalPfRate" defaultValue={activeExtended.statutory?.totalPfRate || "15.67%"} className="text-xs font-mono font-bold text-primary" />
                  </div>
                </div>
              </div>

              {/* ESI Information */}
              <div className="p-4 border rounded-xl bg-secondary/10 space-y-3">
                <h5 className="font-bold text-xs uppercase tracking-wider text-foreground">ESI (Employee State Insurance) Information</h5>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-[11px] font-semibold">ESI Contribution *</Label>
                    <Select defaultValue={activeExtended.statutory?.esiContribution || "Employee Contribution"} name="esiContribution">
                      <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Employee Contribution">Employee Contribution</SelectItem>
                        <SelectItem value="Employer Contribution">Employer Contribution</SelectItem>
                        <SelectItem value="Maternity Benefit">Maternity Benefit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold">ESI Number</Label>
                    <Input name="esiNo" defaultValue={activeExtended.statutory?.esiNo || "310009845210001"} className="text-xs font-mono" />
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold">Employee ESI Rate *</Label>
                    <Input name="employeeEsiRate" defaultValue={activeExtended.statutory?.employeeEsiRate || "0.75%"} className="text-xs font-mono" />
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold">Additional Rate</Label>
                    <Input name="additionalEsiRate" defaultValue={activeExtended.statutory?.additionalEsiRate || "3.25%"} className="text-xs font-mono" />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-[11px] font-semibold">Total Rate</Label>
                    <Input name="totalEsiRate" defaultValue={activeExtended.statutory?.totalEsiRate || "4.00%"} className="text-xs font-mono font-bold text-primary" />
                  </div>
                </div>
              </div>

              <DialogFooter className="mt-4 pt-2 border-t">
                <Button type="button" variant="outline" onClick={() => setOpenBankStatutoryModal(false)}>Cancel</Button>
                <Button type="submit" className="font-bold bg-primary text-primary-foreground">Save Statutory Config</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* 9. ASSET INFORMATION MODAL (#asset_info) */}
        {selectedAssetForInfo && (
          <Dialog open={!!selectedAssetForInfo} onOpenChange={(o) => !o && setSelectedAssetForInfo(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <Laptop className="size-4 text-primary" /> Asset Information Passport
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-xl bg-secondary/30 border flex items-center gap-4">
                  <Avatar className="size-16 rounded-xl border">
                    <AvatarImage src={selectedAssetForInfo.imageUrl || ""} />
                    <AvatarFallback className="font-bold bg-primary/10 text-primary">
                      <Laptop className="size-7" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-bold text-sm text-foreground">{selectedAssetForInfo.name}</h4>
                    <p className="font-mono text-primary text-xs font-bold mt-0.5">
                      {selectedAssetForInfo.assetTag} • Assigned on {selectedAssetForInfo.allocatedDate}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-2.5 rounded-lg border bg-muted/20">
                    <span className="text-muted-foreground block text-[10px] uppercase font-bold">Type</span>
                    <span className="font-bold text-foreground">{selectedAssetForInfo.category}</span>
                  </div>
                  <div className="p-2.5 rounded-lg border bg-muted/20">
                    <span className="text-muted-foreground block text-[10px] uppercase font-bold">Brand</span>
                    <span className="font-bold text-foreground">Dell Enterprise</span>
                  </div>
                  <div className="p-2.5 rounded-lg border bg-muted/20">
                    <span className="text-muted-foreground block text-[10px] uppercase font-bold">Serial No</span>
                    <span className="font-mono font-bold text-foreground">{selectedAssetForInfo.serialNo}</span>
                  </div>
                  <div className="p-2.5 rounded-lg border bg-muted/20">
                    <span className="text-muted-foreground block text-[10px] uppercase font-bold">Cost</span>
                    <span className="font-bold font-mono text-primary">{selectedAssetForInfo.cost || "₹ 1,12,000"}</span>
                  </div>
                  <div className="p-2.5 rounded-lg border bg-muted/20 col-span-2">
                    <span className="text-muted-foreground block text-[10px] uppercase font-bold">Vendor</span>
                    <span className="font-semibold text-foreground">{selectedAssetForInfo.vendor || "Compusoft Systems Ltd."}</span>
                  </div>
                  <div className="p-2.5 rounded-lg border bg-muted/20 col-span-2">
                    <span className="text-muted-foreground block text-[10px] uppercase font-bold">Warranty Period</span>
                    <span className="font-semibold text-foreground">{selectedAssetForInfo.warrantyExpiry}</span>
                  </div>
                </div>
              </div>

              <DialogFooter className="mt-4 pt-2 border-t">
                <Button onClick={() => setSelectedAssetForInfo(null)}>Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* 10. RAISE ISSUE MODAL (#refuse_msg) */}
        {selectedAssetForIssue && (
          <Dialog open={!!selectedAssetForIssue} onOpenChange={(o) => !o && setSelectedAssetForIssue(null)}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <AlertCircle className="size-4 text-rose-500" /> Raise Issue on Asset ({selectedAssetForIssue.assetTag})
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-3 text-xs">
                <p className="text-muted-foreground">
                  Describe the hardware glitch, physical defect, or service requirement for <strong>{selectedAssetForIssue.name}</strong>.
                </p>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Issue Description *</Label>
                  <textarea
                    rows={4}
                    value={issueDescription}
                    onChange={(e) => setIssueDescription(e.target.value)}
                    placeholder="e.g. Screen flickering issue or battery health degradation..."
                    className="w-full p-2.5 text-xs rounded-md border bg-background"
                  />
                </div>
              </div>

              <DialogFooter className="mt-4 pt-2 border-t">
                <Button variant="outline" onClick={() => setSelectedAssetForIssue(null)}>Cancel</Button>
                <Button
                  onClick={() => {
                    if (!issueDescription.trim()) return toast.error("Please provide an issue description");
                    toast.success("Issue ticket raised successfully with IT Administration!");
                    setIssueDescription("");
                    setSelectedAssetForIssue(null);
                  }}
                  className="font-bold bg-primary text-primary-foreground"
                >
                  Submit Ticket
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Circular Avatar Cropper Dialog */}
        <AvatarCropperDialog
          isOpen={isCropperOpen}
          imageSrc={tempCropSrc}
          onCropComplete={handleCropComplete}
          onCancel={() => {
            setIsCropperOpen(false);
            setTempCropSrc(null);
          }}
        />
      </div>
    );
  }

  // =========================================================================
  // VIEW: MAIN WORKFORCE DIRECTORY (Table & Grid Views)
  // =========================================================================
  return (
    <div className="space-y-6 max-w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <Users className="size-6 text-primary" /> Workforce & Talent Hub
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage employee directories, 360° OKR performance appraisals, and company hardware assets.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === "directory" && (
            <>
              <Button variant="outline" size="sm" onClick={exportEmployeesCSV} className="gap-1.5 text-xs font-bold">
                <Download className="size-3.5" /> Export CSV
              </Button>
              <Button
                size="sm"
                onClick={() => { setAddForm({ ...EMPTY_FORM }); setOpenAddModal(true); }}
                className="gap-1.5 font-bold text-xs bg-primary text-primary-foreground"
              >
                <Plus className="size-4" /> Add Employee
              </Button>
            </>
          )}
          {activeTab === "performance" && (
            <Button
              size="sm"
              onClick={() => setIsAddReviewOpen(true)}
              className="gap-1.5 font-bold text-xs bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
            >
              <Plus className="size-4" /> New Appraisal Review
            </Button>
          )}
          {activeTab === "assets" && (
            <Button
              size="sm"
              onClick={() => setIsAddAssetOpen(true)}
              className="gap-1.5 font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
            >
              <Plus className="size-4" /> Allocate Device
            </Button>
          )}
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-3 w-full sm:w-auto h-10 bg-secondary/50 p-1 border">
          <TabsTrigger value="directory" className="text-xs font-bold gap-2">
            <Users className="size-3.5" /> Staff Directory ({employees.length})
          </TabsTrigger>
          <TabsTrigger value="performance" className="text-xs font-bold gap-2">
            <Award className="size-3.5 text-amber-500" /> Appraisals & OKR ({reviews.length})
          </TabsTrigger>
          <TabsTrigger value="assets" className="text-xs font-bold gap-2">
            <Laptop className="size-3.5 text-blue-500" /> Hardware & Assets ({assets.length})
          </TabsTrigger>
        </TabsList>

        {/* ===================== TAB 1: STAFF DIRECTORY ===================== */}
        <TabsContent value="directory" className="space-y-6">
          {/* CRM-Style KPI Widgets */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
            {[
              {
                title: "Total Employees",
                value: employees.length.toString(),
                change: "+29%",
                desc: "Active staff",
                gradient: "from-emerald-500 via-teal-500 to-cyan-500",
                bgTint: "bg-emerald-500/5",
                iconCircle: "bg-emerald-500",
                isUp: true
              },
              {
                title: "Active Staff",
                value: activeCount.toString(),
                change: "+18%",
                desc: "On payroll",
                gradient: "from-blue-500 via-indigo-500 to-violet-500",
                bgTint: "bg-blue-500/5",
                iconCircle: "bg-blue-500",
                isUp: true
              },
              {
                title: "On Probation",
                value: probationCount.toString(),
                change: "-14%",
                desc: "Pending review",
                gradient: "from-amber-500 via-orange-500 to-yellow-500",
                bgTint: "bg-amber-500/5",
                iconCircle: "bg-amber-500",
                isUp: false
              },
              {
                title: "New This Month",
                value: newHiresThisMonth.toString(),
                change: "+42%",
                desc: "New hires",
                gradient: "from-purple-500 via-pink-500 to-rose-500",
                bgTint: "bg-purple-500/5",
                iconCircle: "bg-purple-500",
                isUp: true
              },
            ].map((m) => (
              <div key={m.title} className="bg-card border rounded-xl overflow-hidden shadow-xs">
                <div className={`h-1 bg-gradient-to-r ${m.gradient}`}></div>
                <div className={`p-4 ${m.bgTint}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{m.title}</p>
                      <h2 className="text-2xl max-lg:text-xl font-black text-foreground mb-0">{m.value}</h2>
                    </div>
                    <div className={`size-10 rounded-full ${m.iconCircle} flex items-center justify-center text-white shrink-0 shadow-xs`}>
                      <Users className="size-5" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className={`inline-flex items-center font-bold ${m.isUp ? "text-emerald-600" : "text-amber-600"}`}>
                      {m.change}
                    </span>
                    <span className="text-muted-foreground">{m.desc}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Department Management Panel */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Building2 className="size-4 text-primary" />
                <span className="font-bold text-sm">Department Management</span>
                <Badge variant="outline" className="text-[10px] font-mono">{departments.length} total</Badge>
              </div>
              <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => setAddDeptOpen(true)}>
                <Plus className="size-3.5" /> Add Department
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {departments.length === 0 && (
                <span className="text-xs text-muted-foreground italic">No departments yet. Add one above.</span>
              )}
              {departments.map((d: any) => (
                <div key={d.id} className="flex items-center gap-1.5 bg-secondary/60 border rounded-full px-3 py-1 text-xs font-semibold">
                  {d.name}
                  <button
                    onClick={() => {
                      if (confirm(`Remove department "${d.name}"?`)) deleteDeptMut.mutate(d.id);
                    }}
                    className="text-muted-foreground hover:text-destructive transition-colors ml-1"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          </Card>

          {/* Search & Filter Bar with Grid/Table View Toggle */}
          <Card className="p-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, email, code or position..."
                  className="pl-9 text-xs h-9"
                />
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
                <Select value={selectedDept} onValueChange={setSelectedDept}>
                  <SelectTrigger className="w-[150px] text-xs h-9">
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map((d: any) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-[130px] text-xs h-9">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="probation">Probation</SelectItem>
                    <SelectItem value="on_leave">On Leave</SelectItem>
                    <SelectItem value="terminated">Terminated</SelectItem>
                  </SelectContent>
                </Select>

                {/* Grid vs Table View Switcher */}
                <div className="flex items-center border rounded-lg p-0.5 bg-muted/40 shrink-0">
                  <Button
                    size="sm"
                    variant={viewMode === "table" ? "secondary" : "ghost"}
                    onClick={() => setViewMode("table")}
                    className={`h-8 px-2.5 text-xs font-semibold gap-1 ${
                      viewMode === "table" ? "bg-background shadow-2xs font-bold text-foreground" : "text-muted-foreground"
                    }`}
                    title="Table List View"
                  >
                    <List className="size-3.5" /> <span className="hidden sm:inline">Table</span>
                  </Button>
                  <Button
                    size="sm"
                    variant={viewMode === "grid" ? "secondary" : "ghost"}
                    onClick={() => setViewMode("grid")}
                    className={`h-8 px-2.5 text-xs font-semibold gap-1 ${
                      viewMode === "grid" ? "bg-background shadow-2xs font-bold text-foreground" : "text-muted-foreground"
                    }`}
                    title="Cards Grid View"
                  >
                    <LayoutGrid className="size-3.5" /> <span className="hidden sm:inline">Grid</span>
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* EMPLOYEES DATA DISPLAY: TABLE VIEW OR GRID CARDS VIEW */}
          {isLoading ? (
            <Card className="p-12 text-center text-muted-foreground text-xs">
              Loading employees...
            </Card>
          ) : filtered.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground text-xs italic">
              No employees found matching filter criteria.
            </Card>
          ) : viewMode === "grid" ? (
            /* ===================== GRID CARDS VIEW ===================== */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((e: any) => (
                <Card
                  key={e.id}
                  className="overflow-hidden hover:shadow-md transition-all border group relative flex flex-col justify-between cursor-pointer"
                  onClick={() => setSelectedEmployeeId(e.id)}
                >
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-12 border-2 border-primary/20 shadow-2xs">
                          <AvatarImage src={e.avatar_url || "/favicon.webp"} />
                          <AvatarFallback className="font-bold text-sm bg-primary/10 text-primary">
                            {e.first_name?.[0]}{e.last_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-bold text-sm text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                            {e.first_name} {e.last_name}
                          </h4>
                          <p className="text-xs text-muted-foreground line-clamp-1">{e.position || "Staff Member"}</p>
                          <span className="font-mono text-[10px] text-primary/80 font-bold">{e.employee_code}</span>
                        </div>
                      </div>
                      <Badge className={`font-bold text-[10px] border-0 shrink-0 ${STATUS_CONFIG[e.status]?.className ?? ""}`}>
                        {STATUS_CONFIG[e.status]?.label ?? e.status}
                      </Badge>
                    </div>

                    <div className="pt-2 border-t grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-muted-foreground block font-medium">Department</span>
                        <span className="font-semibold truncate block">{e.departments?.name ?? "—"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block font-medium">Monthly Salary</span>
                        <span className="font-bold font-mono text-primary truncate block">
                          {formatSystemAmount(Number(e.salary) || 0, sysConfig?.currency)}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[10px] text-muted-foreground block font-medium">Email</span>
                        <span className="font-mono text-[11px] truncate block text-muted-foreground">{e.email}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 px-4 bg-muted/30 border-t flex items-center justify-between text-xs" onClick={(ev) => ev.stopPropagation()}>
                    <span className="text-[10px] capitalize text-muted-foreground font-medium">
                      {e.employment_type?.replace("_", " ")}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7 text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
                        onClick={() => { setAuthModalEmployee(e); setNewPassword(""); }}
                        title="Manage Login & Reset Password"
                      >
                        <KeyRound className="size-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        onClick={() => setSelectedEmployeeId(e.id)}
                        title="View Full Profile Details (Dreams UI-2)"
                      >
                        <Eye className="size-3.5 text-primary" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        onClick={() => setEditingEmployee({ ...e })}
                        title="Edit Info"
                      >
                        <Edit2 className="size-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7 text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          if (confirm(`Remove ${e.first_name} ${e.last_name}?`)) deleteMut.mutate(e.id);
                        }}
                        title="Delete"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            /* ===================== TABLE LIST VIEW ===================== */
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-secondary/40">
                      <TableHead className="text-xs">Employee</TableHead>
                      <TableHead className="text-xs">Code</TableHead>
                      <TableHead className="text-xs">Department</TableHead>
                      <TableHead className="text-xs">Position</TableHead>
                      <TableHead className="text-xs">Type</TableHead>
                      <TableHead className="text-xs">Salary</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((e: any) => (
                      <TableRow
                        key={e.id}
                        className="hover:bg-secondary/20 transition-colors cursor-pointer"
                        onClick={() => setSelectedEmployeeId(e.id)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="size-8 border">
                              <AvatarImage src={e.avatar_url || "/favicon.webp"} />
                              <AvatarFallback className="font-bold text-xs bg-primary/10 text-primary">
                                {e.first_name?.[0]}{e.last_name?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-bold text-xs text-foreground hover:text-primary transition-colors">
                                {e.first_name} {e.last_name}
                              </div>
                              <div className="text-[11px] text-muted-foreground font-mono">{e.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs font-bold">{e.employee_code}</TableCell>
                        <TableCell className="text-xs">{e.departments?.name ?? "—"}</TableCell>
                        <TableCell className="text-xs">{e.position ?? "Staff Member"}</TableCell>
                        <TableCell className="text-xs capitalize">{e.employment_type?.replace("_", " ")}</TableCell>
                        <TableCell className="font-mono text-xs font-bold text-primary">
                          {formatSystemAmount(Number(e.salary) || 0, sysConfig?.currency)}
                        </TableCell>
                        <TableCell>
                          <Badge className={`font-bold text-[10px] border-0 ${STATUS_CONFIG[e.status]?.className ?? ""}`}>
                            {STATUS_CONFIG[e.status]?.label ?? e.status.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right" onClick={(ev) => ev.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-7 text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
                              onClick={() => { setAuthModalEmployee(e); setNewPassword(""); }}
                              title="Manage Login & Reset Password"
                            >
                              <KeyRound className="size-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-7"
                              onClick={() => setSelectedEmployeeId(e.id)}
                              title="View Full Profile Details (Dreams UI-2)"
                            >
                              <Eye className="size-3.5 text-primary" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-7"
                              onClick={() => setEditingEmployee({ ...e })}
                              title="Edit Info"
                            >
                              <Edit2 className="size-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-7 text-destructive hover:bg-destructive/10"
                              onClick={() => {
                                if (confirm(`Remove ${e.first_name} ${e.last_name}?`)) deleteMut.mutate(e.id);
                              }}
                              title="Delete"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ===================== TAB 2: PERFORMANCE & OKR APPRAISALS ===================== */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card className="p-4 flex items-center gap-3 bg-amber-500/5 border-amber-500/20">
              <div className="size-10 rounded-xl bg-amber-500/10 grid place-items-center text-amber-600 shrink-0">
                <Star className="size-5" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground font-semibold">Average Org Score</div>
                <div className="font-black text-xl font-mono text-amber-600">4.7 / 5.0</div>
              </div>
            </Card>
            <Card className="p-4 flex items-center gap-3">
              <div className="size-10 rounded-xl bg-blue-500/10 grid place-items-center text-blue-600 shrink-0">
                <Target className="size-5" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground font-semibold">Active Review Cycle</div>
                <div className="font-bold text-sm">Q1 2026 Annual</div>
              </div>
            </Card>
            <Card className="p-4 flex items-center gap-3">
              <div className="size-10 rounded-xl bg-emerald-500/10 grid place-items-center text-emerald-600 shrink-0">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground font-semibold">Reviews Completed</div>
                <div className="font-black text-xl font-mono text-emerald-600">{reviews.length} Staff</div>
              </div>
            </Card>
            <Card className="p-4 flex items-center gap-3">
              <div className="size-10 rounded-xl bg-purple-500/10 grid place-items-center text-purple-600 shrink-0">
                <Award className="size-5" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground font-semibold">Top Performers</div>
                <div className="font-black text-xl font-mono text-purple-600">
                  {reviews.filter((r) => r.rating >= 4.5).length} Staff
                </div>
              </div>
            </Card>
          </div>

          {/* Appraisal Scorecards Grid */}
          <div className="grid md:grid-cols-2 gap-4">
            {reviews.map((rev) => (
              <Card key={rev.id} className="p-5 border space-y-4 hover:border-amber-500/40 transition-all shadow-xs">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-10 border-2 border-amber-500/30">
                      <AvatarFallback className="font-bold text-xs bg-amber-500/10 text-amber-700 dark:text-amber-300">
                        {rev.employeeName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-extrabold text-sm flex items-center gap-2">
                        {rev.employeeName}
                        <Badge variant="outline" className="font-mono text-[9px] text-muted-foreground">
                          {rev.employeeCode}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">{rev.department} · {rev.cycle}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-1 text-amber-500 font-black text-base font-mono">
                      <Star className="size-4 fill-amber-400 text-amber-400" /> {rev.rating.toFixed(1)}
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-[9px] font-bold">
                      {rev.recommendedIncrement}
                    </Badge>
                  </div>
                </div>

                {/* KPI Metrics */}
                <div className="space-y-2 pt-2 border-t text-xs">
                  <div className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                    Key Performance Indicators (KPI Targets)
                  </div>
                  <div className="space-y-1.5">
                    {rev.kpis.map((kpi, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-secondary/30 text-xs">
                        <span className="font-medium text-foreground">{kpi.title}</span>
                        <div className="flex items-center gap-3 font-mono text-[11px]">
                          <span className="text-muted-foreground">Target: {kpi.target}</span>
                          <span className="font-bold text-emerald-600">Achieved: {kpi.achieved}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-muted/40 border text-xs space-y-1">
                  <div className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                    <UserCheck className="size-3 text-primary" /> Manager Executive Feedback
                  </div>
                  <p className="text-foreground italic">"{rev.managerFeedback}"</p>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ===================== TAB 3: HARDWARE & IT ASSETS ===================== */}
        <TabsContent value="assets" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card className="p-4 flex items-center gap-3 bg-blue-500/5 border-blue-500/20">
              <div className="size-10 rounded-xl bg-blue-500/10 grid place-items-center text-blue-600 shrink-0">
                <Laptop className="size-5" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground font-semibold">Total Devices</div>
                <div className="font-black text-xl font-mono text-blue-600">{assets.length}</div>
              </div>
            </Card>
            <Card className="p-4 flex items-center gap-3">
              <div className="size-10 rounded-xl bg-emerald-500/10 grid place-items-center text-emerald-600 shrink-0">
                <CheckSquare className="size-5" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground font-semibold">Allocated</div>
                <div className="font-black text-xl font-mono text-emerald-600">
                  {assets.filter((a) => a.status === "assigned").length}
                </div>
              </div>
            </Card>
            <Card className="p-4 flex items-center gap-3">
              <div className="size-10 rounded-xl bg-purple-500/10 grid place-items-center text-purple-600 shrink-0">
                <PackageCheck className="size-5" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground font-semibold">In Inventory</div>
                <div className="font-black text-xl font-mono text-purple-600">
                  {assets.filter((a) => a.status === "available").length}
                </div>
              </div>
            </Card>
            <Card className="p-4 flex items-center gap-3">
              <div className="size-10 rounded-xl bg-rose-500/10 grid place-items-center text-rose-600 shrink-0">
                <ShieldAlert className="size-5" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground font-semibold">Needs Service</div>
                <div className="font-black text-xl font-mono text-rose-600">
                  {assets.filter((a) => a.condition === "Needs Service").length}
                </div>
              </div>
            </Card>
          </div>

          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/40">
                    <TableHead className="text-xs">Asset Tag</TableHead>
                    <TableHead className="text-xs">Device Name</TableHead>
                    <TableHead className="text-xs">Category</TableHead>
                    <TableHead className="text-xs">Serial Number</TableHead>
                    <TableHead className="text-xs">Assigned Employee</TableHead>
                    <TableHead className="text-xs">Allocated Date</TableHead>
                    <TableHead className="text-xs">Condition</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assets.map((ast) => (
                    <TableRow key={ast.id} className="text-xs hover:bg-secondary/20">
                      <TableCell className="font-mono font-bold text-primary">{ast.assetTag}</TableCell>
                      <TableCell className="font-bold">{ast.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-semibold">{ast.category}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-muted-foreground">{ast.serialNo}</TableCell>
                      <TableCell className="font-semibold text-foreground">
                        {ast.assignedToEmployeeName}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{ast.allocatedDate}</TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] ${
                          ast.condition === "New" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                        }`}>
                          {ast.condition}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] font-bold ${
                          ast.status === "assigned" ? "bg-emerald-100 text-emerald-700" : "bg-purple-100 text-purple-700"
                        }`}>
                          {ast.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ===================== MODAL: ADD EMPLOYEE ===================== */}
      <Dialog open={openAddModal} onOpenChange={setOpenAddModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-black">
              <UserPlus className="size-5 text-primary" /> Add New Employee
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Circular Avatar Upload with Cropper */}
            <div className="p-4 rounded-xl border bg-secondary/30 flex items-center gap-4">
              <div className="relative">
                <Avatar className="size-16 border-2 shadow-sm">
                  <AvatarImage src={addForm.avatar_url || "/favicon.webp"} />
                  <AvatarFallback className="font-black text-lg bg-primary/10 text-primary">
                    <Users className="size-6" />
                  </AvatarFallback>
                </Avatar>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-xs text-foreground">Profile Photo (Circular Crop)</h4>
                <p className="text-[11px] text-muted-foreground">Select an image to preview and crop in a circular frame.</p>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="file"
                    ref={avatarInputRef}
                    onChange={(e) => handleAvatarFileSelect(e, "add")}
                    accept="image/*"
                    className="hidden"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => avatarInputRef.current?.click()}
                    className="h-8 text-xs font-bold gap-1.5 text-primary border-primary/30 hover:bg-primary/5"
                  >
                    <Camera className="size-3.5" /> Upload & Crop Photo
                  </Button>
                  {addForm.avatar_url && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => setAddForm((prev) => ({ ...prev, avatar_url: "" }))}
                      className="size-8 text-rose-500 hover:bg-rose-50"
                      title="Clear photo"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Employee Code *</Label>
                <Input
                  value={addForm.employee_code}
                  onChange={(e) => setAddForm({ ...addForm, employee_code: e.target.value })}
                  placeholder="e.g. EMP-001"
                  className="text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Work Email *</Label>
                <Input
                  type="email"
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  placeholder="john.doe@company.com"
                  className="text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">First Name *</Label>
                <Input
                  value={addForm.first_name}
                  onChange={(e) => setAddForm({ ...addForm, first_name: e.target.value })}
                  placeholder="John"
                  className="text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Last Name *</Label>
                <Input
                  value={addForm.last_name}
                  onChange={(e) => setAddForm({ ...addForm, last_name: e.target.value })}
                  placeholder="Doe"
                  className="text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Phone</Label>
                <Input
                  value={addForm.phone}
                  onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Position / Role</Label>
                <Input
                  value={addForm.position}
                  onChange={(e) => setAddForm({ ...addForm, position: e.target.value })}
                  placeholder="Software Engineer"
                  className="text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Department</Label>
                <Select value={addForm.department_id} onValueChange={(v) => setAddForm({ ...addForm, department_id: v })}>
                  <SelectTrigger className="text-xs"><SelectValue placeholder="Select Department" /></SelectTrigger>
                  <SelectContent>
                    {departments.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Employment Type</Label>
                <Select value={addForm.employment_type} onValueChange={(v) => setAddForm({ ...addForm, employment_type: v })}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_time">Full Time</SelectItem>
                    <SelectItem value="part_time">Part Time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="intern">Intern</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Joining Date</Label>
                <Input
                  type="date"
                  value={addForm.joined_at}
                  onChange={(e) => setAddForm({ ...addForm, joined_at: e.target.value })}
                  className="text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Monthly Salary (₹)</Label>
                <Input
                  type="number"
                  value={addForm.salary}
                  onChange={(e) => setAddForm({ ...addForm, salary: e.target.value })}
                  placeholder="50000"
                  className="text-xs font-mono"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setOpenAddModal(false)}>Cancel</Button>
            <Button
              onClick={() => createMut.mutate()}
              disabled={createMut.isPending || !addForm.first_name || !addForm.email || !addForm.employee_code}
              className="font-bold bg-primary text-primary-foreground"
            >
              {createMut.isPending ? "Creating..." : "Save Employee"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: ADD DEPARTMENT */}
      <Dialog open={addDeptOpen} onOpenChange={setAddDeptOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-bold">
              <Building2 className="size-4 text-primary" /> Add Department
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-xs">
            <Label className="text-xs font-semibold">Department Name *</Label>
            <Input
              value={newDeptName}
              onChange={(e) => setNewDeptName(e.target.value)}
              placeholder="e.g. Engineering, Sales, HR..."
              className="text-xs"
              onKeyDown={(e) => e.key === "Enter" && newDeptName.trim() && addDeptMut.mutate(newDeptName.trim())}
            />
          </div>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setAddDeptOpen(false)}>Cancel</Button>
            <Button
              onClick={() => addDeptMut.mutate(newDeptName.trim())}
              disabled={!newDeptName.trim() || addDeptMut.isPending}
              className="font-bold bg-primary text-primary-foreground"
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: APPRAISAL REVIEW */}
      <Dialog open={isAddReviewOpen} onOpenChange={setIsAddReviewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-bold">
              <Award className="size-4 text-amber-500" /> New Performance Appraisal
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Select Employee *</Label>
              <Select value={reviewForm.employeeId} onValueChange={(v) => setReviewForm({ ...reviewForm, employeeId: v })}>
                <SelectTrigger className="text-xs"><SelectValue placeholder="Choose Employee..." /></SelectTrigger>
                <SelectContent>
                  {employees.map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.employee_code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Rating (1 to 5 Stars)</Label>
              <Input
                type="number"
                min={1}
                max={5}
                step={0.1}
                value={reviewForm.rating}
                onChange={(e) => setReviewForm({ ...reviewForm, rating: Number(e.target.value) })}
                className="text-xs font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Manager Feedback</Label>
              <Input
                value={reviewForm.managerFeedback}
                onChange={(e) => setReviewForm({ ...reviewForm, managerFeedback: e.target.value })}
                placeholder="Consistently delivers quality outcomes..."
                className="text-xs"
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsAddReviewOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateReview} className="font-bold bg-amber-600 hover:bg-amber-700 text-white">Save Appraisal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: ALLOCATE ASSET */}
      <Dialog open={isAddAssetOpen} onOpenChange={setIsAddAssetOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-bold">
              <Laptop className="size-4 text-blue-500" /> Allocate Company Device
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Device / Hardware Name *</Label>
              <Input
                value={assetForm.name}
                onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
                placeholder="e.g. MacBook Pro M3 16-inch"
                className="text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Assign to Employee</Label>
              <Select value={assetForm.assignedToEmployeeId} onValueChange={(v) => setAssetForm({ ...assetForm, assignedToEmployeeId: v })}>
                <SelectTrigger className="text-xs"><SelectValue placeholder="Select Staff..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned (Inventory)</SelectItem>
                  {employees.map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.employee_code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsAddAssetOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateAsset} className="font-bold bg-blue-600 hover:bg-blue-700 text-white">Allocate Device</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: LOGIN ACCOUNT & PASSWORD MANAGER */}
      {authModalEmployee && (
        <Dialog open={!!authModalEmployee} onOpenChange={(o) => !o && setAuthModalEmployee(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-black">
                <KeyRound className="size-5 text-amber-600" /> Employee Login & Password Manager
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-1 text-xs">
              <div className="p-3 rounded-xl border bg-secondary/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="size-10 border shadow-2xs">
                    <AvatarImage src={authModalEmployee.avatar_url || "/favicon.webp"} />
                    <AvatarFallback className="font-bold bg-primary/10 text-primary">
                      {authModalEmployee.first_name?.[0]}{authModalEmployee.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-bold text-foreground text-xs">
                      {authModalEmployee.first_name} {authModalEmployee.last_name}
                    </h4>
                    <p className="font-mono text-[11px] text-muted-foreground">{authModalEmployee.email}</p>
                    <span className="font-mono text-[10px] text-primary font-bold">{authModalEmployee.employee_code}</span>
                  </div>
                </div>

                <Badge variant="outline" className="font-mono text-[10px] border-emerald-500/30 text-emerald-600 bg-emerald-500/5">
                  {empAccountData?.hasAccount ? "● Account Active" : "○ Auto-Provisioned"}
                </Badge>
              </div>

              <div className="space-y-2 pt-1 border-t">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Lock className="size-3.5 text-primary" /> Set / Reset Login Password
                  </Label>
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="text-[10px] text-primary hover:underline font-bold flex items-center gap-1"
                  >
                    <Sparkles className="size-3" /> Auto-Generate
                  </button>
                </div>

                <div className="relative">
                  <Input
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Enter new password (min 6 chars)..."
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="h-9 text-xs font-mono pr-20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground hover:text-foreground font-semibold px-1.5 py-0.5 rounded"
                  >
                    {showNewPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
            </div>

            <DialogFooter className="flex justify-between sm:justify-between items-center w-full pt-3 border-t">
              <Button variant="outline" size="sm" onClick={() => setAuthModalEmployee(null)}>Cancel</Button>
              <Button
                size="sm"
                onClick={() => {
                  if (!newPassword || newPassword.length < 6) {
                    return toast.error("Please enter a password with at least 6 characters");
                  }
                  setPasswordMut.mutate({
                    employeeId: authModalEmployee.id,
                    password: newPassword,
                  });
                }}
                disabled={setPasswordMut.isPending || !newPassword}
                className="gap-1.5 text-xs font-bold bg-primary text-primary-foreground"
              >
                <Check className="size-3.5" /> Save Password
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Circular Avatar Cropper Dialog */}
      <AvatarCropperDialog
        isOpen={isCropperOpen}
        imageSrc={tempCropSrc}
        onCropComplete={handleCropComplete}
        onCancel={() => {
          setIsCropperOpen(false);
          setTempCropSrc(null);
        }}
      />
    </div>
  );
}
