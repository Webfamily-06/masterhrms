import { createFileRoute } from "@tanstack/react-router";
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
} from "lucide-react";
import { useState, useRef } from "react";
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
};

const DEFAULT_PERFORMANCE_REVIEWS: PerformanceReview[] = [];

const DEFAULT_HARDWARE_ASSETS: HardwareAsset[] = [];

function Employees() {
  const { user } = useSession();
  const { data: profile } = useCurrentProfile(user);
  const tenantId = profile?.tenant_id || "default";
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<string>("directory");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [openAddModal, setOpenAddModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any | null>(null);
  const [viewingEmployee, setViewingEmployee] = useState<any | null>(null);
  const [addDeptOpen, setAddDeptOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState("");
  const [addForm, setAddForm] = useState({ ...EMPTY_FORM });

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
    salary: e.salary,
    employment_type: e.employmentType ?? e.employment_type,
    status: e.status,
    joined_at: e.joinedAt ?? e.joined_at,
    avatar_url: e.user?.profile?.avatarUrl || e.avatarUrl || e.avatar_url || "",
  }));

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

  // Update Employee
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
      };
      await api.put(`/employees/${emp.id}`, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      setEditingEmployee(null);
      toast.success("Employee record updated!");
    },
    onError: (e: Error) => toast.error(`Update failed: ${e.message}`),
  });

  // Delete Employee
  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/employees/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
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
  const totalSalary = employees.reduce((s: number, e: any) => s + (Number(e.salary) || 0), 0);
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
      assetTag: `AST-${assetForm.category.slice(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
      name: assetForm.name.trim(),
      category: assetForm.category,
      serialNo: assetForm.serialNo.trim() || `SN-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
      assignedToEmployeeId: targetEmp ? targetEmp.id : "unassigned",
      assignedToEmployeeName: targetEmp ? `${targetEmp.first_name} ${targetEmp.last_name}` : "Unallocated (Inventory)",
      allocatedDate: new Date().toISOString().slice(0, 10),
      warrantyExpiry: new Date(Date.now() + 365 * 24 * 3600 * 1000 * 3).toISOString().slice(0, 10),
      condition: assetForm.condition,
      status: targetEmp ? "assigned" : "available",
    };

    saveAssetsMut.mutate([newAsset, ...assets]);
  }

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
                gradient: "from-success via-warning to-danger",
                bgTint: "bg-success/5",
                iconCircle: "bg-success",
                iconClass: "ph-duotone ph-user",
                isUp: true
              },
              {
                title: "Active Staff",
                value: activeCount.toString(),
                change: "+18%",
                desc: "On payroll",
                gradient: "from-purple via-pink to-purple",
                bgTint: "bg-purple/5",
                iconCircle: "bg-purple",
                iconClass: "ph-duotone ph-user-check",
                isUp: true
              },
              {
                title: "On Probation",
                value: probationCount.toString(),
                change: "-14%",
                desc: "Pending review",
                gradient: "from-warning via-orange to-warning",
                bgTint: "bg-warning/5",
                iconCircle: "bg-warning",
                iconClass: "ph-duotone ph-shield-warning",
                isUp: false
              },
              {
                title: "New This Month",
                value: newHiresThisMonth.toString(),
                change: "+42%",
                desc: "New hires",
                gradient: "from-pink via-purple to-pink",
                bgTint: "bg-pink/5",
                iconCircle: "bg-pink",
                iconClass: "ph-duotone ph-trend-up",
                isUp: true
              },
            ].map((m) => (
              <div key={m.title} className="bg-white border border-border-color rounded-md overflow-hidden dark:bg-card dark:border-border">
                <div className={`h-1 bg-gradient-to-r ${m.gradient}`}></div>
                <div className={`p-4 ${m.bgTint}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-xs text-default mb-1">{m.title}</p>
                      <h2 className="text-2xl max-lg:text-xl font-bold text-gray-900 dark:text-white mb-0">{m.value}</h2>
                    </div>
                    <div className={`size-10 rounded-full ${m.iconCircle} flex items-center justify-center shrink-0`}>
                      <i className={`${m.iconClass} text-white text-lg`}></i>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className={`inline-flex items-center font-semibold ${m.isUp ? "text-success" : "text-danger"}`}>
                      <i className={`ph ${m.isUp ? "ph-arrow-up" : "ph-arrow-down"} text-[10px] me-0.5`}></i>
                      {m.change}
                    </span>
                    <span className="text-default">{m.desc}</span>
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
                  className="overflow-hidden hover:shadow-md transition-all border group relative flex flex-col justify-between"
                >
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-12 border-2 border-primary/20 shadow-2xs">
                          <AvatarImage src={e.avatar_url || "/favicon.webp"} />
                          <AvatarFallback className="font-bold text-sm bg-primary/10 text-primary">
                            <img src="/favicon.webp" alt="Avatar" className="size-full object-cover"  loading="lazy"/>
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-bold text-sm text-foreground line-clamp-1">
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

                  <div className="p-2.5 px-4 bg-muted/30 border-t flex items-center justify-between text-xs">
                    <span className="text-[10px] capitalize text-muted-foreground font-medium">
                      {e.employment_type?.replace("_", " ")}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" className="size-7 text-amber-600 hover:text-amber-700 hover:bg-amber-500/10" onClick={() => { setAuthModalEmployee(e); setNewPassword(""); }} title="Manage Login & Reset Password">
                        <KeyRound className="size-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="size-7" onClick={() => setViewingEmployee(e)} title="View Profile">
                        <Eye className="size-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="size-7" onClick={() => setEditingEmployee({ ...e })} title="Edit">
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
                      <TableRow key={e.id} className="hover:bg-secondary/20 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="size-8 border">
                              <AvatarImage src={e.avatar_url || "/favicon.webp"} />
                              <AvatarFallback className="font-bold text-xs bg-primary/10 text-primary">
                                <img src="/favicon.webp" alt="Avatar" className="size-full object-cover"  loading="lazy"/>
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-bold text-xs text-foreground">
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
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button size="icon" variant="ghost" className="size-7 text-amber-600 hover:text-amber-700 hover:bg-amber-500/10" onClick={() => { setAuthModalEmployee(e); setNewPassword(""); }} title="Manage Login & Reset Password">
                              <KeyRound className="size-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="size-7" onClick={() => setViewingEmployee(e)} title="View Profile">
                              <Eye className="size-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="size-7" onClick={() => setEditingEmployee({ ...e })} title="Edit">
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

                {/* Manager Feedback */}
                <div className="p-3 rounded-xl bg-secondary/20 border text-xs text-muted-foreground italic">
                  "{rev.managerFeedback}"
                </div>

                <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono pt-1">
                  <span>Reviewed: {rev.reviewedAt}</span>
                  <Badge variant="secondary" className="text-[9px] capitalize">{rev.status}</Badge>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ===================== TAB 3: HARDWARE ASSETS & DEVICE INVENTORY ===================== */}
        <TabsContent value="assets" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card className="p-4 flex items-center gap-3 bg-blue-500/5 border-blue-500/20">
              <div className="size-10 rounded-xl bg-blue-500/10 grid place-items-center text-blue-600 shrink-0">
                <Laptop className="size-5" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground font-semibold">Total Asset Registry</div>
                <div className="font-black text-xl font-mono text-blue-600">{assets.length} Devices</div>
              </div>
            </Card>
            <Card className="p-4 flex items-center gap-3">
              <div className="size-10 rounded-xl bg-emerald-500/10 grid place-items-center text-emerald-600 shrink-0">
                <UserCheck className="size-5" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground font-semibold">Assigned to Staff</div>
                <div className="font-black text-xl font-mono text-emerald-600">
                  {assets.filter((a) => a.status === "assigned").length}
                </div>
              </div>
            </Card>
            <Card className="p-4 flex items-center gap-3">
              <div className="size-10 rounded-xl bg-indigo-500/10 grid place-items-center text-indigo-600 shrink-0">
                <PackageCheck className="size-5" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground font-semibold">Available Stock</div>
                <div className="font-black text-xl font-mono text-indigo-600">
                  {assets.filter((a) => a.status === "available").length}
                </div>
              </div>
            </Card>
            <Card className="p-4 flex items-center gap-3">
              <div className="size-10 rounded-xl bg-amber-500/10 grid place-items-center text-amber-600 shrink-0">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground font-semibold">Under Active Warranty</div>
                <div className="font-black text-xl font-mono text-amber-600">100% Covered</div>
              </div>
            </Card>
          </div>

          {/* Hardware Assets Table */}
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/40">
                    <TableHead className="text-xs">Asset Tag</TableHead>
                    <TableHead className="text-xs">Hardware Device</TableHead>
                    <TableHead className="text-xs">Category</TableHead>
                    <TableHead className="text-xs">Assigned Employee</TableHead>
                    <TableHead className="text-xs">Serial Number</TableHead>
                    <TableHead className="text-xs">Warranty</TableHead>
                    <TableHead className="text-xs">Condition</TableHead>
                    <TableHead className="text-xs text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assets.map((asset) => (
                    <TableRow key={asset.id} className="hover:bg-secondary/20">
                      <TableCell className="font-mono text-xs font-bold text-primary">
                        {asset.assetTag}
                      </TableCell>
                      <TableCell className="font-semibold text-xs">{asset.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {asset.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-medium">
                        {asset.assignedToEmployeeName}
                      </TableCell>
                      <TableCell className="font-mono text-[11px] text-muted-foreground">
                        {asset.serialNo}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{asset.warrantyExpiry}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px]">
                          {asset.condition}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          className={`text-[10px] font-bold ${
                            asset.status === "assigned"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                          }`}
                        >
                          {asset.status.toUpperCase()}
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

      {/* ===================== MODAL: NEW APPRAISAL REVIEW ===================== */}
      <Dialog open={isAddReviewOpen} onOpenChange={setIsAddReviewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="size-5 text-amber-500" /> New Performance Appraisal
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Select Employee *</Label>
              <Select
                value={reviewForm.employeeId}
                onValueChange={(v) => setReviewForm({ ...reviewForm, employeeId: v })}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Choose employee..." />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.first_name} {e.last_name} ({e.employee_code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Review Cycle</Label>
              <Input
                value={reviewForm.cycle}
                onChange={(e) => setReviewForm({ ...reviewForm, cycle: e.target.value })}
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Overall Rating (1.0 to 5.0)</Label>
              <Input
                type="number"
                step="0.1"
                min="1"
                max="5"
                value={reviewForm.rating}
                onChange={(e) => setReviewForm({ ...reviewForm, rating: Number(e.target.value) })}
                className="text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Recommended Increment / Promotion</Label>
              <Input
                value={reviewForm.recommendedIncrement}
                onChange={(e) => setReviewForm({ ...reviewForm, recommendedIncrement: e.target.value })}
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Manager Feedback & Review Notes</Label>
              <Input
                value={reviewForm.managerFeedback}
                onChange={(e) => setReviewForm({ ...reviewForm, managerFeedback: e.target.value })}
                placeholder="Key strengths, outcomes and growth trajectory..."
                className="text-xs"
              />
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setIsAddReviewOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateReview} className="font-bold bg-amber-600 hover:bg-amber-700 text-white">
              Submit Appraisal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===================== MODAL: ALLOCATE DEVICE ===================== */}
      <Dialog open={isAddAssetOpen} onOpenChange={setIsAddAssetOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Laptop className="size-5 text-blue-500" /> Allocate Company Hardware Asset
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Device Model Name *</Label>
              <Input
                value={assetForm.name}
                onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
                placeholder='e.g. MacBook Pro 16" M3, Dell 27" 4K'
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Category</Label>
                <Select
                  value={assetForm.category}
                  onValueChange={(v: any) => setAssetForm({ ...assetForm, category: v })}
                >
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Laptop">Laptop</SelectItem>
                    <SelectItem value="Desktop">Desktop</SelectItem>
                    <SelectItem value="Monitor">Monitor</SelectItem>
                    <SelectItem value="Phone">Phone</SelectItem>
                    <SelectItem value="Accessory">Accessory</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Condition</Label>
                <Select
                  value={assetForm.condition}
                  onValueChange={(v: any) => setAssetForm({ ...assetForm, condition: v })}
                >
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="New">Brand New</SelectItem>
                    <SelectItem value="Good">Good</SelectItem>
                    <SelectItem value="Fair">Fair</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Serial Number</Label>
              <Input
                value={assetForm.serialNo}
                onChange={(e) => setAssetForm({ ...assetForm, serialNo: e.target.value })}
                placeholder="e.g. C02G89XYMD6T"
                className="text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Assign to Employee</Label>
              <Select
                value={assetForm.assignedToEmployeeId}
                onValueChange={(v) => setAssetForm({ ...assetForm, assignedToEmployeeId: v })}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Select employee (or leave empty for stock)..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unallocated (Stock Inventory)</SelectItem>
                  {employees.map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.first_name} {e.last_name} ({e.employee_code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setIsAddAssetOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateAsset} className="font-bold bg-blue-600 hover:bg-blue-700 text-white">
              Allocate Device
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===================== MODAL: ADD EMPLOYEE ===================== */}
      <Dialog open={openAddModal} onOpenChange={setOpenAddModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="size-5 text-primary" /> Add New Employee
            </DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="personal">
            <TabsList className="grid grid-cols-4 mb-4">
              <TabsTrigger value="personal" className="text-xs">Personal</TabsTrigger>
              <TabsTrigger value="job" className="text-xs">Job & Salary</TabsTrigger>
              <TabsTrigger value="emergency" className="text-xs">Emergency</TabsTrigger>
              <TabsTrigger value="onboarding" className="text-xs">Onboarding</TabsTrigger>
            </TabsList>

            {/* Tab 1: Personal Info */}
            <TabsContent value="personal" className="space-y-3">
              {/* Profile Picture Uploader with Interactive Round Crop Tool */}
              <div className="p-3 rounded-xl border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar className="size-14 border-2 border-emerald-500 shadow-xs">
                    <AvatarImage src={addForm.avatar_url || "/favicon.webp"} />
                    <AvatarFallback className="bg-emerald-600 text-white font-bold text-base">
                      <img src="/favicon.webp" alt="Avatar" className="size-full object-cover"  loading="lazy"/>
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-bold text-xs flex items-center gap-1.5">
                      <span>Employee Profile Picture</span>
                      {!addForm.avatar_url && (
                        <Badge variant="outline" className="text-[9px] py-0 text-muted-foreground font-mono">
                          Default Favicon
                        </Badge>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Upload a photo. The round crop tool will open to position it accurately.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <input
                    type="file"
                    ref={avatarInputRef}
                    accept="image/*"
                    onChange={(e) => handleAvatarFileSelect(e, "add")}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => avatarInputRef.current?.click()}
                    className="h-8 text-xs font-bold gap-1 text-emerald-600 border-emerald-500/30 hover:bg-emerald-50"
                  >
                    <Camera className="size-3.5" /> Upload & Crop Photo
                  </Button>
                  {addForm.avatar_url && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => setAddForm({ ...addForm, avatar_url: "" })}
                      className="size-8 text-rose-500 hover:bg-rose-50"
                      title="Reset to default"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Employee Code *</Label>
                  <Input value={addForm.employee_code} onChange={(e) => setAddForm({ ...addForm, employee_code: e.target.value })} placeholder="EMP001" className="font-mono text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Work Email *</Label>
                  <Input type="email" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} placeholder="john@company.com" className="font-mono text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">First Name *</Label>
                  <Input value={addForm.first_name} onChange={(e) => setAddForm({ ...addForm, first_name: e.target.value })} placeholder="John" className="text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Last Name *</Label>
                  <Input value={addForm.last_name} onChange={(e) => setAddForm({ ...addForm, last_name: e.target.value })} placeholder="Doe" className="text-xs" />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label className="text-xs font-semibold">Phone Number</Label>
                  <Input value={addForm.phone} onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })} placeholder="+91 98765 43210" className="font-mono text-xs" />
                </div>

                {/* Automatic Login Credentials Setup */}
                <div className="col-span-2 p-3 rounded-xl bg-primary/5 border border-primary/20 space-y-2 mt-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-primary">
                      <KeyRound className="size-3.5" />
                      <span>Employee Login Account (Auto-Created in DB)</span>
                    </div>
                    <Badge variant="outline" className="text-[9px] bg-primary/10 text-primary border-primary/30">
                      Auto-Provisioned
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="space-y-1">
                      <span className="text-muted-foreground font-medium block">Login Username / Email:</span>
                      <div className="font-mono bg-background px-2.5 py-1.5 rounded border text-xs truncate">
                        {addForm.email.trim() || "Enter Work Email above"}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-muted-foreground font-medium block">Initial Login Password:</span>
                      <Input
                        type="text"
                        value={addForm.password}
                        onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                        placeholder="Password@123"
                        className="font-mono text-xs h-8 bg-background"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Upon saving, this account is instantly stored in the database. The employee can immediately log in at <code className="text-primary font-mono">/auth</code>.
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* Tab 2: Job & Salary */}
            <TabsContent value="job" className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Designation / Position</Label>
                  <Input value={addForm.position} onChange={(e) => setAddForm({ ...addForm, position: e.target.value })} placeholder="Software Engineer" className="text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Department</Label>
                  <Select value={addForm.department_id} onValueChange={(v) => setAddForm({ ...addForm, department_id: v })}>
                    <SelectTrigger className="text-xs"><SelectValue placeholder="Select..." /></SelectTrigger>
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
                  <Label className="text-xs font-semibold">Status</Label>
                  <Select value={addForm.status} onValueChange={(v) => setAddForm({ ...addForm, status: v })}>
                    <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="probation">Probation</SelectItem>
                      <SelectItem value="on_leave">On Leave</SelectItem>
                      <SelectItem value="terminated">Terminated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Monthly Base Salary (₹)</Label>
                  <Input type="number" value={addForm.salary} onChange={(e) => setAddForm({ ...addForm, salary: e.target.value })} className="font-mono text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Joining Date</Label>
                  <Input type="date" value={addForm.joined_at} onChange={(e) => setAddForm({ ...addForm, joined_at: e.target.value })} className="text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Bank Name</Label>
                  <Input value={addForm.bank_name} onChange={(e) => setAddForm({ ...addForm, bank_name: e.target.value })} placeholder="State Bank of India" className="text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Account Number</Label>
                  <Input value={addForm.bank_account} onChange={(e) => setAddForm({ ...addForm, bank_account: e.target.value })} placeholder="XXXX XXXX XXXX" className="font-mono text-xs" />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label className="text-xs font-semibold">IFSC Code</Label>
                  <Input value={addForm.bank_ifsc} onChange={(e) => setAddForm({ ...addForm, bank_ifsc: e.target.value })} placeholder="SBIN0001234" className="font-mono text-xs uppercase" />
                </div>
              </div>
            </TabsContent>

            {/* Tab 3: Emergency Contact */}
            <TabsContent value="emergency" className="space-y-3">
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-400 mb-3">
                This information is used in emergency situations and is kept confidential.
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Contact Full Name</Label>
                  <Input value={addForm.emergency_name} onChange={(e) => setAddForm({ ...addForm, emergency_name: e.target.value })} placeholder="Jane Doe" className="text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Relationship</Label>
                  <Input value={addForm.emergency_relation} onChange={(e) => setAddForm({ ...addForm, emergency_relation: e.target.value })} placeholder="Spouse, Parent, Sibling..." className="text-xs" />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label className="text-xs font-semibold">Contact Phone</Label>
                  <Input value={addForm.emergency_phone} onChange={(e) => setAddForm({ ...addForm, emergency_phone: e.target.value })} placeholder="+91 98765 43210" className="font-mono text-xs" />
                </div>
              </div>
            </TabsContent>

            {/* Tab 4: Onboarding Checklist */}
            <TabsContent value="onboarding" className="space-y-3">
              <p className="text-xs text-muted-foreground">Mark completed onboarding steps for this new hire.</p>
              <div className="space-y-2">
                {ONBOARDING_CHECKLIST.map((item) => {
                  const checked = addForm.onboarding.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() =>
                        setAddForm({
                          ...addForm,
                          onboarding: checked
                            ? addForm.onboarding.filter((i) => i !== item)
                            : [...addForm.onboarding, item],
                        })
                      }
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border text-xs transition-all text-left ${
                        checked
                          ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300"
                          : "border-border bg-secondary/30 text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {checked ? (
                        <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                      ) : (
                        <Circle className="size-4 text-muted-foreground shrink-0" />
                      )}
                      {item}
                    </button>
                  );
                })}
              </div>
              <div className="text-xs text-muted-foreground pt-1">
                {addForm.onboarding.length} / {ONBOARDING_CHECKLIST.length} steps completed
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setOpenAddModal(false)}>Cancel</Button>
            <Button
              onClick={() => createMut.mutate()}
              disabled={createMut.isPending || !addForm.employee_code || !addForm.first_name || !addForm.last_name || !addForm.email}
              className="font-bold bg-primary text-primary-foreground"
            >
              {createMut.isPending ? "Adding..." : "Add Employee"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===================== MODAL: EDIT EMPLOYEE ===================== */}
      {editingEmployee && (
        <Dialog open={!!editingEmployee} onOpenChange={(o) => !o && setEditingEmployee(null)}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit2 className="size-5 text-primary" /> Edit Employee ({editingEmployee.employee_code})
              </DialogTitle>
            </DialogHeader>

            {/* Profile Picture Uploader for Edit */}
            <div className="p-3 rounded-xl border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Avatar className="size-14 border-2 border-emerald-500 shadow-xs">
                  <AvatarImage src={editingEmployee.avatar_url || "/favicon.webp"} />
                  <AvatarFallback className="bg-emerald-600 text-white font-bold text-base">
                    <img src="/favicon.webp" alt="Avatar" className="size-full object-cover"  loading="lazy"/>
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-bold text-xs flex items-center gap-1.5">
                    <span>Profile Photo</span>
                    {!editingEmployee.avatar_url && (
                      <Badge variant="outline" className="text-[9px] py-0 text-muted-foreground font-mono">
                        Default Favicon
                      </Badge>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Upload & round-crop image for employee profile.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <input
                  type="file"
                  ref={editAvatarInputRef}
                  accept="image/*"
                  onChange={(e) => handleAvatarFileSelect(e, "edit")}
                  className="hidden"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => editAvatarInputRef.current?.click()}
                  className="h-8 text-xs font-bold gap-1 text-emerald-600 border-emerald-500/30 hover:bg-emerald-50"
                >
                  <Camera className="size-3.5" /> Change & Crop Photo
                </Button>
                {editingEmployee.avatar_url && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => setEditingEmployee({ ...editingEmployee, avatar_url: "" })}
                    className="size-8 text-rose-500 hover:bg-rose-50"
                    title="Reset to default"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Employee Code</Label>
                <Input value={editingEmployee.employee_code} onChange={(e) => setEditingEmployee({ ...editingEmployee, employee_code: e.target.value })} className="text-xs font-mono" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Work Email</Label>
                <Input value={editingEmployee.email} onChange={(e) => setEditingEmployee({ ...editingEmployee, email: e.target.value })} className="text-xs font-mono" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">First Name</Label>
                <Input value={editingEmployee.first_name} onChange={(e) => setEditingEmployee({ ...editingEmployee, first_name: e.target.value })} className="text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Last Name</Label>
                <Input value={editingEmployee.last_name} onChange={(e) => setEditingEmployee({ ...editingEmployee, last_name: e.target.value })} className="text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Phone</Label>
                <Input value={editingEmployee.phone || ""} onChange={(e) => setEditingEmployee({ ...editingEmployee, phone: e.target.value })} className="text-xs font-mono" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Position</Label>
                <Input value={editingEmployee.position || ""} onChange={(e) => setEditingEmployee({ ...editingEmployee, position: e.target.value })} className="text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Department</Label>
                <Select value={editingEmployee.department_id || ""} onValueChange={(v) => setEditingEmployee({ ...editingEmployee, department_id: v })}>
                  <SelectTrigger className="text-xs"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {departments.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Employment Type</Label>
                <Select value={editingEmployee.employment_type} onValueChange={(v) => setEditingEmployee({ ...editingEmployee, employment_type: v })}>
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
                <Label className="text-xs font-semibold">Status</Label>
                <Select value={editingEmployee.status || "active"} onValueChange={(v) => setEditingEmployee({ ...editingEmployee, status: v })}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="probation">Probation</SelectItem>
                    <SelectItem value="on_leave">On Leave</SelectItem>
                    <SelectItem value="terminated">Terminated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Joining Date</Label>
                <Input type="date" value={editingEmployee.joined_at || ""} onChange={(e) => setEditingEmployee({ ...editingEmployee, joined_at: e.target.value })} className="text-xs" />
              </div>
              <div className="space-y-1 col-span-2">
                <Label className="text-xs font-semibold">Monthly Salary (₹)</Label>
                <Input type="number" value={editingEmployee.salary || 0} onChange={(e) => setEditingEmployee({ ...editingEmployee, salary: Number(e.target.value) })} className="text-xs font-mono" />
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setEditingEmployee(null)}>Cancel</Button>
              <Button onClick={() => updateMut.mutate(editingEmployee)} disabled={updateMut.isPending} className="font-bold bg-primary text-primary-foreground">
                {updateMut.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ===================== MODAL: VIEW EMPLOYEE PROFILE ===================== */}
      {viewingEmployee && (
        <Dialog open={!!viewingEmployee} onOpenChange={(o) => !o && setViewingEmployee(null)}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserCheck className="size-5 text-emerald-600" /> Employee Profile
              </DialogTitle>
            </DialogHeader>

            {/* Profile Card */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-primary/5 to-indigo-500/5 border flex items-center gap-4">
              <Avatar className="size-16 border-2 border-primary/20">
                <AvatarImage src={viewingEmployee.avatar_url || "/favicon.webp"} />
                <AvatarFallback className="font-black text-xl bg-primary text-primary-foreground">
                  <img src="/favicon.webp" alt="Avatar" className="size-full object-cover"  loading="lazy"/>
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-extrabold text-lg leading-tight">
                  {viewingEmployee.first_name} {viewingEmployee.last_name}
                </div>
                <div className="text-muted-foreground text-sm">{viewingEmployee.position || "Staff Member"}</div>
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge variant="outline" className="font-mono text-[10px] text-primary border-primary/30">
                    {viewingEmployee.employee_code}
                  </Badge>
                  <Badge className={`font-bold text-[10px] border-0 ${STATUS_CONFIG[viewingEmployee.status]?.className ?? ""}`}>
                    {STATUS_CONFIG[viewingEmployee.status]?.label ?? viewingEmployee.status}
                  </Badge>
                </div>
              </div>
            </div>

            <Tabs defaultValue="info">
              <TabsList className="grid grid-cols-3">
                <TabsTrigger value="info" className="text-xs">Info</TabsTrigger>
                <TabsTrigger value="contact" className="text-xs">Contact</TabsTrigger>
                <TabsTrigger value="onboarding" className="text-xs">Onboarding</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-3 pt-3">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {[
                    { label: "Department", value: viewingEmployee.departments?.name || "Unassigned", icon: Building2 },
                    { label: "Employment", value: viewingEmployee.employment_type?.replace("_", " "), icon: Briefcase },
                    { label: "Joined", value: viewingEmployee.joined_at || "N/A", icon: Calendar },
                    { label: "Monthly Salary", value: formatSystemAmount(Number(viewingEmployee.salary) || 0, sysConfig?.currency), icon: DollarSign },
                  ].map((f) => (
                    <div key={f.label} className="p-3 rounded-lg bg-secondary/40 border">
                      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                        <f.icon className="size-3" />{f.label}
                      </div>
                      <div className="font-bold capitalize">{f.value}</div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="contact" className="space-y-3 pt-3">
                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-lg border flex items-center gap-3">
                    <Mail className="size-4 text-muted-foreground shrink-0" />
                    <div>
                      <div className="text-muted-foreground text-[10px] uppercase font-bold">Work Email</div>
                      <div className="font-mono font-semibold">{viewingEmployee.email}</div>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg border flex items-center gap-3">
                    <Phone className="size-4 text-muted-foreground shrink-0" />
                    <div>
                      <div className="text-muted-foreground text-[10px] uppercase font-bold">Phone</div>
                      <div className="font-mono font-semibold">{viewingEmployee.phone || "Not provided"}</div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="onboarding" className="pt-3">
                <div className="space-y-2">
                  {ONBOARDING_CHECKLIST.map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-3 p-2.5 rounded-lg border bg-secondary/20 text-xs"
                    >
                      <Circle className="size-4 text-muted-foreground/40 shrink-0" />
                      <span className="text-muted-foreground">{item}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">
                  Onboarding tracking stored locally — edit employee to update.
                </p>
              </TabsContent>
            </Tabs>

            <DialogFooter className="gap-2 sm:gap-0 flex-wrap">
              <Button
                variant="outline"
                onClick={() => {
                  setAuthModalEmployee(viewingEmployee);
                  setNewPassword("");
                }}
                className="text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30 border-amber-300 font-semibold gap-1.5 mr-auto"
                title="Manage Login & Set/Reset Password"
              >
                <KeyRound className="size-3.5" /> Manage Login & Password
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (confirm(`Reset 2-Step Verification (2FA) for ${viewingEmployee.first_name} ${viewingEmployee.last_name} (${viewingEmployee.email})? This will unlock their account.`)) {
                    reset2faMut.mutate(viewingEmployee.id);
                  }
                }}
                disabled={reset2faMut.isPending}
                className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-200 shadow-2xs font-semibold mr-2"
                title="Admin 2FA Account Unlock"
              >
                <ShieldAlert className="size-3.5 mr-1 text-rose-500" /> Reset 2FA
              </Button>
              <Button variant="outline" onClick={() => { setViewingEmployee(null); setEditingEmployee({ ...viewingEmployee }); }}>
                <Edit2 className="size-3.5 mr-1.5" /> Edit Profile
              </Button>
              <Button onClick={() => setViewingEmployee(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* MODAL: ADD DEPARTMENT */}
      <Dialog open={addDeptOpen} onOpenChange={setAddDeptOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
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
              className="font-bold"
            >
              Create Department
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===================== MODAL: EMPLOYEE LOGIN & PASSWORD MANAGER ===================== */}
      {authModalEmployee && (
        <Dialog open={!!authModalEmployee} onOpenChange={(o) => !o && setAuthModalEmployee(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-black">
                <KeyRound className="size-5 text-amber-600" /> Employee Login & Password Manager
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-1 text-xs">
              {/* Employee Summary Card */}
              <div className="p-3 rounded-xl border bg-secondary/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="size-10 border shadow-2xs">
                    <AvatarImage src={authModalEmployee.avatar_url || "/favicon.webp"} />
                    <AvatarFallback className="font-bold bg-primary/10 text-primary">
                      <img src="/favicon.webp" alt="Avatar" className="size-full object-cover"  loading="lazy"/>
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

              {/* Account Details & Role */}
              <div className="grid grid-cols-2 gap-2 p-3 rounded-lg border bg-muted/20 text-[11px]">
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">Portal Role</span>
                  <Badge className="font-mono text-[10px] uppercase mt-0.5">
                    {empAccountData?.roles?.[0] || "employee"}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">2FA Status</span>
                  <span className="font-semibold block mt-0.5">
                    {empAccountData?.twoFactorEnabled ? (
                      <span className="text-emerald-600 font-bold flex items-center gap-1">
                        <ShieldCheck className="size-3" /> Enabled
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Disabled</span>
                    )}
                  </span>
                </div>
              </div>

              {/* Set New Password Form */}
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
                    placeholder="Enter new employee password (min 6 chars)..."
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
                <p className="text-[10px] text-muted-foreground">
                  Default login password upon creation is <code className="bg-muted px-1 py-0.5 rounded font-mono font-bold">Password@123</code>.
                </p>
              </div>

              {/* Share / Copy Credentials Helper */}
              {newPassword && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[11px] text-amber-800 dark:text-amber-300">
                      📋 Credentials Ready to Share:
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const msg = `Master HRMS Login Credentials:\nPortal URL: ${window.location.origin}/auth\nEmail: ${authModalEmployee.email}\nPassword: ${newPassword}`;
                        navigator.clipboard.writeText(msg);
                        toast.success("Login credentials copied to clipboard!");
                      }}
                      className="h-6 text-[10px] gap-1 font-semibold"
                    >
                      <Copy className="size-3" /> Copy Credentials
                    </Button>
                  </div>
                  <div className="p-2 rounded bg-background font-mono text-[11px] space-y-0.5 select-all">
                    <div><strong>Portal:</strong> {window.location.origin}/auth</div>
                    <div><strong>Email:</strong> {authModalEmployee.email}</div>
                    <div><strong>Password:</strong> {newPassword}</div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="flex justify-between sm:justify-between items-center w-full pt-3 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAuthModalEmployee(null)}
              >
                Cancel
              </Button>
              <div className="flex items-center gap-2">
                {empAccountData?.twoFactorEnabled && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (confirm(`Reset 2FA for ${authModalEmployee.first_name}?`)) {
                        reset2faMut.mutate(authModalEmployee.id);
                      }
                    }}
                    disabled={reset2faMut.isPending}
                    className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
                  >
                    Reset 2FA
                  </Button>
                )}
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
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ===================== MODAL: CIRCULAR AVATAR CROPPER ===================== */}
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
